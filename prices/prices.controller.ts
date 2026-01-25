import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	ApiOwnerValueLocked,
	ApiPriceERC20,
	ApiPriceERC20Mapping,
	ApiPriceListing,
	ApiPriceMapping,
	PriceQueryCurrencies,
} from 'prices/prices.types';
import { PricesService } from './prices.service';
import { isAddress } from 'viem';

@ApiTags('Prices Controller')
@Controller('prices')
export class PricesController {
	constructor(private readonly pricesService: PricesService) {}

	@Get('ticker/:ticker')
	@ApiOperation({
		summary: 'Get price for a specific ticker',
		description:
			'Returns: PriceQueryCurrencies, the current price in USD and CHF for a specific token ticker symbol. ' +
			'Common tickers include WBTC, WETH, FPS, etc. Returns an error if the ticker is not found.',
	})
	@ApiParam({
		name: 'ticker',
		description: 'Token ticker symbol (e.g., WBTC, WETH, FPS)',
		example: 'WBTC',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns price in USD and CHF',
		schema: {
			type: 'PriceQueryCurrencies',
			properties: {
				usd: { type: 'number', description: 'Price in USD' },
				chf: { type: 'number', description: 'Price in CHF' },
			},
			example: {
				usd: 90611,
				chf: 71913.49,
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Ticker not found error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'No asset found' },
				chf: { type: 'number', example: 0 },
				usd: { type: 'number', example: 0 },
			},
		},
	})
	getTicker(@Param('ticker') ticker: string): PriceQueryCurrencies & { error?: string } {
		const matching = this.pricesService.getPrices().find((p) => p.symbol == ticker);
		if (matching == undefined) {
			return {
				error: 'No asset found',
				chf: 0,
				usd: 0,
			};
		} else {
			return matching.price;
		}
	}

	@Get('list')
	@ApiOperation({
		summary: 'Get all token prices',
		description:
			'Returns: ApiPriceListing, a list of all tracked token prices in the Frankencoin ecosystem. ' +
			'Includes token information (address, name, symbol, decimals) and current prices in USD and CHF.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns an array of price queries with token info and prices',
		schema: {
			type: 'ApiPriceListing',
			items: {
				type: 'PriceQuery',
				properties: {
					address: { type: 'string', description: 'Token contract address' },
					name: { type: 'string', description: 'Token name' },
					symbol: { type: 'string', description: 'Token symbol' },
					decimals: { type: 'number', description: 'Token decimals' },
					timestamp: { type: 'number', description: 'Last update timestamp in milliseconds' },
					price: {
						type: 'object',
						properties: {
							usd: { type: 'number', description: 'Price in USD' },
							chf: { type: 'number', description: 'Price in CHF' },
						},
					},
				},
			},
			example: [
				{
					address: '0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2',
					name: 'Frankencoin Pool Share',
					symbol: 'FPS',
					decimals: 18,
					timestamp: 1768915146172,
					price: {
						usd: 1555.45,
						chf: 1234.49,
					},
				},
			],
		},
	})
	getList(): ApiPriceListing {
		return this.pricesService.getPrices();
	}

	@Get('mapping')
	@ApiOperation({
		summary: 'Get token prices as a mapping',
		description:
			'Returns: ApiPriceMapping, token prices organized as a key-value mapping where token addresses are keys. ' +
			'This format provides efficient lookup by token address.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of token addresses to their price queries',
		schema: {
			type: 'ApiPriceMapping',
			additionalProperties: {
				type: 'PriceQuery',
			},
			example: {
				'0x1ba26788dfde592fec8bcb0eaff472a42be341b2': {
					address: '0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2',
					name: 'Frankencoin Pool Share',
					symbol: 'FPS',
					decimals: 18,
					timestamp: 1768915146172,
					price: {
						usd: 1555.45,
						chf: 1234.49,
					},
				},
			},
		},
	})
	getListMapping(): ApiPriceMapping {
		return this.pricesService.getPricesMapping();
	}

	@Get('erc20/mint')
	@ApiOperation({
		summary: 'Get Frankencoin (ZCHF) token info',
		description:
			'Returns: ApiPriceERC20, ERC20 token information for the Frankencoin (ZCHF) mint token. ' +
			'Includes address, name, symbol, and decimals.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns ERC20 token information for ZCHF',
		schema: {
			type: 'ApiPriceERC20',
			properties: {
				address: { type: 'string', description: 'Token contract address' },
				name: { type: 'string', description: 'Token name' },
				symbol: { type: 'string', description: 'Token symbol' },
				decimals: { type: 'number', description: 'Token decimals' },
			},
			example: {
				address: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
				name: 'Frankencoin',
				symbol: 'ZCHF',
				decimals: 18,
			},
		},
	})
	getMint(): ApiPriceERC20 {
		return this.pricesService.getMint();
	}

	@Get('erc20/fps')
	@ApiOperation({
		summary: 'Get FPS token info',
		description:
			'Returns: ApiPriceERC20, ERC20 token information for the Frankencoin Pool Share (FPS) token. ' +
			'Includes address, name, symbol, and decimals.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns ERC20 token information for FPS',
		schema: {
			type: 'ApiPriceERC20',
			properties: {
				address: { type: 'string', description: 'Token contract address' },
				name: { type: 'string', description: 'Token name' },
				symbol: { type: 'string', description: 'Token symbol' },
				decimals: { type: 'number', description: 'Token decimals' },
			},
			example: {
				address: '0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2',
				name: 'Frankencoin Pool Share',
				symbol: 'FPS',
				decimals: 18,
			},
		},
	})
	getFps(): ApiPriceERC20 {
		return this.pricesService.getFps();
	}

	@Get('erc20/collateral')
	@ApiOperation({
		summary: 'Get all collateral token info',
		description:
			'Returns: ApiPriceERC20Mapping, ERC20 token information for all collateral tokens used in positions. ' +
			'Maps collateral addresses to their token information.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of collateral addresses to their ERC20 info',
		schema: {
			type: 'ApiPriceERC20Mapping',
			additionalProperties: {
				type: 'ApiPriceERC20',
			},
			example: {
				'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
					address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
					name: 'Wrapped Ether',
					symbol: 'WETH',
					decimals: 18,
				},
			},
		},
	})
	getCollateral(): ApiPriceERC20Mapping {
		return this.pricesService.getCollateral();
	}

	@Get('owner/:address/valueLocked')
	@ApiOperation({
		summary: 'Get owner total value locked history',
		description:
			'Returns: ApiOwnerValueLocked, a yearly time series of the total collateral value locked in positions owned by a specific address. ' +
			'Keys are Unix timestamps representing year boundaries, values are the total value in ZCHF (as string to preserve precision). ' +
			'Limited to 1000 entries.',
	})
	@ApiParam({
		name: 'address',
		description: 'Owner wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns yearly mapping of timestamps to total value locked',
		schema: {
			type: 'ApiOwnerValueLocked',
			additionalProperties: {
				type: 'string',
				description: 'Total value locked in ZCHF (as string to preserve precision)',
			},
			example: {
				'2024': '16629936923542038402532305',
				'2025': '21176673489687018495279912',
				'2026': '15742807118611175531762920',
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address not valid' },
			},
		},
	})
	async getOwnerValueLocked(@Param('address') owner: string): Promise<ApiOwnerValueLocked | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		return await this.pricesService.getOwnerValueLocked(owner);
	}

	@Get('marketChart')
	@ApiOperation({
		summary: 'Get Frankencoin market chart data',
		description:
			'Returns: ApiPriceMarketChart, historical chart data for Frankencoin (ZCHF) from CoinGecko. ' +
			'Includes arrays of [timestamp, value] pairs for prices, market caps, and trading volumes over time.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns market chart data with prices, market caps, and volumes',
		schema: {
			type: 'ApiPriceMarketChart',
			properties: {
				prices: {
					type: 'array',
					items: {
						type: 'array',
						items: { type: 'number' },
						minItems: 2,
						maxItems: 2,
					},
					description: 'Array of [timestamp, price] pairs',
				},
				market_caps: {
					type: 'array',
					items: {
						type: 'array',
						items: { type: 'number' },
						minItems: 2,
						maxItems: 2,
					},
					description: 'Array of [timestamp, market_cap] pairs',
				},
				total_volumes: {
					type: 'array',
					items: {
						type: 'array',
						items: { type: 'number' },
						minItems: 2,
						maxItems: 2,
					},
					description: 'Array of [timestamp, volume] pairs',
				},
			},
			example: {
				prices: [
					[1761138132588, 1.0004542301551684],
					[1761141720383, 1.0034832126771194],
				],
				market_caps: [
					[1761138132588, 14538951.566572659],
					[1761141720383, 14555105.414817618],
				],
				total_volumes: [
					[1761138132588, 1201170.4564115603],
					[1761141720383, 1236903.40655455],
				],
			},
		},
	})
	getPeg() {
		return this.pricesService.getMarketChart();
	}
}
