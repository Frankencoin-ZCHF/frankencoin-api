import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemFrankencoinService } from './ecosystem.frankencoin.service';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/coinmarketcap')
export class EcosystemCoinmarketcapController {
	constructor(private readonly frankencoin: EcosystemFrankencoinService) {}

	@Get('totalsupply')
	@ApiOperation({
		summary: 'Get Frankencoin total supply for CoinMarketCap',
		description: 'Returns the current total supply of Frankencoin (ZCHF) across all chains as a plain number.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns total supply as a number',
		schema: {
			type: 'number',
			example: 22039302.79907093,
		},
	})
	getTotalSupply(): number {
		const info = this.frankencoin.getEcosystemFrankencoinInfo();
		return info.token.supply;
	}
}
