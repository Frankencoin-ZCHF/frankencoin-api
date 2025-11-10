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
	EcosystemERC20TotalSupply,
	FrankencoinSupplyQueryObject,
	FrankencoinSupplyQuery,
} from './ecosystem.frankencoin.types';
import { PricesService } from 'prices/prices.service';
import { EcosystemFpsService } from './ecosystem.fps.service';
import { EcosystemCollateralService } from './ecosystem.collateral.service';
import { ADDRESS, ChainId, SupportedChainIds, SupportedChains } from '@frankencoin/zchf';
import { formatFloat } from 'utils/format';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Address, formatUnits } from 'viem';
import { Storj } from 'storj/storj.s3.service';
import { SupplyQueryObjectDTO } from './dtos/supply.query.dto';

@Injectable()
export class EcosystemFrankencoinService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly storjPath: string = '/ecosystem.totalSupply.json';
	private ecosystemFrankencoinKeyValues: EcosystemFrankencoinKeyValues;
	private ecosystemFrankencoin: EcosystemFrankencoinMapping = {} as EcosystemFrankencoinMapping;
	private ecosystemTotalSupply: FrankencoinSupplyQueryObject = {} as FrankencoinSupplyQueryObject;

	constructor(
		private readonly storj: Storj,
		private readonly fpsService: EcosystemFpsService,
		private readonly collService: EcosystemCollateralService,
		private readonly pricesService: PricesService
	) {
		this.readBackupSupplyQuery();
	}

	async readBackupSupplyQuery() {
		this.logger.log(`Reading backup readBackupSupplyQuery from storj`);
		const response = await this.storj.read(this.storjPath, SupplyQueryObjectDTO);

		if (response.messageError || response.validationError.length > 0) {
			this.logger.error(response.messageError);
		} else {
			this.ecosystemTotalSupply = { ...this.ecosystemTotalSupply, ...response.data };
			this.logger.log(`readBackupSupplyQuery state restored...`);
		}
	}
	async writeBackupSupplyQuery() {
		const response = await this.storj.write(this.storjPath, this.ecosystemTotalSupply);
		const httpStatusCode = response['$metadata'].httpStatusCode;

		if (httpStatusCode == 200) {
			this.logger.log(`writeBackupSupplyQuery backup stored`);
		} else {
			this.logger.error(`writeBackupSupplyQuery backup failed. httpStatusCode: ${httpStatusCode}`);
		}
	}

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
				usd: Object.values(this.pricesService.getPrices()).find((p) => p.symbol === 'ZCHF')?.price?.usd || 1,
				supply,
			},
			fps: this.fpsService.getEcosystemFpsInfo()?.token,
			tvl: this.collService.getCollateralStats()?.totalValueLocked ?? {},
		};
	}

	getKeyValueItem(key: string) {
		return this.ecosystemFrankencoinKeyValues?.[key];
	}

	getTotalSupply() {
		return this.ecosystemTotalSupply;
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

	@Cron(CronExpression.EVERY_HOUR)
	async updateTotalSupply() {
		this.logger.debug('Updating updateTotalSupply');

		const data: EcosystemERC20TotalSupply = {} as EcosystemERC20TotalSupply;
		const returnData: FrankencoinSupplyQueryObject = {};

		for (const chain of Object.values(SupportedChains)) {
			const chainId = chain.id;
			let frankencoin: Address;

			if (chainId == 1) {
				frankencoin = ADDRESS[chainId].frankencoin;
			} else {
				frankencoin = ADDRESS[chainId].ccipBridgedFrankencoin;
			}

			const response = await PONDER_CLIENT.query<{
				eRC20TotalSupplys: {
					items: EcosystemERC20TotalSupply[];
				};
			}>({
				fetchPolicy: 'no-cache',
				query: gql`
				query {
					eRC20TotalSupplys(
						orderBy: "created"
						orderDirection: "asc"
						where: { chainId: ${chainId}, token: "${frankencoin}" }
						limit: 1000
					) {
						items {
							supply
							created
						}
					}
				}
			`,
			});

			if (!response.data || !response.data.eRC20TotalSupplys.items) {
				this.logger.warn(`No eRC20TotalSupplys data (chain: ${chain.name}) found.`);
				return;
			}

			const items = response.data.eRC20TotalSupplys.items;

			data[chainId] = items;

			items.forEach((i) => {
				if (returnData[i.created] == undefined)
					returnData[i.created] = {
						created: i.created,
						supply: 0,
						allocation: {
							[chainId]: parseFloat(formatUnits(i.supply, 18)),
						} as FrankencoinSupplyQuery['allocation'],
					};
				else {
					const alloc = returnData[i.created]['allocation'];
					returnData[i.created]['allocation'] = { ...alloc, [chainId]: parseFloat(formatUnits(i.supply, 18)) };
				}
			});
		}

		const timestampKeys = Object.keys(returnData);

		for (let i = 0; i < timestampKeys.length; i++) {
			let prev: FrankencoinSupplyQuery['allocation'] = {} as FrankencoinSupplyQuery['allocation'];
			if (i == 0) {
				SupportedChainIds.forEach((id) => {
					prev[id] = 0;
				});
			} else {
				prev = returnData[timestampKeys[i - 1]].allocation;
			}

			const created = parseInt(timestampKeys[i]) as FrankencoinSupplyQuery['created'];
			const data = returnData[created];

			const alloc = {
				...prev,
				...data.allocation,
			};

			const supply = Object.values(alloc).reduce((a, b) => a + b, 0);

			returnData[created] = {
				created,
				supply,
				allocation: {
					...alloc,
				},
			};
		}

		const snapshotBefore = JSON.stringify(this.ecosystemTotalSupply);
		this.ecosystemTotalSupply = { ...this.ecosystemTotalSupply, ...returnData };
		const snapshotAfter = JSON.stringify(this.ecosystemTotalSupply);

		if (snapshotAfter != snapshotBefore) this.writeBackupSupplyQuery();
	}
}
