import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransferReferenceService } from './transfer.reference.service';
import { TransferReferenceQuery } from './transfer.reference.types';
import { Address, isAddress } from 'viem';

@ApiTags('Transfer Controller')
@Controller('transfer/reference')
export class TransferReferenceController {
	constructor(private readonly transfer: TransferReferenceService) {}

	@Get('list')
	@ApiResponse({
		description: 'Returns a list of latest transfer references',
	})
	getList() {
		return this.transfer.getList();
	}

	@Get('counter')
	@ApiResponse({
		description: 'Returns the counter of latest transfer reference',
	})
	getCounter(): number {
		return this.transfer.getList().list.at(0)?.count ?? 0;
	}

	@Get('by/count/:count')
	@ApiResponse({
		description: 'Returns the transfer reference by its count',
	})
	async getByCount(@Param('count') count: string = '0'): Promise<TransferReferenceQuery | { error: string }> {
		const r = await this.transfer.getByCount(count);
		if (r == undefined) return { error: 'Not found' };
		else return r;
	}

	@Get('by/from/:from')
	@ApiResponse({
		description: 'Returns the latest of transfer references by "from" address',
	})
	@ApiQuery({ name: 'to', required: false, description: 'Enter the recipiant address' })
	@ApiQuery({ name: 'reference', required: false, description: 'Enter the reference' })
	@ApiQuery({ name: 'start', required: false, description: 'Start date for price history (YYYY-MM-DD)' })
	@ApiQuery({ name: 'end', required: false, description: 'End date for price history (YYYY-MM-DD)' })
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
	@ApiResponse({
		description: 'Returns the latest of transfer references by "to" address',
	})
	@ApiQuery({ name: 'from', required: false, description: 'Enter the senders address' })
	@ApiQuery({ name: 'reference', required: false, description: 'Enter the reference' })
	@ApiQuery({ name: 'start', required: false, description: 'Start date for price history (YYYY-MM-DD)' })
	@ApiQuery({ name: 'end', required: false, description: 'End date for price history (YYYY-MM-DD)' })
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
	@ApiResponse({
		description: 'Returns the history query of transfer references by "from" address',
	})
	@ApiQuery({ name: 'to', required: false, description: 'Enter the recipiant address' })
	@ApiQuery({ name: 'reference', required: false, description: 'Enter the reference' })
	@ApiQuery({ name: 'start', required: false, description: 'Start date for price history (YYYY-MM-DD)' })
	@ApiQuery({ name: 'end', required: false, description: 'End date for price history (YYYY-MM-DD)' })
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
	@ApiResponse({
		description: 'Returns the history query of transfer references by "to" address',
	})
	@ApiQuery({ name: 'from', required: false, description: 'Enter the senders address' })
	@ApiQuery({ name: 'reference', required: false, description: 'Enter the reference' })
	@ApiQuery({ name: 'start', required: false, description: 'Start date for price history (YYYY-MM-DD)' })
	@ApiQuery({ name: 'end', required: false, description: 'End date for price history (YYYY-MM-DD)' })
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
