import { AnalyticsDailyLog } from 'modules/analytics/analytics.types';
import { FrankencoinSupplyQueryObject } from 'modules/ecosystem/ecosystem.frankencoin.types';
import { formatCurrency } from 'utils/format';
import { formatUnits } from 'viem';

const WINDOW_SECONDS = 30 * 24 * 3600;

function arrow(change: number | null): string {
	if (change === null) return '→';
	return change > 0 ? '▲' : change < 0 ? '▼' : '→';
}

const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const PCT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

// compact amount with symbol, e.g. 35'000'707 -> 35M
function compact(val: number): string {
	return COMPACT.format(val);
}

// percentage with max. 1 decimal
function fmtPct(val: number): string {
	return PCT.format(val);
}

function fmtZCHF(val: bigint): string {
	return compact(parseFloat(formatUnits(val, 18)));
}

function avg(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

// change of the 30d rolling average vs. the 30d rolling average one window earlier
function avgChangePct(current: number[], previous: number[]): number | null {
	const c = avg(current);
	const p = avg(previous);
	if (c === null || p === null || p === 0) return null;
	return (c / p - 1) * 100;
}

function fmtChange(change: number | null): string {
	if (change === null) return 'n/a';
	return `${arrow(change)} *${fmtPct(change)}%*`;
}

function supplyAt(supply: FrankencoinSupplyQueryObject, keys: number[], ts: number): number | null {
	const key = keys.filter((k) => k <= ts).at(-1);
	return key === undefined ? null : supply[key].supply;
}

/**
 * Weekly snapshot. Headline figures are the latest values; every "30d" line compares the
 * 30 day rolling average ending now against the 30 day rolling average ending 30 days ago,
 * which smooths out single day spikes (e.g. bridge or refinancing timing).
 */
export function WeeklyInfosMessage(logs: AnalyticsDailyLog[], supply: FrankencoinSupplyQueryObject): string {
	const now = logs.at(-1);
	const nowTs = Number(now.timestamp);

	const current = logs.filter((l) => Number(l.timestamp) > nowTs - WINDOW_SECONDS);
	const previous = logs.filter((l) => Number(l.timestamp) > nowTs - 2 * WINDOW_SECONDS && Number(l.timestamp) <= nowTs - WINDOW_SECONDS);

	const toNum = (v: bigint | string) => parseFloat(formatUnits(BigInt(v), 18));
	const series = (list: AnalyticsDailyLog[], key: 'totalEquity' | 'totalSavings' | 'fpsPrice') => list.map((l) => toNum(l[key]));

	const keys = Object.keys(supply).map((i) => parseInt(i));
	const supplySeries = (list: AnalyticsDailyLog[]) => list.map((l) => supplyAt(supply, keys, Number(l.timestamp))).filter((v) => v !== null);

	const supplyNow = supplyAt(supply, keys, nowTs) ?? 0;

	const supplyChangePct = avgChangePct(supplySeries(current), supplySeries(previous));
	const savingsChangePct = avgChangePct(series(current, 'totalSavings'), series(previous, 'totalSavings'));
	const equityChangePct = avgChangePct(series(current, 'totalEquity'), series(previous, 'totalEquity'));
	const fpsPriceChangePct = avgChangePct(series(current, 'fpsPrice'), series(previous, 'fpsPrice'));

	const equityNow = BigInt(now.totalEquity);
	const savingsNow = BigInt(now.totalSavings);

	// shares of supply are computed against the authoritative cross-chain supply figure
	const inEquityPct = supplyNow > 0 ? (toNum(equityNow) / supplyNow) * 100 : 0;
	const inSavingsPct = supplyNow > 0 ? (toNum(savingsNow) / supplyNow) * 100 : 0;

	return `📊 *Frankencoin Weekly Snapshot*
_30d changes use the 30 day rolling average._

💵 Total Supply: *${compact(supplyNow)} ZCHF*
   30d: ${fmtChange(supplyChangePct)}

💰 Savings: *${fmtZCHF(savingsNow)} ZCHF* (${fmtPct(inSavingsPct)}% of supply)
   30d: ${fmtChange(savingsChangePct)}

🔒 Equity: *${fmtZCHF(equityNow)} ZCHF* (${fmtPct(inEquityPct)}% of supply)
   30d: ${fmtChange(equityChangePct)}

📈 FPS Price: *${formatCurrency(formatUnits(BigInt(now.fpsPrice), 18), 0, 0)} ZCHF*
   30d: ${fmtChange(fpsPriceChangePct)}`;
}
