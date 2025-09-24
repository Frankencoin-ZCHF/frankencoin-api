import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from 'api.config';
import { Address } from 'viem';
import { SavingsReferrerEarningsQuery } from './savings.referrer.types';

@Injectable()
export class SavingsReferrerService {
	private readonly logger = new Logger(this.constructor.name);

	// getMapping(referrer: Address): ApiSavingsBalance {
	// 	return this.fetchedBalance;
	// }

	getEarnings(referrer: Address) {
		return this.fetchReferrerEarnings(referrer);
	}

	async fetchReferrerEarnings(referrer: Address) {
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

		console.log(response);

		if (!response.data || !response.data.savingsReferrerEarningss?.items) {
			this.logger.warn('No savingsReferrerEarningss data found.');
			return;
		}

		const d = response.data.savingsReferrerEarningss.items;
		return d;

		// const list: SavingsStatusMapping = {} as SavingsStatusMapping;
		// for (const r of d) {
		// 	// make object available
		// 	if (list[r.chainId] == undefined) list[r.chainId] = {};

		// 	// set state and overwrite type conform
		// 	list[r.chainId][r.module] = {
		// 		chainId: r.chainId,
		// 		updated: parseInt(r.updated as any),
		// 		module: r.module,
		// 		balance: r.balance,
		// 		interest: r.interest,
		// 		save: r.save,
		// 		withdraw: r.withdraw,
		// 		rate: r.rate,
		// 		counter: {
		// 			interest: parseInt(r.counterInterest as any),
		// 			rateChanged: parseInt(r.counterRateChanged as any),
		// 			rateProposed: parseInt(r.counterRateProposed as any),
		// 			save: parseInt(r.counterSave as any),
		// 			withdraw: parseInt(r.counterWithdraw as any),
		// 		},
		// 	};
		// }

		// this.fetchedStatus = list;
	}
}
