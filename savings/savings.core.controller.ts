import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavingsCoreService } from './savings.core.service';
import { ApiSavingsActivity, ApiSavingsBalance, ApiSavingsInfo, ApiSavingsRanked } from './savings.core.types';
import { Address, isAddress, zeroAddress } from 'viem';

@ApiTags('Savings Controller')
@Controller('savings/core')
export class SavingsCoreController {
	constructor(private readonly savings: SavingsCoreService) {}

	@Get('info')
	@ApiOperation({
		summary: 'Get savings ecosystem information',
		description:
			'Returns: ApiSavingsInfo, comprehensive overview of the Frankencoin savings ecosystem across all chains and modules. ' +
			'Includes current module status (balances, interest, rates, counters), total balance across all modules, ' +
			'ratio of total supply in savings, and total interest collected.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns complete savings ecosystem information',
		schema: {
			type: 'ApiSavingsInfo',
			properties: {
				status: {
					type: 'object',
					description: 'Status per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								chainId: { type: 'number', description: 'Blockchain chain ID' },
								updated: { type: 'number', description: 'Last update timestamp' },
								module: { type: 'string', description: 'Savings module address' },
								balance: { type: 'string', description: 'Total balance in this module (in wei)' },
								interest: { type: 'string', description: 'Total interest collected (in wei)' },
								save: { type: 'string', description: 'Total amount saved (in wei)' },
								withdraw: { type: 'string', description: 'Total amount withdrawn (in wei)' },
								rate: { type: 'number', description: 'Current interest rate in PPM' },
								counter: {
									type: 'object',
									properties: {
										interest: { type: 'number', description: 'Number of interest collection events' },
										rateChanged: { type: 'number', description: 'Number of rate changes' },
										rateProposed: { type: 'number', description: 'Number of rate proposals' },
										save: { type: 'number', description: 'Number of save transactions' },
										withdraw: { type: 'number', description: 'Number of withdraw transactions' },
									},
								},
							},
						},
					},
				},
				totalBalance: { type: 'number', description: 'Total balance across all modules' },
				ratioOfSupply: { type: 'number', description: 'Ratio of ZCHF total supply in savings' },
				totalInterest: { type: 'number', description: 'Total interest collected across all modules' },
			},
			example: {
				status: {
					'1': {
						'0x27d9ad987bde08a0d083ef7e0e4043c857a17b38': {
							chainId: 1,
							updated: 1768915583,
							module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
							balance: '7428646983808184086095977',
							interest: '19280714899932967967151',
							save: '13669121967556756892562556',
							withdraw: '6259755698648505774433730',
							rate: 40000,
							counter: {
								interest: 393,
								rateChanged: 2,
								rateProposed: 1,
								save: 477,
								withdraw: 196,
							},
						},
					},
				},
				totalBalance: 8147000.826045715,
				ratioOfSupply: 0.3696292948792586,
				totalInterest: 42121.10242608683,
			},
		},
	})
	getInfo(): ApiSavingsInfo {
		return this.savings.getInfo();
	}

	@Get('ranked')
	@ApiOperation({
		summary: 'Get ranked savings accounts',
		description:
			'Returns: ApiSavingsRanked, a list of the latest 1000 savings accounts ranked by balance from highest to lowest. ' +
			'For each account, includes chain ID, module, current balance, creation/update timestamps, total save/interest/withdraw amounts, and transaction counters.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns array of savings accounts sorted by balance',
		schema: {
			type: 'ApiSavingsRanked',
			items: {
				type: 'object',
				properties: {
					chainId: { type: 'number', description: 'Blockchain chain ID' },
					account: { type: 'string', description: 'Account address' },
					module: { type: 'string', description: 'Savings module address' },
					balance: { type: 'string', description: 'Current balance (in wei)' },
					created: { type: 'number', description: 'Account creation timestamp' },
					updated: { type: 'number', description: 'Last update timestamp' },
					save: { type: 'string', description: 'Total amount saved (in wei)' },
					interest: { type: 'string', description: 'Total interest earned (in wei)' },
					withdraw: { type: 'string', description: 'Total amount withdrawn (in wei)' },
					counter: {
						type: 'object',
						properties: {
							save: { type: 'number', description: 'Number of save transactions' },
							interest: { type: 'number', description: 'Number of interest collection events' },
							withdraw: { type: 'number', description: 'Number of withdraw transactions' },
						},
					},
				},
			},
			example: [
				{
					chainId: 1,
					account: '0x0a638e3386b8b829f6d823bf10acdd641e1b6026',
					module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
					balance: '4273621000000000000000000',
					created: 1768385231,
					updated: 1768385231,
					save: '4273621000000000000000000',
					interest: '0',
					withdraw: '0',
					counter: {
						save: 1,
						interest: 0,
						withdraw: 0,
					},
				},
				{
					chainId: 1,
					account: '0x963ec454423cd543db08bc38fc7b3036b425b301',
					module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
					balance: '650000000000000000000000',
					created: 1751307767,
					updated: 1768247399,
					save: '3249409364155251141552513',
					interest: '5656717175589802130890',
					withdraw: '2605066081330840943683403',
					counter: {
						save: 5,
						interest: 11,
						withdraw: 10,
					},
				},
			],
		},
	})
	getRanked(): ApiSavingsRanked {
		return this.savings.getRanked();
	}

	@Get('balance/:account')
	@ApiOperation({
		summary: 'Get account savings balance',
		description:
			'Returns: ApiSavingsBalance, savings balance information for a specific account across all chains and modules. ' +
			'Organized by chain ID and module address, showing balance, save/interest/withdraw totals, and transaction counters.',
	})
	@ApiParam({
		name: 'account',
		description: 'Account wallet address (Ethereum address)',
		example: '0x963ec454423cd543db08bc38fc7b3036b425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns balance information for the account',
		schema: {
			type: 'ApiSavingsBalance',
			additionalProperties: {
				type: 'object',
				additionalProperties: {
					type: 'object',
					properties: {
						chainId: { type: 'number', description: 'Blockchain chain ID' },
						account: { type: 'string', description: 'Account address' },
						module: { type: 'string', description: 'Savings module address' },
						balance: { type: 'string', description: 'Current balance (in wei)' },
						created: { type: 'number', description: 'Account creation timestamp' },
						updated: { type: 'number', description: 'Last update timestamp' },
						save: { type: 'string', description: 'Total amount saved (in wei)' },
						interest: { type: 'string', description: 'Total interest earned (in wei)' },
						withdraw: { type: 'string', description: 'Total amount withdrawn (in wei)' },
						counter: {
							type: 'object',
							properties: {
								save: { type: 'number', description: 'Number of save transactions' },
								interest: { type: 'number', description: 'Number of interest collection events' },
								withdraw: { type: 'number', description: 'Number of withdraw transactions' },
							},
						},
					},
				},
			},
			example: {
				'1': {
					'0x27d9ad987bde08a0d083ef7e0e4043c857a17b38': {
						chainId: 1,
						account: '0x963ec454423cd543db08bc38fc7b3036b425b301',
						module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
						balance: '650000000000000000000000',
						created: 1751307767,
						updated: 1768247399,
						save: '3249409364155251141552513',
						interest: '5656717175589802130890',
						withdraw: '2605066081330840943683403',
						counter: {
							save: 5,
							interest: 11,
							withdraw: 10,
						},
					},
				},
			},
		},
	})
	async getBalanceAccount(@Param('account') account: string): Promise<ApiSavingsBalance> {
		if (!isAddress(account)) account = zeroAddress;
		return await this.savings.getBalance(account.toLowerCase() as Address);
	}

	@Get('activity/:account')
	@ApiOperation({
		summary: 'Get account savings activity',
		description:
			'Returns: ApiSavingsActivity, recent activity history for a specific account across all chains and modules. ' +
			'Each activity includes transaction type (Saved, Withdrawn, InterestCollected, RateChanged), amounts, balances, ' +
			'timestamps, block heights, and transaction hashes.',
	})
	@ApiParam({
		name: 'account',
		description: 'Account wallet address (Ethereum address)',
		example: '0x963ec454423cd543db08bc38fc7b3036b425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns activity history for the account',
		schema: {
			type: 'ApiSavingsActivity',
			items: {
				type: 'object',
				properties: {
					chainId: { type: 'number', description: 'Blockchain chain ID' },
					account: { type: 'string', description: 'Account address' },
					module: { type: 'string', description: 'Savings module address' },
					created: { type: 'number', description: 'Activity timestamp' },
					blockheight: { type: 'number', description: 'Block number' },
					count: { type: 'number', description: 'Activity counter' },
					balance: { type: 'string', description: 'Balance after this activity (in wei)' },
					save: { type: 'string', description: 'Cumulative save amount (in wei)' },
					interest: { type: 'string', description: 'Cumulative interest (in wei)' },
					withdraw: { type: 'string', description: 'Cumulative withdraw amount (in wei)' },
					kind: {
						type: 'string',
						description: 'Activity type: Saved, Withdrawn, InterestCollected, RateChanged',
					},
					amount: { type: 'string', description: 'Amount for this activity (in wei)' },
					rate: { type: 'number', description: 'Current interest rate in PPM' },
					txHash: { type: 'string', description: 'Transaction hash' },
				},
			},
			example: [
				{
					chainId: 1,
					account: '0x963ec454423cd543db08bc38fc7b3036b425b301',
					module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
					created: 1768247399,
					blockheight: 24220828,
					count: 26,
					balance: '650000000000000000000000',
					save: '3249409364155251141552513',
					interest: '5656717175589802130890',
					withdraw: '2605066081330840943683403',
					kind: 'Saved',
					amount: '249992292237442922374430',
					rate: 40000,
					txHash: '0x8e5f69e4732c9922eb3b7b1e0e22a0048f65c1f5e6392303eb3ae437187bf219',
				},
				{
					chainId: 1,
					account: '0x963ec454423cd543db08bc38fc7b3036b425b301',
					module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
					created: 1768247399,
					blockheight: 24220828,
					count: 25,
					balance: '400007707762557077625570',
					save: '2999417071917808219178083',
					interest: '5656717175589802130890',
					withdraw: '2605066081330840943683403',
					kind: 'InterestCollected',
					amount: '7707762557077625570',
					rate: 40000,
					txHash: '0x8e5f69e4732c9922eb3b7b1e0e22a0048f65c1f5e6392303eb3ae437187bf219',
				},
			],
		},
	})
	async getActivityAccount(@Param('account') account: string): Promise<ApiSavingsActivity> {
		if (!isAddress(account)) account = zeroAddress;
		return await this.savings.getActivity(account.toLowerCase() as Address);
	}
}
