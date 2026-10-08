import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT, VIEM_CONFIG } from 'app.config';
import { EcosystemFpsService } from 'modules/ecosystem/ecosystem.fps.service';
import { FcsService } from 'modules/fcs/fcs.service';
import { PositionsService } from 'modules/positions/positions.service';
import { uniqueValues } from 'utils/format-array';
import { formatUnits } from 'viem';
import {
	AnalyticsDailyLog,
	AnalyticsMintingRevenueDaily,
	AnalyticsExposureItem,
	AnalyticsProfitLossLog,
	AnalyticsTransactionLog,
	ApiAnalyticsCollateralExposure,
	ApiAnalyticsFpsEarnings,
	ApiAnalyticsProfitLossLog,
	ApiDailyLog,
	ApiMintingRevenue,
	ApiTransactionLog,
} from './analytics.types';
import { EcosystemFrankencoinService } from 'modules/ecosystem/ecosystem.frankencoin.service';
import { EcosystemMinterService } from 'modules/ecosystem/ecosystem.minter.service';
import { ADDRESS } from '@frankencoin/zchf';
import { FrankencoinABI } from '@frankencoin/zchf';
import { SavingsCoreService } from 'modules/savings/savings.core.service';
import { gql } from '@apollo/client/core';
import { Interval } from '@nestjs/schedule';
import { mainnet } from 'viem/chains';

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(this.constructor.name);
	private exposure: ApiAnalyticsCollateralExposure;
	private fetchedDailyLogs: AnalyticsDailyLog[] = [];
	private mintingRevenue: ApiMintingRevenue = AnalyticsService.emptyMintingRevenue();

	constructor(
		private readonly positions: PositionsService,
		private readonly fps: EcosystemFpsService,
		private readonly fc: EcosystemFrankencoinService,
		private readonly minters: EcosystemMinterService,
		private readonly save: SavingsCoreService,
		private readonly fcs: FcsService
	) {
		setTimeout(() => this.updateDailyLog(), 10000);
		setTimeout(() => this.updateMintingRevenue(), 10000);
	}

	async getProfitLossLog(): Promise<ApiAnalyticsProfitLossLog> {
		this.logger.debug('Fetching profit loss log...');
		const response = await PONDER_CLIENT.query<{
			frankencoinProfitLosss: {
				items: AnalyticsProfitLossLog[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					frankencoinProfitLosss(orderBy: "count", orderDirection: "desc", limit: 1000) {
						items {
							chainId
							minter
							created
							count
							kind
							amount
							profits
							losses
							perFPS
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.frankencoinProfitLosss.items) {
			this.logger.warn('No profitloss data found.');
			return;
		}

		const logs = response.data.frankencoinProfitLosss.items as AnalyticsProfitLossLog[];

		return {
			num: logs.length,
			logs,
		};
	}

	async getCollateralExposure(): Promise<ApiAnalyticsCollateralExposure> {
		const positions = this.positions.getPositionsOpen().map;
		const list = Object.values(positions);
		const collaterals = list.map((p) => p.collateral).filter(uniqueValues);
		const fps = this.fps.getEcosystemFpsInfo();

		let positionsTheta: number = 0;
		let positionsThetaPerToken: number = 0;

		const minterReserveRaw = await VIEM_CONFIG[mainnet.id].readContract({
			address: ADDRESS[mainnet.id].frankencoin,
			abi: FrankencoinABI,
			functionName: 'minterReserve',
		});

		const balanceReserveRaw = await VIEM_CONFIG[mainnet.id].readContract({
			address: ADDRESS[mainnet.id].frankencoin,
			abi: FrankencoinABI,
			functionName: 'balanceOf',
			args: [ADDRESS[mainnet.id].equity],
		});

		const equityInReserveRaw = balanceReserveRaw - minterReserveRaw;

		const minterReserve = formatUnits(minterReserveRaw, 18);
		const balanceReserve = formatUnits(balanceReserveRaw, 18);
		const equityInReserve = formatUnits(equityInReserveRaw, 18);

		const returnData = [];

		for (const c of collaterals) {
			const pos = list.filter((p) => p.collateral === c);
			const originals = pos.filter((p) => p.isOriginal === true);
			const clones = pos.filter((p) => p.isClone === true);

			const totalMintedRaw = pos.reduce<bigint>((a, b) => a + BigInt(b.minted), 0n);
			const totalMinted = formatUnits(totalMintedRaw, 18);
			const totalLimitRaw = pos.reduce<bigint>((a, b) => a + BigInt(b.limitForClones), 0n);
			const totalLimit = formatUnits(totalLimitRaw, 18);
			const totalMintedRatioPPM = (totalMintedRaw * BigInt(1_000_000)) / totalLimitRaw;
			const totalMintedRatio = parseInt(totalMintedRatioPPM.toString()) / 1_000_000;

			const interestMulRaw = pos.reduce<bigint>((a, b) => {
				const effI = Math.floor((b.annualInterestPPM * 1_000_000) / (1_000_000 - b.reserveContribution));
				return a + BigInt(b.minted) * BigInt(effI);
			}, 0n);
			const interestAvgPPM = totalMintedRaw > 0 ? parseInt(interestMulRaw.toString()) / parseInt(totalMintedRaw.toString()) : 0;
			const interestAvg = parseInt(interestAvgPPM.toString()) / 1_000_000;

			const totalTheta = (interestAvg * parseFloat(totalMinted)) / 365;
			positionsTheta += totalTheta;
			const thetaPerToken = totalTheta / fps.token.totalSupply;
			positionsThetaPerToken += thetaPerToken;

			const totalContributionMul = pos.reduce<bigint>((a, b) => {
				return a + BigInt(b.minted) * BigInt(b.reserveContribution);
			}, 0n);

			const totalContributionRaw = BigInt(Math.floor(parseInt(formatUnits(totalContributionMul, 6))));
			const equityInReserveWipedRaw = equityInReserveRaw + totalContributionRaw - totalMintedRaw;
			const fpsPriceWiped = (parseFloat(formatUnits(equityInReserveWipedRaw, 18)) * 3) / fps.token.totalSupply;
			const riskRatioWiped = Math.round(1_000_000 * (1 - fpsPriceWiped / fps.token.price)) / 1_000_000;

			const data: AnalyticsExposureItem = {
				collateral: {
					address: c,
					chainId: mainnet.id,
					name: pos.at(0).collateralName,
					symbol: pos.at(0).collateralSymbol,
				},
				positions: {
					open: pos.length,
					originals: originals.length,
					clones: clones.length,
				},
				mint: {
					totalMinted: parseFloat(totalMinted),
					totalContribution: parseFloat(formatUnits(totalContributionRaw, 18)),
					totalLimit: parseFloat(totalLimit),
					totalMintedRatio: totalMintedRatio,
					interestAverage: interestAvg,
					totalTheta: totalTheta,
					thetaPerFpsToken: thetaPerToken,
				},
				reserveRiskWiped: {
					fpsPrice: fpsPriceWiped < 0 ? 0 : fpsPriceWiped,
					riskRatio: riskRatioWiped,
				},
			};

			returnData.push(data);
		}

		this.exposure = {
			general: {
				balanceInReserve: parseFloat(balanceReserve),
				mintersContribution: parseFloat(minterReserve),
				equityInReserve: parseFloat(equityInReserve),
				fpsPrice: fps.token.price,
				fpsTotalSupply: fps.token.totalSupply,
				thetaFromPositions: positionsTheta,
				thetaPerToken: positionsThetaPerToken,
				earningsPerAnnum: positionsTheta * 365,
				earningsPerToken: positionsThetaPerToken * 365,
				priceToEarnings: fps.token.price / (positionsThetaPerToken * 365),
				priceToBookValue: 3,
			},
			exposures: returnData,
		};

		return this.exposure;
	}

	async getFpsEarnings(): Promise<ApiAnalyticsFpsEarnings> {
		const num: number = this.positions.getPositionsList().list.filter((p) => p.isOriginal).length;
		const positionProposalFees: number = 1000 * num;
		const investFeeRaw = this.fc.getEcosystemFrankencoinKeyValues()['Equity:InvestedFeePaidPPM']?.amount || 0n;
		const investFees = parseFloat(formatUnits(investFeeRaw, 18 + 6));
		const redeemFeeRaw = this.fc.getEcosystemFrankencoinKeyValues()['Equity:RedeemedFeePaidPPM']?.amount || 0n;
		const redeemFees = parseFloat(formatUnits(redeemFeeRaw, 18 + 6));
		const minterProposalFees = this.minters
			.getMintersList()
			.list.reduce<number>((a, b) => a + parseFloat(formatUnits(BigInt(b.applicationFee), 18)), 0);
		const fcsRedemptionFees: number = this.fcs.getFcsFees().total;
		const revenue = this.getMintingRevenue().totals;
		const challengeProfits = revenue.Challenge.excessProfit + revenue.Challenge.reserveReleased;
		const forcedSaleProfits = revenue.ForcedSale.excessProfit + revenue.ForcedSale.reserveReleased;
		const challengeLosses = revenue.Challenge.lossCovered;
		const forcedSaleLosses = revenue.ForcedSale.lossCovered;
		// savings interest is paid out through Loss events, so it is part of the total losses and not additive to them
		const savingsInterestCosts = this.save.getInfo().totalInterest;
		const otherProfitClaims: number =
			this.fps.getEcosystemFpsInfo().earnings.profit -
			positionProposalFees -
			minterProposalFees -
			challengeProfits -
			forcedSaleProfits;

		const expo = await this.getCollateralExposure();
		const equityAdjusted: number = expo.general.equityInReserve;
		const otherContributions: number =
			equityAdjusted - minterProposalFees - investFees - redeemFees - fcsRedemptionFees - positionProposalFees - otherProfitClaims;

		return {
			minterProposalFees,
			investFees,
			redeemFees,
			fcsRedemptionFees,
			positionProposalFees,
			challengeProfits,
			forcedSaleProfits,
			otherProfitClaims,
			otherContributions,

			savingsInterestCosts,
			challengeLosses,
			forcedSaleLosses,
			otherLossClaims: this.fps.getEcosystemFpsInfo().earnings.loss - savingsInterestCosts - challengeLosses - forcedSaleLosses,
		};
	}

	async getTransactionLog(latest: boolean, limit: number = 50, after: string = ''): Promise<ApiTransactionLog> {
		this.logger.debug('Fetching transaction log...');
		const txLog = await PONDER_CLIENT.query<{
			analyticTransactionLogs: {
				items: AnalyticsTransactionLog[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					analyticTransactionLogs(orderBy: "count", orderDirection: "${latest ? 'desc' : 'asc'}", limit: ${limit}, ${after.length > 0 ? `after: "${after}"` : ''}) {
						items {
							chainId,
							count,
							timestamp,
							kind,
							amount,
							txHash,

							totalInflow,
							totalOutflow,
							totalEquity,
							totalSavings,

							fpsTotalSupply,
							fpsPrice,

							realizedNetEarnings,
							earningsPerFPS,
						}
						pageInfo {
							startCursor
       			 			endCursor
        					hasNextPage
      					}
					}
				}
			`,
		});

		if (!txLog.data || !txLog.data.analyticTransactionLogs.items) {
			this.logger.warn('No transaction log data found.');
			return;
		}

		const logs = txLog.data.analyticTransactionLogs.items;

		return {
			num: logs.length,
			logs,
			// @ts-expect-error not in type
			pageInfo: txLog.data.analyticTransactionLogs.pageInfo ?? {
				startCursor: '',
				endCursor: '',
				hasNextPage: false,
			},
		};
	}

	@Interval(10 * 60 * 1000) // 10min
	async updateDailyLog() {
		this.logger.debug('Fetching daily log...');
		const fetched = await PONDER_CLIENT.query<{
			analyticDailyLogs: {
				items: AnalyticsDailyLog[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					analyticDailyLogs(orderBy: "timestamp", orderDirection: "asc", limit: 1000) {
						items {
							date
							timestamp
							txHash

							totalInflow
							totalOutflow
							totalEquity
							totalSavings

							fpsTotalSupply
							fpsPrice

							realizedNetEarnings
							earningsPerFPS
						}
					}
				}
			`,
		}).catch((error) => {
			// keep serving the previously fetched logs while the indexer is unavailable
			this.logger.warn(`Failed to fetch daily log: ${error?.message ?? error}`);
			return null;
		});

		if (!fetched) return;

		if (!fetched.data || !fetched.data.analyticDailyLogs.items) {
			this.logger.warn('No daily log data found.');
			return;
		}

		this.fetchedDailyLogs = fetched.data.analyticDailyLogs.items;
	}

	getDailyLog(): ApiDailyLog {
		return {
			num: this.fetchedDailyLogs.length,
			logs: this.fetchedDailyLogs,
		};
	}

	private static emptyMintingRevenue(): ApiMintingRevenue {
		const zero = () => ({ excessProfit: 0, reserveReleased: 0, lossCovered: 0, net: 0, count: 0 });
		return { num: 0, totals: { Challenge: zero(), ForcedSale: zero() }, days: [] };
	}

	@Interval(10 * 60 * 1000) // 10min
	async updateMintingRevenue() {
		this.logger.debug('Fetching minting revenue...');

		// Paginate through all days, Ponder caps at 1000 per request
		let after: string | null = null;
		let hasNextPage = true;
		const items: AnalyticsMintingRevenueDaily[] = [];

		while (hasNextPage) {
			const afterArg = after ? `, after: "${after}"` : '';
			const response = await PONDER_CLIENT.query<{
				mintingRevenueDailys: {
					items: AnalyticsMintingRevenueDaily[];
					pageInfo: { endCursor: string; hasNextPage: boolean };
				};
			}>({
				fetchPolicy: 'no-cache',
				query: gql`
					query {
						mintingRevenueDailys(orderBy: "timestamp", orderDirection: "asc", limit: 1000${afterArg}) {
							items {
								chainId
								date
								hub
								kind
								timestamp
								excessProfit
								reserveReleased
								lossCovered
								count
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			}).catch((error) => {
				// keep serving the previously fetched data while the indexer is unavailable
				this.logger.warn(`Failed to fetch minting revenue: ${error?.message ?? error}`);
				return null;
			});

			if (!response) return;

			if (!response.data || !response.data.mintingRevenueDailys?.items) {
				this.logger.warn('No minting revenue data found.');
				return;
			}

			const page = response.data.mintingRevenueDailys;
			items.push(...page.items);
			hasNextPage = page.pageInfo.hasNextPage;
			after = page.pageInfo.endCursor;
		}

		const result = AnalyticsService.emptyMintingRevenue();
		const f = (v: string) => parseFloat(formatUnits(BigInt(v), 18));

		for (const i of items) {
			const excessProfit = f(i.excessProfit);
			const reserveReleased = f(i.reserveReleased);
			const lossCovered = f(i.lossCovered);
			const net = excessProfit + reserveReleased - lossCovered;
			const count = Number(i.count);

			result.days.push({
				chainId: i.chainId,
				date: i.date,
				hub: i.hub,
				kind: i.kind,
				timestamp: Number(i.timestamp),
				excessProfit,
				reserveReleased,
				lossCovered,
				net,
				count,
			});

			const t = result.totals[i.kind as 'Challenge' | 'ForcedSale'];
			if (!t) continue;
			t.excessProfit += excessProfit;
			t.reserveReleased += reserveReleased;
			t.lossCovered += lossCovered;
			t.net += net;
			t.count += count;
		}

		result.num = result.days.length;
		this.mintingRevenue = result;
	}

	getMintingRevenue(): ApiMintingRevenue {
		return this.mintingRevenue;
	}
}
