import { PositionQuery } from 'positions/positions.types';
import { formatCurrency } from 'utils/format';
import { AppUrl, ExplorerAddressUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';

export function PositionExpiredMessage(position: PositionQuery): string {
	const bal: number = parseInt(formatUnits(BigInt(position.collateralBalance), position.collateralDecimals - 2)) / 100;
	const min: number = parseInt(formatUnits(BigInt(position.minimumCollateral), position.collateralDecimals - 2)) / 100;
	const price: number = parseInt(formatUnits(BigInt(position.price), 36 - position.collateralDecimals - 2)) / 100;
	const duration: number = position.challengePeriod * 1000;

	const begin = new Date(position.expiration * 1000);
	const mid = new Date(position.expiration * 1000 + 1 * duration);
	const zero = new Date(position.expiration * 1000 + 2 * duration);

	const header = `
*Position is expired*

Position: ${position.position} (v${position.version})
Owner: ${position.owner}

Minted: ${formatCurrency(formatUnits(BigInt(position.minted), 18), 2, 2)} ZCHF
Retained Reserve: ${formatCurrency(position.reserveContribution / 10000, 1, 1)}%
Auction Duration: ${Math.floor(position.challengePeriod / 60 / 60)} hours

Collateral: ${position.collateralName} (${position.collateralSymbol})
At: ${position.collateral}
Balance: ${formatCurrency(bal, 2, 2)} ${position.collateralSymbol}
Bal. min.: ${formatCurrency(min, 2, 2)} ${position.collateralSymbol}
`;

	const v2Body = `
*ForceSell is available*

Declines (10x -> 1x Price): ${begin.toUTCString()}
Price (10x): ${formatCurrency(price * 10, 2, 2)} ZCHF per 1 ${position.collateralSymbol}

Continues (1x -> 0x Price): ${mid.toUTCString()}
Price (1x): ${formatCurrency(price, 2, 2)} ZCHF per 1 ${position.collateralSymbol}

Zero: ${zero.toUTCString()}
Price (0x): 0.00 ZCHF per 1 ${position.collateralSymbol}
`;

	const footer = `

[Overview Position](${AppUrl(`/monitoring/${position.position}`)})
[Buy Collateral](${AppUrl(`/monitoring/${position.position}/${position.version == 1 ? 'challenge' : 'forceSell'}`)})

[Explorer Position](${ExplorerAddressUrl(position.position)})
[Explorer Owner](${ExplorerAddressUrl(position.owner)}) 
[Explorer Collateral](${ExplorerAddressUrl(position.collateral)}) 
`;

	return position.version == 1 ? header + footer : header + v2Body + footer;
}
