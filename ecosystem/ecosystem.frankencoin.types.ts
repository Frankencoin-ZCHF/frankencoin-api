import { ChainId } from '@frankencoin/zchf';
import { PriceQueryCurrencies } from '../prices/prices.types';
import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types

export type EcosystemQuery = {
	id: string;
	value: string;
	amount: bigint;
};
export type EcosystemERC20StatusQuery = {
	chainId: ChainId;
	updated: number;
	supply: bigint;
	burn: bigint;
	mint: bigint;
	balance: bigint;
	token: Address;
};

// --------------------------------------------------------------------------
// Service
export type EcosystemFrankencoinKeyValues = {
	[key: EcosystemQuery['id']]: EcosystemQuery;
};

export type EcosystemFrankencoin = {
	chainId: ChainId;
	updated: number;
	address: Address;
	supply: number;
	counter: {
		balance: number;
		mint: number;
		burn: number;
	};
};

export type EcosystemFrankencoinMapping = {
	[K in ChainId]: EcosystemFrankencoin;
};

// --------------------------------------------------------------------------
// Api
export type ApiEcosystemFrankencoinKeyValues = EcosystemFrankencoinKeyValues;

export type ApiEcosystemFrankencoinInfo = {
	erc20: {
		name: string;
		symbol: string;
		decimals: number;
	};
	chains: EcosystemFrankencoinMapping;
	token: {
		usd: number;
		supply: number;
	};
	fps: {
		price: number;
		totalSupply: number;
		marketCap: number;
	};
	tvl: PriceQueryCurrencies;
};
