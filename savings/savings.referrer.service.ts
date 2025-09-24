import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from 'api.config';
import { Address } from 'viem';
import { ApiSavingsReferrerEarnings, SavingsReferrerEarnings, SavingsReferrerEarningsQuery } from './savings.referrer.types';
import { formatFloat } from 'utils/format';

@Injectable()
export class SavingsReferrerService {
	private readonly logger = new Logger(this.constructor.name);

	// getMapping(referrer: Address): ApiSavingsBalance {
	// 	return this.fetchedBalance;
	// }

	getEarnings(referrer: Address) {
		return this.fetchReferrerEarnings(referrer);
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
						where: { referrer: "${referrer}" }
						orderBy: "updated"
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
