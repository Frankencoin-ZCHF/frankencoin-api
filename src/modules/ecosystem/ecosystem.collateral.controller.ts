import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemCollateralService } from './ecosystem.collateral.service';
import {
	ApiEcosystemCollateralList,
	ApiEcosystemCollateralListArray,
	ApiEcosystemCollateralPositions,
	ApiEcosystemCollateralPositionsDetails,
	ApiEcosystemCollateralStats,
} from './ecosystem.collateral.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/collateral')
export class EcosystemCollateralController {
	constructor(private readonly collateral: EcosystemCollateralService) {}

	@Get('list')
	@ApiOperation({
		summary: 'Get all collateral tokens as array',
		description:
			'Returns: ApiEcosystemCollateralListArray, an array list of all collateral tokens used in Frankencoin positions. ' +
			'Includes ERC20 token information (address, name, symbol, decimals) for each collateral type accepted by the system.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns array of collateral token information',
		schema: {
			type: 'ApiEcosystemCollateralListArray',
			properties: {
				num: { type: 'number', description: 'Total number of collateral types' },
				list: {
					type: 'array',
					description: 'Array of collateral token objects',
					items: {
						type: 'object',
						properties: {
							address: { type: 'string', description: 'Token contract address' },
							name: { type: 'string', description: 'Token name' },
							symbol: { type: 'string', description: 'Token symbol' },
							decimals: { type: 'number', description: 'Token decimals' },
						},
					},
				},
			},
			example: {
				num: 15,
				list: [
					{
						address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
						name: 'Wrapped Ether',
						symbol: 'WETH',
						decimals: 18,
					},
					{
						address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						name: 'Wrapped BTC',
						symbol: 'WBTC',
						decimals: 8,
					},
				],
			},
		},
	})
	getCollateralListArray(): ApiEcosystemCollateralListArray {
		return this.collateral.getCollateralList();
	}

