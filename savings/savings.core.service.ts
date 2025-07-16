import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import {
	ApiSavingsActivity,
	ApiSavingsBalance,
	ApiSavingsInfo,
	ApiSavingsRanked,
	SavingsActivityQuery,
	SavingsBalance,
	SavingsBalanceAccountMapping,
	SavingsBalanceChainIdMapping,
	SavingsBalanceQuery,
	SavingsStatusMapping,
	SavingsStatusQuery,
} from './savings.core.types';
import { PONDER_CLIENT } from 'api.config';
import { formatFloat } from 'utils/format';

@Injectable()
export class SavingsCoreService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedStatus: SavingsStatusMapping = {} as SavingsStatusMapping;
	private fetchedBalances: SavingsBalanceAccountMapping = {} as SavingsBalanceAccountMapping;
	private fetchedActivities: SavingsActivityQuery[] = [];

	constructor(private readonly fc: EcosystemFrankencoinService) {}

	getInfo(): ApiSavingsInfo {
		const totalBalance = Object.values(this.fetchedStatus).reduce((a, b) => {
			const modules = Object.values(b).reduce((a, b) => a + formatFloat(BigInt(b.balance)), 0);
			return a + modules;
		}, 0);

		const totalSupply = this.fc.getEcosystemFrankencoinInfo().token.supply;
		const ratioOfSupply: number = totalBalance / totalSupply;

		return {
			status: this.fetchedStatus,
			totalBalance,
			ratioOfSupply,
		};
	}

	getBalances(): ApiSavingsBalance {
		return this.fetchedBalances;
	}

	getRanked(): ApiSavingsRanked {
		const balance: ApiSavingsRanked = {} as ApiSavingsRanked;
		const accounts = Object.keys(this.fetchedBalances) as SavingsBalance['account'][];

		for (const acc of accounts) {
			balance[acc] = Object.values(this.fetchedBalances[acc as SavingsBalance['account']]).reduce((a, b) => {
				const modules = Object.values(b).reduce((a, b) => a + formatFloat(BigInt(b.balance)), 0);
				return a + modules;
			}, 0);
		}

		return balance;
	}

	getActivity(): ApiSavingsActivity {
		return this.fetchedActivities;
	}

	async updateSavingsStatus() {
		this.logger.debug('Updating savings status');
		const response = await PONDER_CLIENT.query<{
			savingsStatuss: {
				items: SavingsStatusQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsStatuss(orderBy: "updated", orderDirection: "DESC", limit: 1000) {
						items {
							balance
							chainId
							counterInterest
							counterRateChanged
							counterRateProposed
							counterSave
							counterWithdraw
							interest
							module
							rate
							save
							updated
							withdraw
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.savingsStatuss?.items) {
			this.logger.warn('No savingsStatuss data found.');
			return;
		}

		const d = response.data.savingsStatuss.items;

		const list: SavingsStatusMapping = {} as SavingsStatusMapping;
		for (const r of d) {
			// make object available
			if (list[r.chainId] == undefined) list[r.chainId] = {};

			// set state and overwrite type conform
			list[r.chainId][r.module] = {
				chainId: r.chainId,
				updated: parseInt(r.updated as any),
				module: r.module,
				balance: r.balance,
				interest: r.interest,
				save: r.save,
				withdraw: r.withdraw,
				rate: r.rate,
				counter: {
					interest: parseInt(r.counterInterest as any),
					rateChanged: parseInt(r.counterRateChanged as any),
					rateProposed: parseInt(r.counterRateProposed as any),
					save: parseInt(r.counterSave as any),
					withdraw: parseInt(r.counterWithdraw as any),
				},
			};
		}

		this.fetchedStatus = list;
	}

	async updateSavingsBalance() {
		this.logger.debug('Updating savings balance');
		const response = await PONDER_CLIENT.query<{
			savingsMappings: {
				items: SavingsBalanceQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsMappings(where: { balance_gt: "0" }, orderBy: "balance", orderDirection: "DESC", limit: 1000) {
						items {
							account
							balance
							chainId
							counterInterest
							counterSave
							counterWithdraw
							created
							interest
							module
							save
							updated
							withdraw
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.savingsMappings?.items) {
			this.logger.warn('No savingsMappings data found.');
			return;
		}

		const d = response.data.savingsMappings.items;

		const list: SavingsBalanceAccountMapping = {} as SavingsBalanceAccountMapping;
		for (const r of d) {
			// make object available, account -> chainId -> balance
			if (list[r.account] == undefined) list[r.account] = {} as SavingsBalanceChainIdMapping;
			if (list[r.account][r.chainId] == undefined) list[r.account][r.chainId] = {};

			// set state and overwrite type conform
			list[r.account][r.chainId][r.module] = {
				chainId: r.chainId,
				account: r.account,
				module: r.module,
				balance: r.balance,
				created: parseInt(r.created as any),
				updated: parseInt(r.updated as any),
				save: r.save,
				interest: r.interest,
				withdraw: r.withdraw,
				counter: {
					save: parseInt(r.counterSave as any),
					interest: parseInt(r.counterInterest as any),
					withdraw: parseInt(r.counterWithdraw as any),
				},
			};
		}

		this.fetchedBalances = list;
	}

	async updateSavingsActivity() {
		this.logger.debug('Updating savings activity');
		const response = await PONDER_CLIENT.query<{
			savingsActivitys: {
				items: SavingsActivityQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsActivitys(orderBy: "created", orderDirection: "DESC", limit: 1000) {
						items {
							account
							amount
							balance
							blockheight
							chainId
							count
							created
							interest
							kind
							module
							rate
							save
							txHash
							withdraw
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.savingsActivitys?.items) {
			this.logger.warn('No savingsActivitys data found.');
			return;
		}

		const d = response.data.savingsActivitys.items;

		const list: SavingsActivityQuery[] = [];
		for (const r of d) {
			// set state and overwrite type conform
			list.push({
				chainId: r.chainId,
				account: r.account,
				module: r.module,
				created: parseInt(r.created as any),
				blockheight: parseInt(r.blockheight as any),
				count: parseInt(r.count as any),
				balance: r.balance,
				save: r.save,
				interest: r.interest,
				withdraw: r.withdraw,
				kind: r.kind,
				amount: r.amount,
				rate: r.rate,
				txHash: r.txHash,
			});
		}

		this.fetchedActivities = d;
	}
}
