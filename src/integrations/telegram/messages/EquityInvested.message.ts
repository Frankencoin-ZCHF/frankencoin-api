import { AnalyticsTransactionLog } from 'modules/analytics/analytics.types';
import { formatCurrency } from 'utils/format';
import { AppUrl, ExplorerTxUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';

export function EquityInvestedMessage(log: AnalyticsTransactionLog): string {
	const d = new Date(Number(log.timestamp) * 1000);
	const cap = BigInt(log.fpsPrice) * BigInt(log.fpsTotalSupply);

	return `💰 *Equity Invested*

*Amount: ${formatCurrency(formatUnits(log.amount, 18))} ZCHF*
📅 Date: *${d.toUTCString()}*

FPS Price: *${formatCurrency(formatUnits(log.fpsPrice, 18))} ZCHF*
Market Cap: *${formatCurrency(formatUnits(cap, 36))} ZCHF*

[🏦 Equity](${AppUrl('/equity')}) · [🔍 Explorer](${ExplorerTxUrl(log.txHash)})`;
}
