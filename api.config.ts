import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { http, createPublicClient, PublicClient } from 'viem';
import { SupportedChainIds, ChainId } from '@frankencoin/zchf';
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from 'viem/chains';

import * as dotenv from 'dotenv';
dotenv.config();

// Verify environment
if (process.env.ALCHEMY_RPC_KEY === undefined) throw new Error('ALCHEMY_RPC_KEY not available');
if (process.env.COINGECKO_API_KEY === undefined) throw new Error('COINGECKO_API_KEY not available');

// Config type
export type ConfigType = {
	app: string;
	indexer: string;
	coingeckoApiKey: string;
	alchemyRpcKey: string;
	supportedChainIds: ChainId[];
};

// Create config
export const CONFIG: ConfigType = {
	app: process.env.CONFIG_APP_URL || 'https://app.frankencoin.com',
	indexer: process.env.CONFIG_INDEXER_URL || 'https://ponder.frankencoin.com',
	coingeckoApiKey: process.env.COINGECKO_API_KEY,
	alchemyRpcKey: process.env.ALCHEMY_RPC_KEY,
	supportedChainIds: SupportedChainIds,
};

// Start up message
console.log(`Starting API with this config:`);
console.log(CONFIG);

// PONDER CLIENT REQUEST
export const PONDER_CLIENT = new ApolloClient({
	uri: CONFIG.indexer,
	cache: new InMemoryCache(),
});

// VIEM CONFIG BY CHAINS
export const ViemConfigMainnet = createPublicClient({
	chain: mainnet,
	transport: http(`https://eth-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigPolygon = createPublicClient({
	chain: polygon,
	transport: http(`https://polygon-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigOptimism = createPublicClient({
	chain: optimism,
	transport: http(`https://opt-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigArbitrum = createPublicClient({
	chain: arbitrum,
	transport: http(`https://arb-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigBase = createPublicClient({
	chain: base,
	transport: http(`https://base-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigAvalanche = createPublicClient({
	chain: avalanche,
	transport: http(`https://avax-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigGnosis = createPublicClient({
	chain: gnosis,
	transport: http(`https://gnosis-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

export const ViemConfigSonic = createPublicClient({
	chain: sonic,
	transport: http(`https://sonic-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

// VIEM CONFIG MERGED
// @dev: The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed.
export const VIEM_CONFIG: Record<number, PublicClient> = {
	[mainnet.id]: ViemConfigMainnet as PublicClient,
	[polygon.id]: ViemConfigPolygon as PublicClient,
	[optimism.id]: ViemConfigOptimism as PublicClient,
	[arbitrum.id]: ViemConfigArbitrum as PublicClient,
	[base.id]: ViemConfigBase as PublicClient,
	[avalanche.id]: ViemConfigAvalanche as PublicClient,
	[gnosis.id]: ViemConfigGnosis as PublicClient,
	[sonic.id]: ViemConfigSonic as PublicClient,
} as const;

// COINGECKO CLIENT
export const COINGECKO_CLIENT = (query: string) => {
	const hasParams = query.includes('?');
	const uri: string = `https://api.coingecko.com${query}`;
	return fetch(`${uri}${hasParams ? '&' : '?'}${CONFIG.coingeckoApiKey}`);
};
