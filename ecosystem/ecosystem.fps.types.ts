import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types

// --------------------------------------------------------------------------
// Service

// --------------------------------------------------------------------------
// Api
export type ApiEcosystemFpsInfo = {
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
	token: {
		price: number;
		totalSupply: number;
		marketCap: number;
	};
	earnings: {
		profit: number;
		loss: number;
	};
	reserve: {
		balance: number;
		equity: number;
		minter: number;
	};
};
