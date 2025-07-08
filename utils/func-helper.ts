import { mainnet, Chain } from 'viem/chains';

export function ExplorerAddressUrl(address: string, chain: Chain = mainnet): string {
	return chain.blockExplorers.default.url + `/address/${address}`;
}

export function ExplorerTxUrl(tx: string, chain: Chain = mainnet): string {
	return chain.blockExplorers.default.url + `/tx/${tx}`;
}

export function AppUrl(path: string, chain: Chain = mainnet): string {
	return `${chain.id == 1 ? 'https://app.frankencoin.com' : 'https://app.test.frankencoin.com'}${path}`;
}
