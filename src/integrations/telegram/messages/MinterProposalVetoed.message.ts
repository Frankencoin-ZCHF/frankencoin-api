import { MinterQuery } from 'modules/ecosystem/ecosystem.minter.types';
import { formatCurrency, shortenString } from 'utils/format';
import { AppUrl, ExplorerTxUrl, getChain } from 'utils/func-helper';
import { Chain } from 'viem';

export function MinterProposalVetoedMessage(minter: MinterQuery): string {
	return `🚫 *Minter Proposal Vetoed*

👤 Minter: \`${shortenString(minter.minter)}\`
👤 Suggestor: \`${shortenString(minter.suggestor)}\`
💰 Fee: *${formatCurrency(minter.applicationFee / 1e18, 2, 2)} ZCHF*
💬 Apply: ${minter.applyMessage || '—'}

🚫 Vetor: \`${shortenString(minter.vetor)}\`
💬 Reason: ${minter.denyMessage || '—'}

[🏛️ Governance](${AppUrl('/governance')}) · [🔍 Explorer](${ExplorerTxUrl(minter.denyTxHash, getChain(minter.chainId) as Chain)})`;
}
