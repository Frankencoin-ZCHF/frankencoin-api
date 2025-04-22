import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from '../api.config';
import { gql } from '@apollo/client/core';
import { TransferReferenceObjectArray, TransferReferenceQuery } from './transfer.reference.types';
import { Address } from 'viem';

@Injectable()
export class TransferReferenceService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedReferences: TransferReferenceObjectArray = {};
	private fetchedByFromFilter: { [keyof: Address]: TransferReferenceQuery[] | undefined } = {};
	private fetchedByToFilter: { [keyof: Address]: TransferReferenceQuery[] | undefined } = {};

	getList() {
		const m = Object.values(this.fetchedReferences);
		return {
			num: m.length,
			list: m,
		};
	}

	async getByCount(count: string): Promise<TransferReferenceQuery | undefined> {
		const cachedItem = this.fetchedReferences[count];
		if (cachedItem != undefined) return cachedItem;

		try {
			const { data } = await PONDER_CLIENT.query<{
				referenceTransfers: { items: TransferReferenceQuery[] };
			}>({
				fetchPolicy: 'no-cache',
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
		const { from, to, ref, start, end } = Props;
		const cachedItem = this.fetchedByFromFilter[to.toLowerCase()] as TransferReferenceQuery[] | undefined;
		let currentItems: TransferReferenceQuery[] = [];

		// fetch from indexer if not available
		if (cachedItem == undefined) {
			try {
				const { data } = await PONDER_CLIENT.query<{
					referenceTransfers: { items: TransferReferenceQuery[] };
				}>({
					fetchPolicy: 'no-cache',
					query: gql`
					query {
						referenceTransfers(
							where: {
								AND: [
									{from: "${from.toLowerCase()}"},
									${to != undefined ? `{to: "${to.toLowerCase()}"},` : ''}
									${ref != undefined ? `{ref: "${ref}"},` : ''}
								]
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
				currentItems = data.referenceTransfers.items;
				this.fetchedByFromFilter[to.toLowerCase()] = currentItems;
			} catch (error) {
				return { error };
			}
		} else {
			// get latest state and merge with ref log
			const latestMatched = Object.values(this.fetchedReferences).filter((i) => i.from == from.toLowerCase());
			const ids = Object.values(cachedItem).map((i) => i.id);
			const upsert = latestMatched.filter((i) => !ids.includes(i.id));
			this.fetchedByFromFilter[to.toLowerCase()].push(upsert);
			currentItems = [...cachedItem, ...upsert];
		}

		// filter
		const filteredItems = currentItems.filter(
			(i) => i.created * 1000 >= new Date(start).getTime() && i.created * 1000 <= new Date(end).getTime()
		);
		return filteredItems;
	}

	async getByToFilter(Props: {
		to: Address;
		from?: Address | undefined;
		ref?: string | undefined;
		start?: string | number;
		end?: string | number;
	}) {
		const { from, to, ref, start, end } = Props;
		const cachedItem = this.fetchedByToFilter[to.toLowerCase()] as TransferReferenceQuery[] | undefined;
		let currentItems: TransferReferenceQuery[] = [];

		console.log(Props);

		const query = `
					query {
						referenceTransfers(
							where: {
								to: "${to.toLowerCase()}",
								${from != undefined ? `from: "${from.toLowerCase()}",` : ''}
								${ref != undefined ? `ref: "${ref}",` : ''}
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
						}`;

		console.log(query);

		// fetch from indexer if not available
		if (cachedItem == undefined) {
			try {
				const { data } = await PONDER_CLIENT.query<{
					referenceTransfers: { items: TransferReferenceQuery[] };
				}>({
					fetchPolicy: 'no-cache',
					query: gql(query),
				});
				currentItems = data.referenceTransfers.items;
				this.fetchedByToFilter[to.toLowerCase()] = currentItems;
			} catch (error) {
				return { error };
			}
		} else {
			// get latest state and merge with ref log
			const latestMatched = Object.values(this.fetchedReferences).filter((i) => i.to == to.toLowerCase());
			const ids = Object.values(cachedItem).map((i) => i.id);
			const upsert = latestMatched.filter((i) => !ids.includes(i.id));
			this.fetchedByToFilter[to.toLowerCase()].push(upsert);
			currentItems = [...cachedItem, ...upsert];
		}

		// filter
		const filteredItems = currentItems.filter(
			(i) => i.created * 1000 >= new Date(start).getTime() && i.created * 1000 <= new Date(end).getTime()
		);
		return filteredItems;
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
