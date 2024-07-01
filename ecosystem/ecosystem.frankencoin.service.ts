import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { gql } from '@apollo/client/core';
import { CONFIG, CONFIG_PROFILE, PONDER_CLIENT } from 'app.config';
import {
	ServiceEcosystemFrankencoin,
	ServiceEcosystemMintBurnMapping,
	EcosystemQueryItem,
	MintBurnAddressMapperQueryItem,
	ApiEcosystemFrankencoinInfo,
	ApiEcosystemMintBurnMapping,
} from './ecosystem.frankencoin.types';
import { ADDRESS } from 'contracts/address';
import { PricesService } from 'prices/prices.service';
import { Address } from 'viem';

@Injectable()
export class EcosystemFrankencoinService {
	private readonly logger = new Logger(this.constructor.name);
	private ecosystemFrankencoin: ServiceEcosystemFrankencoin;
	private ecosystemMintBurnMapping: ServiceEcosystemMintBurnMapping = {};

	constructor(private readonly pricesService: PricesService) {
		setTimeout(() => this.updateEcosystemKeyValues(), 100);
		setTimeout(() => this.updateEcosystemMintBurnMapping(), 100);
	}

	getEcosystemFrankencoinInfo(): ApiEcosystemFrankencoinInfo {
		return {
			erc20: {
				name: 'Frankencoin',
				address: ADDRESS[CONFIG[CONFIG_PROFILE].chain.id as number].frankenCoin,
				symbol: 'ZCHF',
				decimals: 18,
			},
			chain: {
				name: CONFIG[CONFIG_PROFILE].chain.name,
				id: CONFIG[CONFIG_PROFILE].chain.id,
			},
			price: {
				usd: Object.values(this.pricesService.getPrices()).find((p) => p.symbol === 'ZCHF')?.price.usd,
			},
			...this.ecosystemFrankencoin,
		};
	}

	getEcosystemMintBurnMapping(): ApiEcosystemMintBurnMapping {
		return {
			num: Object.keys(this.ecosystemMintBurnMapping).length,
			addresses: Object.keys(this.ecosystemMintBurnMapping) as Address[],
			map: this.ecosystemMintBurnMapping,
		};
	}

	@Interval(10_000)
	async updateEcosystemKeyValues() {
		this.logger.debug('updateEcosystemKeyValues');
		const ecosystem = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					ecosystems(orderBy: "id") {
						items {
							id
							value
							amount
						}
					}
				}
			`,
		});

		if (!ecosystem.data || !ecosystem.data.ecosystems.items) {
			this.logger.warn('No ecosystem data found.');
			return;
		}

		const e = ecosystem.data.ecosystems.items as EcosystemQueryItem[];
		const getItem = (key: string) => e.find((i) => i.id === key);

		const mint: number = parseInt(getItem('Frankencoin:Mint')?.amount.toString() ?? '0') / 10 ** 18;
		const burn: number = parseInt(getItem('Frankencoin:Burn')?.amount.toString() ?? '0') / 10 ** 18;
		const supply: number = mint - burn;

		this.ecosystemFrankencoin = {
			total: {
				mint: mint,
				burn: burn,
				supply: supply,
			},
			raw: {
				mint: getItem('Frankencoin:Mint')?.amount.toString() ?? '0',
				burn: getItem('Frankencoin:Burn')?.amount.toString() ?? '0',
			},
			counter: {
				mint: parseInt(getItem('Frankencoin:MintCounter')?.amount.toString() ?? '0'),
				burn: parseInt(getItem('Frankencoin:BurnCounter')?.amount.toString() ?? '0'),
			},
		};
	}

	@Interval(10_000)
	async updateEcosystemMintBurnMapping() {
		this.logger.debug('updateEcosystemMintBurnMapping');

		// FIXME: build a fetcher... with start and offset. (first:2 offset:2)
		const response = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					mintBurnAddressMappers(orderBy: "id", limit: 1000) {
						items {
							id
							mint
							burn
						}
					}
				}
			`,
		});

		if (!response.data || !response.data.mintBurnAddressMappers.items) {
			this.logger.warn('No mints data found.');
			return;
		}

		const e = response.data.mintBurnAddressMappers.items as MintBurnAddressMapperQueryItem[];

		for (const item of e) {
			this.ecosystemMintBurnMapping[item.id] = {
				mint: item.mint,
				burn: item.burn,
			};
		}
	}
}
