import { Injectable, Logger } from '@nestjs/common';
import { gql } from '@apollo/client/core';
import { PONDER_CLIENT } from 'api.config';
import {
	ServiceEcosystemFrankencoinMapping,
	EcosystemQueryItem,
	// ApiEcosystemFrankencoinInfo,
	ServiceEcosystemFrankencoinKeyValues,
	ApiEcosystemFrankencoinKeyValues,
	EcosystemERC20StatusQueryItem,
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
	private ecosystemFrankencoinKeyValues: ServiceEcosystemFrankencoinKeyValues;
	private ecosystemFrankencoin: ServiceEcosystemFrankencoinMapping = {} as ServiceEcosystemFrankencoinMapping;

	constructor(
		private readonly fpsService: EcosystemFpsService
		// private readonly collService: EcosystemCollateralService,
		// private readonly pricesService: PricesService
	) {}

	getEcosystemFrankencoinKeyValues(): ApiEcosystemFrankencoinKeyValues {
		return this.ecosystemFrankencoinKeyValues;
	}

	getEcosystemFrankencoinInfo(): ApiEcosystemFrankencoinInfo {
		return {
			erc20: {
				name: 'Frankencoin',
				symbol: 'ZCHF',
				decimals: 18,
			},
			chains: this.ecosystemFrankencoin,
			price: {
				usd: 0,
				// usd: Object.values(this.pricesService.getPrices()).find((p) => p.symbol === 'ZCHF')?.price?.usd || 1,
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
				items: EcosystemQueryItem[];
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
		const mappingKeyValues: ServiceEcosystemFrankencoinKeyValues = {};
		for (const i of d) {
			mappingKeyValues[i.id] = i;
		}

		this.ecosystemFrankencoinKeyValues = { ...mappingKeyValues };
	}

	async updateEcosystemERC20Status() {
		this.logger.debug('Updating EcosystemERC20Status');
		const response = await PONDER_CLIENT.query<{
			eRC20Statuss: {
				items: EcosystemERC20StatusQueryItem[];
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
				updated: i.updated,
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
