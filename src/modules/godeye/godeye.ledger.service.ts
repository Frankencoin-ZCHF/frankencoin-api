import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { gql } from '@apollo/client/core';
import { ADDRESS } from '@frankencoin/zchf';
import { PONDER_CLIENT } from 'app.config';
import { GodEyeTokenInfo } from './godeye.types';

export const ZERO = '0x0000000000000000000000000000000000000000';

export const CHAIN_NAMES: Record<number, string> = {
	1: 'Ethereum',
	10: 'Optimism',
	100: 'Gnosis',
	137: 'Polygon',
	146: 'Sonic',
	8453: 'Base',
	42161: 'Arbitrum',
	43114: 'Avalanche',
};

const PAGE = 1000;
const E18 = 1e18;

/**
 * Compact, column oriented transfer store of a single ERC20 on a single chain.
 * Rows are ordered by the indexer's transfer counter and therefore by time.
 */
export class TokenLedger {
	n = 0;
	cap = 0;
	ts: Uint32Array;
	from: Uint32Array;
	to: Uint32Array;
	amt: Float64Array;
	/** 1 when the row was routed through a position (mint/burn attribution) */
	via: Uint8Array;

	lastCount = 0n;
	/** indexer transfer counter we are syncing towards */
	target = 0;
	syncedAt = 0;
	/** bumped on every append, used as cache key */
	version = 0;

	constructor(
		readonly chainId: number,
		readonly token: string,
		readonly symbol: string
	) {
		this.grow(1 << 12);
	}

	get key() {
		return `${this.chainId}:${this.token}`;
	}

	private grow(cap: number) {
		const copy = <T extends Uint32Array | Float64Array | Uint8Array>(old: T, Ctor: any): T => {
			const next = new Ctor(cap);
			if (old) next.set(old.subarray(0, this.n));
			return next;
		};
		this.ts = copy(this.ts, Uint32Array);
		this.from = copy(this.from, Uint32Array);
		this.to = copy(this.to, Uint32Array);
		this.amt = copy(this.amt, Float64Array);
		this.via = copy(this.via, Uint8Array);
		this.cap = cap;
	}

	push(ts: number, from: number, to: number, amount: number, via = 0) {
		if (this.n >= this.cap) this.grow(this.cap * 2);
		const i = this.n++;
		this.ts[i] = ts;
		this.from[i] = from;
		this.to[i] = to;
		this.amt[i] = amount;
		this.via[i] = via;
		this.version++;
	}

