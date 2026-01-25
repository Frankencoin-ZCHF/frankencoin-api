import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransferReferenceService } from './transfer.reference.service';
import { TransferReferenceQuery } from './transfer.reference.types';
import { Address, isAddress } from 'viem';

@ApiTags('Transfer Controller')
@Controller('transfer/reference')
export class TransferReferenceController {
	constructor(private readonly transfer: TransferReferenceService) {}

	@Get('list')
	@ApiOperation({
		summary: 'Get latest transfer references list',
		description:
			'Returns: object with num and list array, a list of the most recent ZCHF transfer references. ' +
			'Transfer references are custom messages attached to ZCHF transfers, allowing users to add context like invoice numbers or payment purposes. ' +
			'Limited to the most recent transfers.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns list of latest transfer references',
		schema: {
			type: 'object',
			properties: {
				num: { type: 'number', description: 'Total number of transfer references returned' },
				list: {
					type: 'array',
					description: 'Array of transfer reference objects',
					items: {
						type: 'object',
						properties: {
							chainId: { type: 'number', description: 'Blockchain chain ID' },
							count: { type: 'number', description: 'Sequential transfer counter' },
							created: { type: 'number', description: 'Transfer timestamp (Unix epoch)' },
							from: { type: 'string', description: 'Sender address' },
							sender: { type: 'string', description: 'Original sender address' },
							to: { type: 'string', description: 'Recipient address' },
							amount: { type: 'string', description: 'Transfer amount (bigint as string)' },
							reference: { type: 'string', description: 'Custom reference message' },
							targetChain: { type: 'string', description: 'Target blockchain chain identifier' },
							txHash: { type: 'string', description: 'Transaction hash' },
						},
					},
				},
			},
			example: {
				num: 100,
				list: [
					{
						amount: '10000000000000000',
						chainId: 43114,
						count: '1',
						created: '1749118517',
						from: '0xac1e456166c041f3d93c97d8c2579a371702f618',
						reference: 'Test Ref',
						sender: '0xac1e456166c041f3d93c97d8c2579a371702f618',
						targetChain: '4051577828743386545',
						to: '0xac1e456166c041f3d93c97d8c2579a371702f618',
						txHash: '0x145d7869f04a4d0ccacdb79f96253cb9aaff50c8454fd18d58d9fc11f17c463b',
						__typename: 'TransferReference',
					},
				],
			},
		},
	})
	getList() {
		return this.transfer.getList();
	}

	@Get('counter')
	@ApiOperation({
		summary: 'Get latest transfer reference counter',
		description:
			'Returns: number, the counter value of the most recent transfer reference. ' +
			'This sequential counter increments with each transfer that includes a reference message. ' +
			'Useful for tracking the total number of referenced transfers or as a reference ID.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns the counter of the latest transfer reference',
		schema: {
			type: 'number',
			example: 5234,
		},
	})
	getCounter(): number {
		return this.transfer.getList().list.at(0)?.count ?? 0;
	}

	@Get('by/count/:count')
	@ApiOperation({
		summary: 'Get transfer reference by count',
		description:
			'Returns: TransferReferenceQuery or error object, retrieves a specific transfer reference by its sequential count number. ' +
			'Each referenced transfer has a unique count value that can be used to look up the exact transfer details. ' +
			'Returns an error if no transfer with that count exists.',
	})
	@ApiParam({
		name: 'count',
		description: 'Sequential count number of the transfer reference',
		example: '5234',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns the transfer reference object',
		schema: {
			type: 'object',
			properties: {
				chainId: { type: 'number', description: 'Blockchain chain ID' },
				count: { type: 'number', description: 'Sequential transfer counter' },
				created: { type: 'number', description: 'Transfer timestamp (Unix epoch)' },
				from: { type: 'string', description: 'Sender address' },
				sender: { type: 'string', description: 'Original sender address' },
				to: { type: 'string', description: 'Recipient address' },
				amount: { type: 'string', description: 'Transfer amount (bigint as string)' },
				reference: { type: 'string', description: 'Custom reference message' },
				targetChain: { type: 'string', description: 'Target blockchain chain identifier' },
				txHash: { type: 'string', description: 'Transaction hash' },
			},
			example: {
				chainId: 1,
				count: 5234,
				created: 1768914604,
				from: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
				sender: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
				to: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
				amount: '1000000000000000000000',
				reference: 'Invoice #12345',
				targetChain: '1',
				txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Transfer reference not found error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Not found' },
			},
		},
	})
	async getByCount(@Param('count') count: string = '0'): Promise<TransferReferenceQuery | { error: string }> {
		const r = await this.transfer.getByCount(count);
		if (r == undefined) return { error: 'Not found' };
		else return r;
	}

