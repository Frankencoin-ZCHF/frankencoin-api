import { ApiCCIPProposal } from 'modules/bridge/bridge.types';
import { shortenString } from 'utils/format';
import { getChain } from 'utils/func-helper';
import { ChainId } from '@frankencoin/zchf';

export function CCIPProposalMessage(proposal: ApiCCIPProposal): string {
	const deadline = new Date(Number(proposal.deadline) * 1000);
	const chainName = getChain(proposal.chainId as ChainId)?.name;
	const details = parseDetails(proposal.type, proposal.details);

	const typeLabel: Record<string, string> = {
		AddChain: '🔗 Add Chain',
		RemotePoolUpdate: '🔄 Remote Pool Update',
		RemoveChain: '🗑 Remove Chain',
		AdminTransfer: '👤 Admin Transfer',
	};

	return `⚠️ *New CCIP Proposal*

🌐 Chain: *${chainName}* (${proposal.chainId})
📋 Type: *${typeLabel[proposal.type] ?? proposal.type}*
👤 Proposer: \`${proposal.proposer ? shortenString(proposal.proposer) : 'unknown'}\`
⏰ Veto Until: *${deadline.toUTCString()}*
${details}
🔑 Hash: \`${shortenString(proposal.hash)}\``;
}

function parseDetails(type: string | null, raw: string | null): string {
	if (!raw) return '';
	try {
		const d = JSON.parse(raw);
		if (type === 'AddChain') {
			return `🔗 Remote Chain: \`${d.remoteChainSelector}\`\n📍 Token: \`${d.remoteTokenAddress ? shortenString(d.remoteTokenAddress) : '?'}\``;
		}
		if (type === 'RemotePoolUpdate') {
			const action = d.add ? '➕ Add pool' : '➖ Remove pool';
			return `${action} on chain \`${d.chain}\`\n📍 Pool: \`${d.poolAddress ? shortenString(d.poolAddress) : '?'}\``;
		}
		if (type === 'RemoveChain') {
			return `🔗 Remote Chain: \`${d.chain}\``;
		}
		if (type === 'AdminTransfer') {
			return `👤 New Admin: \`${d.newAdmin ? shortenString(d.newAdmin) : '?'}\``;
		}
	} catch {}
	return '';
}
