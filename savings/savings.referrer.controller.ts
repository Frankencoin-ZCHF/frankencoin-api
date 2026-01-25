import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Address, isAddress, zeroAddress } from 'viem';
import { SavingsReferrerService } from './savings.referrer.service';
import { ApiSavingsReferrerEarnings, ApiSavingsReferrerMapping } from 'exports';

@ApiTags('Savings Controller')
@Controller('savings/referrer')
export class SavingsReferrerController {
	constructor(private readonly referrer: SavingsReferrerService) {}

	@Get(':referrer/mapping')
	@ApiOperation({
		summary: 'Get referrer accounts mapping',
		description:
			'Returns: ApiSavingsReferrerMapping, all savings accounts that use a specific referrer across all chains and modules. ' +
			'For each account, includes creation/update timestamps, balance, referrer address, and referrer fee percentage. ' +
			'Organized by chain ID, module address, and account address.',
	})
	@ApiParam({
		name: 'referrer',
		description: 'Referrer wallet address (Ethereum address)',
		example: '0x0000000000000000000000000000000000000000',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns mapping of accounts using this referrer',
		schema: {
			type: 'ApiSavingsReferrerMapping',
			properties: {
				num: { type: 'number', description: 'Total number of accounts using this referrer' },
				accounts: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of account addresses',
				},
				map: {
					type: 'object',
					description: 'Nested mapping: chainId -> module -> account -> details',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							additionalProperties: {
								type: 'object',
								properties: {
									created: { type: 'string', description: 'Account creation timestamp' },
									updated: { type: 'string', description: 'Last update timestamp' },
									balance: { type: 'number', description: 'Current savings balance' },
									referrer: { type: 'string', description: 'Referrer address' },
									referrerFee: { type: 'number', description: 'Referrer fee in PPM (parts per million)' },
								},
							},
						},
					},
				},
			},
			example: {
				num: 251,
				accounts: [
					'0x0a638e3386b8b829f6d823bf10acdd641e1b6026',
					'0x5a57dd9c623e1403af1d810673183d89724a4e0c',
					'0x7eaff5a4d025a5c697946ce624afcf621bb689b0',
				],
				map: {
					'1': {
						'0x27d9ad987bde08a0d083ef7e0e4043c857a17b38': {
							'0x0a638e3386b8b829f6d823bf10acdd641e1b6026': {
								created: '1768385231',
								updated: '1768385231',
								balance: 4273621,
								referrer: '0x0000000000000000000000000000000000000000',
								referrerFee: 0,
							},
						},
					},
				},
			},
		},
	})
	getReferrerAccounts(@Param('referrer') referrer: string): Promise<ApiSavingsReferrerMapping> {
		if (!isAddress(referrer)) referrer = zeroAddress;
		return this.referrer.getMapping(referrer as Address);
	}

	@Get(':referrer/earnings')
	@ApiOperation({
		summary: 'Get referrer earnings',
		description:
			'Returns: ApiSavingsReferrerEarnings, total earnings accumulated by a referrer from their referred savings accounts. ' +
			'Breaks down earnings by chain ID, module address, and account, with totals per chain and overall total. ' +
			'Earnings come from referrer fees on savings interest.',
	})
	@ApiParam({
		name: 'referrer',
		description: 'Referrer wallet address (Ethereum address)',
		example: '0x963ec454423cd543db08bc38fc7b3036b425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns earnings breakdown for the referrer',
		schema: {
			type: 'ApiSavingsReferrerEarnings',
			properties: {
				earnings: {
					type: 'object',
					description: 'Nested mapping: chainId -> module -> account -> earnings amount',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							additionalProperties: { type: 'number' },
						},
					},
				},
				chains: {
					type: 'object',
					description: 'Total earnings per chain',
					additionalProperties: { type: 'number' },
				},
				total: { type: 'number', description: 'Total earnings across all chains' },
			},
			example: {
				earnings: {
					'1': {
						'0x27d9ad987bde08a0d083ef7e0e4043c857a17b38': {
							'0x5a57dd9c623e1403af1d810673183d89724a4e0c': 125.45,
							'0x7eaff5a4d025a5c697946ce624afcf621bb689b0': 87.32,
						},
					},
				},
				chains: {
					'1': 212.77,
					'100': 45.23,
				},
				total: 258.0,
			},
		},
	})
	getReferrerEarnings(@Param('referrer') referrer: string): Promise<ApiSavingsReferrerEarnings> {
		if (!isAddress(referrer)) referrer = zeroAddress;
		return this.referrer.getEarnings(referrer as Address);
	}
}
