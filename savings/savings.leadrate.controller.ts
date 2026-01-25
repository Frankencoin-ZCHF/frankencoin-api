import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavingsLeadrateService } from './savings.leadrate.service';
import { ApiLeadrateInfo, ApiLeadrateProposed, ApiLeadrateRate } from './savings.leadrate.types';

@ApiTags('Savings Controller')
@Controller('savings/leadrate')
export class SavingsLeadrateController {
	constructor(private readonly leadrate: SavingsLeadrateService) {}

	@Get('info')
	@ApiOperation({
		summary: 'Get lead rate comprehensive information',
		description:
			'Returns: ApiLeadrateInfo, complete information about savings lead rates across all chains including currently approved rates, pending proposals, and open proposals awaiting execution. ' +
			'Combines current rate data, proposed changes, and status of proposals (pending vs synced).',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns comprehensive lead rate information',
		schema: {
			type: 'ApiLeadrateInfo',
			properties: {
				rate: {
					type: 'object',
					description: 'Currently approved lead rates per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								chainId: { type: 'number', description: 'Blockchain chain ID' },
								count: { type: 'number', description: 'Number of rate changes' },
								module: { type: 'string', description: 'Savings module address' },
								created: { type: 'number', description: 'Approval timestamp' },
								blockheight: { type: 'number', description: 'Block number' },
								txHash: { type: 'string', description: 'Transaction hash' },
								approvedRate: { type: 'number', description: 'Approved interest rate in PPM (parts per million)' },
							},
						},
					},
				},
				proposed: {
					type: 'object',
					description: 'Proposed lead rate changes per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								chainId: { type: 'number', description: 'Blockchain chain ID' },
								created: { type: 'number', description: 'Proposal timestamp' },
								count: { type: 'number', description: 'Proposal count' },
								blockheight: { type: 'number', description: 'Block number' },
								module: { type: 'string', description: 'Savings module address' },
								txHash: { type: 'string', description: 'Transaction hash' },
								proposer: { type: 'string', description: 'Proposer address' },
								nextChange: { type: 'number', description: 'Timestamp when rate will change' },
								nextRate: { type: 'number', description: 'Proposed rate in PPM' },
							},
						},
					},
				},
				open: {
					type: 'object',
					description: 'Open proposals awaiting execution',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								details: { type: 'object', description: 'Proposal details' },
								currentRate: { type: 'number', description: 'Current rate in PPM' },
								nextRate: { type: 'number', description: 'Next rate in PPM' },
								nextChange: { type: 'number', description: 'Change timestamp' },
								isProposal: { type: 'boolean', description: 'Is a proposal' },
								isPending: { type: 'boolean', description: 'Is pending execution' },
								isSynced: { type: 'boolean', description: 'Is synced across chains' },
							},
						},
					},
				},
			},
			example: {
				rate: {
					'1': {
						'0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae': {
							chainId: 1,
							count: 5,
							module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
							created: 1764338927,
							blockheight: 23897670,
							txHash: '0x7c9e0dc045e10e4209dc0579586b1b5b66847d43a010ad0e282cf2acef5c9fd2',
							approvedRate: 15000,
						},
					},
				},
				proposed: {
					'1': {
						'0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae': {
							chainId: 1,
							created: 1763647871,
							count: 4,
							blockheight: 23840762,
							module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
							txHash: '0xff6569bcbd1fd6eb76ca65b06ed28bd6f0f39ea999612f0fb9bda0b949eb56d4',
							proposer: '0x5a57dd9c623e1403af1d810673183d89724a4e0c',
							nextChange: 1764252671,
							nextRate: 15000,
						},
					},
				},
				open: {},
			},
		},
	})
	getInfo(): ApiLeadrateInfo {
		return this.leadrate.getInfo();
	}

	@Get('rates')
	@ApiOperation({
		summary: 'Get approved lead rates',
		description:
			'Returns: ApiLeadrateRate, currently approved lead rates across all chains and savings modules. ' +
			'Includes both the latest approved rate per module and complete historical list of all rate changes. ' +
			'Rates are expressed in PPM (parts per million), where 40000 PPM = 4% annual interest.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns current and historical lead rates',
		schema: {
			type: 'ApiLeadrateRate',
			properties: {
				rate: {
					type: 'object',
					description: 'Latest approved rate per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								chainId: { type: 'number', description: 'Blockchain chain ID' },
								count: { type: 'number', description: 'Number of rate changes' },
								module: { type: 'string', description: 'Savings module address' },
								created: { type: 'number', description: 'Approval timestamp' },
								blockheight: { type: 'number', description: 'Block number' },
								txHash: { type: 'string', description: 'Transaction hash' },
								approvedRate: { type: 'number', description: 'Approved rate in PPM' },
							},
						},
					},
				},
				list: {
					type: 'object',
					description: 'Complete history of rate changes per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'array',
							items: { type: 'object' },
						},
					},
				},
			},
			example: {
				rate: {
					'1': {
						'0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae': {
							chainId: 1,
							count: 5,
							module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
							created: 1764338927,
							blockheight: 23897670,
							txHash: '0x7c9e0dc045e10e4209dc0579586b1b5b66847d43a010ad0e282cf2acef5c9fd2',
							approvedRate: 15000,
						},
						'0x27d9ad987bde08a0d083ef7e0e4043c857a17b38': {
							chainId: 1,
							count: 2,
							module: '0x27d9ad987bde08a0d083ef7e0e4043c857a17b38',
							created: 1765387379,
							blockheight: 23983764,
							txHash: '0xf3ad06cab1adffd5b0a3d84f60797f9ee7740fe7576245cfd46f543132bc318f',
							approvedRate: 40000,
						},
					},
				},
				list: {
					'1': {
						'0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae': [
							{
								chainId: 1,
								count: 5,
								module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
								created: 1764338927,
								approvedRate: 15000,
							},
							{
								chainId: 1,
								count: 4,
								module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
								created: 1762768751,
								approvedRate: 20000,
							},
						],
					},
				},
			},
		},
	})
	getRates(): ApiLeadrateRate {
		return this.leadrate.getRates();
	}

	@Get('proposals')
	@ApiOperation({
		summary: 'Get lead rate proposals',
		description:
			'Returns: ApiLeadrateProposed, all proposed lead rate changes across chains and savings modules. ' +
			'Includes both the latest proposal per module and complete historical list of all proposals. ' +
			'Proposals have a delay period before they take effect, shown in the nextChange timestamp.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns current and historical lead rate proposals',
		schema: {
			type: 'ApiLeadrateProposed',
			properties: {
				proposed: {
					type: 'object',
					description: 'Latest proposal per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								chainId: { type: 'number', description: 'Blockchain chain ID' },
								created: { type: 'number', description: 'Proposal timestamp' },
								count: { type: 'number', description: 'Proposal count' },
								blockheight: { type: 'number', description: 'Block number' },
								module: { type: 'string', description: 'Savings module address' },
								txHash: { type: 'string', description: 'Transaction hash' },
								proposer: { type: 'string', description: 'Proposer address' },
								nextChange: { type: 'number', description: 'Timestamp when rate will change' },
								nextRate: { type: 'number', description: 'Proposed rate in PPM' },
							},
						},
					},
				},
				list: {
					type: 'object',
					description: 'Complete history of proposals per chain and module',
					additionalProperties: {
						type: 'object',
						additionalProperties: {
							type: 'array',
							items: { type: 'object' },
						},
					},
				},
			},
			example: {
				proposed: {
					'1': {
						'0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae': {
							chainId: 1,
							created: 1763647871,
							count: 4,
							blockheight: 23840762,
							module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
							txHash: '0xff6569bcbd1fd6eb76ca65b06ed28bd6f0f39ea999612f0fb9bda0b949eb56d4',
							proposer: '0x5a57dd9c623e1403af1d810673183d89724a4e0c',
							nextChange: 1764252671,
							nextRate: 15000,
						},
					},
				},
				list: {
					'1': {
						'0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae': [
							{
								chainId: 1,
								created: 1763647871,
								count: 4,
								module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
								proposer: '0x5a57dd9c623e1403af1d810673183d89724a4e0c',
								nextChange: 1764252671,
								nextRate: 15000,
							},
							{
								chainId: 1,
								created: 1762084391,
								count: 3,
								module: '0x3bf301b0e2003e75a3e86ab82bd1eff6a9dfb2ae',
								proposer: '0x5a57dd9c623e1403af1d810673183d89724a4e0c',
								nextChange: 1762689191,
								nextRate: 20000,
							},
						],
					},
				},
			},
		},
	})
	getProposed(): ApiLeadrateProposed {
		return this.leadrate.getProposals();
	}
}
