import { FrankencoinSupplyQuery, FrankencoinSupplyQueryObject } from '../ecosystem.frankencoin.types';

export class SupplyQueryObjectDTO {
	[key: FrankencoinSupplyQuery['created']]: FrankencoinSupplyQuery;

	constructor() {
		return {} as FrankencoinSupplyQueryObject;
	}
}
