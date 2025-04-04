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
	autoSaved: boolean;
};

// --------------------------------------------------------------------------
// Service
export type TransferReferenceObjectArray = {
	[key: number]: TransferReferenceQuery;
};

// --------------------------------------------------------------------------
// Api
// export type ApiMinterListing = {
// 	num: number;
// 	list: MinterQuery[];
// };

// export type ApiMinterMapping = {
// 	num: number;
// 	addresses: Address[];
// 	map: MinterQueryObjectArray;
// };
