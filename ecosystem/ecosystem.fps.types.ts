// --------------------------------------------------------------------------
// Ponder return types

// --------------------------------------------------------------------------
// Service

// --------------------------------------------------------------------------
// Api
export type ApiEcosystemFpsInfo = {
	earnings: {
		profit: number;
		loss: number;
	};
	values: {
		price: number;
		totalSupply: number;
		fpsMarketCapInChf: number;
	};
	raw: {
		price: string;
		totalSupply: string;
	};
};
