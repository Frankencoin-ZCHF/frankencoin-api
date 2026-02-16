import { PositionQuery } from 'positions/positions.types';
import { formatCurrency } from 'utils/format';
import { AppUrl, ExplorerAddressUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';

export function PositionDeniedMessage(position: PositionQuery): string {
	const bal = formatUnits(BigInt(position.collateralBalance), position.collateralDecimals);
	const price = formatUnits(BigInt(position.price), 36 - position.collateralDecimals);
	const deniedDate = position.denyDate > 0 ? new Date(position.denyDate * 1000).toString().split(' ').splice(0, 5).join(' ') : 'Unknown';

	return `
*Position Denied by Governance*

Denied: ${deniedDate}
Position: ${position.position}
Owner: ${position.owner}
Minting Limit: ${formatCurrency(formatUnits(BigInt(position.version === 1 ? position.limitForClones : (position as any).limitForClones), 18), 2, 2)} ZCHF
Annual Interest: ${formatCurrency(position.annualInterestPPM / 10000, 1, 1)}%

Collateral: ${position.collateralName} (${position.collateralSymbol})
At: ${position.collateral}
Balance: ${formatCurrency(bal, 2, 2)} ${position.collateralSymbol}
Price: ${formatCurrency(price, 2, 2)} ZCHF

[Explorer Position](${ExplorerAddressUrl(position.position)})
[Explorer Owner](${ExplorerAddressUrl(position.owner)})
[Explorer Collateral](${ExplorerAddressUrl(position.collateral)})
                        `;
}
