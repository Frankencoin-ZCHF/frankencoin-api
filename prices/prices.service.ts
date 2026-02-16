import { Injectable, Logger } from '@nestjs/common';
import {
	ApiOwnerValueLocked,
	ApiPriceERC20,
	ApiPriceERC20Mapping,
	ApiPriceListing,
	ApiPriceMapping,
	ApiPriceMarketChart,
	ERC20Info,
	ERC20InfoObjectArray,
	PriceMarketChartObject,
	PriceQueryCurrencies,
	PriceQueryObjectArray,
	PriceSource,
} from './prices.types';
import { PositionsService } from 'positions/positions.service';
import { COINGECKO_CLIENT, CONFIG } from 'api.config';
import { Address, parseUnits } from 'viem';
import { EcosystemFpsService } from 'ecosystem/ecosystem.fps.service';
import { ADDRESS, ChainMain, SupportedChain } from '@frankencoin/zchf';
import { Storj } from 'storj/storj.s3.service';
import { PriceQueryObjectDTO } from './dtos/price.query.dto';
import { mainnet } from 'viem/chains';
import { getEndOfYearPrice } from './yearly.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractBlacklist, ContractWhitelist } from './prices.mgm';
import { getChain } from 'utils/func-helper';

@Injectable()
export class PricesService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly storjPath: string = '/prices.query.json';
	private fetchedPrices: PriceQueryObjectArray = {};
	private fetchedMarketChart: PriceMarketChartObject = { prices: [], market_caps: [], total_volumes: [] };

	constructor(
		private readonly storj: Storj,
		private readonly positionsService: PositionsService,
		private readonly fps: EcosystemFpsService
	) {
		this.readBackupPriceQuery();
		this.updateMarketChart();
	}

	async readBackupPriceQuery() {
		this.logger.log(`Reading backup PriceQueryObject from storj`);
		const response = await this.storj.read(this.storjPath, PriceQueryObjectDTO);

		if (response.messageError || response.validationError.length > 0) {
			this.logger.error(response.messageError);
		} else {
			this.fetchedPrices = { ...this.fetchedPrices, ...response.data };
			this.logger.log(`PriceQueryObject state restored...`);
		}
	}

	async writeBackupPriceQuery() {
		const response = await this.storj.write(this.storjPath, this.fetchedPrices);
		const httpStatusCode = response['$metadata'].httpStatusCode;

		if (httpStatusCode == 200) {
			this.logger.log(`PriceQueryObject backup stored`);
		} else {
			this.logger.error(`PriceQueryObject backup failed. httpStatusCode: ${httpStatusCode}`);
		}
	}

	getPrices(): ApiPriceListing {
		return Object.values(this.fetchedPrices);
	}

	getPricesMapping(): ApiPriceMapping {
		return this.fetchedPrices;
	}

	getMint(): ApiPriceERC20 {
		const p = Object.values(this.positionsService.getPositionsList().list)[0];
		if (!p) return null;
		return {
			chainId: ChainMain.mainnet.id,
			address: p.zchf,
			name: p.zchfName,
			symbol: p.zchfSymbol,
			decimals: p.zchfDecimals,
		};
	}

	getFps(): ApiPriceERC20 {
		return {
			chainId: ChainMain.mainnet.id,
			address: ADDRESS[mainnet.id].equity,
			name: 'Frankencoin Pool Share',
			symbol: 'FPS',
			decimals: 18,
		};
	}

	getCollateral(): ApiPriceERC20Mapping {
		const pos = Object.values(this.positionsService.getPositionsList().list);
		const c: ERC20InfoObjectArray = {};

		for (const p of pos) {
			if (ContractBlacklist.includes(p.collateral.toLowerCase() as Address)) continue;
			c[p.collateral.toLowerCase()] = {
				chainId: ChainMain.mainnet.id,
				address: p.collateral,
				name: p.collateralName,
				symbol: p.collateralSymbol,
				decimals: p.collateralDecimals,
			};
		}

		for (const i of ContractWhitelist) {
			c[i.address.toLowerCase()] = i;
		}

		return c;
	}

	getMarketChart(): ApiPriceMarketChart {
		return this.fetchedMarketChart;
	}

	async fetchMarketChartCoingecko(): Promise<PriceMarketChartObject | null> {
		const url = `/api/v3/coins/frankencoin/market_chart?vs_currency=chf&days=90`;
		const data = await (await COINGECKO_CLIENT(url)).json();
		if (data.status) {
			this.logger.debug(data.status?.error_message || 'Error fetching market chart from coingecko');
			return null;
		}
		return data;
	}

	async fetchPriceTheGraph(erc: ERC20Info): Promise<PriceQueryCurrencies | null> {
		const url = `https://gateway.thegraph.com/api/subgraphs/id/6PRcMNb9RCczH7aAnWvbw7pHgPWmziVsYjwgUFBeE3mR`;
		const query = `{
			token(id: "${erc.address.toLowerCase()}") {
				priceUSD
				priceCHF
			}
		}`;

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${CONFIG.theGraphKey}`,
				},
				body: JSON.stringify({ query }),
			});

			const data = await response.json();

			// Handle indexer errors gracefully
			if (data?.errors) {
				const errorMsg = data.errors[0]?.message || 'Unknown error';
				if (errorMsg.includes('bad indexers') || errorMsg.includes('Unavailable')) {
					this.logger.warn(`The Graph indexer unavailable for ${erc.symbol}, skipping...`);
				} else {
					this.logger.debug(`The Graph error for ${erc.symbol}: ${errorMsg}`);
				}
				return null;
			}

			const token = data?.data?.token;
			if (!token?.priceUSD) return null;

			const usd = parseFloat(token.priceUSD);
			const chf = parseFloat(token.priceCHF);
			return chf > 0 ? { usd, chf } : { usd };
		} catch (error) {
			this.logger.error(`Error fetching price from The Graph: ${error}`);
			return null;
		}
	}

	async fetchPriceDefillama(erc: ERC20Info): Promise<PriceQueryCurrencies | null> {
		const chain = getChain(erc.chainId) as SupportedChain;
		const chainName = chain.id === mainnet.id ? 'ethereum' : chain.name;
		const url = `https://coins.llama.fi/prices/current/${chainName}:${erc.address.toLowerCase()}`;

		try {
			const response = await fetch(url);
			const data = await response.json();
			const coin = data?.coins?.[`${chainName}:${erc.address.toLowerCase()}`];
			if (!coin?.price) return null;

			return { usd: Number(coin.price) };
		} catch (error) {
			this.logger.error(`Error fetching price from DefiLlama: ${error}`);
			return null;
		}
	}

	async fetchPriceCoingecko(erc: ERC20Info): Promise<PriceQueryCurrencies | null> {
		const url = `/api/v3/simple/token_price/ethereum?contract_addresses=${erc.address}&vs_currencies=usd`;

		try {
			const data = await (await COINGECKO_CLIENT(url)).json();
			if (data.status) {
				this.logger.debug(data.status?.error_message || 'Error fetching price from CoinGecko');
				return null;
			}

			const priceData = Object.values(data)[0] as { usd?: number } | undefined;
			if (!priceData?.usd || priceData.usd === 0) return null;

			return { usd: priceData.usd };
		} catch (error) {
			this.logger.error(`Error fetching price from CoinGecko: ${error}`);
			return null;
		}
	}

	async fetchPriceSources(erc: ERC20Info): Promise<{ price: PriceQueryCurrencies; source: PriceSource } | null> {
		// Priority 1: Custom overwrite (e.g., Frankencoin Pool Share)
		if (erc.address.toLowerCase() === ADDRESS[mainnet.id].equity.toLowerCase()) {
			const priceInChf = this.fps.getEcosystemFpsInfo()?.token?.price;
			const zchfAddress = ADDRESS[mainnet.id].frankencoin.toLowerCase();
			const zchfPrice: number = this.fetchedPrices[zchfAddress]?.price?.usd;
			if (!zchfPrice || !priceInChf) return null;
			return { price: { usd: priceInChf * zchfPrice }, source: 'custom' };
		}

		// Priority: The Graph
		const thegraphPrice = await this.fetchPriceTheGraph(erc);
		if (thegraphPrice) return { price: thegraphPrice, source: 'thegraph' };

		// Priority: DeFiLlama
		const defillamaPrice = await this.fetchPriceDefillama(erc);
		if (defillamaPrice) return { price: defillamaPrice, source: 'defillama' };

		// Priority: CoinGecko
		const coingeckoPrice = await this.fetchPriceCoingecko(erc);
		if (coingeckoPrice) return { price: coingeckoPrice, source: 'coingecko' };

		// No price found from any source
		return null;
	}

	async getOwnerValueLocked(owner: Address): Promise<ApiOwnerValueLocked> {
		owner = owner.toLowerCase() as Address;
		const history = await this.positionsService.getOwnerHistory(owner);

		const years = Object.keys(history).map((i) => Number(i));

		const yearlyValue: {
			[key: number]: string;
		} = {};

		for (const y of years) {
			const positions = history[y];

			let value = 0n;
			for (const pos of positions) {
				const updates = this.positionsService.getMintingUpdatesMapping().map[pos.toLowerCase() as Address] || [];
				const itemsUntil = updates.filter((i) => i.created * 1000 < new Date(String(y + 1)).getTime());
				const selected = itemsUntil.at(0);
				if (selected != undefined) {
					const isCurrentYear = new Date().getFullYear() == y;
					const c = selected.collateral.toLowerCase() as Address;
					const d = selected.collateralDecimals;
					const s = BigInt(selected.size);

					let p = 0n;

					if (isCurrentYear) {
						const priceCurrent = parseUnits(String(this.fetchedPrices[c].price.chf), 18);
						p = priceCurrent;
					} else {
						const priceHistory = getEndOfYearPrice({ year: y, contract: selected.collateral });
						p = priceHistory;
					}

					const v = (s * p) / BigInt(10 ** d);
					value += v;
				}
			}

			yearlyValue[y] = String(value);
		}

		return yearlyValue;
	}

	async updatePrices() {
		this.logger.debug('Updating Prices');

		const fps = this.getFps();
		const m = this.getMint();
		const c = Object.values(this.getCollateral());

		if (!m || c.length == 0) return;
		const a = [fps, m, ...c];

		const pricesQuery: PriceQueryObjectArray = {};
		let pricesQueryNewCount: number = 0;
		let pricesQueryNewCountFailed: number = 0;
		let pricesQueryUpdateCount: number = 0;
		let pricesQueryUpdateCountFailed: number = 0;

		for (const erc of a) {
			const addr = erc.address.toLowerCase() as Address;
			const oldEntry = this.fetchedPrices[addr];

			if (!oldEntry) {
				pricesQueryNewCount += 1;
				this.logger.debug(`Price for ${erc.name} not available, trying to fetch`);
				const result = await this.fetchPriceSources(erc);
				if (result == null) pricesQueryNewCountFailed += 1;

				pricesQuery[addr] = {
					...erc,
					source: result?.source || null,
					timestamp: result === null ? 0 : Date.now(),
					price: result === null ? { usd: 0, chf: 0 } : result.price,
				};
			} else if (oldEntry.timestamp + 300_000 < Date.now()) {
				// needs to update => try to fetch
				pricesQueryUpdateCount += 1;
				this.logger.debug(`Price for ${erc.name} out of date, trying to fetch`);
				const result = await this.fetchPriceSources(erc);

				if (result == null) {
					pricesQueryUpdateCountFailed += 1;
				} else {
					pricesQuery[addr] = {
						...erc,
						...oldEntry,
						source: result.source,
						timestamp: Date.now(),
						price: { ...oldEntry.price, ...result.price },
					};
				}
			}
		}

		const updatesCnt = pricesQueryNewCount + pricesQueryUpdateCount;
		const fromNewStr = `from new ${pricesQueryNewCount - pricesQueryNewCountFailed} / ${pricesQueryNewCount}`;
		const fromUpdateStr = `from update ${pricesQueryUpdateCount - pricesQueryUpdateCountFailed} / ${pricesQueryUpdateCount}`;

		if (updatesCnt > 0) this.logger.log(`Prices merging, ${fromNewStr}, ${fromUpdateStr}`);
		this.fetchedPrices = { ...this.fetchedPrices, ...pricesQuery };

		if (pricesQueryUpdateCount > pricesQueryUpdateCountFailed || pricesQueryNewCount > pricesQueryNewCountFailed) {
			this.writeBackupPriceQuery();
		}

		// make chf conversion available
		const frankencoin = ADDRESS[mainnet.id].frankencoin.toLowerCase();
		const zchfPrice = this.fetchedPrices[frankencoin].price.usd;
		for (const addr of Object.keys(this.fetchedPrices)) {
			// break out if zchf price is not available
			if (zchfPrice == undefined) break;

			// calculate chf value for erc token
			if (this.fetchedPrices[addr]?.timestamp > 0) {
				const priceUsd = this.fetchedPrices[addr].price.usd;
				if (priceUsd == undefined) continue;
				const priceChf = Math.round((priceUsd / zchfPrice) * 100) / 100;
				this.fetchedPrices[addr].price.chf = addr === frankencoin ? 1 : priceChf;
			}
		}
	}

	@Cron(CronExpression.EVERY_10_MINUTES)
	async updateMarketChart() {
		this.logger.debug('Updating Market Chart');

		const data = await this.fetchMarketChartCoingecko();
		if (data) this.fetchedMarketChart = data;
	}
}
