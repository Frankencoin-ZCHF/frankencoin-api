import { ChainId } from '@frankencoin/zchf';
import { PriceQueryCurrencies } from '../prices/prices.types';
import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types

export type EcosystemQueryItem = {
	id: string;
	value: string;
	amount: bigint;
};
export type EcosystemERC20StatusQueryItem = {
	chainId: ChainId;
	updated: number;
	supply: bigint;
	burn: number;
	mint: number;
	balance: number;
	token: Address;
};

// --------------------------------------------------------------------------
// Service
export type ServiceEcosystemFrankencoinKeyValues = {
	[key: EcosystemQueryItem['id']]: EcosystemQueryItem;
};

export type ServiceEcosystemFrankencoin = {
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

export type ServiceEcosystemFrankencoinMapping = {
	[K in ChainId]: ServiceEcosystemFrankencoin;
};

// --------------------------------------------------------------------------
// Api
export type ApiEcosystemFrankencoinKeyValues = ServiceEcosystemFrankencoinKeyValues;

export type ApiEcosystemFrankencoinInfo = {
	erc20: {
		name: string;
		symbol: string;
		decimals: number;
	};
	chains: ServiceEcosystemFrankencoinMapping;
	price: {
		usd: number;
	};
	fps: {
		price: number;
		totalSupply: number;
		marketCap: number;
	};
	tvl: PriceQueryCurrencies;
};
