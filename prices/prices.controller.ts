import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPriceERC20, ApiPriceERC20Mapping, ApiPriceListing, ApiPriceMapping, PriceQueryCurrencies } from 'prices/prices.types';
import { PricesService } from './prices.service';
import { AnalyticsService } from 'analytics/analytics.service';
import { formatUnits } from 'viem';

@ApiTags('Prices Controller')
@Controller('prices')
export class PricesController {
	constructor(
		private readonly pricesService: PricesService,
		private readonly analytics: AnalyticsService
	) {}

	@Get('ticker/:ticker')
	@ApiResponse({
		description: 'Returns a list of price queries',
	})
	getTicker(@Param('ticker') ticker: string): PriceQueryCurrencies & { error?: string } {
		const matching = this.pricesService.getPrices().find((p) => p.symbol == ticker);
		if (matching == undefined) {
			return {
				error: 'No asset found for given criteria',
				chf: 0,
				usd: 0,
			};
		} else {
			return matching.price;
		}
	}

	@Get('ticker/FPS/history')
	@ApiResponse({
		description: 'Returns price history for FPS ticker',
	})
	@ApiQuery({ name: 'date', required: false, description: 'Date for price history (DD-MM-YYYY)' })
	getTickerHistory(@Query('date') date: string = '0'): { t: number; p: number }[] {
		const listMapped = this.analytics
			.getDailyLog()
			.logs.map((l) => ({ t: Number(l.timestamp), p: Number(formatUnits(l.fpsPrice, 18)) }));

		return listMapped.filter((l) => l.t >= new Date(date).getTime());
	}

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
}
