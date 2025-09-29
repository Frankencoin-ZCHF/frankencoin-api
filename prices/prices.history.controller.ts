import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricesHistoryService } from './prices.history.service';

@ApiTags('Prices Controller')
@Controller('prices/history')
export class PricesHistoryController {
	constructor(private readonly history: PricesHistoryService) {}

	@Get('list')
	@ApiResponse({
		description: '',
	})
	getList() {
		return this.history.getHistory();
	}
}