	@Get('mapping')
	@ApiOperation({
		summary: 'Get all collateral tokens as mapping',
		description:
			'Returns: ApiEcosystemCollateralList, collateral token information organized as a mapping. ' +
			'Provides efficient lookup by collateral address with an index of addresses and a map of token details.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns mapping of collateral addresses to token information',
		schema: {
			type: 'ApiEcosystemCollateralList',
			properties: {
				num: { type: 'number', description: 'Total number of collateral types' },
				addresses: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of collateral addresses (lowercase)',
				},
				map: {
					type: 'object',
					description: 'Mapping of addresses to token information',
					additionalProperties: {
						type: 'object',
						properties: {
							address: { type: 'string', description: 'Token contract address' },
							name: { type: 'string', description: 'Token name' },
							symbol: { type: 'string', description: 'Token symbol' },
							decimals: { type: 'number', description: 'Token decimals' },
						},
					},
				},
			},
			example: {
				num: 15,
				addresses: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
				map: {
					'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
						address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
						name: 'Wrapped Ether',
						symbol: 'WETH',
						decimals: 18,
					},
				},
			},
		},
	})
	getCollateralMapping(): ApiEcosystemCollateralList {
		return this.collateral.getCollateralMapping();
	}

	@Get('positions')
	@ApiOperation({
		summary: 'Get collateral to position addresses mapping',
		description:
			'Returns: ApiEcosystemCollateralPositions, a mapping of collateral addresses to their associated position addresses. ' +
			'For each collateral type, shows the token information, count of positions, and array of position contract addresses using that collateral.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns collateral addresses mapped to position address arrays',
		schema: {
			type: 'ApiEcosystemCollateralPositions',
			additionalProperties: {
				type: 'object',
				properties: {
					address: { type: 'string', description: 'Collateral token address' },
					name: { type: 'string', description: 'Collateral token name' },
					symbol: { type: 'string', description: 'Collateral token symbol' },
					decimals: { type: 'number', description: 'Collateral token decimals' },
					num: { type: 'number', description: 'Number of positions using this collateral' },
					addresses: {
						type: 'array',
						items: { type: 'string' },
						description: 'Array of position contract addresses',
					},
				},
			},
			example: {
				'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
					address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
					name: 'Wrapped Ether',
					symbol: 'WETH',
					decimals: 18,
					num: 12,
					addresses: [
						'0xf68Aca3D30672C7b81CEd1215198B2a288E46Afb',
						'0xBD5678BAb4adAd591a11941E60FdDD81D6BC54dE',
						'0xA73eA04feF834E41A044f0bDDDd959a9Ff8fC639',
					],
				},
			},
		},
	})
	getCollateralPositions(): ApiEcosystemCollateralPositions {
		return this.collateral.getCollateralPositions();
	}

	@Get('positions/details')
	@ApiOperation({
		summary: 'Get collateral to position details mapping',
		description:
			'Returns: ApiEcosystemCollateralPositionsDetails, a mapping of collateral addresses to complete position details. ' +
			'For each collateral type, includes token information, position count, position addresses, and full position details.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns collateral mapped to full position details',
		schema: {
			type: 'ApiEcosystemCollateralPositionsDetails',
			additionalProperties: {
				type: 'object',
				properties: {
					address: { type: 'string', description: 'Collateral token address' },
					name: { type: 'string', description: 'Collateral token name' },
					symbol: { type: 'string', description: 'Collateral token symbol' },
					decimals: { type: 'number', description: 'Collateral token decimals' },
					num: { type: 'number', description: 'Number of positions using this collateral' },
					addresses: {
						type: 'array',
						items: { type: 'string' },
						description: 'Array of position contract addresses',
					},
					positions: {
						type: 'array',
						description: 'Array of complete position objects',
						items: { type: 'PositionQuery' },
					},
				},
			},
			example: {
				'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
					address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
					name: 'Wrapped Ether',
					symbol: 'WETH',
					decimals: 18,
					num: 5,
					addresses: ['0x8AeEAcb941B7d3a75F64bf76c9758f5967B64cf7'],
					positions: [
						{
							version: 2,
							position: '0x8AeEAcb941B7d3a75F64bf76c9758f5967B64cf7',
							owner: '0x3E847b606803D5bf44Bd153f920F0e273FEb4af',
							collateral: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
							price: '1100000000000000000000',
							isOriginal: false,
							isClone: true,
							collateralBalance: '4000000000000000000',
							minted: '4400000000000000000000',
						},
					],
				},
			},
		},
	})
	getCollateralPositionsDetails(): ApiEcosystemCollateralPositionsDetails {
		return this.collateral.getCollateralPositionsDetails();
	}

	@Get('stats')
	@ApiOperation({
		summary: 'Get collateral statistics',
		description:
			'Returns: ApiEcosystemCollateralStats, comprehensive statistics for each collateral type in the ecosystem. ' +
			'Includes position counts (total, open, closed, denied, originals, clones), prices, total minted amounts, limits, ' +
			'total value locked (TVL) per collateral, and overall system TVL.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns detailed statistics per collateral type',
		schema: {
			type: 'ApiEcosystemCollateralStats',
			properties: {
				num: { type: 'number', description: 'Total number of collateral types' },
				addresses: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of collateral addresses',
				},
				totalValueLocked: {
					type: 'object',
					properties: {
						usd: { type: 'number', description: 'Total value locked across all collateral in USD' },
						chf: { type: 'number', description: 'Total value locked across all collateral in CHF' },
					},
				},
				map: {
					type: 'object',
					description: 'Mapping of addresses to collateral statistics',
					additionalProperties: {
						type: 'object',
						properties: {
							address: { type: 'string', description: 'Collateral token address' },
							name: { type: 'string', description: 'Collateral token name' },
							symbol: { type: 'string', description: 'Collateral token symbol' },
							decimals: { type: 'number', description: 'Collateral token decimals' },
							positions: {
								type: 'object',
								properties: {
									total: { type: 'number', description: 'Total positions' },
									open: { type: 'number', description: 'Open positions' },
									requested: { type: 'number', description: 'Requested positions' },
									closed: { type: 'number', description: 'Closed positions' },
									denied: { type: 'number', description: 'Denied positions' },
									originals: { type: 'number', description: 'Original positions' },
									clones: { type: 'number', description: 'Cloned positions' },
								},
							},
							price: {
								type: 'object',
								properties: {
									usd: { type: 'number', description: 'Price in USD' },
									chf: { type: 'number', description: 'Price in CHF' },
								},
							},
							totalMinted: { type: 'number', description: 'Total ZCHF minted against this collateral' },
							totalLimit: { type: 'number', description: 'Total minting limit for this collateral' },
							totalBalanceRaw: { type: 'string', description: 'Total collateral balance (in wei)' },
							totalValueLocked: {
								type: 'object',
								properties: {
									usd: { type: 'number', description: 'TVL for this collateral in USD' },
									chf: { type: 'number', description: 'TVL for this collateral in CHF' },
								},
							},
						},
					},
				},
			},
			example: {
				num: 15,
				addresses: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
				totalValueLocked: {
					usd: 66929716.79102999,
					chf: 53118822.850023806,
				},
				map: {
					'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
						address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
						name: 'Wrapped Ether',
						symbol: 'WETH',
						decimals: 18,
						positions: {
							total: 5,
							open: 5,
							requested: 0,
							closed: 0,
							denied: 0,
							originals: 0,
							clones: 5,
						},
						totalMinted: 618043,
						totalLimit: 10000000,
						totalBalanceRaw: '441000000000000000000',
						totalValueLocked: {
							usd: 1361821.23,
							chf: 1080810.5,
						},
						price: {
							usd: 3088.03,
							chf: 2450.82,
						},
					},
				},
			},
		},
	})
	getCollateralStats(): ApiEcosystemCollateralStats {
		return this.collateral.getCollateralStats();
	}
}
