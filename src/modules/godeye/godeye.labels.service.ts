import { Injectable } from '@nestjs/common';
import { ADDRESS } from '@frankencoin/zchf';
import { PositionsService } from 'modules/positions/positions.service';
import { EcosystemMinterService } from 'modules/ecosystem/ecosystem.minter.service';
import { GodEyeKind, GodEyeLabel } from './godeye.types';
import { ZERO } from './godeye.ledger.service';

/** protocol address book keys -> display label and node kind */
const BOOK: Record<string, GodEyeLabel> = {
	frankencoin: { label: 'Frankencoin (reserve)', kind: 'equity' },
	equity: { label: 'Equity (FPS)', kind: 'equity' },
	wFPS: { label: 'Wrapped FPS', kind: 'equity' },
	fcs: { label: 'FCS vault', kind: 'equity' },
	uniswapPoolV3ZCHFUSDT: { label: 'Uniswap V3 ZCHF/USDT', kind: 'dex' },
	mintingHubV1: { label: 'MintingHub V1', kind: 'minter' },
	mintingHubV2: { label: 'MintingHub V2', kind: 'minter' },
	positionFactoryV1: { label: 'Position Factory V1', kind: 'minter' },
	positionFactoryV2: { label: 'Position Factory V2', kind: 'minter' },
	rollerV2: { label: 'Position Roller', kind: 'minter' },
	cloneHelper: { label: 'Clone Helper', kind: 'minter' },
	savingsV2: { label: 'Savings V2', kind: 'savings' },
	savingsReferral: { label: 'Savings (Referral)', kind: 'savings' },
	svZCHF: { label: 'svZCHF vault', kind: 'savings' },
	stablecoinBridgeXCHF: { label: 'Bridge XCHF', kind: 'bridge' },
	stablecoinBridgeVCHF: { label: 'Bridge VCHF', kind: 'bridge' },
	stablecoinBridgeCHFAU: { label: 'Bridge CHFAU', kind: 'bridge' },
	xchfToken: { label: 'XCHF', kind: 'contract' },
	vchfToken: { label: 'VCHF', kind: 'contract' },
	chfauToken: { label: 'CHFAU', kind: 'contract' },
	ccipTokenPool: { label: 'CCIP Token Pool', kind: 'bridge' },
	ccipBridgeAccounting: { label: 'CCIP Bridge Accounting', kind: 'bridge' },
	ccipRouter: { label: 'CCIP Router', kind: 'bridge' },
	uniswapAmplifier: { label: 'Uniswap Amplifier', kind: 'minter' },
	uniswapAmplifierPositionImplementation: { label: 'Amplifier Position', kind: 'minter' },
	transferReference: { label: 'Transfer Reference', kind: 'contract' },
	transferWithAuthorization: { label: 'Transfer With Authorization', kind: 'contract' },
	mainnetVotes: { label: 'Mainnet Votes', kind: 'contract' },
};

/** well known external counterparties that show up in the transfer graph */
const EXTERNAL: Record<string, GodEyeLabel> = {
	'0x000000000004444c5dc75cb358380d2e3de08a90': { label: 'Uniswap V4 PoolManager', kind: 'dex' },
};

@Injectable()
export class GodEyeLabelsService {
	private statics = new Map<string, GodEyeLabel>();
	private dynamic = new Map<string, GodEyeLabel>();
	private dynamicAt = 0;

	constructor(
		private readonly positions: PositionsService,
		private readonly minters: EcosystemMinterService
	) {
		this.buildStatics();
	}

	private buildStatics() {
		this.statics.set(ZERO, { label: 'Mint / Burn', kind: 'mint' });
		for (const [a, l] of Object.entries(EXTERNAL)) this.statics.set(a, l);
		for (const chain of Object.values(ADDRESS as Record<string, Record<string, any>>)) {
			for (const [name, value] of Object.entries(chain)) {
				const l = BOOK[name];
				if (!l || typeof value !== 'string' || !value.startsWith('0x')) continue;
				const a = value.toLowerCase();
				if (!this.statics.has(a)) this.statics.set(a, l);
			}
		}
	}

	private refreshDynamic() {
		if (Date.now() - this.dynamicAt < 60_000) return;
		this.dynamicAt = Date.now();
		const next = new Map<string, GodEyeLabel>();
		try {
			for (const m of this.minters.getMintersList().list) {
				if (m.denyDate) continue;
				next.set(m.minter.toLowerCase(), { label: `Minter ${m.minter.slice(0, 8)}`, kind: 'minter' });
			}
			for (const p of this.positions.getPositionsList().list) {
				const sym = (p as any).collateralSymbol || '?';
				next.set(p.position.toLowerCase(), { label: `Position ${sym} ${p.position.slice(2, 6)}`, kind: 'position' });
			}
		} catch {
			// services not ready yet, keep what we have
			return;
		}
		this.dynamic = next;
	}

	resolve(address: string): GodEyeLabel {
		this.refreshDynamic();
		const a = address.toLowerCase();
		return this.statics.get(a) || this.dynamic.get(a) || { label: null, kind: 'wallet' as GodEyeKind };
	}
}
