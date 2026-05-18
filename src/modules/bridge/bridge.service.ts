import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from 'app.config';
import {
	ApiCCIPChain,
	ApiCCIPChains,
	ApiCCIPProposal,
	ApiCCIPProposals,
	CCIPAdminChainQuery,
	CCIPAdminProposalQuery,
} from './bridge.types';

@Injectable()
export class BridgeService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedProposals: ApiCCIPProposal[] = [];
	private fetchedChains: ApiCCIPChain[] = [];

	getProposals(): ApiCCIPProposals {
		return { list: this.fetchedProposals };
	}

	getPendingProposals(): ApiCCIPProposal[] {
		return this.fetchedProposals.filter((p) => p.status === 'Pending');
	}

	getDeniedProposals(): ApiCCIPProposal[] {
		return this.fetchedProposals.filter((p) => p.deniedAt !== null);
	}

	getEnactedProposals(): ApiCCIPProposal[] {
		return this.fetchedProposals.filter((p) => p.enactedAt !== null);
	}

	getChains(): ApiCCIPChains {
		return { list: this.fetchedChains };
	}

	async updateProposals() {
		this.logger.debug('Updating CCIP proposals');

		const response = await PONDER_CLIENT.query<{
			CCIPAdminProposals: { items: CCIPAdminProposalQuery[] };
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					CCIPAdminProposals(orderBy: "created", orderDirection: "desc", limit: 1000) {
						items {
							chainId
							hash
							proposer
							type
							deadline
							status
							details
							created
							deniedAt
							enactedAt
						}
					}
				}
			`,
		});

		if (!response.data?.CCIPAdminProposals?.items) {
			this.logger.warn('No CCIPAdminProposals data found.');
			return;
		}

		this.fetchedProposals = response.data.CCIPAdminProposals.items.map((r) => ({
			chainId: r.chainId,
			hash: r.hash,
			proposer: r.proposer,
			type: r.type,
			deadline: parseInt(r.deadline as any),
			status: r.status,
			details: r.details,
			created: parseInt(r.created as any),
			deniedAt: r.deniedAt !== null ? parseInt(r.deniedAt as any) : null,
			enactedAt: r.enactedAt !== null ? parseInt(r.enactedAt as any) : null,
		}));
	}

	async updateChains() {
		this.logger.debug('Updating CCIP chains');

		const response = await PONDER_CLIENT.query<{
			CCIPAdminChains: { items: CCIPAdminChainQuery[] };
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					CCIPAdminChains(limit: 1000) {
						items {
							chainId
							remoteChainSelector
							active
							remoteTokenAddress
							outboundEnabled
							outboundCapacity
							outboundRate
							inboundEnabled
							inboundCapacity
							inboundRate
							rateLimitUpdatedAt
						}
					}
				}
			`,
		});

		if (!response.data?.CCIPAdminChains?.items) {
			this.logger.warn('No CCIPAdminChains data found.');
			return;
		}

		this.fetchedChains = response.data.CCIPAdminChains.items.map((r) => ({
			...r,
			rateLimitUpdatedAt: r.rateLimitUpdatedAt !== null ? parseInt(r.rateLimitUpdatedAt as any) : null,
		}));
	}
}
