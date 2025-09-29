import { Injectable, Logger } from '@nestjs/common';
import { PricesService } from './prices.service';
import { ERC20Info, PriceQueryObjectArray } from './prices.types';
import { PriceHistoryQueryObjectArray } from 'exports';
import { Storj } from 'storj/storj.s3.service';
import { HistoryQueryObjectDTO } from './dtos/history.query.dto';
import { Address } from 'viem';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PricesHistoryService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly storjPath: string = '/prices.history.query.json';
	private fetchedHistory: PriceHistoryQueryObjectArray = {};

	constructor(
		private readonly storj: Storj,
		private readonly prices: PricesService
	) {
		this.readBackupHistoryQuery();
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

	async writeBackupHistoryQuery() {
		const response = await this.storj.write(this.storjPath, this.fetchedHistory);
		const httpStatusCode = response['$metadata'].httpStatusCode;

		if (httpStatusCode == 200) {
			this.logger.log(`PriceHistoryQueryObject backup stored`);
		} else {
			this.logger.error(`PriceHistoryQueryObject backup failed. httpStatusCode: ${httpStatusCode}`);
		}
	}

	getHistory() {
		return this.fetchedHistory;
	}

	getHistoryByContract(contract: Address) {
		return this.fetchedHistory[contract.toLowerCase()];
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
		this.logger.debug('Updating Prices History');

		const prices = this.prices.getPricesMapping();
		const coll = Object.values(prices);
		const timestamp = Date.now();

		if (!coll || coll.length == 0) return;

		const pricesQuery: PriceHistoryQueryObjectArray = {};
		let pricesQueryNewCount: number = 0;
		let pricesQueryNewCountFailed: number = 0;
		let pricesQueryUpdateCount: number = 0;
		let pricesQueryUpdateCountFailed: number = 0;

		for (const erc of coll) {
			const addr = erc.address.toLowerCase() as Address;
			const oldEntry = this.fetchedHistory[addr];

			if (!oldEntry) {
				pricesQueryNewCount += 1;
				this.logger.debug(`History for ${erc.name} not available, trying to fetch`);
				const data = await this.fetchSources(prices, erc);

				if (data == null) {
					pricesQueryNewCountFailed += 1;
					pricesQuery[addr] = {
						...erc,
						timestamp: 0,
						history: {},
					};
				} else {
					pricesQuery[addr] = {
						...erc,
						timestamp,
						history: {
							[timestamp]: data,
						},
					};
				}
			} else {
				// needs to update => try to fetch
				pricesQueryUpdateCount += 1;
				this.logger.debug(`History for ${erc.name} out of date, trying to fetch`);
				const data = await this.fetchSources(prices, erc);

				if (data == null) {
					pricesQueryUpdateCountFailed += 1;
				} else {
					pricesQuery[addr] = {
						...oldEntry,
						timestamp,
						history: { ...oldEntry.history, [timestamp]: data },
					};
				}
			}
		}

		const updatesCnt = pricesQueryNewCount + pricesQueryUpdateCount;
		const fromNewStr = `from new ${pricesQueryNewCount - pricesQueryNewCountFailed} / ${pricesQueryNewCount}`;
		const fromUpdateStr = `from update ${pricesQueryUpdateCount - pricesQueryUpdateCountFailed} / ${pricesQueryUpdateCount}`;

		if (updatesCnt > 0) this.logger.log(`History merging, ${fromNewStr}, ${fromUpdateStr}`);
		this.fetchedHistory = { ...this.fetchedHistory, ...pricesQuery };

		if (pricesQueryUpdateCount > pricesQueryUpdateCountFailed || pricesQueryNewCount > pricesQueryNewCountFailed) {
			this.writeBackupHistoryQuery();
		}
	}
}