	@Get('by/from/:from')
	@ApiOperation({
		summary: 'Get latest transfer references by sender address',
		description:
			'Returns: array of TransferReferenceQuery or error object, retrieves the latest transfer references sent from a specific address. ' +
			'Supports optional filtering by recipient address, reference text, and date range. ' +
			'Returns only the most recent matching transfers. Returns an error if the address is invalid.',
	})
	@ApiParam({
		name: 'from',
		description: 'Sender wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiQuery({ name: 'to', required: false, description: 'Optional recipient address filter' })
	@ApiQuery({ name: 'reference', required: false, description: 'Optional reference text filter (partial match)' })
	@ApiQuery({ name: 'start', required: false, description: 'Start timestamp (Unix epoch or 0 for beginning). Default: 0' })
	@ApiQuery({ name: 'end', required: false, description: 'End timestamp (Unix epoch or current time). Default: now' })
	@ApiResponse({
		status: 200,
		description: 'Returns array of matching transfer references',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					chainId: { type: 'number', description: 'Blockchain chain ID' },
					count: { type: 'number', description: 'Sequential transfer counter' },
					created: { type: 'number', description: 'Transfer timestamp (Unix epoch)' },
					from: { type: 'string', description: 'Sender address' },
					sender: { type: 'string', description: 'Original sender address' },
					to: { type: 'string', description: 'Recipient address' },
					amount: { type: 'string', description: 'Transfer amount (bigint as string)' },
					reference: { type: 'string', description: 'Custom reference message' },
					targetChain: { type: 'string', description: 'Target blockchain chain identifier' },
					txHash: { type: 'string', description: 'Transaction hash' },
				},
			},
			example: [
				{
					chainId: 1,
					count: 5234,
					created: 1768914604,
					from: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					sender: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					to: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
					amount: '1000000000000000000000',
					reference: 'Invoice #12345',
					targetChain: '1',
					txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				},
			],
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address invalid, "from"' },
			},
		},
	})
	async getByFrom(
		@Param('from') from: string,
		@Query('to') to?: string,
		@Query('reference') reference?: string,
		@Query('start') start: string = '0',
		@Query('end') end: string | number = Date.now()
	): Promise<TransferReferenceQuery[] | { error: string }> {
		if (isAddress(from) == false) return { error: 'Address invalid, "from"' };
		if (to != undefined && isAddress(to) == false) return { error: 'Address invalid, "to"' };
		return await this.transfer.getByFromFilter({
			from,
			to: to as Address | undefined,
			reference,
			start,
			end,
		});
	}

	@Get('by/to/:to')
	@ApiOperation({
		summary: 'Get latest transfer references by recipient address',
		description:
			'Returns: array of TransferReferenceQuery or error object, retrieves the latest transfer references received by a specific address. ' +
			'Supports optional filtering by sender address, reference text, and date range. ' +
			'Returns only the most recent matching transfers. Returns an error if the address is invalid.',
	})
	@ApiParam({
		name: 'to',
		description: 'Recipient wallet address (Ethereum address)',
		example: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
	})
	@ApiQuery({ name: 'from', required: false, description: 'Optional sender address filter' })
	@ApiQuery({ name: 'reference', required: false, description: 'Optional reference text filter (partial match)' })
	@ApiQuery({ name: 'start', required: false, description: 'Start timestamp (Unix epoch or 0 for beginning). Default: 0' })
	@ApiQuery({ name: 'end', required: false, description: 'End timestamp (Unix epoch or current time). Default: now' })
	@ApiResponse({
		status: 200,
		description: 'Returns array of matching transfer references',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					chainId: { type: 'number', description: 'Blockchain chain ID' },
					count: { type: 'number', description: 'Sequential transfer counter' },
					created: { type: 'number', description: 'Transfer timestamp (Unix epoch)' },
					from: { type: 'string', description: 'Sender address' },
					sender: { type: 'string', description: 'Original sender address' },
					to: { type: 'string', description: 'Recipient address' },
					amount: { type: 'string', description: 'Transfer amount (bigint as string)' },
					reference: { type: 'string', description: 'Custom reference message' },
					targetChain: { type: 'string', description: 'Target blockchain chain identifier' },
					txHash: { type: 'string', description: 'Transaction hash' },
				},
			},
			example: [
				{
					chainId: 1,
					count: 5234,
					created: 1768914604,
					from: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					sender: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					to: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
					amount: '1000000000000000000000',
					reference: 'Invoice #12345',
					targetChain: '1',
					txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				},
			],
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address invalid, "to"' },
			},
		},
	})
	async getByTo(
		@Param('to') to: string,
		@Query('from') from?: string,
		@Query('reference') reference?: string,
		@Query('start') start: string = '0',
		@Query('end') end: string | number = Date.now()
	): Promise<TransferReferenceQuery[] | { error: string }> {
		if (isAddress(to) == false) return { error: 'Address invalid, "to"' };
		if (from != undefined && isAddress(from) == false) return { error: 'Address invalid, "from"' };
		return await this.transfer.getByToFilter({
			from: from as Address | undefined,
			to,
			reference,
			start,
			end,
		});
	}

	@Get('history/by/from/:from')
	@ApiOperation({
		summary: 'Get complete transfer history by sender address',
		description:
			'Returns: array of TransferReferenceQuery or error object, retrieves the complete historical transfer references sent from a specific address. ' +
			'Unlike the /by/from endpoint which returns only latest transfers, this returns the full history. ' +
			'Supports optional filtering by recipient address, reference text, and date range. Returns an error if the address is invalid.',
	})
	@ApiParam({
		name: 'from',
		description: 'Sender wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiQuery({ name: 'to', required: false, description: 'Optional recipient address filter' })
	@ApiQuery({ name: 'reference', required: false, description: 'Optional reference text filter (partial match)' })
	@ApiQuery({ name: 'start', required: false, description: 'Start timestamp (Unix epoch or 0 for beginning). Default: 0' })
	@ApiQuery({ name: 'end', required: false, description: 'End timestamp (Unix epoch or current time). Default: now' })
	@ApiResponse({
		status: 200,
		description: 'Returns complete array of matching transfer references',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					chainId: { type: 'number', description: 'Blockchain chain ID' },
					count: { type: 'number', description: 'Sequential transfer counter' },
					created: { type: 'number', description: 'Transfer timestamp (Unix epoch)' },
					from: { type: 'string', description: 'Sender address' },
					sender: { type: 'string', description: 'Original sender address' },
					to: { type: 'string', description: 'Recipient address' },
					amount: { type: 'string', description: 'Transfer amount (bigint as string)' },
					reference: { type: 'string', description: 'Custom reference message' },
					targetChain: { type: 'string', description: 'Target blockchain chain identifier' },
					txHash: { type: 'string', description: 'Transaction hash' },
				},
			},
			example: [
				{
					chainId: 1,
					count: 5234,
					created: 1768914604,
					from: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					sender: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					to: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
					amount: '1000000000000000000000',
					reference: 'Invoice #12345',
					targetChain: '1',
					txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				},
			],
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address invalid, "from"' },
			},
		},
	})
	async getHistoryByFrom(
		@Param('from') from: string,
		@Query('to') to?: string,
		@Query('reference') reference?: string,
		@Query('start') start: string = '0',
		@Query('end') end: string | number = Date.now()
	): Promise<TransferReferenceQuery[] | { error: string }> {
		if (isAddress(from) == false) return { error: 'Address invalid, "from"' };
		if (to != undefined && isAddress(to) == false) return { error: 'Address invalid, "to"' };
		return await this.transfer.getHistoryByFromFilter({
			from,
			to: to as Address | undefined,
			reference,
			start,
			end,
		});
	}

	@Get('history/by/to/:to')
	@ApiOperation({
		summary: 'Get complete transfer history by recipient address',
		description:
			'Returns: array of TransferReferenceQuery or error object, retrieves the complete historical transfer references received by a specific address. ' +
			'Unlike the /by/to endpoint which returns only latest transfers, this returns the full history. ' +
			'Supports optional filtering by sender address, reference text, and date range. Returns an error if the address is invalid.',
	})
	@ApiParam({
		name: 'to',
		description: 'Recipient wallet address (Ethereum address)',
		example: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
	})
	@ApiQuery({ name: 'from', required: false, description: 'Optional sender address filter' })
	@ApiQuery({ name: 'reference', required: false, description: 'Optional reference text filter (partial match)' })
	@ApiQuery({ name: 'start', required: false, description: 'Start timestamp (Unix epoch or 0 for beginning). Default: 0' })
	@ApiQuery({ name: 'end', required: false, description: 'End timestamp (Unix epoch or current time). Default: now' })
	@ApiResponse({
		status: 200,
		description: 'Returns complete array of matching transfer references',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					chainId: { type: 'number', description: 'Blockchain chain ID' },
					count: { type: 'number', description: 'Sequential transfer counter' },
					created: { type: 'number', description: 'Transfer timestamp (Unix epoch)' },
					from: { type: 'string', description: 'Sender address' },
					sender: { type: 'string', description: 'Original sender address' },
					to: { type: 'string', description: 'Recipient address' },
					amount: { type: 'string', description: 'Transfer amount (bigint as string)' },
					reference: { type: 'string', description: 'Custom reference message' },
					targetChain: { type: 'string', description: 'Target blockchain chain identifier' },
					txHash: { type: 'string', description: 'Transaction hash' },
				},
			},
			example: [
				{
					chainId: 1,
					count: 5234,
					created: 1768914604,
					from: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					sender: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
					to: '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F',
					amount: '1000000000000000000000',
					reference: 'Invoice #12345',
					targetChain: '1',
					txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				},
			],
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address invalid, "to"' },
			},
		},
	})
	async getHistoryByTo(
		@Param('to') to: string,
		@Query('from') from?: string,
		@Query('reference') reference?: string,
		@Query('start') start: string = '0',
		@Query('end') end: string | number = Date.now()
	): Promise<TransferReferenceQuery[] | { error: string }> {
		if (isAddress(to) == false) return { error: 'Address invalid, "to"' };
		if (from != undefined && isAddress(from) == false) return { error: 'Address invalid, "from"' };
		return await this.transfer.getHistoryByToFilter({
			from: from as Address | undefined,
			to,
			reference,
			start,
			end,
		});
	}
}
