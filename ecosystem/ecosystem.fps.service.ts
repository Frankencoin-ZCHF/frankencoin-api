import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT, VIEM_CONFIG } from 'api.config';
import { ApiEcosystemFpsInfo } from './ecosystem.fps.types';
import { ABIS, ADDRESS } from 'contracts';
import { gql } from '@apollo/client/core';
import { formatUnits } from 'viem';

@Injectable()
export class EcosystemFpsService {
	private readonly logger = new Logger(this.constructor.name);
	private fpsInfo: ApiEcosystemFpsInfo;

	getEcosystemFpsInfo(): ApiEcosystemFpsInfo {
		return this.fpsInfo;
	}

	async updateFpsInfo() {
		this.logger.debug('Updating EcosystemFpsInfo');

		const chainId = VIEM_CONFIG.chain.id;
		const addr = ADDRESS[chainId].equity;

		const fetchedPrice = await VIEM_CONFIG.readContract({
			address: addr,
			abi: ABIS.EquityABI,
			functionName: 'price',
		});
		const fetchedTotalSupply = await VIEM_CONFIG.readContract({
			address: addr,
			abi: ABIS.EquityABI,
			functionName: 'totalSupply',
		});

		const p = parseInt(fetchedPrice.toString()) / 1e18;
		const s = parseInt(fetchedTotalSupply.toString()) / 1e18;

		const profitLossPonder = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					fPSs(orderBy: "id", limit: 1000) {
						items {
							id
							profits
							loss
						}
					}
				}
			`,
		});

		if (!profitLossPonder.data || !profitLossPonder.data.fPSs.items) {
			this.logger.warn('No profitLossPonder data found.');
			return;
		}

		const d = profitLossPonder.data.fPSs.items.at(0);
		const earningsData: ApiEcosystemFpsInfo['earnings'] = {
			profit: parseFloat(formatUnits(d.profits, 18)),
			loss: parseFloat(formatUnits(d.loss, 18)),
		};

		this.fpsInfo = {
			earnings: earningsData,
			values: {
				price: p,
				totalSupply: s,
				fpsMarketCapInChf: p * s,
			},
			raw: {
				price: fetchedPrice.toString(),
				totalSupply: fetchedTotalSupply.toString(),
			},
		};
	}
}
