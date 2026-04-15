import { PositionQuery } from 'modules/positions/positions.types';
import { formatCurrency, shortenString } from 'utils/format';
import { AppUrl, ExplorerAddressUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';

export function PositionDeniedMessage(position: PositionQuery): string {
	const bal = formatUnits(BigInt(position.collateralBalance), position.collateralDecimals);
	const price = formatUnits(BigInt(position.price), 36 - position.collateralDecimals);
	const denied = position.denyDate > 0 ? new Date(position.denyDate * 1000).toUTCString() : 'Unknown';

	return `🚫 *Position Denied*

📅 Denied: *${denied}*
🏦 Position: \`${shortenString(position.position)}\`
👤 Owner: \`${shortenString(position.owner)}\`

💎 Collateral: *${position.collateralName} (${position.collateralSymbol})*
   Address: \`${shortenString(position.collateral)}\`
   Balance: *${formatCurrency(bal, 2, 2)} ${position.collateralSymbol}*
   Liq. Price: *${formatCurrency(price, 2, 2)} ZCHF*

📊 Limit: *${formatCurrency(formatUnits(BigInt(position.limitForClones), 18), 2, 2)} ZCHF*
   Interest: *${formatCurrency(position.annualInterestPPM / 10000, 1, 1)}%* APY

[🔍 Position](${ExplorerAddressUrl(position.position)}) · [🔍 Owner](${ExplorerAddressUrl(position.owner)}) · [🔍 Collateral](${ExplorerAddressUrl(position.collateral)})`;
}
