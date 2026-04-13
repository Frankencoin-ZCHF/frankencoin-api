import { PriceHistoryRatio } from 'modules/prices/prices.types';

export class HistoryRatioObjectDTO {
	constructor() {
		return {
			timestamp: 0,
			collateralRatioBySupply: {},
			collateralRatioByFreeFloat: {},
		} as PriceHistoryRatio;
	}
}
