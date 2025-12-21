import { AnalyticsDailyLog } from 'analytics/analytics.types';
import { FrankencoinSupplyQueryObject } from 'ecosystem/ecosystem.frankencoin.types';
import { formatCurrency } from 'utils/format';
import { formatUnits } from 'viem';

export function DailyInfosMessage(before: AnalyticsDailyLog, now: AnalyticsDailyLog, supply: FrankencoinSupplyQueryObject): string {
	// overwrite total supply with multichain supply
	const timestampBefore = new Date(before.date).getTime();
	const timestampAfter = new Date(now.date).getTime();

	const keys = Object.keys(supply).map((i) => parseInt(i) * 1000);

	const filteredBefore = keys.filter((i) => i <= timestampBefore);
	const keyBefore = filteredBefore.at(-1);
	const supplyBefore = supply[keyBefore / 1000].supply;

	const filteredAfter = keys.filter((i) => i <= timestampAfter);
	const keyAfter = filteredAfter.at(-1);
	const supplyAfter = supply[keyAfter / 1000].supply;

	// Total Supply, changes
	const totalSupplyChangePct = (supplyAfter / supplyBefore - 1) * 100;
	const fpsPriceChangePct = (BigInt(now.fpsPrice) * 10n ** 20n) / BigInt(before.fpsPrice) - 10n ** 20n;

	const inSavingsPct = (BigInt(now.totalSavings) * 10n ** 20n) / BigInt(now.totalSupply);
	const inEquityPct = (BigInt(now.totalEquity) * 10n ** 20n) / BigInt(now.totalSupply);

	return `
*Frankencoin Infos*

Total Supply: ${formatCurrency(supplyAfter, 0, 0)} ZCHF 
Last 30d: ${formatCurrency(totalSupplyChangePct)}%

In Equity: ${formatCurrency(formatUnits(inEquityPct, 18))}%
In Savings: ${formatCurrency(formatUnits(inSavingsPct, 18))}%

FPS Price: ${formatCurrency(formatUnits(now.fpsPrice, 18), 0, 0)} ZCHF 
Last 30d: ${formatCurrency(formatUnits(fpsPriceChangePct, 18))}%
`;
}
