import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricesHistoryService } from './prices.history.service';
import { isAddress } from 'viem';

@ApiTags('Prices Controller')
@Controller('prices/history')
export class PricesHistoryController {
	constructor(private readonly history: PricesHistoryService) {}

	@Get('list')
	@ApiResponse({
		description: 'Retrieves a list of all price history entries.',
	})
	getList() {
		return this.history.getHistory();
	}

	@Get('ratio')
	@ApiResponse({
		description: 'Retrieves a list of the latest collat. ratio',
	})
	getRetio() {
		return this.history.getRatio();
	}

	@Get(':address')
	@ApiResponse({
		description: 'Retrieves the price history for a specific contract address.',
	})
	getByContract(@Param('address') address: string) {
		if (!isAddress(address)) {
			return { error: 'Address not valid' };
		}
		return this.history.getHistoryByContract(address);
	}
}
