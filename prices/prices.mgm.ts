import { ERC20Info } from './prices.types';
import { Address } from 'viem';

export const ContractBlacklist: Address[] = [
	'0x5601b88A3F6700dd5cc9B94941431c6BfC077163',
	'0x691b4bAcBfE0e3bea191420e96ef41aA76729889',
	'0xCAf237F016CbA0E41b271E88e9088c09d495ee05',
] as const;

export const ContractWhitelist: ERC20Info[] = [
	{
		address: '0x79d4f0232A66c4c91b89c76362016A1707CFBF4f',
		name: 'VNX Franc',
		symbol: 'VCHF',
		decimals: 18,
	},
];
