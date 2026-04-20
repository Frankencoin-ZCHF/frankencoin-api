import { Address, parseUnits } from 'viem';
import { normalizeAddress } from 'utils/format';
import { PriceHistoryQueryObjectArray } from '../../../exports';

interface Props {
	year: string | number;
	contract: Address;
	history?: PriceHistoryQueryObjectArray;
}

type ContractYearlyMap = {
	[key: Address]: {
		[key: string]: number;
	};
};

export function getEndOfYearPrice({ year, contract, history }: Props) {
	const data: ContractYearlyMap = {
		// Wrapped Ether
		[normalizeAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')]: {
			['2023']: 1948.008419,
			['2024']: 3083.55628,
			['2025']: 2364.08,
		},
		// Liquid Staked ETH
		[normalizeAddress('0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549')]: {
			['2023']: 2017.941921,
			['2024']: 3283.370727,
			['2025']: 2597.26,
		},
		// Wrapped BTC
		[normalizeAddress('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599')]: {
			['2023']: 35541.6309,
			['2024']: 85926.48636,
			['2025']: 69208.67,
		},
		// Uniswap
		[normalizeAddress('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984')]: {
			['2023']: 6.290979,
			['2024']: 12.273699,
			['2025']: 4.6231,
		},
		// Boss Info AG
		[normalizeAddress('0x2E880962A9609aA3eab4DEF919FE9E917E99073B')]: {
			['2023']: 10.15,
			['2024']: 10.19,
			['2025']: 10.195,
		},
		// Draggable quitt.shares
		[normalizeAddress('0x8747a3114Ef7f0eEBd3eB337F745E31dBF81a952')]: {
			['2023']: 8.21,
			['2024']: 8.05,
			['2025']: 8.5,
		},
		// RealUnit Shares
		[normalizeAddress('0x553C7f9C780316FC1D34b8e14ac2465Ab22a090B')]: {
			['2023']: 1.04,
			['2024']: 1.13,
			['2025']: 1.38,
		},
		// Wrapped liquid staked Ether 2.0
		[normalizeAddress('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0')]: {
			['2023']: 2618,
			['2024']: 3983,
			['2025']: 2891.88,
		},
		// Coinbase Wrapped BTC
		[normalizeAddress('0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf')]: {
			['2023']: 35541.6309,
			['2024']: 85926.48636,
			['2025']: 69208.67,
		},
		// Curve DAO Token
		[normalizeAddress('0xD533a949740bb3306d119CC777fa900bA034cd52')]: {
			['2023']: 0.623,
			['2024']: 0.929,
			['2025']: 0.29,
		},
		// Frankencoin Pool Share
		[normalizeAddress('0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2')]: {
			['2024']: 1179.0,
			['2025']: 1191.04,
		},
		// Paxos Gold
		[normalizeAddress('0x45804880De22913dAFE09f4980848ECE6EcbAf78')]: {
			['2024']: 2378.08,
			['2025']: 3438.47,
		},
		// Tether Gold
		[normalizeAddress('0x68749665FF8D2d112Fa859AA293F07A622782F38')]: {
			['2024']: 2378.08,
			['2025']: 3438.47,
		},
	};

	const entry = data[normalizeAddress(contract)];

	if (entry) {
		const price = entry[String(year)];
		if (price) return parseUnits(String(price), 18);
	}

	if (history) {
		const historyEntry = history[normalizeAddress(contract)];
		if (historyEntry?.history) {
			const yearEndMs = new Date(Number(year) + 1, 0, 1).getTime();
			const yearStartMs = new Date(Number(year), 0, 1).getTime();
			const timestamps = Object.keys(historyEntry.history).map(Number);

			const withinYear = timestamps.filter((t) => t >= yearStartMs && t < yearEndMs).sort((a, b) => b - a);
			if (withinYear.length > 0) return parseUnits(String(historyEntry.history[withinYear[0]]), 18);

			const before = timestamps.filter((t) => t < yearEndMs).sort((a, b) => b - a);
			if (before.length > 0) return parseUnits(String(historyEntry.history[before[0]]), 18);
		}
	}

	return BigInt(0);
}
