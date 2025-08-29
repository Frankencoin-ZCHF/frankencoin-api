import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	ApiOwnerValueLocked,
	ApiPriceERC20,
	ApiPriceERC20Mapping,
	ApiPriceListing,
	ApiPriceMapping,
	PriceQueryCurrencies,
} from 'prices/prices.types';
import { PricesService } from './prices.service';
// import { AnalyticsService } from 'analytics/analytics.service';
import { isAddress } from 'viem';

@ApiTags('Prices Controller')
@Controller('prices')
export class PricesController {
	constructor(
		private readonly pricesService: PricesService
		// private readonly analytics: AnalyticsService
	) {}

	@Get('ticker/:ticker')
	@ApiResponse({
		description: 'Returns a price query for a given ticker',
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

	// @Get('ticker/FPS/history')
	// @ApiResponse({
	// 	description: 'Returns trade price history from DailyLog for FPS ticker',
	// })
	// @ApiQuery({ name: 'start', required: false, description: 'Start date for price history (YYYY-MM-DD)' })
	// @ApiQuery({ name: 'end', required: false, description: 'End date for price history (YYYY-MM-DD)' })
	// getTickerHistory(@Query('start') start: string = '0', @Query('end') end: string | number = Date.now()): { t: number; p: number }[] {
	// 	const listMapped = this.analytics
	// 		.getDailyLog()
	// 		.logs.map((l) => ({ t: Number(l.timestamp), p: Number(formatUnits(l.fpsPrice, 18)) }));

	// 	const listFiltered = listMapped.filter((l) => l.t >= new Date(start).getTime() && l.t <= new Date(end).getTime());
	// 	return listFiltered;
	// }

	@Get('list')
	@ApiResponse({
		description: 'Returns a list of price queries',
	})
	getList(): ApiPriceListing {
		return this.pricesService.getPrices();
	}

	@Get('mapping')
	@ApiResponse({
		description: 'Returns a mapping of price queries',
	})
	getListMapping(): ApiPriceMapping {
		return this.pricesService.getPricesMapping();
	}

	@Get('erc20/mint')
	@ApiResponse({
		description: 'Returns ERC20 information about the mint token',
	})
	getMint(): ApiPriceERC20 {
		return this.pricesService.getMint();
	}

	@Get('erc20/fps')
	@ApiResponse({
		description: 'Returns ERC20 information about the FPS token',
	})
	getFps(): ApiPriceERC20 {
		return this.pricesService.getFps();
	}

	@Get('erc20/collateral')
	@ApiResponse({
		description: 'Returns a list of ERC20 information about collateral token',
	})
	getCollateral(): ApiPriceERC20Mapping {
		return this.pricesService.getCollateral();
	}

	@Get('owner/:address/valueLocked')
	@ApiResponse({
		description: 'Returns a yearly list of collateral value of positions reflecting the owner, limit: 1000',
	})
	async getOwnerValueLocked(@Param('address') owner: string): Promise<ApiOwnerValueLocked | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		return await this.pricesService.getOwnerValueLocked(owner);
	}
}
