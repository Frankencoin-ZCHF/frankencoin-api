// --------------------------------------------------------------------------
// Ponder return types

import { Address } from 'viem';

// --------------------------------------------------------------------------
// Service
export type AnalyticsExposureItem = {
	collateral: {
		address: Address;
		chainId: number;
		name: string;
		symbol: string;
	};
	positions: {
		open: number;
		originals: number;
		clones: number;
	};
	mint: {
		totalMinted: number;
		totalContribution: number;
		totalLimit: number;
		totalMintedRatio: number;
		interestAverage: number;
		totalTheta: number;
		thetaPerFpsToken: number;
	};
	reserveRiskWiped: {
		fpsPrice: number;
		riskRatio: number;
	};
};

export type AnalyticsProfitLossLog = {
	chainId: number;
	minter: Address;
	created: number;
	count: number;
	kind: string;
	amount: bigint;
	profits: bigint;
	losses: bigint;
	perFPS: bigint;
};

export type AnalyticsTransactionLog = {
	chainId: number;
	count: number;
	timestamp: string;
	kind: string;
	amount: bigint;
	txHash: string;

	totalInflow: bigint;
	totalOutflow: bigint;
	totalTradeFee: bigint;

	totalSupply: bigint;
	totalEquity: bigint;
	totalSavings: bigint;

	fpsTotalSupply: bigint;
	fpsPrice: bigint;

	totalMintedV1: bigint;
	totalMintedV2: bigint;

	currentLeadRate: bigint;
	claimableInterests: bigint;
	projectedInterests: bigint;

	annualV1Interests: bigint;
	annualV2Interests: bigint;
	annualV1BorrowRate: bigint;
	annualV2BorrowRate: bigint;

	annualNetEarnings: bigint;
	realizedNetEarnings: bigint;
	earningsPerFPS: bigint;
};

export type AnalyticsDailyLog = {
	date: string;
	timestamp: string;
	txHash: string;

	totalInflow: bigint;
	totalOutflow: bigint;
	totalTradeFee: bigint;

	totalSupply: bigint;
	totalEquity: bigint;
	totalSavings: bigint;

	fpsTotalSupply: bigint;
	fpsPrice: bigint;

	totalMintedV1: bigint;
	totalMintedV2: bigint;

	currentLeadRate: bigint;
	claimableInterests: bigint;
	projectedInterests: bigint;

	annualV1Interests: bigint;
	annualV2Interests: bigint;
	annualV1BorrowRate: bigint;
	annualV2BorrowRate: bigint;

	annualNetEarnings: bigint;
	realizedNetEarnings: bigint;
	earningsPerFPS: bigint;
};

// --------------------------------------------------------------------------
// Api
export type ApiAnalyticsProfitLossLog = {
	num: number;
	logs: AnalyticsProfitLossLog[];
};

export type ApiAnalyticsCollateralExposure = {
	general: {
		balanceInReserve: number;
		mintersContribution: number;
		equityInReserve: number;
		fpsPrice: number;
		fpsTotalSupply: number;
		thetaFromPositions: number;
		thetaPerToken: number;
		earningsPerAnnum: number;
		earningsPerToken: number;
		priceToEarnings: number;
		priceToBookValue: number;
	};
	exposures: AnalyticsExposureItem[];
};

export type ApiAnalyticsFpsEarnings = {
	investFees: number;
	redeemFees: number;
	minterProposalFees: number;
	positionProposalFees: number;
	otherProfitClaims: number;
	otherContributions: number;

	// loss or costs
	savingsInterestCosts: number;
	otherLossClaims: number;
};

export type ApiTransactionLog = {
	num: number;
	logs: AnalyticsTransactionLog[];
	pageInfo: {
		startCursor: string;
		endCursor: string;
		hasNextPage: boolean;
	};
};

export type ApiDailyLog = {
	num: number;
	logs: AnalyticsDailyLog[];
};
