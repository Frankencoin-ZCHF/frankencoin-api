// ── Ponder response types ─────────────────────────────────────────────────────

export type CCIPAdminProposalQuery = {
	chainId: number;
	hash: string;
	proposer: string | null;
	type: string | null;
	deadline: string;
	status: string;
	details: string | null;
	created: string;
	deniedAt: string | null;
	enactedAt: string | null;
};

export type CCIPAdminChainQuery = {
	chainId: number;
	remoteChainSelector: string;
	active: boolean;
	remoteTokenAddress: string | null;
	outboundEnabled: boolean;
	outboundCapacity: string;
	outboundRate: string;
	inboundEnabled: boolean;
	inboundCapacity: string;
	inboundRate: string;
	rateLimitUpdatedAt: string | null;
};

// ── API response types ────────────────────────────────────────────────────────

export type ApiCCIPProposal = {
	chainId: number;
	hash: string;
	proposer: string | null;
	type: string | null;
	deadline: number;
	status: string;
	details: string | null;
	created: number;
	deniedAt: number | null;
	enactedAt: number | null;
};

export type ApiCCIPChain = {
	chainId: number;
	remoteChainSelector: string;
	active: boolean;
	remoteTokenAddress: string | null;
	outboundEnabled: boolean;
	outboundCapacity: string;
	outboundRate: string;
	inboundEnabled: boolean;
	inboundCapacity: string;
	inboundRate: string;
	rateLimitUpdatedAt: number | null;
};

export type ApiCCIPProposals = {
	list: ApiCCIPProposal[];
};

export type ApiCCIPChains = {
	list: ApiCCIPChain[];
};
