import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavingsCoreService } from './savings.core.service';
import { ApiSavingsActivity, ApiSavingsBalances, ApiSavingsInfo, ApiSavingsRanked } from './savings.core.types';
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

	@Get('balances')
	@ApiResponse({
		description: 'returns information about balances',
	})
	getBalances(): ApiSavingsBalances {
		return this.savings.getBalances();
	}

	@Get('balances/:account')
	@ApiResponse({
		description: 'returns information about balances of an account',
	})
	getBalancesAccount(@Param('account') account: string): ApiSavingsBalances {
		if (!isAddress(account)) account = zeroAddress;
		return this.savings.getBalances()[account.toLowerCase() as Address] || {};
	}

	@Get('ranked')
	@ApiResponse({
		description: 'returns information about balances',
	})
	getRanked(): ApiSavingsRanked {
		return this.savings.getRanked();
	}

	@Get('activity')
	@ApiResponse({
		description: 'returns the latest activities',
	})
	getActivity(): ApiSavingsActivity {
		return this.savings.getActivity();
	}

	@Get('activity/:account')
	@ApiResponse({
		description: 'returns the latest activities of an account',
	})
	getActivityAccount(@Param('account') account: string): ApiSavingsActivity {
		if (!isAddress(account)) account = zeroAddress;
		return this.savings.getActivity().filter((i) => i.account.toLowerCase() == account.toLowerCase());
	}
}
