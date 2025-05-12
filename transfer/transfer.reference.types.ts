import { Address } from 'viem';

// --------------------------------------------------------------------------
// Ponder return types
export type TransferReferenceQuery = {
	id: `${Address}-${Address}-${number}`;
	count: number;
	created: number;
	txHash: string;
	from: Address;
	to: Address;
	amount: bigint;
	ref: string;
	autoSaved: Address;
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
