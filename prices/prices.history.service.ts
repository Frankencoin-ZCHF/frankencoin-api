import { Injectable, Logger } from '@nestjs/common';
import { PricesService } from './prices.service';
import { ERC20Info, PriceHistoryRatio, PriceQueryObjectArray } from './prices.types';
import { PriceHistoryQueryObjectArray } from 'exports';
import { PrismaService } from 'database/prisma.service';
import { Address } from 'viem';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PositionsService } from 'positions/positions.service';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import { formatFloat } from 'utils/format';
import { EcosystemFpsService } from 'ecosystem/ecosystem.fps.service';
import { VIEM_CONFIG } from 'api.config';
import { mainnet } from 'viem/chains';
import { ADDRESS, StablecoinBridgeABI } from '@frankencoin/zchf';

@Injectable()
export class PricesHistoryService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedHistory: PriceHistoryQueryObjectArray = {};
	private fetchedHistoryRatio: PriceHistoryRatio = {
		timestamp: 0,
		collateralRatioByFreeFloat: {},
		collateralRatioBySupply: {},
	};

	constructor(
		private readonly prisma: PrismaService,
		private readonly prices: PricesService,
		private readonly positions: PositionsService,
		private readonly frankencoin: EcosystemFrankencoinService,
		private readonly equity: EcosystemFpsService
	) {
		this.readBackupHistoryQuery();
		this.readBackupHistoryRatio();
	}

	async readBackupHistoryQuery() {
		if (!this.prisma.isEnabled()) {
			this.logger.warn('Database disabled, skipping price history restoration');
			return;
		}

		this.logger.log(`Reading backup price history from database`);

		try {
			// Read all price history rows
			const records = await this.prisma.priceHistory.findMany({
				orderBy: { timestamp: 'asc' },
			});

			if (records.length === 0) {
				this.logger.warn('No price history found in database');
				return;
			}

			// Transform from DB format to in-memory format
			// DB: { timestamp: xxx, prices: { address: price } }
			// Memory: { address: { history: { timestamp: price } } }
			const history: PriceHistoryQueryObjectArray = {};

			for (const record of records) {
				const timestamp = Number(record.timestamp);
				const prices = record.prices as { [address: string]: number };

				for (const [address, price] of Object.entries(prices)) {
					const addr = address.toLowerCase() as Address;
					if (!history[addr]) {
						history[addr] = {
							address: addr,
							timestamp,
							price: { chf: price },
							history: {},
						} as any;
					}
					history[addr].history[timestamp] = price;
					history[addr].timestamp = Math.max(history[addr].timestamp, timestamp);
					history[addr].price.chf = price; // Keep latest price
				}
			}

			this.fetchedHistory = { ...this.fetchedHistory, ...history };
			this.logger.log(`Price history state restored from database (${records.length} timestamps)`);
		} catch (error) {
			this.logger.error('Failed to read price history from database', error);
		}
	}

	async readBackupHistoryRatio() {
		if (!this.prisma.isEnabled()) {
			this.logger.warn('Database disabled, skipping ratio history restoration');
			return;
		}

		this.logger.log(`Reading backup ratio history from database`);

		try {
			const records = await this.prisma.priceHistoryRatio.findMany({
				orderBy: { timestamp: 'asc' },
			});

			if (records.length === 0) {
				this.logger.warn('No ratio history found in database');
				return;
			}

			const collateralRatioByFreeFloat: { [timestamp: number]: number } = {};
			const collateralRatioBySupply: { [timestamp: number]: number } = {};
			let latestTimestamp = 0;

			for (const record of records) {
				const timestamp = Number(record.timestamp);
				collateralRatioByFreeFloat[timestamp] = record.collateralRatioByFreeFloat;
				collateralRatioBySupply[timestamp] = record.collateralRatioBySupply;
				latestTimestamp = Math.max(latestTimestamp, timestamp);
			}

			this.fetchedHistoryRatio = {
				timestamp: latestTimestamp,
				collateralRatioByFreeFloat,
				collateralRatioBySupply,
			};

			this.logger.log(`Ratio history state restored from database (${records.length} timestamps)`);
		} catch (error) {
			this.logger.error('Failed to read ratio history from database', error);
		}
	}

	async writeBackupHistoryQuery() {
		if (!this.prisma.isEnabled()) {
			return;
		}

		try {
			// Get all unique timestamps across all addresses
			const timestamps = new Set<number>();
			for (const entry of Object.values(this.fetchedHistory)) {
				for (const ts of Object.keys(entry.history)) {
					timestamps.add(Number(ts));
				}
			}

			// Write each timestamp as a separate row
			for (const timestamp of timestamps) {
				const prices: { [address: string]: number } = {};

				// Collect all prices for this timestamp
				for (const [address, entry] of Object.entries(this.fetchedHistory)) {
					if (entry.history[timestamp] !== undefined) {
						prices[address] = entry.history[timestamp];
					}
				}

				// Upsert the record
				await this.prisma.priceHistory.upsert({
					where: { timestamp: BigInt(timestamp) },
					create: {
						timestamp: BigInt(timestamp),
						prices: prices,
					},
					update: {
						prices: prices,
					},
				});
			}

			this.logger.log(`Price history backup stored to database (${timestamps.size} timestamps)`);
		} catch (error) {
			this.logger.error('Failed to write price history to database', error);
		}
	}

	async writeBackupHistoryRatio() {
		if (!this.prisma.isEnabled()) {
			return;
		}

		try {
			// Write all ratio entries
			const timestamps = Object.keys(this.fetchedHistoryRatio.collateralRatioByFreeFloat);

			for (const ts of timestamps) {
				const timestamp = Number(ts);
				const freeFloat = this.fetchedHistoryRatio.collateralRatioByFreeFloat[timestamp];
				const supply = this.fetchedHistoryRatio.collateralRatioBySupply[timestamp];

				if (freeFloat === undefined || supply === undefined) continue;

				await this.prisma.priceHistoryRatio.upsert({
					where: { timestamp: BigInt(timestamp) },
					create: {
						timestamp: BigInt(timestamp),
						collateralRatioByFreeFloat: freeFloat,
						collateralRatioBySupply: supply,
					},
					update: {
						collateralRatioByFreeFloat: freeFloat,
						collateralRatioBySupply: supply,
					},
				});
			}

			this.logger.log(`Ratio history backup stored to database (${timestamps.length} timestamps)`);
		} catch (error) {
			this.logger.error('Failed to write ratio history to database', error);
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

		const positionData = positions.map((p) => {
			const key = p.collateral.toLowerCase() as Address;
			return {
				minted: formatFloat(BigInt(p.minted), 18),
				marketPrice: this.fetchedHistory[key].price?.chf || 0,
				liqPrice: formatFloat(BigInt(p.price), 36 - p.collateralDecimals),
			};
		});

		const stablecoinBridgeVCHF = ADDRESS[mainnet.id].stablecoinBridgeVCHF.toLowerCase() as Address;
		const stablecoinBridges = [
			{
				minted: formatFloat(
					await VIEM_CONFIG[mainnet.id].readContract({
						address: stablecoinBridgeVCHF,
						abi: StablecoinBridgeABI,
						functionName: 'minted',
					}),
					18
				),
				marketPrice: this.fetchedHistory[stablecoinBridgeVCHF]?.price?.chf || 0,
				liqPrice: 1,
			},
		];

		const data = [...positionData, ...stablecoinBridges];

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
