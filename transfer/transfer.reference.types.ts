import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types
export type TransferReferenceQuery = {
	amount: bigint;
	chainId: number;
	count: number;
	created: number;
	from: Address;
	reference: string;
	sender: Address;
	targetChain: string;
	to: Address;
	txHash: string;
};

// --------------------------------------------------------------------------
// Service
export type TransferReferenceObjectArray = {
	[key: number]: TransferReferenceQuery;
};

// --------------------------------------------------------------------------
// Api
export type ApiTransferReferenceList = {
	num: number;
	list: TransferReferenceQuery[];
};

export type ApiTransferReferenceQuery = TransferReferenceQuery[] | { error: string };
