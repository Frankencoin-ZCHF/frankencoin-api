#!/usr/bin/env ts-node
/**
 * Show the profit and loss on each sidechain that has not yet been synchronized to mainnet.
 *
 * On a BridgedFrankencoin, unsynced profit is the ZCHF balance of the reserve (governance) and
 * unsynced loss is `accruedLoss`. Both are reset/sent home by `synchronizeAccounting()`.
 * Values are read via `getSynchronizeAccountingData()`, i.e. exactly what the next sync would send.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/verify-sidechain-accounting.ts
 */

import { ADDRESS, BridgedFrankencoinABI, SupportedChainIds } from '@frankencoin/zchf';
import { VIEM_CONFIG } from 'app.config';
import { Address, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';

type ChainAccounting = { chainId: number; name: string; profit: bigint; loss: bigint };

const fmtZ = (raw: bigint) => {
	const sign = raw < 0n ? '-' : '';
	const abs = raw < 0n ? -raw : raw;
	return sign + Number(formatUnits(abs, 18)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

async function fetchChainAccounting(chainId: number): Promise<ChainAccounting> {
	const client = VIEM_CONFIG[chainId];
	const [profit, loss] = (await client.readContract({
		address: (ADDRESS[chainId] as any).ccipBridgedFrankencoin as Address,
		abi: BridgedFrankencoinABI,
		functionName: 'getSynchronizeAccountingData',
	})) as readonly [bigint, bigint, unknown];

	return { chainId, name: client.chain?.name ?? String(chainId), profit, loss };
}

async function main() {
	const sidechains = SupportedChainIds.filter((id) => id !== mainnet.id && (ADDRESS[id] as any)?.ccipBridgedFrankencoin && VIEM_CONFIG[id]);

	console.log('\nQuerying unsynchronized accounting on sidechains ...\n');

	const results = await Promise.allSettled(sidechains.map(fetchChainAccounting));
	const rows: ChainAccounting[] = [];

	results.forEach((r, i) => {
		if (r.status === 'fulfilled') rows.push(r.value);
		else console.error(`  ⚠️  chain ${sidechains[i]}: ${r.reason?.shortMessage ?? r.reason?.message ?? r.reason}`);
	});

	const col = [18, 20, 20, 20];
	const line = (c: string[]) => '  ' + c.map((v, i) => (i === 0 ? v.padEnd(col[i]) : v.padStart(col[i]))).join(' ');

	console.log(line(['Chain', 'Profit (ZCHF)', 'Loss (ZCHF)', 'Net (ZCHF)']));
	console.log('  ' + '─'.repeat(col.reduce((a, b) => a + b + 1, -1)));

	let totalProfit = 0n;
	let totalLoss = 0n;
	for (const { chainId, name, profit, loss } of rows) {
		totalProfit += profit;
		totalLoss += loss;
		console.log(line([`${name} (${chainId})`, fmtZ(profit), fmtZ(loss), fmtZ(profit - loss)]));
	}

	console.log('  ' + '─'.repeat(col.reduce((a, b) => a + b + 1, -1)));
	console.log(line(['TOTAL', fmtZ(totalProfit), fmtZ(totalLoss), fmtZ(totalProfit - totalLoss)]));
	console.log();
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
