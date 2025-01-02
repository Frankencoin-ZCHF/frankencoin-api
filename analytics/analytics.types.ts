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
	id: string;
	timestamp: string;
	kind: string;
	amount: bigint;
};

export type AnalyticsTransactionLog = {
	id: string;
	timestamp: string;
	kind: string;
	amount: bigint;

	totalInflow: bigint;
	totalOutflow: bigint;
	totalTradeFee: bigint;

	totalSupply: bigint;
	totalEquity: bigint;
	totalSavings: bigint;
	equityToSupplyRatio: bigint;
	savingsToSupplyRatio: bigint;

	fpsTotalSupply: bigint;
	fpsPrice: bigint;

	totalMintedV1: bigint;
	totalMintedV2: bigint;
	mintedV1ToSupplyRatio: bigint;
	mintedV2ToSupplyRatio: bigint;

	currentLeadRate: bigint;
	claimableInterests: bigint;
	projectedInterests: bigint;
	impliedV1Interests: bigint;
	impliedV2Interests: bigint;

	impliedV1AvgBorrowRate: bigint;
	impliedV2AvgBorrowRate: bigint;

	netImpliedEarnings: bigint;
	netImpliedEarningsToSupplyRatio: bigint;
	netImpliedEarningsToEquityRatio: bigint;
	netImpliedEarningsPerToken: bigint;
	netImpliedEarningsPerTokenYield: bigint;

	netRealized365Earnings: bigint;
	netRealized365EarningsToSupplyRatio: bigint;
	netRealized365EarningsToEquityRatio: bigint;
	netRealized365EarningsPerToken: bigint;
	netRealized365EarningsPerTokenYield: bigint;
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
