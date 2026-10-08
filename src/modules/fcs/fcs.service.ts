import { Injectable, Logger } from '@nestjs/common';
import { ADDRESS, FCSABI } from '@frankencoin/zchf';
import { mainnet } from 'viem/chains';
import { formatFloat } from 'utils/format';
import { formatUnits } from 'viem';
import { gql } from '@apollo/client/core';
import { PONDER_CLIENT, VIEM_CONFIG } from 'app.config';
import { ApiFcsDiscount, ApiFcsFees, ApiFcsInfo, FcsFeeDaily } from './fcs.types';

@Injectable()
export class FcsService {
	private readonly logger = new Logger(this.constructor.name);
	private fcsInfo: ApiFcsInfo;
	private fcsDiscount: ApiFcsDiscount;
	private fcsFees: ApiFcsFees = { num: 0, total: 0, days: [] };

	getFcsInfo(): ApiFcsInfo {
		return this.fcsInfo;
	}

	getFcsDiscount(): ApiFcsDiscount {
		return this.fcsDiscount;
	}

	getFcsFees(): ApiFcsFees {
		return this.fcsFees;
	}

	async updateFcsInfo() {
		this.logger.debug('Updating FcsInfo');

		const chainId = mainnet.id;
		const addr = ADDRESS[chainId].fcs;
		const contract = { address: addr, abi: FCSABI, chainId } as const;

		const [ask, bid, totalAssets, totalSupply, isBinding] = await Promise.all([
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'ask' }),
			// bid() divides by (totalSupply + recentRedemptions) and can revert while FCS supply is 0
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'bid' }).catch(() => 0n),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'totalAssets' }),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'totalSupply' }),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'isBinding' }),
		]);

		this.fcsInfo = {
			erc20: {
				name: 'Frankencoin Share',
				symbol: 'FCS',
				decimals: 18,
			},
			chain: {
				chainId,
				address: addr,
			},
			token: {
				ask: formatFloat(ask),
				bid: formatFloat(bid),
				totalAssets: formatFloat(totalAssets),
				totalSupply: formatFloat(totalSupply),
				isBinding,
			},
		};
	}

	async updateFcsDiscount() {
		this.logger.debug('Updating FcsDiscount');

		const chainId = mainnet.id;
		const addr = ADDRESS[chainId].fcs;
		const contract = { address: addr, abi: FCSABI, chainId } as const;

		const [discount, recentlyRedeemed, weightedRecentRedemptions, redemptionAnchor, recoveryPeriod] = await Promise.all([
			// same zero-supply revert risk as bid() above (currentDiscount(0) is the marginal discount)
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'currentDiscount', args: [0n] }).catch(() => 10n ** 18n),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'recentlyRedeemed' }),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'weightedRecentRedemptions' }),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'redemptionAnchor' }),
			VIEM_CONFIG[chainId].readContract({ ...contract, functionName: 'RECOVERY_PERIOD' }),
		]);

		const recoveryCountdown = Number(redemptionAnchor) + Number(recoveryPeriod) - Math.floor(Date.now() / 1000);

		this.fcsDiscount = {
			discount: formatFloat(discount),
			recentlyRedeemed: recentlyRedeemed.toString(),
			weightedRecentRedemptions: weightedRecentRedemptions.toString(),
			redemptionAnchor: Number(redemptionAnchor),
			recoveryPeriodSeconds: Number(recoveryPeriod),
			recoveryCountdownSeconds: Math.max(0, recoveryCountdown),
		};
	}

	async updateFcsFees() {
		this.logger.debug('Updating FcsFees');

		// Paginate through all days, Ponder caps at 1000 per request
		let after: string | null = null;
		let hasNextPage = true;
		const items: FcsFeeDaily[] = [];

		while (hasNextPage) {
			const afterArg = after ? `, after: "${after}"` : '';
			const response = await PONDER_CLIENT.query<{
				fCSFeeDailys: {
					items: FcsFeeDaily[];
					pageInfo: { endCursor: string; hasNextPage: boolean };
				};
			}>({
				fetchPolicy: 'no-cache',
				query: gql`
					query {
						fCSFeeDailys(orderBy: "timestamp", orderDirection: "asc", limit: 1000${afterArg}) {
							items {
								date
								timestamp
								amount
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
				// keep serving the previously fetched fees while the indexer is unavailable
				this.logger.warn(`Failed to fetch FCS fees: ${error?.message ?? error}`);
				return null;
			});

			if (!response) return;

			if (!response.data || !response.data.fCSFeeDailys?.items) {
				this.logger.warn('No FCS fee data found.');
				return;
			}

			const page = response.data.fCSFeeDailys;
			items.push(...page.items);
			hasNextPage = page.pageInfo.hasNextPage;
			after = page.pageInfo.endCursor;
		}

		const days = items.map((i) => ({
			date: i.date,
			timestamp: Number(i.timestamp),
			amount: parseFloat(formatUnits(BigInt(i.amount), 18)),
			count: Number(i.count),
		}));

		this.fcsFees = {
			num: days.length,
			total: days.reduce((a, b) => a + b.amount, 0),
			days,
		};
	}
}
