import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Address, isAddress, zeroAddress } from 'viem';
import { SavingsReferrerService } from './savings.referrer.service';

@ApiTags('Savings Controller')
@Controller('savings/referrer')
export class SavingsReferrerController {
	constructor(private readonly referrer: SavingsReferrerService) {}

	@Get(':referrer/accounts')
	@ApiResponse({
		description: 'returns all savings-module information.',
	})
	getReferrerAccounts(@Param('referrer') referrer: string) {
		if (!isAddress(referrer)) referrer = zeroAddress;
		return this.referrer.getEarnings(referrer as Address);
	}

	@Get(':referrer/earnings')
	@ApiResponse({
		description: 'returns information about balance',
	})
	getReferrerEarnings(@Param('referrer') referrer: string) {
		if (!isAddress(referrer)) referrer = zeroAddress;
		return this.referrer.getEarnings(referrer as Address);
	}
}
