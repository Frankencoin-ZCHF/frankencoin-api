import { ChainId } from '@frankencoin/zchf';
import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types
export type SavingsStatusQuery = {
	chainId: ChainId;
	updated: number;
	module: Address;
	balance: string;
	interest: string;
	save: string;
	withdraw: string;
	rate: number;
	counterInterest: number;
	counterRateChanged: number;
	counterRateProposed: number;
	counterSave: number;
	counterWithdraw: number;
};

export type SavingsBalancesQuery = {
	chainId: ChainId;
	account: Address;
	module: Address;
	balance: string;
	created: number;
	updated: number;
	interest: string;
	save: string;
	withdraw: string;
	counterInterest: number;
	counterSave: number;
	counterWithdraw: number;
};

export type SavingsActivityQuery = {
	chainId: ChainId;
	account: Address;
	module: Address;
	created: number;
	blockheight: number;
	count: number;
	balance: string;
	save: string;
	interest: string;
	withdraw: string;
	kind: string;
	amount: string;
	rate: number;
	txHash: string;
};

// --------------------------------------------------------------------------
// Service

export type SavingsStatus = {
	chainId: ChainId;
	updated: number;
	module: Address;
	balance: string;
	interest: string;
	save: string;
	withdraw: string;
	rate: number;
	counter: {
		interest: number;
		rateChanged: number;
		rateProposed: number;
		save: number;
		withdraw: number;
	};
};

export type SavingsStatusMapping = {
	[K in ChainId]: {
		[key: SavingsStatus['module']]: SavingsStatus;
	};
};

export type SavingsBalances = {
	chainId: ChainId;
	account: Address;
	module: Address;
	balance: string;
	created: number;
	updated: number;
	interest: string;
	save: string;
	withdraw: string;
	counter: {
		save: number;
		interest: number;
		withdraw: number;
	};
};

export type SavingsBalancesChainIdMapping = {
	[K in ChainId]: {
		[key in SavingsBalances['module'] | SavingsBalancesQuery['module']]: SavingsBalances;
	};
};

export type SavingsBalancesAccountMapping = {
	[key in SavingsBalances['account'] | SavingsBalancesQuery['account']]: SavingsBalancesChainIdMapping;
};

// --------------------------------------------------------------------------
// Api
export type ApiSavingsInfo = {
	status: SavingsStatusMapping;
	totalBalance: number;
	ratioOfSupply: number;
};

export type ApiSavingsBalances = SavingsBalancesAccountMapping;

export type ApiSavingsRanked = {
	[key in SavingsBalances['account']]: number;
};

export type ApiSavingsActivity = SavingsActivityQuery[];
