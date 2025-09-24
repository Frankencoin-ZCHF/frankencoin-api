import { ChainId } from '@frankencoin/zchf';
import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types
export type SavingsReferrerMappingQuery = {
	chainId: ChainId;
	module: Address;
	account: Address;
	created: number;
	updated: number;
	referrer: Address;
	referrerFee: number;
};

export type SavingsReferrerEarningsQuery = {
	chainId: ChainId;
	module: Address;
	account: Address;
	created: number;
	updated: number;
	referrer: Address;
	earnings: string;
};

// --------------------------------------------------------------------------
// Service

export type SavingsReferrerMapping = {
	[K in ChainId]: {
		[key: SavingsReferrerEarningsQuery['module']]: {
			[key: SavingsReferrerEarningsQuery['account']]: SavingsReferrerMappingQuery;
		};
	};
};

export type SavingsReferrerEarnings = {
	[K in ChainId]: {
		[key: SavingsReferrerEarningsQuery['module']]: {
			[key: SavingsReferrerEarningsQuery['account']]: number;
		};
	};
};

// --------------------------------------------------------------------------
// Api

export type ApiSavingsReferrerMapping = {
	num: number;
	accounts: Address[];
	map: SavingsReferrerMapping;
};

export type ApiSavingsReferrerEarnings = {
	earnings: SavingsReferrerEarnings;
	chains: {
		[K in ChainId]: number;
	};
	total: number;
};
