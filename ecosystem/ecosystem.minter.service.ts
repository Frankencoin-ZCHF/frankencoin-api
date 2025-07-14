import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT } from '../api.config';
import { gql } from '@apollo/client/core';
import { ApiMinterListing, MinterQuery } from './ecosystem.minter.types';

@Injectable()
export class EcosystemMinterService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedMinters: MinterQuery[] = [];

	getMintersList(): ApiMinterListing {
		const m = this.fetchedMinters;
		return {
			num: m.length,
			list: m,
		};
	}

	getMintersListChainId(chainId: number): ApiMinterListing {
		const m = this.fetchedMinters.filter((m) => m.chainId == chainId);
		return {
			num: m.length,
			list: m,
		};
	}

	async updateMinters() {
		this.logger.debug('Updating minters');
		const minter = await PONDER_CLIENT.query<{
			frankencoinMinters: {
				items: MinterQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					frankencoinMinters(orderBy: "applyDate", orderDirection: "DESC", limit: 1000) {
						items {
							applicationFee
							applicationPeriod
							applyDate
							applyMessage
							chainId
							denyDate
							denyMessage
							denyTxHash
							minter
							suggestor
							txHash
							vetor
						}
					}
				}
			`,
		});

		if (!minter.data || !minter.data.frankencoinMinters) {
			this.logger.warn('No minters found.');
			return;
		}

		const list: MinterQuery[] = [];
		for (const m of minter.data.frankencoinMinters.items) {
			list.push({
				chainId: m.chainId,
				txHash: m.txHash,
				minter: m.minter,
				applicationPeriod: parseInt(m.applicationPeriod as any),
				applicationFee: m.applicationFee,
				applyMessage: m.applyMessage,
				applyDate: parseInt(m.applyDate as any),
				suggestor: m.suggestor,
				denyMessage: m.denyMessage,
				denyDate: parseInt(m.denyDate as any),
				denyTxHash: m.denyTxHash,
				vetor: m.vetor,
			});
		}

		const a = list.length;
		const b = this.fetchedMinters.length;
		const isDiff = a !== b;

		if (isDiff) this.logger.log(`Minters merging, from ${b} to ${a} entries`);
		this.fetchedMinters = list;

		return list;
	}
}
