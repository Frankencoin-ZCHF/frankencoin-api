import { Address, parseUnits } from 'viem';

interface Props {
	year: string | number;
	contract: Address;
}

type ContractYearlyMap = {
	[key: Address]: {
		[key: string]: number;
	};
};

export function getEndOfYearPrice({ year, contract }: Props) {
	const data: ContractYearlyMap = {
		// Wrapped Ether
		['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'.toLowerCase()]: {
			['2023']: 1948.008419,
			['2024']: 3083.55628,
		},
		// Liquid Staked ETH
		['0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549'.toLowerCase()]: {
			['2023']: 2017.941921,
			['2024']: 3283.370727,
		},
		// Wrapped BTC
		['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'.toLowerCase()]: {
			['2023']: 35541.6309,
			['2024']: 85926.48636,
		},
		// Uniswap
		['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'.toLowerCase()]: {
			['2023']: 6.290979,
			['2024']: 12.273699,
		},
		// Boss Info AG
		['0x2E880962A9609aA3eab4DEF919FE9E917E99073B'.toLowerCase()]: {
			['2023']: 10.15,
			['2024']: 10.19,
		},
		// Draggable quitt.shares
		['0x8747a3114Ef7f0eEBd3eB337F745E31dBF81a952'.toLowerCase()]: {
			['2023']: 8.21,
			['2024']: 8.05,
		},
		// RealUnit Shares
		['0x553C7f9C780316FC1D34b8e14ac2465Ab22a090B'.toLowerCase()]: {
			['2023']: 1.04,
			['2024']: 1.13,
		},
		// Wrapped liquid staked Ether 2.0
		['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'.toLowerCase()]: {
			['2023']: 2618,
			['2024']: 3983,
		},
		// Coinbase Wrapped BTC
		['0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'.toLowerCase()]: {
			['2023']: 35541.6309,
			['2024']: 85926.48636,
		},
		// Curve DAO Token
		['0xD533a949740bb3306d119CC777fa900bA034cd52'.toLowerCase()]: {
			['2023']: 0.623,
			['2024']: 0.929,
		},
	};

	const entry = data[contract.toLowerCase() as Address];

	if (entry) {
		const price = entry[String(year)];
		if (price) return parseUnits(String(price), 18);

		const fallBack = entry[String(Number(year) - 1)];
		if (fallBack) return parseUnits(String(fallBack), 18);
	}

	return BigInt(0);
}
