import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemMinterService } from './ecosystem.minter.service';
import { ApiMinterListing } from './ecosystem.minter.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/minter')
export class EcosystemMinterController {
	constructor(private readonly minter: EcosystemMinterService) {}

	@Get('list')
	@ApiOperation({
		summary: 'Get all minter proposals',
		description:
			'Returns: ApiMinterListing, a complete list of all minter proposals across all chains. ' +
			'Minter proposals are requests to authorize new minting contracts in the Frankencoin ecosystem. ' +
			'Includes application details, fees, status (approved/denied), and proposer information.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns array of all minter proposals',
		schema: {
			type: 'ApiMinterListing',
			properties: {
				num: { type: 'number', description: 'Total number of minter proposals' },
				list: {
					type: 'array',
					description: 'Array of minter proposal objects',
					items: {
						type: 'object',
						properties: {
							chainId: { type: 'number', description: 'Blockchain chain ID' },
							txHash: { type: 'string', description: 'Transaction hash of proposal' },
							minter: { type: 'string', description: 'Minter contract address' },
							applicationPeriod: { type: 'number', description: 'Application period in seconds' },
							applicationFee: { type: 'string', description: 'Application fee in wei' },
							applyMessage: { type: 'string', description: 'Proposal description' },
							applyDate: { type: 'number', description: 'Module activation timestamp' },
							suggestor: { type: 'string', description: 'Address of proposer' },
							denyMessage: { type: 'string', description: 'Denial reason (if denied)' },
							denyDate: { type: 'number', description: 'Denial timestamp (if denied)' },
							vetor: { type: 'string', description: 'Address that vetoed (if denied)' },
						},
					},
				},
			},
			example: {
				num: 33,
				list: [
					{
						chainId: 43114,
						txHash: '0x12458f8f483edd208f0c2d3610c003d206b1c3a9e1dee737e3a78a97450b60e2',
						minter: '0x8e7c2a697751a1ce7a8db51f01b883a27c5c8325',
						applicationPeriod: 1209600,
						applicationFee: '1000000000000000000000',
						applyMessage: 'Multichain Savings Module',
						applyDate: 1754296731,
						suggestor: '0x82049bc095473b886ca99f4c2091383464aa3c9c',
						denyMessage: null,
						denyDate: null,
						vetor: null,
					},
				],
			},
		},
	})
	getList(): ApiMinterListing {
		return this.minter.getMintersList();
	}

	@Get('list/:chainId')
	@ApiOperation({
		summary: 'Get minter proposals by chain',
		description:
			'Returns: ApiMinterListing, minter proposals filtered by specific blockchain. ' +
			'Only returns proposals submitted on the specified chain ID.',
	})
	@ApiParam({
		name: 'chainId',
		description: 'Blockchain chain ID (e.g., 1 for Ethereum, 100 for Gnosis)',
		example: '1',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns array of minter proposals for the specified chain',
		schema: {
			type: 'ApiMinterListing',
			properties: {
				num: { type: 'number', description: 'Total number of minter proposals for this chain' },
				list: {
					type: 'array',
					description: 'Array of minter proposal objects',
					items: {
						type: 'object',
						properties: {
							chainId: { type: 'number', description: 'Blockchain chain ID' },
							txHash: { type: 'string', description: 'Transaction hash of proposal' },
							minter: { type: 'string', description: 'Minter contract address' },
							applicationPeriod: { type: 'number', description: 'Application period in seconds' },
							applicationFee: { type: 'string', description: 'Application fee in wei' },
							applyMessage: { type: 'string', description: 'Proposal description' },
							applyDate: { type: 'number', description: 'Module activation timestamp' },
							suggestor: { type: 'string', description: 'Address of proposer' },
							denyMessage: { type: 'string', description: 'Denial reason (if denied)' },
							denyDate: { type: 'number', description: 'Denial timestamp (if denied)' },
							vetor: { type: 'string', description: 'Address that vetoed (if denied)' },
						},
					},
				},
			},
			example: {
				num: 15,
				list: [
					{
						chainId: 43114,
						txHash: '0x12458f8f483edd208f0c2d3610c003d206b1c3a9e1dee737e3a78a97450b60e2',
						minter: '0x8e7c2a697751a1ce7a8db51f01b883a27c5c8325',
						applicationPeriod: 1209600,
						applicationFee: '1000000000000000000000',
						applyMessage: 'Multichain Savings Module',
						applyDate: 1754296731,
						suggestor: '0x82049bc095473b886ca99f4c2091383464aa3c9c',
						denyMessage: null,
						denyDate: null,
						vetor: null,
					},
				],
			},
		},
	})
	getListChainId(@Param('chainId') chainId: string): ApiMinterListing {
		return this.minter.getMintersListChainId(parseInt(chainId));
	}
}
