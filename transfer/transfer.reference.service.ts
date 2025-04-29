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
			list: m,
		};
	}

	async getByCount(count: string): Promise<TransferReferenceQuery | undefined> {
		try {
			const cachedItem = this.fetchedReferences[count];
			if (cachedItem != undefined) return cachedItem;

			const { data } = await PONDER_CLIENT.query<{
				referenceTransfers: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'cache-first',
				query: gql`
				query {
					referenceTransfers(where: {count: "${count}" }, limit: 1) {
						items {
							id
							count
							created
							txHash
							from
							to
							amount
							ref
							autoSaved
						}
					}
				}
			`,
			});

			if (!data || !data.referenceTransfers.items) {
				return undefined;
			} else {
				const item = data.referenceTransfers.items.at(0);
				this.fetchedReferences[count] = item;
				return item;
			}
		} catch (error) {
			return undefined;
		}
	}

	async getByFromFilter(Props: {
		from: Address;
		to?: Address | undefined;
		ref?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		try {
			const { from, to, ref, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			let filtered = Object.values(this.fetchedReferences).filter((i) => i.from.toLowerCase() == from.toLowerCase());
			if (to != undefined) filtered = filtered.filter((i) => i.to.toLowerCase() == to.toLowerCase());
			if (ref != undefined) filtered = filtered.filter((i) => i.ref == ref);

			return filtered.filter((i) => i.created >= Math.round(startTimestamp) && i.created < Math.round(endTimestamp));
		} catch (error) {
			return { error };
		}
	}

	async getByToFilter(Props: {
		to: Address;
		from?: Address | undefined;
		ref?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		try {
			const { from, to, ref, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			let filtered = Object.values(this.fetchedReferences).filter((i) => i.to.toLowerCase() == to.toLowerCase());
			if (from != undefined) filtered = filtered.filter((i) => i.from.toLowerCase() == from.toLowerCase());
			if (ref != undefined) filtered = filtered.filter((i) => i.ref == ref);

			return filtered.filter((i) => i.created >= Math.round(startTimestamp) && i.created < Math.round(endTimestamp));
		} catch (error) {
			return { error };
		}
	}

	async getHistoryByFromFilter(Props: {
		from: Address;
		to?: Address | undefined;
		ref?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		// fetch from indexer
		try {
			const { from, to, ref, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			const { data } = await PONDER_CLIENT.query<{
				referenceTransfers: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'cache-first',
				query: gql`
				query {
					referenceTransfers(
						where: {
							from: "${from.toLowerCase()}",
							${to != undefined ? `to: "${to.toLowerCase()}",` : ''}
							${ref != undefined ? `ref: "${ref}",` : ''}
							created_gte: "${Math.round(startTimestamp)}",
							created_lt: "${Math.round(endTimestamp)}",
						},
						orderBy: "count",
						limit: 1000) {
							items {
								id
								count
								created
								txHash
								from
								to
								amount
								ref
								autoSaved
							}
						}
					}`,
			});
			return data.referenceTransfers.items;
		} catch (error) {
			return { error };
		}
	}

	async getHistoryByToFilter(Props: {
		to: Address;
		from?: Address | undefined;
		ref?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		// fetch from indexer
		try {
			const { from, to, ref, start, end } = Props;
			const startTimestamp = new Date(start ?? 0).getTime() / 1000;
			const endTimestamp = end ? new Date(end).getTime() / 1000 : Date.now() / 1000;

			const { data } = await PONDER_CLIENT.query<{
				referenceTransfers: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'cache-first',
				query: gql`
				query {
					referenceTransfers(
						where: {
							to: "${to.toLowerCase()}",
							${from != undefined ? `from: "${from.toLowerCase()}",` : ''}
							${ref != undefined ? `ref: "${ref}",` : ''}
							created_gte: "${Math.round(startTimestamp)}",
							created_lt: "${Math.round(endTimestamp)}",
						},
						orderBy: "count",
						limit: 1000) {
							items {
								id
								count
								created
								txHash
								from
								to
								amount
								ref
								autoSaved
							}
						}
					}`,
			});
			return data.referenceTransfers.items;
		} catch (error) {
			return { error };
		}
	}

	async updateReferences() {
		this.logger.debug('Updating transfer references...');
		const { data } = await PONDER_CLIENT.query<{
			referenceTransfers: { items: TransferReferenceQuery[] };
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					referenceTransfers(orderBy: "count", limit: 1000) {
						items {
							id
							count
							created
							txHash
							from
							to
							amount
							ref
							autoSaved
						}
					}
				}
			`,
		});

		if (!data || !data.referenceTransfers.items) {
			this.logger.warn('No transfer references found.');
			return;
		}

		const list: TransferReferenceObjectArray = {};
		for (const i of data.referenceTransfers.items) {
			list[i.count] = i;
		}

		const a = Object.keys(list).length;
		const b = Object.keys(this.fetchedReferences).length;
		const isDiff = a !== b;

		if (isDiff) this.logger.log(`Transfer Ref. merging, from ${b} to ${a} entries`);
		this.fetchedReferences = { ...this.fetchedReferences, ...list };

		return list;
	}
}
