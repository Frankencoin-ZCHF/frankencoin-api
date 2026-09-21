import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FcsService } from './fcs.service';

@ApiTags('FCS Controller')
@Controller('fcs/coinmarketcap')
export class FcsCoinmarketcapController {
	constructor(private readonly fcs: FcsService) {}

	@Get('totalsupply')
	@ApiOperation({
		summary: 'Get FCS total supply for CoinMarketCap',
		description: 'Returns the current total supply of Frankencoin Share (FCS) as a plain number.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns total supply as a number',
		schema: {
			type: 'number',
			example: 246.42729859445951,
		},
	})
	getTotalSupply(): number {
		return this.fcs.getFcsInfo().token.totalSupply;
	}

	@Get('circulatingsupply')
	@ApiOperation({
		summary: 'Get FCS circulating supply for CoinMarketCap',
		description:
			'Returns the current circulating supply of Frankencoin Share (FCS) as a plain number. Equal to total supply: every minted FCS share is freely transferable, with no vesting schedule or locked allocation.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns circulating supply as a number',
		schema: {
			type: 'number',
			example: 246.42729859445951,
		},
	})
	getCirculatingSupply(): number {
		return this.fcs.getFcsInfo().token.totalSupply;
	}
}
