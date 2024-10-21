import { ApiLeadrateRate, LeadrateProposed } from 'savings/savings.leadrate.types';
import { AppUrl, ExplorerTxUrl } from 'utils/func-helper';

export function LeadrateProposalMessage(proposal: LeadrateProposed, rate: ApiLeadrateRate): string {
	const d = new Date(proposal.nextChange * 1000);
	const u = rate.rate === proposal.nextRate;

	return `
*New Leadrate Proposal*

Proposal Period: 7 days
Proposal Until: ${d.toString().split(' ').slice(0, 5).join(' ')}
Proposer: ${proposal.proposer}

Current Rate: ${rate.rate}
Proposed Rate: ${proposal.nextRate}

${u ? '*Rate will remain unchanged*' : '*Rate can be applied after 7 days*'}

[Goto Governance](${AppUrl(`/governance`)})
[Explorer Transaction](${ExplorerTxUrl(proposal.txHash)})
                        `;
}