import { ChainId } from '@frankencoin/zchf';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { VIEM_CONFIG } from 'api.config';
import { ChallengesService } from 'challenges/challenges.service';
import { EcosystemFpsService } from 'ecosystem/ecosystem.fps.service';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import { EcosystemMinterService } from 'ecosystem/ecosystem.minter.service';
import { PositionsService } from 'positions/positions.service';
import { PricesService } from 'prices/prices.service';
import { SavingsCoreService } from 'savings/savings.core.service';
import { SavingsLeadrateService } from 'savings/savings.leadrate.service';
import { TelegramService } from 'telegram/telegram.service';
import { TransferReferenceService } from 'transfer/transfer.reference.service';
import { IndexerHealthService } from 'data-source/indexer-health.service';
import { mainnet } from 'viem/chains';

export const INDEXING_TIMEOUT_COUNT: number = 3;
export const POLLING_DELAY: number = 3_000; // 3000ms (= 3sec)
export const BLOCK_HEIGHT_TOLERANCE: number = 2; // Allow indexer to be up to 2 blocks behind

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
		private readonly minter: EcosystemMinterService,
		private readonly positions: PositionsService,
		private readonly prices: PricesService,
		private readonly frankencoin: EcosystemFrankencoinService,
		private readonly fps: EcosystemFpsService,
		private readonly challenges: ChallengesService,
		private readonly telegram: TelegramService,
		private readonly leadrate: SavingsLeadrateService,
		private readonly savings: SavingsCoreService,
		private readonly transferRef: TransferReferenceService,
		private readonly indexerHealth: IndexerHealthService
	) {
		setTimeout(() => this.updateBlockheight(), 100);
	}

	async updateWorkflow() {
		this.logger.log(`Fetching blockheight: ${this.fetchedBlockheight}`);
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
			this.savings.updateSavingsRank(),
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

	@Interval(POLLING_DELAY)
	async updateBlockheight() {
		// Get blockchain block height
		const blockHeight: number = parseInt((await VIEM_CONFIG[mainnet.id].getBlockNumber()).toString());

		// Check health of both indexers
		const { primary, backup } = await this.indexerHealth.checkBothIndexers();

		// Determine which indexer to use
		const currentSource = this.indexerHealth.determineDataSource();

		// Get the active indexer status
		const activeIndexer = currentSource === 'primary' ? primary : backup;

		if (!activeIndexer || !activeIndexer.isHealthy) {
			this.logger.warn('No healthy indexer available');
			return;
		}

		// Check if indexer is caught up with blockchain (with tolerance)
		const indexerBlockNumber = Number(activeIndexer.blockNumber);
		const blockDifference = blockHeight - indexerBlockNumber;
		if (blockDifference > BLOCK_HEIGHT_TOLERANCE) {
			this.logger.warn(
				`Indexer is not ready (blockchain: ${blockHeight}, indexer: ${indexerBlockNumber}, lag: ${blockDifference} blocks)`
			);
			return;
		}

		// Run update workflow
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
