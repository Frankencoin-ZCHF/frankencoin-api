import { Injectable, Logger } from '@nestjs/common';
import { PricesService } from './prices.service';
import { ERC20Info, PriceMarketChartObject } from './prices.types';
import { COINGECKO_CLIENT } from 'api.config';
import { PriceHistoryQueryObjectArray } from 'exports';
import { Storj } from 'storj/storj.s3.service';
import { HistoryQueryObjectDTO } from './dtos/history.query.dto';
import { Address } from 'viem';

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

	async fetchSourcesCoingecko(network: string, erc: ERC20Info): Promise<PriceMarketChartObject | null> {
		const contract = erc.address.toLowerCase();
		network = network.toLowerCase();

		const url = `/api/v3/coins/${network}/contract/${contract}/market_chart?vs_currency=chf&days=365`;

		const data = await (await COINGECKO_CLIENT(url)).json();
		if (data.status) {
			this.logger.debug(data.status?.error_message || 'Error fetching market chart from coingecko');
			return null;
		}

		return data as PriceMarketChartObject;
	}

	async updateHistory() {
		this.logger.debug('Updating Prices History');

		const coll = Object.values(this.prices.getCollateral());

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
				this.logger.debug(`History for ${erc.name} not available, trying to fetch from coingecko`);
				const data = await this.fetchSourcesCoingecko('ethereum', erc);

				if (data == null) {
					pricesQueryNewCountFailed += 1;
				} else {
					const map: PriceHistoryQueryObjectArray[Address]['history'] = {};
					data?.prices?.forEach((i) => (map[i[0]] = i[1]));

					pricesQuery[addr] = {
						...erc,
						timestamp: data === null ? 0 : Date.now(),
						history: data === null ? {} : map,
					};
				}
			} else if (oldEntry.timestamp + 30 * 60_000 < Date.now()) {
				// needs to update => try to fetch
				pricesQueryUpdateCount += 1;
				this.logger.debug(`History for ${erc.name} out of date, trying to fetch from coingecko`);
				const data = await this.fetchSourcesCoingecko('ethereum', erc);

				if (data == null) {
					pricesQueryUpdateCountFailed += 1;
				} else {
					const map: PriceHistoryQueryObjectArray[Address]['history'] = {};
					data?.prices?.forEach((i) => (map[i[0]] = i[1]));
					pricesQuery[addr] = {
						...oldEntry,
						timestamp: Date.now(),
						history: { ...oldEntry.history, ...map },
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
