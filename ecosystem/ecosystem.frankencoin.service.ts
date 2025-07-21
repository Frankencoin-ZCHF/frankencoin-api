import { Injectable, Logger } from '@nestjs/common';
import { gql } from '@apollo/client/core';
import { PONDER_CLIENT } from 'api.config';
import {
	EcosystemQuery,
	EcosystemERC20StatusQuery,
	EcosystemFrankencoinKeyValues,
	EcosystemFrankencoinMapping,
	ApiEcosystemFrankencoinKeyValues,
	ApiEcosystemFrankencoinInfo,
} from './ecosystem.frankencoin.types';
// import { PricesService } from 'prices/prices.service';
import { EcosystemFpsService } from './ecosystem.fps.service';
// import { EcosystemCollateralService } from './ecosystem.collateral.service';
import { ADDRESS, ChainId } from '@frankencoin/zchf';
import { formatFloat } from 'utils/format';

@Injectable()
export class EcosystemFrankencoinService {
	private readonly logger = new Logger(this.constructor.name);
	private ecosystemFrankencoinKeyValues: EcosystemFrankencoinKeyValues;
	private ecosystemFrankencoin: EcosystemFrankencoinMapping = {} as EcosystemFrankencoinMapping;

	constructor(
		private readonly fpsService: EcosystemFpsService
		// private readonly collService: EcosystemCollateralService,
		// private readonly pricesService: PricesService
	) {}

	getEcosystemFrankencoinKeyValues(): ApiEcosystemFrankencoinKeyValues {
		return this.ecosystemFrankencoinKeyValues;
	}

	getEcosystemFrankencoinInfo(): ApiEcosystemFrankencoinInfo {
		const supply = Object.values(this.ecosystemFrankencoin).reduce((a, b) => {
			return a + b.supply;
		}, 0);

		return {
			erc20: {
				name: 'Frankencoin',
				symbol: 'ZCHF',
				decimals: 18,
			},
			chains: this.ecosystemFrankencoin,
			token: {
				usd: 0,
				// usd: Object.values(this.pricesService.getPrices()).find((p) => p.symbol === 'ZCHF')?.price?.usd || 1,
				supply,
			},
			fps: this.fpsService.getEcosystemFpsInfo()?.token,
			tvl: {
				usd: 1,
			},
			// tvl: this.collService.getCollateralStats()?.totalValueLocked ?? {},
		};
	}

	getKeyValueItem(key: string) {
		return this.ecosystemFrankencoinKeyValues?.[key];
	}

	async updateEcosystemKeyValues() {
		this.logger.debug('Updating EcosystemKeyValues');
		const response = await PONDER_CLIENT.query<{
			commonEcosystems: {
				items: EcosystemQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					commonEcosystems(orderBy: "id", limit: 1000) {
						items {
							id
							value
							amount
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.commonEcosystems.items) {
			this.logger.warn('No commonEcosystems data found.');
			return;
		}

		const d = response.data.commonEcosystems.items;

		// key values mapping
		const mappingKeyValues: EcosystemFrankencoinKeyValues = {};
		for (const i of d) {
			mappingKeyValues[i.id] = i;
		}

		this.ecosystemFrankencoinKeyValues = { ...mappingKeyValues };
	}

	async updateEcosystemERC20Status() {
		this.logger.debug('Updating EcosystemERC20Status');
		const response = await PONDER_CLIENT.query<{
			eRC20Statuss: {
				items: EcosystemERC20StatusQuery[];
			};
		}>({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					eRC20Statuss(orderBy: "updated", orderDirection: "DESC", limit: 1000) {
						items {
							balance
							burn
							chainId
							mint
							supply
							token
							updated
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.eRC20Statuss.items) {
			this.logger.warn('No eRC20Statuss data found.');
			return;
		}

		const d = response.data.eRC20Statuss.items;

		// chainId mapping
		for (const i of d) {
			// verify chainId with token address
			if (i.chainId == 1) {
				const a = ADDRESS[i.chainId].frankencoin.toLowerCase();
				if (a != i.token) continue;
			} else {
				const a = ADDRESS[i.chainId].ccipBridgedFrankencoin.toLowerCase();
				if (a != i.token) continue;
			}

			this.ecosystemFrankencoin[i.chainId as ChainId] = {
				chainId: i.chainId,
				updated: parseInt(i.updated as any),
				address: i.token,
				supply: formatFloat(i.supply),
				counter: {
					mint: formatFloat(i.mint, 0),
					burn: formatFloat(i.burn, 0),
					balance: formatFloat(i.balance, 0),
				},
			};
		}
	}
}
