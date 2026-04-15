import { PriceQuery, PriceQueryObjectArray } from 'modules/prices/prices.types';
import { Address } from 'viem';

export class PriceQueryObjectDTO {
	[key: Address]: PriceQuery;

	constructor() {
		return {} as PriceQueryObjectArray;
	}
}
