import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from '../api.config';
import { gql } from '@apollo/client/core';
import { TransferReferenceObjectArray, TransferReferenceQuery } from './transfer.reference.types';
import { Address } from 'viem';

@Injectable()
export class TransferReferenceService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedReferences: TransferReferenceObjectArray = {};

	getList() {
		const m = Object.values(this.fetchedReferences);
		return {
			num: m.length,
			list: m.reverse(),
		};
	}

	async getByCount(count: string): Promise<TransferReferenceQuery | undefined> {
		try {
			const cachedItem = this.fetchedReferences[count];
			if (cachedItem != undefined) return cachedItem;

			const { data } = await PONDER_CLIENT.query<{
				transferReferences: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'cache-first',
				query: gql`
				query {
					transferReferences(where: {count: "${count}" }, limit: 1) {
						items {
							amount
							chainId
							count
							created
							from
							reference
							sender
							targetChain
							to
							txHash
						}
					}
				}
			`,
			});

			if (!data || !data.transferReferences.items) {
				return undefined;
			} else {
				const item = data.transferReferences.items.at(0);
				this.fetchedReferences[count] = item;
				return item;
			}
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	async getByFromFilter(Props: {
		from: Address;
		to?: Address | undefined;
		reference?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		try {
			const { from, to, reference, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			let filtered = Object.values(this.fetchedReferences).filter((i) => i.from.toLowerCase() == from.toLowerCase());
			if (to != undefined) filtered = filtered.filter((i) => i.to.toLowerCase() == to.toLowerCase());
			if (reference != undefined) filtered = filtered.filter((i) => i.reference == reference);

			return filtered.filter((i) => i.created >= Math.round(startTimestamp) && i.created < Math.round(endTimestamp));
		} catch (error) {
			console.error(error);
			return { error };
		}
	}

	async getByToFilter(Props: {
		to: Address;
		from?: Address | undefined;
		reference?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		try {
			const { from, to, reference, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			let filtered = Object.values(this.fetchedReferences).filter((i) => i.to.toLowerCase() == to.toLowerCase());
			if (from != undefined) filtered = filtered.filter((i) => i.from.toLowerCase() == from.toLowerCase());
			if (reference != undefined) filtered = filtered.filter((i) => i.reference == reference);

			return filtered.filter((i) => i.created >= Math.round(startTimestamp) && i.created < Math.round(endTimestamp));
		} catch (error) {
			console.error(error);
			return { error };
		}
	}

	async getHistoryByFromFilter(Props: {
		from: Address;
		to?: Address | undefined;
		reference?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		// fetch from indexer
		try {
			const { from, to, reference, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			const { data } = await PONDER_CLIENT.query<{
				transferReferences: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'cache-first',
				query: gql`
				query {
					transferReferences(
						where: {
							from: "${from.toLowerCase()}",
							${to != undefined ? `to: "${to.toLowerCase()}",` : ''}
							${reference != undefined ? `reference: "${reference}",` : ''}
							created_gte: "${Math.round(startTimestamp)}",
							created_lt: "${Math.round(endTimestamp)}",
						},
						orderBy: "count",
						limit: 1000) {
							items {
								amount
								chainId
								count
								created
								from
								reference
								sender
								targetChain
								to
								txHash
							}
						}
					}`,
			});
			return data.transferReferences.items;
		} catch (error) {
			console.error(error);
			return { error };
		}
	}

	async getHistoryByToFilter(Props: {
		to: Address;
		from?: Address | undefined;
		reference?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		// fetch from indexer
		try {
			const { from, to, reference, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			const { data } = await PONDER_CLIENT.query<{
				transferReferences: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'cache-first',
				query: gql`
				query {
					transferReferences(
						where: {
							to: "${to.toLowerCase()}",
							${from != undefined ? `from: "${from.toLowerCase()}",` : ''}
							${reference != undefined ? `reference: "${reference}",` : ''}
							created_gte: "${Math.round(startTimestamp)}",
							created_lt: "${Math.round(endTimestamp)}",
						},
						orderBy: "count",
						limit: 1000) {
							items {
								amount
								chainId
								count
								created
								from
								reference
								sender
								targetChain
								to
								txHash
							}
						}
					}`,
			});
			return data.transferReferences.items;
		} catch (error) {
			console.error(error);
			return { error };
		}
	}

	async updateReferences() {
		this.logger.debug('Updating transfer references...');
		const { data } = await PONDER_CLIENT.query<{
			transferReferences: { items: TransferReferenceQuery[] };
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					transferReferences(orderBy: "count", limit: 1000) {
						items {
							amount
							chainId
							count
							created
							from
							reference
							sender
							targetChain
							to
							txHash
						}
					}
				}
			`,
		});

		if (!data || !data.transferReferences.items) {
			this.logger.warn('No transfer references found.');
			return;
		}

		const list: TransferReferenceObjectArray = {};
		for (const i of data.transferReferences.items) {
			list[i.count] = i;
		}

		const a = Object.keys(list).length;
		const b = Object.keys(this.fetchedReferences).length;
		const isDiff = a !== b;

		if (isDiff) this.logger.log(`Transfer reference. merging, from ${b} to ${a} entries`);
		this.fetchedReferences = { ...this.fetchedReferences, ...list };

		return list;
	}
}
