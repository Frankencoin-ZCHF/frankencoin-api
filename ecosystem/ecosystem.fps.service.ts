import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT, VIEM_CONFIG } from 'api.config';
import { ApiEcosystemFpsInfo } from './ecosystem.fps.types';
import { gql } from '@apollo/client/core';
import { ADDRESS } from '@frankencoin/zchf';
import { EquityABI, FrankencoinABI } from '@frankencoin/zchf';
import { mainnet } from 'viem/chains';
import { formatFloat } from 'utils/format';

@Injectable()
export class EcosystemFpsService {
	private readonly logger = new Logger(this.constructor.name);
	private fpsInfo: ApiEcosystemFpsInfo;

	getEcosystemFpsInfo(): ApiEcosystemFpsInfo {
		return this.fpsInfo;
	}

	async updateFpsInfo() {
		this.logger.debug('Updating EcosystemFpsInfo');

		const chainId = mainnet.id;
		const addr = ADDRESS[chainId].equity;

		const fetchedPrice = await VIEM_CONFIG[chainId].readContract({
			address: addr,
			abi: EquityABI,
			functionName: 'price',
		});
		const fetchedTotalSupply = await VIEM_CONFIG[chainId].readContract({
			address: addr,
			abi: EquityABI,
			functionName: 'totalSupply',
		});

		const fetchedMinterReserve = await VIEM_CONFIG[chainId].readContract({
			address: ADDRESS[chainId].frankencoin,
			abi: FrankencoinABI,
			functionName: 'minterReserve',
		});

		const fetchedBalanceReserve = await VIEM_CONFIG[chainId].readContract({
			address: ADDRESS[chainId].frankencoin,
			abi: FrankencoinABI,
			functionName: 'balanceOf',
			args: [ADDRESS[chainId].equity],
		});

		const response = await PONDER_CLIENT.query<{
			frankencoinProfitLosss: {
				items: {
					profits: bigint;
					losses: bigint;
				}[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					frankencoinProfitLosss(orderBy: "count", orderDirection: "DESC", limit: 1) {
						items {
							losses
							profits
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.frankencoinProfitLosss.items) {
			this.logger.warn('No profitLossPonder data found.');
			return;
		}

		const d = response.data.frankencoinProfitLosss.items.at(0);

		this.fpsInfo = {
			erc20: {
				name: 'Frankencoin Pool Share',
				address: ADDRESS[mainnet.id].equity,
				symbol: 'FPS',
				decimals: 18,
			},
			chain: {
				name: mainnet.name,
				id: mainnet.id,
			},
			token: {
				price: formatFloat(fetchedPrice),
				totalSupply: formatFloat(fetchedTotalSupply),
				marketCap: formatFloat(fetchedPrice * fetchedTotalSupply, 18 * 2),
			},
			earnings: {
				profit: formatFloat(d.profits),
				loss: formatFloat(d.losses),
			},
			reserve: {
				balance: formatFloat(fetchedBalanceReserve - fetchedMinterReserve),
				equity: formatFloat(fetchedBalanceReserve),
				minter: formatFloat(fetchedMinterReserve),
			},
		};
	}
}
