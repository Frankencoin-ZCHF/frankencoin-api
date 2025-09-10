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
import { isAddress } from 'viem';

@ApiTags('Prices Controller')
@Controller('prices')
export class PricesController {
	constructor(private readonly pricesService: PricesService) {}

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

	@Get('marketChart')
	@ApiResponse({
		description: 'This endpoint allows you to get the historical chart data of frankencoin from coingecko',
	})
	getPeg() {
		return this.pricesService.getMarketChart();
	}
}
