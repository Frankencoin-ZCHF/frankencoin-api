import { ChainId } from '@frankencoin/zchf';
import { Address } from 'viem';

// --------------------------------------------------------------------------
// Api

export type ApiFcsInfo = {
	erc20: {
		name: string;
		symbol: string;
		decimals: number;
	};
	chain: {
		chainId: ChainId;
		address: Address;
	};
	token: {
		ask: number;
		bid: number;
		totalAssets: number;
		totalSupply: number;
		isBinding: boolean;
	};
};

export type ApiFcsDiscount = {
	// marginal discount factor for a redemption right now: 1 = no discount, 0 = fully discounted
	discount: number;
	// raw FPS1 shares (18 decimals), as string to preserve precision
	recentlyRedeemed: string;
	weightedRecentRedemptions: string;
	// unix seconds
	redemptionAnchor: number;
	recoveryPeriodSeconds: number;
	// seconds remaining until weightedRecentRedemptions decays back to 0, floored at 0
	recoveryCountdownSeconds: number;
};

export type FcsFeeDaily = {
	date: string;
	timestamp: string;
	amount: string;
	count: string;
};

export type ApiFcsFees = {
	num: number;
	// sum of all daily fees in ZCHF
	total: number;
	days: {
		date: string;
		timestamp: number;
		// fee paid into Equity on this day, in ZCHF
		amount: number;
		// number of withdrawals that paid a non-zero fee
		count: number;
	}[];
};
