import { PriceQuery } from 'prices/prices.types';
import { PositionQuery } from 'positions/positions.types';
import { formatCurrency } from 'utils/format';
import { AppUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';
import { PositionPriceAlertState } from 'telegram/telegram.types';

export function PositionPriceLowest(position: PositionQuery, price: PriceQuery, last: PositionPriceAlertState): string {
	const bal: number = parseInt(formatUnits(BigInt(position.collateralBalance), position.collateralDecimals - 2)) / 100;
	const posPrice = parseFloat(formatUnits(BigInt(position.price), 36 - position.collateralDecimals));

	return `
*Position Price Declines*

Position: ${position.position}
Collateral: ${position.collateralName} (${position.collateralSymbol})
Balance: ${formatCurrency(bal, 2, 2)} ${position.collateralSymbol}

Position Price: ${posPrice} ZCHF
CoinGecko Price: ${price.price.chf} ZCHF
Collateralization: ${Math.round((price.price.chf / posPrice) * 10000) / 100}%

[Challenge Position](${AppUrl(`/monitoring/${position.position}/challenge`)})
[View Position](${AppUrl(`/monitoring/${position.position}`)})
[View Owner Positions](${AppUrl(`/mypositions?address=${position.owner}`)})

`;
}

export function PositionPriceAlert(position: PositionQuery, price: PriceQuery, last: PositionPriceAlertState): string {
	const bal: number = parseInt(formatUnits(BigInt(position.collateralBalance), position.collateralDecimals - 2)) / 100;
	const posPrice = parseFloat(formatUnits(BigInt(position.price), 36 - position.collateralDecimals));

	return `
*Position Price Alert*

Position: ${position.position}
Collateral: ${position.collateralName} (${position.collateralSymbol})
Balance: ${formatCurrency(bal, 2, 2)} ${position.collateralSymbol}

Position Price: ${posPrice} ZCHF
CoinGecko Price: ${price.price.chf} ZCHF
Collateralization: ${Math.round((price.price.chf / posPrice) * 10000) / 100}%

[Challenge Position](${AppUrl(`/monitoring/${position.position}/challenge`)})
[View Position](${AppUrl(`/monitoring/${position.position}`)})
[View Owner Positions](${AppUrl(`/mypositions?address=${position.owner}`)})

`;
}

export function PositionPriceWarning(position: PositionQuery, price: PriceQuery, last: PositionPriceAlertState): string {
	const bal: number = parseInt(formatUnits(BigInt(position.collateralBalance), position.collateralDecimals - 2)) / 100;
	const posPrice = parseFloat(formatUnits(BigInt(position.price), 36 - position.collateralDecimals));

	return `
*Position Price Warning*

Position: ${position.position}
Collateral: ${position.collateralName} (${position.collateralSymbol})
Balance: ${formatCurrency(bal, 2, 2)} ${position.collateralSymbol}

Position Price: ${posPrice} ZCHF
CoinGecko Price: ${price.price.chf} ZCHF
Collateralization: ${Math.round((price.price.chf / posPrice) * 10000) / 100}%

[Challenge Position](${AppUrl(`/monitoring/${position.position}/challenge`)})
[View Position](${AppUrl(`/monitoring/${position.position}`)})
[View Owner Positions](${AppUrl(`/mypositions?address=${position.owner}`)})

`;
}
