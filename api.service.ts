import { ChainId } from '@frankencoin/zchf';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CONFIG, VIEM_CONFIG } from 'api.config';
import { AxiosError } from 'axios';
import { ChallengesService } from 'challenges/challenges.service';
import { EcosystemFpsService } from 'ecosystem/ecosystem.fps.service';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import { EcosystemMinterService } from 'ecosystem/ecosystem.minter.service';
import { PositionsService } from 'positions/positions.service';
import { PricesService } from 'prices/prices.service';
import { catchError, firstValueFrom } from 'rxjs';
import { SavingsCoreService } from 'savings/savings.core.service';
import { SavingsLeadrateService } from 'savings/savings.leadrate.service';
import { TelegramService } from 'telegram/telegram.service';
// import { TransferReferenceService } from 'transfer/transfer.reference.service';
import { mainnet } from 'viem/chains';

export const INDEXING_TIMEOUT_COUNT: number = 3;
export const POLLING_DELAY: number = 2_000; // 2000ms (= 2sec)

export type IndexerStatus = {
	id: ChainId;
	block: {
		number: number;
		timestamp: number;
	};
};
export type IndexerStatusObject = {
	[key: string]: IndexerStatus;
};

@Injectable()
export class ApiService {
	private readonly logger = new Logger(this.constructor.name);
	private indexing: boolean = false;
	private indexingTimeoutCount: number = 0;
	private fetchedBlockheight: number = 0;

	constructor(
		private readonly httpService: HttpService,
		private readonly minter: EcosystemMinterService,
		private readonly positions: PositionsService,
		private readonly prices: PricesService,
		private readonly frankencoin: EcosystemFrankencoinService,
		private readonly fps: EcosystemFpsService,
		private readonly challenges: ChallengesService,
		private readonly telegram: TelegramService,
		private readonly leadrate: SavingsLeadrateService,
		private readonly savings: SavingsCoreService
		// private readonly transferRef: TransferReferenceService
	) {
		setTimeout(() => this.updateBlockheight(), 100);
	}

	async updateWorkflow() {
		this.logger.log(`Fetched blockheight: ${this.fetchedBlockheight}`);
		const promises = [
			this.minter.updateMinters(),
			this.positions.updatePositonV1s(),
			this.positions.updatePositonV2s(),
			this.positions.updateMintingUpdateV1s(),
			this.positions.updateMintingUpdateV2s(),
			this.prices.updatePrices(),
			this.frankencoin.updateEcosystemKeyValues(),
			this.frankencoin.updateEcosystemERC20Status(),
			this.fps.updateFpsInfo(),
			this.leadrate.updateLeadrateRates(),
			this.leadrate.updateLeadrateProposals(),
			this.savings.updateSavingsStatus(),
			this.savings.updateSavingsBalance(),
			this.savings.updateSavingsActivity(),
			this.challenges.updateChallengeV1s(),
			this.challenges.updateChallengeV2s(),
			this.challenges.updateBidV1s(),
			this.challenges.updateBidV2s(),
			this.challenges.updateChallengesPrices(),
			// this.transferRef.updateReferences(),
			this.telegram.updateTelegram(),
		];

		return Promise.all(promises);
	}

	@Interval(POLLING_DELAY)
	async updateBlockheight() {
		// block height
		const blockHeight: number = parseInt((await VIEM_CONFIG[mainnet.id].getBlockNumber()).toString());

		// get status of indexer
		let statusError = false;
		const statusIndexer = (
			await firstValueFrom(
				this.httpService.get<IndexerStatus>(`${CONFIG.indexer}/status`).pipe(
					catchError((error: AxiosError) => {
						statusError = true;
						this.logger.error(error.response?.data || error.message);
						throw new Error('Could not reach indexer status');
					})
				)
			)
		).data;

		// break if indexer is not available
		if (statusError) return;
		else if (statusIndexer[mainnet.name] == undefined) {
			this.logger.warn(`Could not fetch indexer status`);
			return;
		} else if (blockHeight > (statusIndexer[mainnet.name] as IndexerStatus).block.number) {
			this.logger.warn(`Indexer is not ready...`);
			return;
		}

		this.indexingTimeoutCount += 1;
		if (blockHeight > this.fetchedBlockheight && !this.indexing) {
			this.indexing = true;
			await this.updateWorkflow();
			this.indexingTimeoutCount = 0;
			this.fetchedBlockheight = blockHeight;
			this.indexing = false;
		}
		if (this.indexingTimeoutCount >= INDEXING_TIMEOUT_COUNT && this.indexing) {
			this.indexingTimeoutCount = 0;
			this.indexing = false;
		}
	}
}
