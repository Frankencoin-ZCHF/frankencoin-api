import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavingsCoreService } from './savings.core.service';
import { ApiSavingsActivity, ApiSavingsBalance, ApiSavingsInfo, ApiSavingsRanked } from './savings.core.types';
import { Address, isAddress, zeroAddress } from 'viem';

@ApiTags('Savings Controller')
@Controller('savings/core')
export class SavingsCoreController {
	constructor(private readonly savings: SavingsCoreService) {}

	@Get('info')
	@ApiResponse({
		description: 'returns all savings-module information.',
	})
	getInfo(): ApiSavingsInfo {
		return this.savings.getInfo();
	}

	@Get('ranked')
	@ApiResponse({
		description: 'returns information about balances',
	})
	getRanked(): ApiSavingsRanked {
		return this.savings.getRanked();
	}

	@Get('balance/:account')
	@ApiResponse({
		description: 'returns information about balance of an account',
	})
	async getBalanceAccount(@Param('account') account: string): Promise<ApiSavingsBalance> {
		if (!isAddress(account)) account = zeroAddress;
		return await this.savings.getBalance(account.toLowerCase() as Address);
	}

	@Get('activity/:account')
	@ApiResponse({
		description: 'returns the latest activities of an account',
	})
	async getActivityAccount(@Param('account') account: string): Promise<ApiSavingsActivity> {
		if (!isAddress(account)) account = zeroAddress;
		return await this.savings.getActivity(account.toLowerCase() as Address);
	}
}
