import { AnalyticsTransactionLog } from 'analytics/analytics.types';
import { formatCurrency } from 'utils/format';
import { AppUrl, ExplorerTxUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';

export function EquityInvestedMessage(log: AnalyticsTransactionLog): string {
	const d = new Date(Number(log.timestamp) * 1000);
	const cap = BigInt(log.fpsPrice) * BigInt(log.fpsTotalSupply);

	return `
*Equity Invested*

Date: ${d.toString().split(' ').slice(0, 5).join(' ')}
*Amount: ${formatCurrency(formatUnits(log.amount, 18))} ZCHF*

Current Price: ${formatCurrency(formatUnits(log.fpsPrice, 18))} ZCHF
Current Market Cap.: ${formatCurrency(formatUnits(cap, 18 * 2))} ZCHF

[Goto Governance](${AppUrl(`/equity`)})
[Explorer Transaction](${ExplorerTxUrl(log.txHash)})
`;
}
