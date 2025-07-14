import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from 'api.config';
import {
	LeadrateRateQuery,
	LeadrateRateMapping,
	LeadrateProposedQuery,
	LeadrateProposedMapping,
	ApiLeadrateInfo,
	ApiLeadrateRate,
	ApiLeadrateProposed,
} from './savings.leadrate.types';
import { ChainId } from '@frankencoin/zchf';
import { Address } from 'viem';

@Injectable()
export class SavingsLeadrateService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedRates: LeadrateRateMapping = {} as LeadrateRateMapping;
	private fetchedProposals: LeadrateProposedMapping = {} as LeadrateProposedMapping;

	getRates(): ApiLeadrateRate {
		const chainIds = Object.keys(this.fetchedRates).map((id) => Number(id)) as ChainId[];
		const rate: ApiLeadrateRate['rate'] = {} as ApiLeadrateRate['rate'];

		for (const chain of chainIds) {
			const modules = Object.keys(this.fetchedRates[chain]).map((module) => module as Address);
			for (const module of modules) {
				// make object available
				if (rate[chain] == undefined) rate[chain] = {};

				// set value
				rate[chain][module] = this.fetchedRates[chain][module][0];
			}
		}

		return {
			rate,
			list: this.fetchedRates,
		};
	}

	getProposals(): ApiLeadrateProposed {
		const chainIds = Object.keys(this.fetchedProposals).map((id) => Number(id)) as ChainId[];
		const proposed: ApiLeadrateProposed['proposed'] = {} as ApiLeadrateProposed['proposed'];

		for (const chain of chainIds) {
			const modules = Object.keys(this.fetchedProposals[chain]).map((module) => module as Address);
			for (const module of modules) {
				// make object available
				if (proposed[chain] == undefined) proposed[chain] = {};

				// set value
				proposed[chain][module] = this.fetchedProposals[chain][module][0];
			}
		}

		return {
			proposed,
			list: this.fetchedProposals,
		};
	}

	getInfo(): ApiLeadrateInfo {
		const rate = this.getRates().rate;
		const proposed = this.getProposals().proposed;

		const open: ApiLeadrateInfo['open'] = {} as ApiLeadrateInfo['open'];

		const chainIds = Object.keys(rate).map((id) => Number(id)) as ChainId[];
		for (const chain of chainIds) {
			const modules = Object.keys(rate[chain]).map((module) => module as Address);
			for (const module of modules) {
				// skip if there are no proposed items
				if (proposed?.[chain]?.[module] == undefined) continue;

				const currentRate = rate[chain][module];
				const latestProposed = proposed[chain][module];
				const isProposal = currentRate.approvedRate != latestProposed.nextRate;
				const isPending = latestProposed.nextChange * 1000 >= Date.now();

				// validate that it is a rate change
				if (!isProposal) continue;

				// make chain available and make entry
				if (open[chain] == undefined) open[chain] = {};
				open[chain][module] = {
					currentRate: currentRate.approvedRate,
					nextRate: latestProposed.nextRate,
					nextchange: latestProposed.nextChange,
					isPending,
				};
			}
		}

		return {
			rate,
			proposed,
			open,
		};
	}

	async updateLeadrateRates() {
		this.logger.debug('Updating leadrate rates');
		const response = await PONDER_CLIENT.query<{
			leadrateRateChangeds: {
				items: LeadrateRateQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					leadrateRateChangeds(orderBy: "count", orderDirection: "DESC", limit: 1000) {
						items {
							approvedRate
							blockheight
							chainId
							count
							created
							module
							txHash
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.leadrateRateChangeds?.items) {
			this.logger.warn('No leadrateRateChangeds data found.');
			return;
		}

		const d = response.data.leadrateRateChangeds.items;

		const list: LeadrateRateMapping = {} as LeadrateRateMapping;
		for (const r of d) {
			// make object available
			if (list[r.chainId] == undefined) list[r.chainId] = {};
			if (list[r.chainId][r.module] == undefined) list[r.chainId][r.module] = [] as LeadrateRateQuery[];

			// set state and overwrite type conform
			list[r.chainId][r.module].push({
				chainId: r.chainId,
				count: parseInt(r.count as any),
				module: r.module,
				created: parseInt(r.created as any),
				blockheight: parseInt(r.blockheight as any),
				txHash: r.txHash,
				approvedRate: r.approvedRate,
			});
		}

		this.fetchedRates = list;
	}

	async updateLeadrateProposals() {
		this.logger.debug('Updating leadrate proposals');
		const response = await PONDER_CLIENT.query<{
			leadRateProposeds: {
				items: LeadrateProposedQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					leadRateProposeds(orderBy: "count", orderDirection: "DESC", limit: 1000) {
						items {
							blockheight
							chainId
							count
							created
							module
							nextChange
							nextRate
							proposer
							txHash
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.leadRateProposeds?.items) {
			this.logger.warn('No leadRateProposeds data found.');
			return;
		}

		const d = response.data.leadRateProposeds.items;

		const list: LeadrateProposedMapping = {} as LeadrateProposedMapping;
		for (const r of d) {
			// make object available
			if (list[r.chainId] == undefined) list[r.chainId] = {};
			if (list[r.chainId][r.module] == undefined) list[r.chainId][r.module] = [] as LeadrateProposedQuery[];

			// set state and overwrite type conform
			list[r.chainId][r.module].push({
				chainId: r.chainId,
				created: parseInt(r.created as any),
				count: parseInt(r.count as any),
				blockheight: parseInt(r.blockheight as any),
				module: r.module,
				txHash: r.txHash,
				proposer: r.proposer,
				nextChange: r.nextChange,
				nextRate: r.nextRate,
			});
		}

		this.fetchedProposals = list;
	}
}
