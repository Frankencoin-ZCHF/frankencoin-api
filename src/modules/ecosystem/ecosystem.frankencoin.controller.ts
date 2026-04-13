import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemFrankencoinService } from './ecosystem.frankencoin.service';
import {
	ApiEcosystemFrankencoinInfo,
	ApiEcosystemFrankencoinKeyValues,
	ApiEcosystemFrankencoinSupply,
} from './ecosystem.frankencoin.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/frankencoin')
export class EcosystemFrankencoinController {
	constructor(private readonly frankencoin: EcosystemFrankencoinService) {}

	@Get('info')
	@ApiOperation({
		summary: 'Get Frankencoin ecosystem information',
		description:
			'Returns: ApiEcosystemFrankencoinInfo, comprehensive information about the Frankencoin (ZCHF) stablecoin including ERC20 details, multichain deployments with supply per chain, token metrics (price, total supply), FPS token data, and total value locked (TVL) in USD and CHF.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns complete Frankencoin ecosystem information',
		schema: {
			type: 'ApiEcosystemFrankencoinInfo',
			properties: {
				erc20: {
					type: 'object',
					properties: {
						name: { type: 'string', description: 'Token name' },
						symbol: { type: 'string', description: 'Token symbol' },
						decimals: { type: 'number', description: 'Token decimals' },
					},
				},
				chains: {
					type: 'object',
					description: 'Chain deployment details keyed by chainId',
					additionalProperties: {
						type: 'object',
						properties: {
							chainId: { type: 'number', description: 'Blockchain chain ID' },
							updated: { type: 'number', description: 'Last update timestamp' },
							address: { type: 'string', description: 'Token contract address on this chain' },
							supply: { type: 'number', description: 'Total supply on this chain' },
							counter: {
								type: 'object',
								properties: {
									mint: { type: 'number', description: 'Number of mint transactions' },
									burn: { type: 'number', description: 'Number of burn transactions' },
									balance: { type: 'number', description: 'Number of balance updates' },
								},
							},
						},
					},
				},
				token: {
					type: 'object',
					properties: {
						usd: { type: 'number', description: 'Current USD price' },
						supply: { type: 'number', description: 'Total supply across all chains' },
					},
				},
				fps: {
					type: 'object',
					properties: {
						price: { type: 'number', description: 'FPS token price' },
						totalSupply: { type: 'number', description: 'Total FPS supply' },
						marketCap: { type: 'number', description: 'FPS market capitalization' },
					},
				},
				tvl: {
					type: 'object',
					properties: {
						usd: { type: 'number', description: 'Total value locked in USD' },
						chf: { type: 'number', description: 'Total value locked in CHF' },
					},
				},
			},
			example: {
				erc20: {
					name: 'Frankencoin',
					symbol: 'ZCHF',
					decimals: 18,
				},
				chains: {
					'1': {
						chainId: 1,
						updated: 1768915583,
						address: '0xb58e61c3098d85632df34eecfb899a1ed80921cb',
						supply: 20382979.622031458,
						counter: {
							mint: 1096,
							burn: 719,
							balance: 42384,
						},
					},
					'100': {
						chainId: 100,
						updated: 1768915210,
						address: '0xd4dd9e2f021bb459d5a5f6c24c12fe09c5d45553',
						supply: 900667.2199570168,
						counter: {
							mint: 2191,
							burn: 210,
							balance: 26784,
						},
					},
				},
				token: {
					usd: 1.26,
					supply: 22039302.79907093,
				},
				fps: {
					price: 1234.4878159510345,
					totalSupply: 8807.138265408352,
					marketCap: 10872304.882042738,
				},
				tvl: {
					usd: 66946741.70102999,
					chf: 53132334.68335714,
				},
			},
		},
	})
	getFrankencoinInfo(): ApiEcosystemFrankencoinInfo {
		return this.frankencoin.getEcosystemFrankencoinInfo();
	}

	@Get('keyvalues')
	@ApiOperation({
		summary: 'Get Frankencoin key-value metrics',
		description:
			'Returns: ApiEcosystemFrankencoinKeyValues, a comprehensive mapping of all ecosystem metrics and counters. ' +
			'Includes transaction counters, equity metrics (investments, redemptions, profits/losses), minter statistics, ' +
			'position and challenge counters, savings totals, and transfer references. Each key contains an object with id, value, amount, and __typename.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns key-value mapping of ecosystem metrics',
		schema: {
			type: 'ApiEcosystemFrankencoinKeyValues',
			additionalProperties: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Metric identifier' },
					value: { type: 'string', description: 'Optional string value' },
					amount: { type: 'string', description: 'Numeric amount as string' },
					__typename: { type: 'string', description: 'GraphQL typename' },
				},
			},
			example: {
				'Analytics:TransactionLogCounter': {
					id: 'Analytics:TransactionLogCounter',
					value: '',
					amount: '6627',
					__typename: 'CommonEcosystem',
				},
				'Equity:Profits': {
					id: 'Equity:Profits',
					value: '',
					amount: '1136496222253052819761165',
					__typename: 'CommonEcosystem',
				},
				'Equity:Losses': {
					id: 'Equity:Losses',
					value: '',
					amount: '43256249982437523974634',
					__typename: 'CommonEcosystem',
				},
				'Frankencoin:MinterAppliedCounter': {
					id: 'Frankencoin:MinterAppliedCounter',
					value: '',
					amount: '33',
					__typename: 'CommonEcosystem',
				},
				'MintingHubV2:TotalPositions': {
					id: 'MintingHubV2:TotalPositions',
					value: '',
					amount: '76',
					__typename: 'CommonEcosystem',
				},
				'Savings:TotalSaved': {
					id: 'Savings:TotalSaved',
					value: '',
					amount: '20242891065224645247929430',
					__typename: 'CommonEcosystem',
				},
			},
		},
	})
	getFrankencoinKeyValues(): ApiEcosystemFrankencoinKeyValues {
		return this.frankencoin.getEcosystemFrankencoinKeyValues();
	}

	@Get('totalsupply')
	@ApiOperation({
		summary: 'Get Frankencoin total supply history',
		description:
			'Returns: ApiEcosystemFrankencoinSupply, a historical time series of Frankencoin total supply with multichain allocation breakdown. ' +
			'Keys are Unix timestamps representing daily snapshots. Each entry includes total supply and allocation per chain ID. ' +
			'Limited to the latest 1000 days of history.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns daily total supply history with chain allocation',
		schema: {
			type: 'ApiEcosystemFrankencoinSupply',
			additionalProperties: {
				type: 'object',
				properties: {
					created: { type: 'number', description: 'Unix timestamp for this snapshot' },
					supply: { type: 'number', description: 'Total supply across all chains' },
					allocation: {
						type: 'object',
						description: 'Supply breakdown by chain ID',
						additionalProperties: { type: 'number' },
					},
				},
			},
			example: {
				'1698451200': {
					created: 1698451200,
					supply: 25000,
					allocation: {
						'1': 25000,
						'10': 0,
						'100': 0,
						'137': 0,
						'146': 0,
						'8453': 0,
						'42161': 0,
						'43114': 0,
					},
				},
				'1698537600': {
					created: 1698537600,
					supply: 26001,
					allocation: {
						'1': 26001,
						'10': 0,
						'100': 0,
						'137': 0,
						'146': 0,
						'8453': 0,
						'42161': 0,
						'43114': 0,
					},
				},
			},
		},
	})
	getTotalSupply(): ApiEcosystemFrankencoinSupply {
		return this.frankencoin.getTotalSupply();
	}
}
