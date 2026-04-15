import { PriceHistoryQuery, PriceHistoryQueryObjectArray } from 'modules/prices/prices.types';
import { Address } from 'viem';

export class HistoryQueryObjectDTO {
	[key: Address]: PriceHistoryQuery;

	constructor() {
		return {} as PriceHistoryQueryObjectArray;
	}
}
