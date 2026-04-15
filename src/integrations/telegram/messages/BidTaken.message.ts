import { BidsQueryItem, ChallengesQueryItem } from 'modules/challenges/challenges.types';
import { PositionQuery } from 'modules/positions/positions.types';
import { formatCurrency, shortenString } from 'utils/format';
import { AppUrl, ExplorerAddressUrl } from 'utils/func-helper';
import { formatUnits } from 'viem';

export function BidTakenMessage(position: PositionQuery, challenge: ChallengesQueryItem, bid: BidsQueryItem): string {
	return `💸 *Bid Taken*

🏦 Position: \`${shortenString(bid.position)}\` (v${position.version})
👤 Bidder: \`${shortenString(bid.bidder)}\`
📋 Challenge: #${bid.number} · Bid: #${bid.numberBid}
🏷 Type: *${bid.bidType}*

💎 Collateral: *${position.collateralName} (${position.collateralSymbol})*
   Challenge Size: *${formatCurrency(formatUnits(bid.challengeSize, position.collateralDecimals))} ${position.collateralSymbol}*
   Bid Filled: *${formatCurrency(formatUnits(bid.filledSize, position.collateralDecimals))} ${position.collateralSymbol}*
   Bid Amount: *${formatCurrency(formatUnits(bid.bid, 18))} ZCHF*
   Bid Price: *${formatCurrency(formatUnits(bid.price, 36 - position.collateralDecimals))} ZCHF/${position.collateralSymbol}*

[💸 Buy in Auction](${AppUrl(`/monitoring/${bid.position}/auction/${bid.number}`)}) · [📋 Position](${AppUrl(`/monitoring/${bid.position}`)})
[🔍 Bidder](${ExplorerAddressUrl(bid.bidder)}) · [🔍 Position](${ExplorerAddressUrl(bid.position)})`;
}
