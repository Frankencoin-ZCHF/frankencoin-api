import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GodEyeService } from './godeye.service';

const num = (v?: string) => (v === undefined || v === '' || isNaN(Number(v)) ? undefined : Number(v));

@ApiTags('GodEye Controller')
@Controller('godeye')
export class GodEyeController {
	constructor(private readonly godeye: GodEyeService) {}

	@Get('tokens')
	@ApiOperation({
		summary: 'GodEye: tracked ERC20 ledgers',
		description: 'Returns every ERC20 (chain, token) whose complete transfer history is mirrored from the indexer, plus the sync state.',
	})
	tokens() {
		return this.godeye.getTokens();
	}

	@Get('addressbook')
	@ApiOperation({
		summary: 'GodEye: curated address book',
		description:
			'Known addresses with a label and a category (wallet, position, minter, savings, equity, bridge, dex, contract). ' +
			'GodEye uses these to label nodes and to move addresses out of the generic wallet category.',
	})
	@ApiQuery({ name: 'chainId', required: false })
	addressbook(@Query('chainId') chainId?: string) {
		return this.godeye.getAddressBook(num(chainId));
	}

	@Get('timeline')
	@ApiOperation({ summary: 'GodEye: daily supply / holders / volume series' })
	@ApiQuery({ name: 'token', required: false, description: 'Symbol (ZCHF, FPS), address or "chainId:address". Default ZCHF' })
	@ApiQuery({ name: 'chainId', required: false })
	timeline(@Query('token') token?: string, @Query('chainId') chainId?: string) {
		return this.godeye.getTimeline(token, num(chainId));
	}

	@Get('graph')
	@ApiOperation({
		summary: 'GodEye: fund-flow graph at a point in time',
		description:
			'Aggregated transfer graph. Nodes are the biggest accounts (by balance or volume) at `at`, edges are the summed transfers inside the window. ' +
			'Mints/burns routed through positions appear as zero-address -> position -> owner. Use `focus` for the neighbourhood of one address, ' +
			'or mode=categories for a protocol-level flow between wallets, positions, savings, equity, bridges and DEXes.',
	})
	@ApiQuery({ name: 'token', required: false })
	@ApiQuery({ name: 'chainId', required: false })
	@ApiQuery({ name: 'at', required: false, description: 'Unix seconds, default latest' })
	@ApiQuery({ name: 'window', required: false, description: 'Seconds of flow to aggregate before `at`, 0 = since genesis' })
	@ApiQuery({ name: 'top', required: false, description: 'Node count (5-400), default 80' })
	@ApiQuery({ name: 'rank', required: false, enum: ['balance', 'volume'] })
	@ApiQuery({ name: 'mode', required: false, enum: ['entities', 'categories'] })
	@ApiQuery({ name: 'focus', required: false, description: 'Address to center on' })
	@ApiQuery({ name: 'minAmount', required: false, description: 'Hide edges below this token amount' })
	graph(
		@Query('token') token?: string,
		@Query('chainId') chainId?: string,
		@Query('at') at?: string,
		@Query('window') window?: string,
		@Query('top') top?: string,
		@Query('rank') rank?: 'balance' | 'volume',
		@Query('mode') mode?: 'entities' | 'categories',
		@Query('focus') focus?: string,
		@Query('minAmount') minAmount?: string
	) {
		return this.godeye.getGraph({
			token,
			chainId: num(chainId),
			at: num(at),
			window: num(window),
			top: num(top),
			rank,
			mode,
			focus,
			minAmount: num(minAmount),
		});
	}

	@Get('holders')
	@ApiOperation({ summary: 'GodEye: richest holders and concentration at a point in time' })
	holders(
		@Query('token') token?: string,
		@Query('chainId') chainId?: string,
		@Query('at') at?: string,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string
	) {
		return this.godeye.getHolders(token, num(chainId), num(at), Math.min(num(limit) || 100, 500), num(offset) || 0);
	}

	@Get('search')
	@ApiOperation({ summary: 'GodEye: find an address by prefix or label' })
	@ApiQuery({ name: 'q', required: true })
	search(@Query('q') q: string, @Query('token') token?: string, @Query('chainId') chainId?: string) {
		return this.godeye.search(q || '', token, num(chainId));
	}

	@Get('address/:address')
	@ApiOperation({
		summary: 'GodEye: full history and provenance of one address',
		description: 'Balance history, top sources / destinations, a two-hop origin tree of the funds and the latest raw transfers.',
	})
	address(@Param('address') address: string, @Query('token') token?: string, @Query('chainId') chainId?: string) {
		return this.godeye.getAddress(address, token, num(chainId));
	}

	@Get('address/:address/transfers')
	@ApiOperation({
		summary: 'GodEye: raw transfers of one address in a time window',
		description:
			'The transactions behind a day of the timeline view, with tx hashes. Optionally narrowed to one counterparty with `peer`; ' +
			'if nothing matches (mints/burns routed through a position) all transfers of the window are returned and `peerMatched` is false. Max 100 rows.',
	})
	@ApiQuery({ name: 'from', required: true, description: 'Window start, unix seconds' })
	@ApiQuery({ name: 'to', required: true, description: 'Window end (exclusive), unix seconds, max one year after `from`' })
	@ApiQuery({ name: 'peer', required: false, description: 'Only transfers with this counterparty' })
	transfers(
		@Param('address') address: string,
		@Query('from') from: string,
		@Query('to') to: string,
		@Query('peer') peer?: string,
		@Query('token') token?: string,
		@Query('chainId') chainId?: string
	) {
		return this.godeye.getTransfers(address, token, num(chainId), num(from), num(to), peer);
	}

	@Get('address/:address/journey')
	@ApiOperation({
		summary: 'GodEye: day-by-day activity of one address',
		description: 'Daily inflow / outflow / balance with the biggest counterparties of each day. Powers the timeline view.',
	})
	journey(@Param('address') address: string, @Query('token') token?: string, @Query('chainId') chainId?: string) {
		return this.godeye.getJourney(address, token, num(chainId));
	}
}
