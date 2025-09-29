import { Injectable, Logger } from '@nestjs/common';
import { PricesService } from './prices.service';

@Injectable()
export class PricesHistoryService {
	private readonly logger = new Logger(this.constructor.name);

	constructor(private readonly prices: PricesService) {
		setTimeout(() => this.getHistory(), 500);
	}

	getHistory() {
		const coll = this.prices.getCollateral();
		return coll;
	}
}
