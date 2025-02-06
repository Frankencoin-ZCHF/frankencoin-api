import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavingsCoreService } from './savings.core.service';
import { ApiSavingsBalance, ApiSavingsInfo, ApiSavingsUserTable } from './savings.core.types';
import { Address, isAddress, zeroAddress } from 'viem';

@ApiTags('Savings Controller')
@Controller('savings/core')
export class SavingsCoreController {
	constructor(private readonly savings: SavingsCoreService) {}

	@Get('info')
	@ApiResponse({
		description: 'returns the current savings information.',
	})
	getInfo(): ApiSavingsInfo {
		return this.savings.getInfo();
	}

	@Get('balances')
	@ApiResponse({
		description: 'returns information about balances, max. 100',
	})
	// async getBalance(@Param('limit') limit: number): Promise<ApiSavingsBalance> {
	// if (isNaN(limit)) limit = undefined;
	async getBalance(): Promise<ApiSavingsBalance> {
		return await this.savings.getBalanceTable(100);
	}

	@Get('user/:address')
	@ApiResponse({
		description: 'returns the latest user table history or recent entries from all users',
	})
	async getUserTable(@Param('address') address: string): Promise<ApiSavingsUserTable> {
		const keywords: string[] = ['0', 'all', 'zero', 'zeroAddress', zeroAddress];
		if (keywords.includes(address)) address = zeroAddress;
		if (!isAddress(address)) address = zeroAddress;
		return await this.savings.getUserTable(address as Address);
	}
}
