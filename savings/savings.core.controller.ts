import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavingsCoreService } from './savings.core.service';
import {
	ApiSavingsActivity,
	ApiSavingsBalance,
	ApiSavingsInfo,
	ApiSavingsRanked,
	SavingsBalanceChainIdMapping,
} from './savings.core.types';
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

	// TODO: endpoint could be deactivated, if work load and data load is to high
	@Get('balance')
	@ApiResponse({
		description: 'returns information about balance',
	})
	getBalance(): ApiSavingsBalance {
		return this.savings.getBalance();
	}

	@Get('balance/:account')
	@ApiResponse({
		description: 'returns information about balance of an account',
	})
	getBalanceAccount(@Param('account') account: string): ApiSavingsBalance {
		if (!isAddress(account)) account = zeroAddress;
		const data = this.savings.getBalance()[account.toLowerCase() as Address] || ({} as SavingsBalanceChainIdMapping);
		return { [account.toLowerCase()]: data };
	}

	@Get('ranked')
	@ApiResponse({
		description: 'returns information about balances',
	})
	getRanked(): ApiSavingsRanked {
		return this.savings.getRanked();
	}

	// TODO: endpoint could be deactivated, if work load and data load is to high
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
