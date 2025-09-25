import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from 'api.config';
import { Address } from 'viem';
import {
	ApiSavingsReferrerEarnings,
	ApiSavingsReferrerMapping,
	SavingsReferrerEarnings,
	SavingsReferrerEarningsQuery,
	SavingsReferrerMapping,
	SavingsReferrerMappingQuery,
} from './savings.referrer.types';
import { formatFloat } from 'utils/format';

@Injectable()
export class SavingsReferrerService {
	private readonly logger = new Logger(this.constructor.name);

	getMapping(referrer: Address): Promise<ApiSavingsReferrerMapping> {
		return this.fetchReferrerMapping(referrer);
	}

	getEarnings(referrer: Address): Promise<ApiSavingsReferrerEarnings> {
		return this.fetchReferrerEarnings(referrer);
	}

	async fetchReferrerMapping(referrer: Address): Promise<ApiSavingsReferrerMapping> {
		this.logger.debug('Fetching savings referrer mapping');
		referrer = referrer.toLowerCase() as Address;

		const response = await PONDER_CLIENT.query<{
			savingsReferrerMappings: {
				items: SavingsReferrerMappingQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsReferrerMappings(
						where: { referrer: "${referrer}", balance_gt: "0" }
						orderBy: "balance"
						orderDirection: "DESC"
						limit: 1000
					) {
						items {
							chainId
							module
							account
							created
							updated
							balance
							referrer
							referrerFee
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.savingsReferrerMappings?.items) {
			this.logger.warn('No savingsReferrerMappings data found.');
			return;
		}

		const d = response.data.savingsReferrerMappings.items;

		const accounts: Address[] = [];
		const map: SavingsReferrerMapping = {} as SavingsReferrerMapping;

		for (const r of d) {
			// make object available
			if (map[r.chainId] == undefined) map[r.chainId] = {};
			if (map[r.chainId][r.module] == undefined) map[r.chainId][r.module] = {};

			// set state and overwrite type conform
			map[r.chainId][r.module][r.account] = {
				created: r.created,
				updated: r.updated,
				balance: formatFloat(BigInt(r.balance), 18),
				referrer: r.referrer,
				referrerFee: r.referrerFee,
			};

			// upsert accounts
			if (!accounts.includes(r.account)) accounts.push(r.account);
		}

		return {
			num: accounts.length,
			accounts,
			map,
		};
	}

	async fetchReferrerEarnings(referrer: Address): Promise<ApiSavingsReferrerEarnings> {
		this.logger.debug('Fetching savings referrer earnings');
		referrer = referrer.toLowerCase() as Address;

		const response = await PONDER_CLIENT.query<{
			savingsReferrerEarningss: {
				items: SavingsReferrerEarningsQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsReferrerEarningss(
						where: { referrer: "${referrer}", earnings_gt: "0" }
						orderBy: "earnings"
						orderDirection: "DESC"
						limit: 1000
					) {
						items {
							chainId
							module
							account
							created
							updated
							referrer
							earnings
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.savingsReferrerEarningss?.items) {
			this.logger.warn('No savingsReferrerEarningss data found.');
			return;
		}

		const d = response.data.savingsReferrerEarningss.items;

		const earnings: SavingsReferrerEarnings = {} as SavingsReferrerEarnings;
		const chains: ApiSavingsReferrerEarnings['chains'] = {} as ApiSavingsReferrerEarnings['chains'];
		let total: number = 0;

		for (const r of d) {
			// make object available
			if (earnings[r.chainId] == undefined) earnings[r.chainId] = {};
			if (earnings[r.chainId][r.module] == undefined) earnings[r.chainId][r.module] = {};

			// set state and overwrite type conform
			earnings[r.chainId][r.module][r.account] = formatFloat(BigInt(r.earnings), 18);

			// make object available
			if (chains[r.chainId] == undefined) chains[r.chainId] = formatFloat(BigInt(r.earnings), 18);
			else chains[r.chainId] += formatFloat(BigInt(r.earnings), 18);

			// accum. total
			total += formatFloat(BigInt(r.earnings), 18);
		}

		return {
			earnings,
			chains,
			total,
		};
	}
}
