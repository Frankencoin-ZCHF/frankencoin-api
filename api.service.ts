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
import { TransferReferenceService } from 'transfer/transfer.reference.service';
import { Chain } from 'viem';
import { mainnet, polygon } from 'viem/chains';

export const INDEXING_TIMEOUT_COUNT: number = 3;
export const POLLING_DELAY: { [key: Chain['id']]: number } = {
	[mainnet.id]: 2_000, // blocktime: 12s
	[polygon.id]: 6_000, // blocktime: 2s, skip: 6 blks
};

export type IndexerStatus = {
	block: {
		number: number;
		timestamp: number;
	};
	ready: boolean;
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
		private readonly savings: SavingsCoreService,
		private readonly transferRef: TransferReferenceService
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
			this.frankencoin.updateEcosystemMintBurnMapping(),
			this.fps.updateFpsInfo(),
			this.leadrate.updateLeadrateRates(),
			this.leadrate.updateLeadrateProposals(),
			this.savings.updateBalanceTable(),
			this.savings.updateZeroAddressTable(),
			this.challenges.updateChallengeV1s(),
			this.challenges.updateChallengeV2s(),
			this.challenges.updateBidV1s(),
			this.challenges.updateBidV2s(),
			this.challenges.updateChallengesPrices(),
			this.transferRef.updateReferences(),
			this.telegram.updateTelegram(),
		];

		return Promise.all(promises);
	}

	@Interval(POLLING_DELAY[CONFIG.chain.id])
	async updateBlockheight() {
		// block height
		const blockHeight: number = parseInt((await VIEM_CONFIG.getBlockNumber()).toString());

		// get status of indexer
		let statusError = false;
		const statusIndexer = (
			await firstValueFrom(
				this.httpService.get<IndexerStatus>(`${CONFIG.indexer}/status`).pipe(
					catchError((error: AxiosError) => {
						statusError = true;
						this.logger.error(error.response?.data || error.message);
						throw new Error('An error happened!');
					})
				)
			)
		).data;

		// break if indexer is not available
		if (statusError) return;
		else if (statusIndexer[CONFIG.chain.name] == undefined) {
			this.logger.warn(`Could not fetch indexer status`);
			return;
		} else if (!(statusIndexer[CONFIG.chain.name] as IndexerStatus).ready) {
			this.logger.warn(`Indexer not ready...`);
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
