import { ChainId, ChainIdMain } from '@frankencoin/zchf';
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
		symbol: string;
		decimals: number;
	};
	chains: {
		[K in ChainIdMain]: {
			chainId: ChainId;
			address: Address;
		};
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
