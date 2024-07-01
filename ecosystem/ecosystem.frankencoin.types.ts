// --------------------------------------------------------------------------

import { Address } from 'viem';

// Ponder return types
export type EcosystemQueryItem = {
	id: string;
	value: string;
	amount: bigint;
};

export type EcosystemMintQueryItem = {
	id: string;
	to: string;
	value: bigint;
	blockheight: bigint;
	timestamp: bigint;
};

export type EcosystemBurnQueryItem = {
	id: string;
	from: string;
	value: bigint;
	blockheight: bigint;
	timestamp: bigint;
};

export type MintBurnAddressMapperQueryItem = {
	id: Address;
	mint: number;
	burn: number;
};

// --------------------------------------------------------------------------
export type ServiceEcosystemFrankencoin = {
	raw: {
		mint: string;
		burn: string;
	};
	total: {
		mint: number;
		burn: number;
		supply: number;
	};
	counter: {
		mint: number;
		burn: number;
	};
};

export type ServiceEcosystemMintBurnMapping = {
	[key: Address]: { mint: number; burn: number };
};

// --------------------------------------------------------------------------
export type ApiEcosystemFrankencoinInfo = ServiceEcosystemFrankencoin & {
	erc20: {
		name: string;
		address: Address;
		symbol: string;
		decimals: number;
	};
	chain: {
		name: string;
		id: number;
	};
	price: {
		usd: number;
	};
};

export type ApiEcosystemMintBurnMapping = {
	num: number;
	map: {
		[key: Address]: { mint: number; burn: number };
	};
};
