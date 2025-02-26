import { PriceQuery, PriceQueryObjectArray } from 'prices/prices.types';
import { Address } from 'viem';

export class PriceQueryObjectDTO {
	[key: Address]: PriceQuery;

	constructor() {
		return {} as PriceQueryObjectArray;
	}
}
