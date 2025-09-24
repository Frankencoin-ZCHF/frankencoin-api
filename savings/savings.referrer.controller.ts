import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Address, isAddress, zeroAddress } from 'viem';
import { SavingsReferrerService } from './savings.referrer.service';
import { ApiSavingsReferrerEarnings, ApiSavingsReferrerMapping } from 'exports';

@ApiTags('Savings Controller')
@Controller('savings/referrer')
export class SavingsReferrerController {
	constructor(private readonly referrer: SavingsReferrerService) {}

	@Get(':referrer/mapping')
	@ApiResponse({
		description: 'returns referrer accounts mapping informations across all chains',
	})
	getReferrerAccounts(@Param('referrer') referrer: string): Promise<ApiSavingsReferrerMapping> {
		if (!isAddress(referrer)) referrer = zeroAddress;
		return this.referrer.getMapping(referrer as Address);
	}

	@Get(':referrer/earnings')
	@ApiResponse({
		description: 'returns referrer earnings informations across all chains',
	})
	getReferrerEarnings(@Param('referrer') referrer: string): Promise<ApiSavingsReferrerEarnings> {
		if (!isAddress(referrer)) referrer = zeroAddress;
		return this.referrer.getEarnings(referrer as Address);
	}
}
