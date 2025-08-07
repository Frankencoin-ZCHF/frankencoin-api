import { AnalyticsDailyLog } from 'analytics/analytics.types';
import { formatCurrency } from 'utils/format';
import { formatUnits } from 'viem';

export function DailyInfosMessage(before: AnalyticsDailyLog, now: AnalyticsDailyLog): string {
	// Total Supply, changes
	const totalSupplyChangePct = (BigInt(now.totalSupply) * 10n ** 20n) / BigInt(before.totalSupply) - 10n ** 20n;
	const fpsPriceChangePct = (BigInt(now.fpsPrice) * 10n ** 20n) / BigInt(before.fpsPrice) - 10n ** 20n;

	const inSavingsPct = (BigInt(now.totalSavings) * 10n ** 20n) / BigInt(now.totalSupply);
	const inEquityPct = (BigInt(now.totalEquity) * 10n ** 20n) / BigInt(now.totalSupply);

	return `
*Frankencoin Infos*

Total Supply: ${formatCurrency(formatUnits(now.totalSupply, 18), 0, 0)} ZCHF 
Last 30d: ${formatCurrency(formatUnits(totalSupplyChangePct, 18))}%

In Equity: ${formatCurrency(formatUnits(inEquityPct, 18))}%
In Savings: ${formatCurrency(formatUnits(inSavingsPct, 18))}%

FPS Price: ${formatCurrency(formatUnits(now.fpsPrice, 18), 0, 0)} ZCHF 
Last 30d: ${formatCurrency(formatUnits(fpsPriceChangePct, 18))}%
`;
}
