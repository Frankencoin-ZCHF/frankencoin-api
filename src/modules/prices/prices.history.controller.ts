import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricesHistoryService } from './prices.history.service';
import { isAddress } from 'viem';

@ApiTags('Prices Controller')
@Controller('prices/history')
export class PricesHistoryController {
	constructor(private readonly history: PricesHistoryService) {}

	@Get('list')
	@ApiOperation({
		summary: 'Get complete price history for all collaterals',
		description:
			'Returns: object mapping contract addresses to price history data, a complete time series of price data for all collateral types in the Frankencoin ecosystem. ' +
			'Each collateral is keyed by its lowercase contract address and contains token metadata, current price, and historical price data. ' +
			'The history object maps Unix timestamps (in milliseconds) to CHF prices. Used for charting price movements and analyzing collateral value over time.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns complete price history for all collateral assets',
		schema: {
			type: 'object',
			description: 'Object mapping lowercase contract addresses to collateral price data',
			additionalProperties: {
				type: 'object',
				properties: {
					address: { type: 'string', description: 'Collateral contract address (checksummed)' },
					name: { type: 'string', description: 'Token name' },
					symbol: { type: 'string', description: 'Token symbol' },
					decimals: { type: 'number', description: 'Token decimals' },
					timestamp: { type: 'number', description: 'Latest price update timestamp (Unix milliseconds)' },
					price: {
						type: 'object',
						description: 'Current price in different currencies',
						properties: {
							chf: { type: 'number', description: 'Current price in CHF' },
						},
					},
					history: {
						type: 'object',
						description: 'Historical price data - Unix timestamps (ms) mapped to CHF prices',
						additionalProperties: { type: 'number', description: 'Price in CHF at timestamp' },
					},
				},
			},
			example: {
				'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
					address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
					name: 'Wrapped Ether',
					symbol: 'WETH',
					decimals: 18,
					timestamp: 1769364000009,
					price: {
						chf: 2251.47,
					},
					history: {
						'1769356800003': 2285.48,
						'1769360400024': 2258.21,
						'1769364000009': 2251.47,
					},
				},
			},
		},
	})
	getList() {
		return this.history.getHistory();
	}

	@Get('ratio')
	@ApiOperation({
		summary: 'Get historical collateralization ratios',
		description:
			'Returns: object with timestamp and ratio time series, historical collateralization ratio data for the Frankencoin ecosystem. ' +
			'Provides two metrics: collateralRatioByFreeFloat (ratio based on circulating supply) and collateralRatioBySupply (ratio based on total supply). ' +
			'Each ratio object maps timestamps to ratio values. Useful for analyzing system-wide collateralization trends over time.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns historical collateralization ratio time series',
		schema: {
			type: 'object',
			properties: {
				timestamp: { type: 'number', description: 'Current timestamp (Unix milliseconds)' },
				collateralRatioByFreeFloat: {
					type: 'object',
					description: 'Time series mapping timestamps to collateral ratios based on free float',
					additionalProperties: { type: 'number' },
				},
				collateralRatioBySupply: {
					type: 'object',
					description: 'Time series mapping timestamps to collateral ratios based on total supply',
					additionalProperties: { type: 'number' },
				},
			},
			example: {
				timestamp: 1768964400003,
				collateralRatioByFreeFloat: {
					'1759158000005': 3.138139819821414,
					'1759161600002': 3.142567234521876,
				},
				collateralRatioBySupply: {
					'1759158000005': 1.688283955398297,
					'1759161600002': 1.689342187654321,
				},
			},
		},
	})
	getRatio() {
		return this.history.getRatio();
	}

	@Get(':address')
	@ApiOperation({
		summary: 'Get price history for specific collateral',
		description:
			'Returns: object with token info and price history or error object, retrieves complete price information and historical data for a specific collateral token by its contract address. ' +
			'Includes current price and a time series of historical prices mapped by timestamp. ' +
			'Useful for analyzing price trends of a particular asset. Returns an error if the address is invalid.',
	})
	@ApiParam({
		name: 'address',
		description: 'Collateral contract address (Ethereum address)',
		example: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns price history for the specified collateral',
		schema: {
			type: 'object',
			properties: {
				address: { type: 'string', description: 'Collateral contract address' },
				name: { type: 'string', description: 'Token name' },
				symbol: { type: 'string', description: 'Token symbol' },
				decimals: { type: 'number', description: 'Token decimals' },
				timestamp: { type: 'number', description: 'Current timestamp (Unix milliseconds)' },
				price: {
					type: 'object',
					description: 'Current price in different currencies',
					properties: {
						chf: { type: 'number', description: 'Price in CHF' },
					},
				},
				history: {
					type: 'object',
					description: 'Historical price data - timestamps mapped to prices',
					additionalProperties: { type: 'number', description: 'Price at timestamp' },
				},
			},
			example: {
				address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
				name: 'Wrapped BTC',
				symbol: 'WBTC',
				decimals: 8,
				timestamp: 1768964400003,
				price: {
					chf: 70374.6,
				},
				history: {
					'1759158000005': 90567.46,
					'1759161600002': 91163.2,
					'1759165200003': 91245.8,
				},
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
	getByContract(@Param('address') address: string) {
		if (!isAddress(address)) {
			return { error: 'Address not valid' };
		}
		return this.history.getHistoryByContract(address);
	}
}
