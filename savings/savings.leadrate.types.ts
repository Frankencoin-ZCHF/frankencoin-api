import { ChainId } from '@frankencoin/zchf';
import { Address } from 'viem';
// --------------------------------------------------------------------------
// Ponder return types
export type LeadrateRateQuery = {
	chainId: ChainId;
	created: number;
	count: number;
	blockheight: number;
	module: Address;
	approvedRate: number;
	txHash: string;
};

export type LeadrateProposedQuery = {
	chainId: ChainId;
	created: number;
	count: number;
	blockheight: number;
	module: Address;
	txHash: string;
	proposer: Address;
	nextRate: number;
	nextChange: number;
};

// --------------------------------------------------------------------------
// Service
export type LeadrateRateMapping = {
	[K in ChainId]: {
		[key: LeadrateRateQuery['module']]: LeadrateRateQuery[];
	};
};

export type LeadrateProposedMapping = {
	[K in ChainId]: {
		[L in LeadrateProposedQuery['module']]: LeadrateProposedQuery[];
	};
};

// --------------------------------------------------------------------------
// Api
export type ApiLeadrateInfo = {
	rate: ApiLeadrateRate['rate'];
	proposed: ApiLeadrateProposed['proposed'];
	open: {
		[K in ChainId]: {
			[L in LeadrateRateQuery['module']]: {
				currentRate: number;
				nextRate: number;
				nextChange: number;
				isPending: boolean;
			};
		};
	};
};

export type ApiLeadrateRate = {
	rate: {
		[K in ChainId]: {
			[L in LeadrateRateQuery['module']]: LeadrateRateQuery;
		};
	};
	list: LeadrateRateMapping;
};

export type ApiLeadrateProposed = {
	proposed: {
		[K in ChainId]: {
			[L in LeadrateProposedQuery['module']]: LeadrateProposedQuery;
		};
	};
	list: LeadrateProposedMapping;
};
