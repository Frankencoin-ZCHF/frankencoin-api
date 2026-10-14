import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { GodEyeService } from './godeye.service';

const num = (v?: string) => (v === undefined || v === '' || isNaN(Number(v)) ? undefined : Number(v));

@ApiTags('GodEye Controller')
@Controller('godeye')
export class GodEyeController {
	private html: string | null = null;

	constructor(private readonly godeye: GodEyeService) {}

	private page(): string {
		if (this.html && process.env.NODE_ENV === 'production') return this.html;
		const candidates = [
			join(__dirname, 'ui', 'godeye.html'),
			join(__dirname, '..', '..', '..', 'modules', 'godeye', 'ui', 'godeye.html'), // nest assets copy next to dist/src
			join(process.cwd(), 'src', 'modules', 'godeye', 'ui', 'godeye.html'),
			join(process.cwd(), 'dist', 'src', 'modules', 'godeye', 'ui', 'godeye.html'),
		];
		const file = candidates.find((f) => existsSync(f));
		this.html = file ? readFileSync(file, 'utf8') : '<h1>GodEye UI not found</h1>';
		return this.html;
	}

	@Get()
	@Header('Content-Type', 'text/html; charset=utf-8')
	@ApiExcludeEndpoint()
	ui() {
		return this.page();
	}

	@Get('tokens')
	@ApiOperation({
		summary: 'GodEye: tracked ERC20 ledgers',
		description: 'Returns every ERC20 (chain, token) whose complete transfer history is mirrored from the indexer, plus the sync state.',
	})
	tokens() {
		return this.godeye.getTokens();
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
}
