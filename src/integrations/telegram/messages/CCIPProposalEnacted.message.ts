import { ApiCCIPProposal } from 'modules/bridge/bridge.types';
import { shortenString } from 'utils/format';
import { getChain } from 'utils/func-helper';
import { ChainId } from '@frankencoin/zchf';

const typeLabel: Record<string, string> = {
	AddChain: '🔗 Add Chain',
	RemotePoolUpdate: '🔄 Remote Pool Update',
	RemoveChain: '🗑 Remove Chain',
	AdminTransfer: '👤 Admin Transfer',
};

export function CCIPProposalEnactedMessage(proposal: ApiCCIPProposal): string {
	const chainName = getChain(proposal.chainId as ChainId)?.name;

	return `✅ *CCIP Proposal Enacted*

🌐 Chain: *${chainName}* (${proposal.chainId})
📋 Type: *${typeLabel[proposal.type] ?? proposal.type}*
👤 Proposer: \`${proposal.proposer ? shortenString(proposal.proposer) : 'unknown'}\`
🔑 Hash: \`${shortenString(proposal.hash)}\``;
}
