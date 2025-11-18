import { MinterQuery } from 'ecosystem/ecosystem.minter.types';
import { formatCurrency } from 'utils/format';
import { AppUrl, ExplorerTxUrl, getChain } from 'utils/func-helper';
import { Chain } from 'viem';

export function MinterProposalVetoedMessage(minter: MinterQuery): string {
	return `
*Minter Proposal Vetoed*

Minter: ${minter.minter}
Suggestor: ${minter.suggestor}
Application Fee: ${formatCurrency(minter.applicationFee / 1e18, 2, 2)} ZCHF
Message: ${minter.applyMessage}

Vetor: ${minter.vetor}
Message: ${minter.denyMessage}

[Goto Governance](${AppUrl(`/governance`)})
[Explorer Transaction](${ExplorerTxUrl(minter.denyTxHash, getChain(minter.chainId) as Chain)})
`;
}
