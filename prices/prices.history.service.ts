import { Injectable, Logger } from '@nestjs/common';
import { PricesService } from './prices.service';
import { ERC20Info, PriceHistoryRatio, PriceQueryObjectArray } from './prices.types';
import { PriceHistoryQueryObjectArray } from 'exports';
import { Storj } from 'storj/storj.s3.service';
import { HistoryQueryObjectDTO } from './dtos/history.query.dto';
import { Address } from 'viem';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PositionsService } from 'positions/positions.service';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import { formatFloat } from 'utils/format';
import { EcosystemFpsService } from 'ecosystem/ecosystem.fps.service';
import { HistoryRatioObjectDTO } from './dtos/history.ratio.dto';

@Injectable()
export class PricesHistoryService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly storjPath: string = '/prices.history.query.json';
	private readonly storjPathRatio: string = '/prices.history.ratio.json';
	private fetchedHistory: PriceHistoryQueryObjectArray = {};
	private fetchedHistoryRatio: PriceHistoryRatio = {
		timestamp: 0,
		collateralRatioByFreeFloat: {},
		collateralRatioBySupply: {},
	};

	constructor(
		private readonly storj: Storj,
		private readonly prices: PricesService,
		private readonly positions: PositionsService,
		private readonly frankencoin: EcosystemFrankencoinService,
		private readonly equity: EcosystemFpsService
	) {
		this.readBackupHistoryQuery();
		this.readBackupHistoryRatio();
	}

	async readBackupHistoryQuery() {
		this.logger.log(`Reading backup PriceHistoryQueryObject from storj`);
		const response = await this.storj.read(this.storjPath, HistoryQueryObjectDTO);

		if (response.messageError || response.validationError.length > 0) {
			this.logger.error(response.messageError);
		} else {
			this.fetchedHistory = { ...this.fetchedHistory, ...response.data };
			this.logger.log(`PriceHistoryQueryObject state restored...`);
		}
	}
	async readBackupHistoryRatio() {
		this.logger.log(`Reading backup readBackupHistoryRatio from storj`);
		const response = await this.storj.read(this.storjPathRatio, HistoryRatioObjectDTO);

		if (response.messageError || response.validationError.length > 0) {
			this.logger.error(response.messageError);
		} else {
			this.fetchedHistoryRatio = { ...this.fetchedHistoryRatio, ...response.data };
			this.logger.log(`readBackupHistoryRatio state restored...`);
		}
	}

	async writeBackupHistoryQuery() {
		const response = await this.storj.write(this.storjPath, this.fetchedHistory);
		const httpStatusCode = response['$metadata'].httpStatusCode;

		if (httpStatusCode == 200) {
			this.logger.log(`PriceHistoryQueryObject backup stored`);
		} else {
			this.logger.error(`PriceHistoryQueryObject backup failed. httpStatusCode: ${httpStatusCode}`);
		}
	}
	async writeBackupHistoryRatio() {
		const response = await this.storj.write(this.storjPathRatio, this.fetchedHistoryRatio);
		const httpStatusCode = response['$metadata'].httpStatusCode;

		if (httpStatusCode == 200) {
			this.logger.log(`PriceHistoryRatio backup stored`);
		} else {
			this.logger.error(`PriceHistoryRatio backup failed. httpStatusCode: ${httpStatusCode}`);
		}
	}

	getHistory() {
		return this.fetchedHistory;
	}

	getHistoryByContract(contract: Address) {
		return this.fetchedHistory[contract.toLowerCase()];
	}

	getRatio() {
		return this.fetchedHistoryRatio;
	}

	async fetchSources(prices: PriceQueryObjectArray, erc: ERC20Info): Promise<number | null> {
		const contract = erc.address.toLowerCase() as Address;

		const data = prices[contract];
		if (data == undefined || data.timestamp == 0) {
			return null;
		}

		return data.price.chf;
	}

	@Cron(CronExpression.EVERY_HOUR)
	async updateHistory() {
		const timestamp = Date.now();
		await this.updateHistoryPrices({ timestamp });
		await this.updateHistoryRatio({ timestamp });
	}

	async updateHistoryPrices({ timestamp }: { timestamp: number }) {
		this.logger.debug('Updating History Prices');

		const prices = this.prices.getPricesMapping();
		const coll = Object.values(prices);

		if (!coll || coll.length == 0) return;

		const pricesQuery: PriceHistoryQueryObjectArray = {};
		let updatesCnt: number = 0;

		for (const erc of coll) {
			const addr = erc.address.toLowerCase() as Address;
			const oldEntry = this.fetchedHistory[addr];

			if (!oldEntry) {
				this.logger.debug(`History for ${erc.name} not available, trying to fetch`);
				const data = await this.fetchSources(prices, erc);

				if (data != null) {
					updatesCnt += 1;
					pricesQuery[addr] = {
						...erc,
						timestamp,
						price: {
							chf: data,
						},
						history: {
							[timestamp]: data,
						},
					};
				}
			} else {
				// needs to update => try to fetch
				this.logger.debug(`History for ${erc.name} out of date, trying to fetch`);
				const data = await this.fetchSources(prices, erc);

				if (data != null) {
					updatesCnt += 1;
					pricesQuery[addr] = {
						...oldEntry,
						timestamp,
						price: {
							chf: data,
						},
						history: { ...oldEntry.history, [timestamp]: data },
					};
				}
			}
		}

		if (updatesCnt > 0) this.logger.log(`History merging, ${updatesCnt} entries.`);
		this.fetchedHistory = { ...this.fetchedHistory, ...pricesQuery };

		if (updatesCnt > 0) {
			await this.writeBackupHistoryQuery();
		}
	}

	async updateHistoryRatio({ timestamp }: { timestamp: number }) {
		this.logger.debug('Updating History Ratio');

		const supply = this.frankencoin.getEcosystemFrankencoinInfo().token.supply;
		const reserve = this.equity.getEcosystemFpsInfo().reserve.balance;
		const positions = Object.values(this.positions.getPositionsOpen().map);

		const data = positions.map((p) => {
			const key = p.collateral.toLowerCase() as Address;
			return {
				minted: formatFloat(BigInt(p.minted), 18),
				marketPrice: this.fetchedHistory[key].price?.chf || 0,
				liqPrice: formatFloat(BigInt(p.price), 36 - p.collateralDecimals),
			};
		});

		const collMul = data.reduce((a, b) => {
			if (b.liqPrice == 0) return a;
			return a + (b.minted * b.marketPrice) / b.liqPrice;
		}, 0);

		this.fetchedHistoryRatio.timestamp = timestamp;
		this.fetchedHistoryRatio.collateralRatioBySupply = {
			...this.fetchedHistoryRatio.collateralRatioBySupply,
			[timestamp]: collMul / supply,
		};
		this.fetchedHistoryRatio.collateralRatioByFreeFloat = {
			...this.fetchedHistoryRatio.collateralRatioByFreeFloat,
			[timestamp]: collMul / (supply - reserve),
		};

		this.writeBackupHistoryRatio();
	}
}