	/** first row index with ts > t */
	upperBound(t: number): number {
		let lo = 0;
		let hi = this.n;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			if (this.ts[mid] <= t) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	/** first row index with ts >= t */
	lowerBound(t: number): number {
		let lo = 0;
		let hi = this.n;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			if (this.ts[mid] < t) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
}

@Injectable()
export class GodEyeLedgerService {
	private readonly logger = new Logger(this.constructor.name);

	readonly ledgers = new Map<string, TokenLedger>();
	readonly addrs: string[] = [ZERO];
	private readonly addrIdx = new Map<string, number>([[ZERO, 0]]);
	/** mint/burn tx -> position, so ledger can route mint -> position -> owner */
	private readonly positionTx = new Map<string, string>();

	private syncing = false;
	private lastRun = 0;
	private lastError: string | null = null;
	private phase: 'idle' | 'positions' | 'ledgers' = 'idle';

	constructor() {
		setTimeout(() => this.sync(), 4000);
	}

	// ---------------------------------------------------------------- address table
	idOf(address: string): number {
		const a = address.toLowerCase();
		let i = this.addrIdx.get(a);
		if (i === undefined) {
			i = this.addrs.length;
			this.addrs.push(a);
			this.addrIdx.set(a, i);
		}
		return i;
	}

	findId(address: string): number | undefined {
		return this.addrIdx.get(address.toLowerCase());
	}

	// ---------------------------------------------------------------- public accessors
	get(key: string): TokenLedger | undefined {
		return this.ledgers.get(key.toLowerCase());
	}

	/** resolves a "chainId:token", a bare symbol (ZCHF, FPS) or defaults to mainnet ZCHF */
	resolve(token?: string, chainId?: number): TokenLedger | undefined {
		if (!token) token = 'ZCHF';
		const t = token.toLowerCase();
		const direct = this.ledgers.get(t);
		if (direct) return direct;
		const list = [...this.ledgers.values()];
		if (t.startsWith('0x')) return list.find((l) => l.token === t && (chainId ? l.chainId === chainId : true));
		const bySymbol = list.filter((l) => l.symbol.toLowerCase() === t);
		return bySymbol.find((l) => l.chainId === (chainId || 1)) || bySymbol[0];
	}

	status() {
		const list = [...this.ledgers.values()];
		// the UI waits for mainnet ZCHF only, the other ledgers keep syncing in the background
		const main = list.filter((l) => l.symbol === 'ZCHF' && l.chainId === 1);
		const target = main.reduce((a, l) => a + l.target, 0);
		const done = main.reduce((a, l) => a + Math.min(Number(l.lastCount), l.target), 0);
		return {
			syncing: this.syncing,
			phase: this.phase,
			lastRun: this.lastRun,
			lastError: this.lastError,
			ledgers: this.ledgers.size,
			progress: target > 0 ? done / target : 0,
			done,
			target,
			ready: list.some((l) => l.symbol === 'ZCHF' && l.chainId === 1 && l.n > 0 && Number(l.lastCount) >= l.target),
		};
	}

	tokens(): GodEyeTokenInfo[] {
		return [...this.ledgers.values()]
			.map((l) => ({
				key: l.key,
				chainId: l.chainId,
				chain: CHAIN_NAMES[l.chainId] || String(l.chainId),
				token: l.token,
				symbol: l.symbol,
				transfers: l.n,
				firstTs: l.n ? l.ts[0] : 0,
				lastTs: l.n ? l.ts[l.n - 1] : 0,
				syncedAt: l.syncedAt,
			}))
			.sort((a, b) => b.transfers - a.transfers);
	}

	// ---------------------------------------------------------------- sync
	@Interval(60_000)
	async sync() {
		if (this.syncing) return;
		this.syncing = true;
		try {
			this.phase = 'positions';
			await this.syncPositionTx();
			this.phase = 'ledgers';
			const status = await this.fetchStatus();
			// register all ledgers up front so progress covers the full workload
			for (const s of status) {
				const key = `${s.chainId}:${s.token}`;
				if (!this.ledgers.has(key)) this.ledgers.set(key, new TokenLedger(s.chainId, s.token, this.symbolOf(s.chainId, s.token)));
				this.ledgers.get(key).target = s.balance;
			}
			const rank = (s: any) => (s.chainId === 1 && s.token === ADDRESS[1].frankencoin.toLowerCase() ? 0 : s.chainId === 1 ? 1 : 2);
			status.sort((a, b) => rank(a) - rank(b) || b.balance - a.balance);

			for (const s of status) {
				const symbol = this.symbolOf(s.chainId, s.token);
				const key = `${s.chainId}:${s.token}`;
				let ledger = this.ledgers.get(key);
				if (!ledger) {
					ledger = new TokenLedger(s.chainId, s.token, symbol);
					this.ledgers.set(key, ledger);
				}
				if (ledger.lastCount >= BigInt(s.balance)) {
					ledger.syncedAt = Math.floor(Date.now() / 1000);
					continue;
				}
				await this.syncLedger(ledger);
			}
			this.lastError = null;
		} catch (e) {
			this.lastError = String(e?.message || e);
			this.logger.error(`Ledger sync failed: ${this.lastError}`);
		} finally {
			this.lastRun = Date.now();
			this.phase = 'idle';
			this.syncing = false;
		}
	}

	private symbolOf(chainId: number, token: string): string {
		const chain = (ADDRESS as any)[chainId];
		if (!chain) return token.slice(0, 8);
		if (chain.frankencoin?.toLowerCase() === token) return 'ZCHF';
		if (chain.equity?.toLowerCase() === token) return 'FPS';
		if (chain.fcs?.toLowerCase() === token) return 'FCS';
		if (chain.wFPS?.toLowerCase() === token) return 'WFPS';
		// bridged ZCHF lives at a different address on L2s
		return chainId === 1 ? token.slice(0, 8) : 'ZCHF';
	}

	private async fetchStatus(): Promise<{ chainId: number; token: string; balance: number }[]> {
		const r = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					eRC20Statuss(limit: 100) {
						items {
							chainId
							token
							balance
						}
					}
				}
			`,
		});
		return r.data.eRC20Statuss.items.map((i: any) => ({ chainId: i.chainId, token: i.token.toLowerCase(), balance: Number(i.balance) }));
	}

	private async syncPositionTx() {
		const pull = async (entity: string) => {
			let after: string | null = null;
			do {
				const r: any = await PONDER_CLIENT.query({
					fetchPolicy: 'no-cache',
					query: gql(`
						query($after: String) {
							${entity}(orderBy: "created", orderDirection: "asc", limit: ${PAGE}, after: $after) {
								items { txHash position }
								pageInfo { hasNextPage endCursor }
							}
						}
					`),
					variables: { after },
				});
				const page = r.data[entity];
				for (const it of page.items) this.positionTx.set(it.txHash.toLowerCase(), it.position.toLowerCase());
				after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
			} while (after);
		};
		await pull('mintingHubV1MintingUpdateV1s');
		await pull('mintingHubV2MintingUpdateV2s');
	}

	private async syncLedger(ledger: TokenLedger) {
		const before = ledger.n;
		const started = Date.now();
		const isZchf = ledger.symbol === 'ZCHF';
		for (;;) {
			const r = await PONDER_CLIENT.query({
				fetchPolicy: 'no-cache',
				query: gql`
					query ($chainId: Int!, $token: String!, $cursor: BigInt!) {
						eRC20Balances(
							where: { chainId: $chainId, token: $token, count_gt: $cursor }
							orderBy: "count"
							orderDirection: "asc"
							limit: ${PAGE}
						) {
							items {
								count
								txHash
								created
								from
								to
								amount
							}
						}
					}
				`,
				variables: { chainId: ledger.chainId, token: ledger.token, cursor: ledger.lastCount.toString() },
			});
			const items = r.data.eRC20Balances.items;
			for (const it of items) {
				const from = it.from.toLowerCase();
				const to = it.to.toLowerCase();
				const ts = Number(it.created);
				const amount = Number(BigInt(it.amount)) / E18;
				const position = isZchf && ledger.chainId === 1 && (from === ZERO || to === ZERO) ? this.positionTx.get(it.txHash.toLowerCase()) : undefined;
				if (position && from === ZERO) {
					// mint: zero -> position -> recipient
					const p = this.idOf(position);
					ledger.push(ts, 0, p, amount, 1);
					ledger.push(ts, p, this.idOf(to), amount, 1);
				} else if (position && to === ZERO) {
					// burn: payer -> position -> zero
					const p = this.idOf(position);
					ledger.push(ts, this.idOf(from), p, amount, 1);
					ledger.push(ts, p, 0, amount, 1);
				} else {
					ledger.push(ts, this.idOf(from), this.idOf(to), amount);
				}
				ledger.lastCount = BigInt(it.count);
			}
			if (items.length < PAGE) break;
		}
		ledger.syncedAt = Math.floor(Date.now() / 1000);
		this.logger.log(`Ledger ${ledger.symbol}@${ledger.chainId}: +${ledger.n - before} rows (${ledger.n} total, ${Date.now() - started}ms)`);
	}
}
