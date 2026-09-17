import { Injectable, Logger } from '@nestjs/common';
import { PONDER_CLIENT, PONDER_CLIENT_BACKUP, VIEM_CONFIG } from 'app.config';
import { ApolloClient, DocumentNode, gql, NormalizedCacheObject } from '@apollo/client/core';
import { DataSourceManagerService } from 'core/data-source/data-source.manager.service';
import {
	ApiMintingUpdateListing,
	ApiMintingUpdateMapping,
	ApiOwnerDebt,
	ApiOwnerHistory,
	ApiOwnerTransfersListing,
	ApiPositionsListing,
	ApiPositionsMapping,
	ApiPositionsOwners,
	MintingUpdateQuery,
	MintingUpdateQueryObjectArray,
	MintingUpdateQueryV1,
	MintingUpdateQueryV2,
	OwnersPositionsObjectArray,
	OwnerTransferQuery,
	PositionQuery,
	PositionQueryV1,
	PositionQueryV2,
	PositionsQueryObjectArray,
} from './positions.types';
import { Address, erc20Abi, getAddress } from 'viem';
import { FIVEDAYS_MS } from 'utils/const-helper';
import { PositionV1ABI } from '@frankencoin/zchf';
import { ADDRESS } from '@frankencoin/zchf';
import { SavingsABI } from '@frankencoin/zchf';
import { PositionV2ABI } from '@frankencoin/zchf';
import { mainnet } from 'viem/chains';
import { normalizeAddress } from 'utils/format';
import { TtlCache } from 'utils/ttl-cache';

const OWNER_CACHE_TTL_MS = 1 * 60 * 1000;

@Injectable()
export class PositionsService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedPositionV1s: PositionQueryV1[] = [];
	private fetchedPositionV2s: PositionQueryV2[] = [];
	private fetchedPositions: PositionsQueryObjectArray = {};
	private fetchedMintingUpdates: MintingUpdateQueryObjectArray = {};

	// Per-address reporting caches. getOwnerDebt/getOwnerHistory internally call getOwnerHistory/
	// getOwnerTransfers, so caching each method independently also de-duplicates that nested chain.
	private ownerFeesCache = new TtlCache<ApiMintingUpdateListing>(OWNER_CACHE_TTL_MS);
	private ownerDebtCache = new TtlCache<ApiOwnerDebt>(OWNER_CACHE_TTL_MS);
	private ownerHistoryCache = new TtlCache<ApiOwnerHistory>(OWNER_CACHE_TTL_MS);
	private ownerTransfersCache = new TtlCache<ApiOwnerTransfersListing>(OWNER_CACHE_TTL_MS);
	private mintingUpdatesPositionCache = new TtlCache<ApiMintingUpdateListing>(OWNER_CACHE_TTL_MS);
	private mintingUpdatesOwnerCache = new TtlCache<ApiMintingUpdateListing>(OWNER_CACHE_TTL_MS);

	constructor(private readonly dataSource: DataSourceManagerService) {}

	// @dev: unwraps one Promise.allSettled() result. A rejected on-chain read (e.g. a collateral token
	// whose balanceOf() reverts, or availableForClones() reverting because of it) is logged with the
	// position it belongs to and yields undefined, so callers fall back to the indexer value.
	private settledValue(
		result: PromiseSettledResult<bigint> | undefined,
		p: { position: Address; collateral: Address },
		call: string
	): bigint | undefined {
		if (result?.status === 'fulfilled') return result.value;
		const reason = result?.reason;
		const message = reason?.shortMessage ?? reason?.message ?? String(reason);
		this.logger.warn(
			`On-chain read ${call} failed for position ${p.position} (collateral ${p.collateral}), falling back to indexer state: ${message}`
		);
		return undefined;
	}

	// @dev: ponder caps a single page at 1000 items, so any connection that can grow past that has
	// to be walked with cursor pagination — see reporting.service.ts for the same fix. `query` must
	// declare an `$after: String` variable and select `pageInfo { endCursor hasNextPage }` alongside
	// `items` on the field named by `rootField`.
	private async fetchAllPages<T>(
		client: ApolloClient<NormalizedCacheObject>,
		query: DocumentNode,
		rootField: string,
		variables: Record<string, unknown> = {}
	): Promise<T[]> {
		const collected: T[] = [];
		let after: string | null = null;

		do {
			const { data } = await client.query<Record<string, { items: T[]; pageInfo: { endCursor: string | null; hasNextPage: boolean } }>>(
				{
					fetchPolicy: 'no-cache',
					query,
					variables: { ...variables, after },
				}
			);

			const page = data?.[rootField];
			if (!page?.items) break;

			collected.push(...page.items);
			after = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
		} while (after);

		return collected;
	}

	getPositionsList(): ApiPositionsListing {
		const pos = Object.values(this.fetchedPositions) as PositionQuery[];
		return {
			num: pos.length,
			list: pos,
		};
	}

	getPositionsMapping(): ApiPositionsMapping {
		const pos = this.fetchedPositions;
		return { num: Object.keys(pos).length, addresses: Object.keys(pos) as Address[], map: pos };
	}

	getPositionsOpen(): ApiPositionsMapping {
		const pos = this.getPositionsList().list;
		const open = pos.filter((p) => !p.closed && !p.denied && BigInt(p.collateralBalance) > 0n);
		const mapped: PositionsQueryObjectArray = {};
		for (const p of open) {
			mapped[p.position] = p;
		}
		return { num: Object.keys(mapped).length, addresses: Object.keys(mapped) as Address[], map: mapped };
	}

	getPositionsRequests(): ApiPositionsMapping {
		const pos = this.getPositionsList().list;
		// @dev: includes 5days created positions
		const request = pos.filter((p) => p.start * 1000 + FIVEDAYS_MS > Date.now());
		const mapped: PositionsQueryObjectArray = {};
		for (const p of request) {
			mapped[p.position] = p;
		}
		return { num: Object.keys(mapped).length, addresses: Object.keys(mapped) as Address[], map: mapped };
	}

	getPositionsDenied(): ApiPositionsMapping {
		const pos = this.getPositionsList().list;
		// @dev: includes positions denied within the last 5 days
		const denied = pos.filter((p) => p.denyDate > 0 && p.denyDate * 1000 + FIVEDAYS_MS > Date.now());
		const mapped: PositionsQueryObjectArray = {};
		for (const p of denied) {
			mapped[p.position] = p;
		}
		return { num: Object.keys(mapped).length, addresses: Object.keys(mapped) as Address[], map: mapped };
	}

	getPositionsOwners(): ApiPositionsOwners {
		const ow: OwnersPositionsObjectArray = {};
		for (const p of Object.values(this.fetchedPositions)) {
			const owner = normalizeAddress(p.owner);
			if (!ow[owner]) ow[owner] = [];
			ow[owner].push(p);
		}
		return {
			num: Object.keys(ow).length,
			owners: Object.keys(ow) as Address[],
			map: ow,
		};
	}

	async updatePositonV1s() {
		this.logger.debug('Updating Positions V1');
		const currentSource = this.dataSource.getCurrentSource();

		// Determine which client to use
		const client = currentSource === 'primary' ? PONDER_CLIENT : PONDER_CLIENT_BACKUP;

		try {
			const items = await this.fetchAllPages<PositionQueryV1>(
				client!,
				gql`
					query ($after: String) {
						mintingHubV1PositionV1s(orderBy: "created", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								position
								owner
								zchf
								collateral
								price

								created
								isOriginal
								isClone
								denied
								denyDate
								closed
								original

								minimumCollateral
								annualInterestPPM
								reserveContribution
								start
								cooldown
								expiration
								challengePeriod

								zchfName
								zchfSymbol
								zchfDecimals

								collateralName
								collateralSymbol
								collateralDecimals
								collateralBalance

								limitForPosition
								limitForClones
								availableForPosition
								availableForClones
								minted
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
				'mintingHubV1PositionV1s'
			);

			if (!items.length) {
				this.logger.warn('No Positions V1 found.');
				return;
			}

			const list: PositionsQueryObjectArray = {};
			const balanceOfDataPromises: Promise<bigint>[] = [];
			const mintedDataPromises: Promise<bigint>[] = [];
			const availableForClonesDataPromises: Promise<bigint>[] = [];

			// Ponder same-batch factory child event miss: when a position is opened and then acted on
			// (e.g. denied) within the same ethGetLogsBlockRange window, Ponder silently drops the child
			// contract events during a full re-index. Position 0xf35378277191c1f0d90869426f7177aa0393f77d
			// was opened at block 25287288 and denied at block 25287602 — both inside window [25286536–25291535]
			// — so after re-indexing it incorrectly shows denied: false. Filter it out until ponder is fixed
			// or the indexer is backfilled. See: ponder/docs/ponder-factory-same-batch-miss.md
			const PONDER_SAME_BATCH_MISS = new Set(['0xf35378277191c1f0d90869426f7177aa0393f77d']);
			const filteredItems = items.filter((p) => !PONDER_SAME_BATCH_MISS.has(normalizeAddress(p.position)));
			const openItems = filteredItems.filter((p) => !p.closed && !p.denied) as PositionQueryV1[];
			const closedItems = filteredItems.filter((p) => p.closed || p.denied) as PositionQueryV1[];

			for (const p of openItems) {
				// Forces the collateral balance to be overwritten with the latest blockchain state, instead of the ponder state.
				// This ensures that collateral transfers can be made without using the smart contract or application directly,
				// and the API will be aware of the updated state.
				balanceOfDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.collateral,
						abi: erc20Abi,
						functionName: 'balanceOf',
						args: [p.position],
					})
				);

				// fetch minted - See issue #11
				// https://github.com/Frankencoin-ZCHF/frankencoin-api/issues/11
				mintedDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.position,
						abi: PositionV1ABI,
						functionName: 'minted',
					})
				);

				availableForClonesDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.position,
						abi: PositionV1ABI,
						functionName: 'limitForClones',
					})
				);
			}

			// await for contract calls. All allSettled() calls are created in the same tick so every
			// promise has a rejection handler attached before any network round trip completes. Awaiting
			// them one array at a time would leave the later arrays unobserved while the earlier ones are
			// in flight; a revert there (e.g. a collateral token whose balanceOf() reverts) becomes an
			// unhandled rejection and Node terminates the process.
			const [balanceOfData, mintedData, availableForClonesData] = await Promise.all([
				Promise.allSettled(balanceOfDataPromises),
				Promise.allSettled(mintedDataPromises),
				Promise.allSettled(availableForClonesDataPromises),
			]);

			for (let idx = 0; idx < openItems.length; idx++) {
				const p = openItems[idx];
				const b = this.settledValue(balanceOfData[idx], p, 'balanceOf');
				const m = this.settledValue(mintedData[idx], p, 'minted');
				const a = this.settledValue(availableForClonesData[idx], p, 'limitForClones');

				const entry: PositionQueryV1 = {
					version: 1,

					position: getAddress(p.position),
					owner: getAddress(p.owner),
					zchf: getAddress(p.zchf),
					collateral: getAddress(p.collateral),
					price: p.price,

					created: parseInt(p.created as any),
					isOriginal: p.isOriginal,
					isClone: p.isClone,
					denied: p.denied,
					denyDate: parseInt(p.denyDate as any),
					closed: p.closed,
					original: getAddress(p.original),

					minimumCollateral: p.minimumCollateral,
					annualInterestPPM: p.annualInterestPPM,
					reserveContribution: p.reserveContribution,
					start: parseInt(p.start as any),
					cooldown: parseInt(p.cooldown as any),
					expiration: parseInt(p.expiration as any),
					challengePeriod: parseInt(p.challengePeriod as any),

					zchfName: p.zchfName,
					zchfSymbol: p.zchfSymbol,
					zchfDecimals: p.zchfDecimals,

					collateralName: p.collateralName,
					collateralSymbol: p.collateralSymbol,
					collateralDecimals: p.collateralDecimals,
					collateralBalance: typeof b === 'bigint' ? b.toString() : p.collateralBalance,

					limitForPosition: p.limitForPosition,
					limitForClones: p.limitForClones,
					availableForPosition: p.availableForPosition,
					availableForClones: typeof a === 'bigint' ? a.toString() : p.availableForClones,
					minted: typeof m === 'bigint' ? m.toString() : p.minted,
				};

				list[normalizeAddress(p.position)] = entry;
			}

			for (const p of closedItems) {
				list[normalizeAddress(p.position)] = {
					version: 1,

					position: getAddress(p.position),
					owner: getAddress(p.owner),
					zchf: getAddress(p.zchf),
					collateral: getAddress(p.collateral),
					price: p.price,

					created: parseInt(p.created as any),
					isOriginal: p.isOriginal,
					isClone: p.isClone,
					denied: p.denied,
					denyDate: parseInt(p.denyDate as any),
					closed: p.closed,
					original: getAddress(p.original),

					minimumCollateral: p.minimumCollateral,
					annualInterestPPM: p.annualInterestPPM,
					reserveContribution: p.reserveContribution,
					start: parseInt(p.start as any),
					cooldown: parseInt(p.cooldown as any),
					expiration: parseInt(p.expiration as any),
					challengePeriod: parseInt(p.challengePeriod as any),

					zchfName: p.zchfName,
					zchfSymbol: p.zchfSymbol,
					zchfDecimals: p.zchfDecimals,

					collateralName: p.collateralName,
					collateralSymbol: p.collateralSymbol,
					collateralDecimals: p.collateralDecimals,
					collateralBalance: p.collateralBalance,

					limitForPosition: p.limitForPosition,
					limitForClones: p.limitForClones,
					availableForPosition: p.availableForPosition,
					availableForClones: p.availableForClones,
					minted: p.minted,
				};
			}

			const a = Object.keys(list).length;
			const b = this.fetchedPositionV1s.length;
			const isDiff = a > b;

			if (isDiff) this.logger.log(`Positions V1 merging, from ${b} to ${a} positions`);
			this.fetchedPositionV1s = Object.values(list) as PositionQueryV1[];
			this.fetchedPositions = { ...this.fetchedPositions, ...list };

			return list;
		} catch (error) {
			this.logger.error('Failed to update Positions V1 from indexer', error);
			// Data remains in memory from previous successful fetch
		}
	}

	async updatePositonV2s() {
		this.logger.debug('Updating Positions V2');
		const currentSource = this.dataSource.getCurrentSource();

		// Determine which client to use
		const client = currentSource === 'primary' ? PONDER_CLIENT : PONDER_CLIENT_BACKUP;

		try {
			const items = await this.fetchAllPages<PositionQueryV2>(
				client!,
				gql`
					query ($after: String) {
						mintingHubV2PositionV2s(orderBy: "created", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								position
								owner
								zchf
								collateral
								price

								created
								isOriginal
								isClone
								denied
								denyDate
								closed
								original
								parent

								minimumCollateral
								riskPremiumPPM
								reserveContribution
								start
								cooldown
								expiration
								challengePeriod

								zchfName
								zchfSymbol
								zchfDecimals

								collateralName
								collateralSymbol
								collateralDecimals
								collateralBalance

								limitForClones
								availableForClones
								availableForMinting
								minted
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
				'mintingHubV2PositionV2s'
			);

			if (!items.length) {
				this.logger.warn('No Positions V2 found.');
				return;
			}

			const list: PositionsQueryObjectArray = {};
			const balanceOfDataPromises: Promise<bigint>[] = [];
			const mintedDataPromises: Promise<bigint>[] = [];
			const availableForClonesDataPromises: Promise<bigint>[] = [];
			const availableForMintingDataPromises: Promise<bigint>[] = [];

			const leadrate: number = await VIEM_CONFIG[mainnet.id].readContract({
				address: ADDRESS[mainnet.id].savingsV2,
				abi: SavingsABI,
				functionName: 'currentRatePPM',
			});

			const openItems = items.filter((p) => !p.closed && !p.denied) as PositionQueryV2[];
			const closedItems = items.filter((p) => p.closed || p.denied) as PositionQueryV2[];

			for (const p of openItems) {
				// Forces the collateral balance to be overwritten with the latest blockchain state, instead of the ponder state.
				// This ensures that collateral transfers can be made without using the smart contract or application directly,
				// and the API will be aware of the updated state.
				balanceOfDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.collateral,
						abi: erc20Abi,
						functionName: 'balanceOf',
						args: [p.position],
					})
				);

				// fetch minted - See issue #11
				// https://github.com/Frankencoin-ZCHF/frankencoin-api/issues/11
				mintedDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.position,
						abi: PositionV2ABI,
						functionName: 'minted',
					})
				);

				// make highly available, instead of relying on indexer state
				// https://github.com/Frankencoin-ZCHF/frankencoin-dapp/issues/144
				availableForClonesDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.original,
						abi: PositionV2ABI,
						functionName: 'availableForClones',
					})
				);
				availableForMintingDataPromises.push(
					VIEM_CONFIG[mainnet.id].readContract({
						address: p.position,
						abi: PositionV2ABI,
						functionName: 'availableForMinting',
					})
				);
			}

			// await for contract calls. See the V1 comment above: attach all handlers in the same tick so a
			// reverting call can never surface as an unhandled rejection.
			const [balanceOfData, mintedData, clonesDate, mintingDate] = await Promise.all([
				Promise.allSettled(balanceOfDataPromises),
				Promise.allSettled(mintedDataPromises),
				Promise.allSettled(availableForClonesDataPromises),
				Promise.allSettled(availableForMintingDataPromises),
			]);

			for (let idx = 0; idx < openItems.length; idx++) {
				const p = openItems[idx];
				const b = this.settledValue(balanceOfData[idx], p, 'balanceOf');
				const m = this.settledValue(mintedData[idx], p, 'minted');
				const ac = this.settledValue(clonesDate[idx], p, 'availableForClones');
				const am = this.settledValue(mintingDate[idx], p, 'availableForMinting');

				// Fall back to the indexer state when the on-chain read failed, so one broken
				// collateral token cannot abort the whole V2 update.
				const balance = typeof b === 'bigint' ? b : BigInt(p.collateralBalance);
				const minted = typeof m === 'bigint' ? m : BigInt(p.minted);
				const limitForPosition = (balance * BigInt(p.price)) / BigInt(10 ** p.zchfDecimals);
				const availableForPosition = limitForPosition - minted;

				const entry: PositionQueryV2 = {
					version: 2,

					position: getAddress(p.position),
					owner: getAddress(p.owner),
					zchf: getAddress(p.zchf),
					collateral: getAddress(p.collateral),
					price: p.price,

					created: parseInt(p.created as any),
					isOriginal: p.isOriginal,
					isClone: p.isClone,
					denied: p.denied,
					denyDate: parseInt(p.denyDate as any),
					closed: p.closed,
					original: getAddress(p.original),
					parent: getAddress(p.parent),

					minimumCollateral: p.minimumCollateral,
					annualInterestPPM: leadrate + p.riskPremiumPPM,
					riskPremiumPPM: p.riskPremiumPPM,
					reserveContribution: p.reserveContribution,
					start: parseInt(p.start as any),
					cooldown: parseInt(p.cooldown as any),
					expiration: parseInt(p.expiration as any),
					challengePeriod: parseInt(p.challengePeriod as any),

					zchfName: p.zchfName,
					zchfSymbol: p.zchfSymbol,
					zchfDecimals: p.zchfDecimals,

					collateralName: p.collateralName,
					collateralSymbol: p.collateralSymbol,
					collateralDecimals: p.collateralDecimals,
					collateralBalance: typeof b === 'bigint' ? b.toString() : p.collateralBalance,

					limitForPosition: limitForPosition.toString(),
					limitForClones: p.limitForClones,
					availableForClones: typeof ac === 'bigint' ? ac.toString() : p.availableForClones,
					availableForMinting: typeof am === 'bigint' ? am.toString() : p.availableForMinting,
					availableForPosition: availableForPosition.toString(),
					minted: typeof m === 'bigint' ? m.toString() : p.minted,
				};

				list[normalizeAddress(p.position)] = entry;
			}

			for (const p of closedItems) {
				const b = BigInt(p.collateralBalance);
				const m = BigInt(p.minted);
				const limitForPosition = (b * BigInt(p.price)) / BigInt(10 ** p.zchfDecimals);
				const availableForPosition = limitForPosition - m;

				list[normalizeAddress(p.position)] = {
					version: 2,

					position: getAddress(p.position),
					owner: getAddress(p.owner),
					zchf: getAddress(p.zchf),
					collateral: getAddress(p.collateral),
					price: p.price,

					created: parseInt(p.created as any),
					isOriginal: p.isOriginal,
					isClone: p.isClone,
					denied: p.denied,
					denyDate: parseInt(p.denyDate as any),
					closed: p.closed,
					original: getAddress(p.original),
					parent: getAddress(p.parent),

					minimumCollateral: p.minimumCollateral,
					annualInterestPPM: leadrate + p.riskPremiumPPM,
					riskPremiumPPM: p.riskPremiumPPM,
					reserveContribution: p.reserveContribution,
					start: parseInt(p.start as any),
					cooldown: parseInt(p.cooldown as any),
					expiration: parseInt(p.expiration as any),
					challengePeriod: parseInt(p.challengePeriod as any),

					zchfName: p.zchfName,
					zchfSymbol: p.zchfSymbol,
					zchfDecimals: p.zchfDecimals,

					collateralName: p.collateralName,
					collateralSymbol: p.collateralSymbol,
					collateralDecimals: p.collateralDecimals,
					collateralBalance: p.collateralBalance,

					limitForPosition: limitForPosition.toString(),
					limitForClones: p.limitForClones,
					availableForClones: p.availableForClones,
					availableForMinting: p.availableForMinting,
					availableForPosition: availableForPosition.toString(),
					minted: p.minted,
				};
			}

			const a = Object.keys(list).length;
			const b = this.fetchedPositionV2s.length;
			const isDiff = a > b;

			if (isDiff) this.logger.log(`Positions V2 merging, from ${b} to ${a} positions`);
			this.fetchedPositionV2s = Object.values(list) as PositionQueryV2[];
			this.fetchedPositions = { ...this.fetchedPositions, ...list };

			return list;
		} catch (error) {
			this.logger.error('Failed to update Positions V2 from indexer', error);
			// Data remains in memory from previous successful fetch
		}
	}

	getMintingUpdatesList(): ApiMintingUpdateListing {
		const m = Object.values(this.fetchedMintingUpdates).flat(1) as MintingUpdateQuery[];
		return {
			num: m.length,
			list: m,
		};
	}

	getMintingUpdatesMapping(): ApiMintingUpdateMapping {
		const m = this.fetchedMintingUpdates;
		return { num: Object.keys(m).length, positions: Object.keys(m) as Address[], map: m };
	}

	async getMintingUpdatesPosition(position: Address, version: number): Promise<ApiMintingUpdateListing> {
		return this.mintingUpdatesPositionCache.getOrCompute(`${normalizeAddress(position)}:${version}`, () =>
			this.fetchMintingUpdatesPosition(position, version)
		);
	}

	private async fetchMintingUpdatesPosition(position: Address, version: number): Promise<ApiMintingUpdateListing> {
		if (version == 1) {
			const items = await this.fetchAllPages<MintingUpdateQueryV1>(
				PONDER_CLIENT,
				gql`
					query ($after: String) {
						mintingHubV1MintingUpdateV1s(
							orderBy: "count"
						 	orderDirection: "desc"
							where: { position: "${normalizeAddress(position)}" }
							limit: 1000
							after: $after
							) {
							items {
								count
								txHash
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
				'mintingHubV1MintingUpdateV1s'
			);

			if (!items.length) this.logger.warn('No MintingUpdates V1 found.');

			return {
				num: items.length,
				list: items,
			};
		} else {
			const items = await this.fetchAllPages<MintingUpdateQueryV2>(
				PONDER_CLIENT,
				gql`
					query ($after: String) {
						mintingHubV2MintingUpdateV2s(where: { position: "${normalizeAddress(position)}" }, orderBy: "count", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								count
								txHash
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								basePremiumPPM
								riskPremiumPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
				'mintingHubV2MintingUpdateV2s'
			);

			if (!items.length) this.logger.warn('No MintingUpdates V2 found.');

			return {
				num: items.length,
				list: items,
			};
		}
	}

	async getMintingUpdatesOwner(owner: Address): Promise<ApiMintingUpdateListing> {
		return this.mintingUpdatesOwnerCache.getOrCompute(normalizeAddress(owner), () => this.fetchMintingUpdatesOwner(owner));
	}

	private async fetchMintingUpdatesOwner(owner: Address): Promise<ApiMintingUpdateListing> {
		const version1 = await this.fetchAllPages<MintingUpdateQueryV1>(
			PONDER_CLIENT,
			gql`
					query ($after: String) {
						mintingHubV1MintingUpdateV1s(
							orderBy: "created"
						 	orderDirection: "desc"
							where: { owner: "${normalizeAddress(owner)}" }
							limit: 1000
							after: $after
							) {
							items {
								count
								txHash
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			'mintingHubV1MintingUpdateV1s'
		);

		const version2 = await this.fetchAllPages<MintingUpdateQueryV2>(
			PONDER_CLIENT,
			gql`
					query ($after: String) {
						mintingHubV2MintingUpdateV2s(where: { owner: "${normalizeAddress(owner)}" }, orderBy: "count", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								count
								txHash
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								basePremiumPPM
								riskPremiumPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			'mintingHubV2MintingUpdateV2s'
		);

		const items: MintingUpdateQuery[] = [...version1, ...version2];

		return {
			num: items.length,
			list: items,
		};
	}

	async updateMintingUpdateV1s() {
		this.logger.debug('Updating Positions MintingUpdates V1');
		const currentSource = this.dataSource.getCurrentSource();

		// Determine which client to use
		const client = currentSource === 'primary' ? PONDER_CLIENT : PONDER_CLIENT_BACKUP;

		try {
			const items = await this.fetchAllPages<MintingUpdateQueryV1>(
				client!,
				gql`
					query ($after: String) {
						mintingHubV1MintingUpdateV1s(orderBy: "created", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								txHash
								count
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
				'mintingHubV1MintingUpdateV1s'
			);

			if (!items.length) {
				this.logger.warn('No MintingUpdates V1 found.');
				return;
			}

			const list: MintingUpdateQueryObjectArray = {};

			for (let idx = 0; idx < items.length; idx++) {
				const m = items[idx] as MintingUpdateQueryV1;
				const k = normalizeAddress(m.position);

				if (list[k] === undefined) list[k] = [];

				const entry: MintingUpdateQuery = {
					version: 1,

					id: m.id,
					count: Number(m.count),
					txHash: m.txHash,
					created: parseInt(m.created as any),
					position: getAddress(m.position),
					owner: getAddress(m.owner),
					isClone: m.isClone,
					collateral: getAddress(m.collateral),
					collateralName: m.collateralName,
					collateralSymbol: m.collateralSymbol,
					collateralDecimals: m.collateralDecimals,
					size: m.size,
					price: m.price,
					minted: m.minted,
					sizeAdjusted: m.sizeAdjusted,
					priceAdjusted: m.priceAdjusted,
					mintedAdjusted: m.mintedAdjusted,
					annualInterestPPM: m.annualInterestPPM,
					reserveContribution: m.reserveContribution,
					feeTimeframe: m.feeTimeframe,
					feePPM: m.feePPM,
					feePaid: m.feePaid,
				};

				list[k].push(entry);
			}

			const a = Object.values(list).flat(1).length;
			const b = Object.values(this.fetchedMintingUpdates).flat(1).length;
			const isDiff = a > b;

			if (isDiff) this.logger.log(`MintingUpdates V1 merging, from ${b} to ${a} entries`);
			this.fetchedMintingUpdates = { ...this.fetchedMintingUpdates, ...list };

			return list;
		} catch (error) {
			this.logger.error('Failed to update MintingUpdates V1 from indexer', error);
			// Data remains in memory from previous successful fetch
		}
	}

	async updateMintingUpdateV2s() {
		this.logger.debug('Updating Positions MintingUpdates V2');
		const currentSource = this.dataSource.getCurrentSource();

		// Determine which client to use
		const client = currentSource === 'primary' ? PONDER_CLIENT : PONDER_CLIENT_BACKUP;

		try {
			const items = await this.fetchAllPages<MintingUpdateQueryV2>(
				client!,
				gql`
					query ($after: String) {
						mintingHubV2MintingUpdateV2s(orderBy: "created", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								txHash
								count
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								basePremiumPPM
								riskPremiumPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
				'mintingHubV2MintingUpdateV2s'
			);

			if (!items.length) {
				this.logger.warn('No MintingUpdates V2 found.');
				return;
			}

			const list: MintingUpdateQueryObjectArray = {};

			for (let idx = 0; idx < items.length; idx++) {
				const m = items[idx] as MintingUpdateQueryV2;
				const k = normalizeAddress(m.position);

				if (list[k] === undefined) list[k] = [];

				const entry: MintingUpdateQueryV2 = {
					version: 2,

					id: m.id,
					count: Number(m.count),
					txHash: m.txHash,
					created: parseInt(m.created as any),
					position: getAddress(m.position),
					owner: getAddress(m.owner),
					isClone: m.isClone,
					collateral: getAddress(m.collateral),
					collateralName: m.collateralName,
					collateralSymbol: m.collateralSymbol,
					collateralDecimals: m.collateralDecimals,
					size: m.size,
					price: m.price,
					minted: m.minted,
					sizeAdjusted: m.sizeAdjusted,
					priceAdjusted: m.priceAdjusted,
					mintedAdjusted: m.mintedAdjusted,
					annualInterestPPM: m.annualInterestPPM,
					basePremiumPPM: m.basePremiumPPM,
					riskPremiumPPM: m.riskPremiumPPM,
					reserveContribution: m.reserveContribution,
					feeTimeframe: m.feeTimeframe,
					feePPM: m.feePPM,
					feePaid: m.feePaid,
				};

				list[k].push(entry);
			}

			const a = Object.values(list).flat(1).length;
			const b = Object.values(this.fetchedMintingUpdates).flat(1).length;
			const isDiff = a > b;

			if (isDiff) this.logger.log(`MintingUpdates V2 merging, from ${b} to ${a} entries`);
			this.fetchedMintingUpdates = { ...this.fetchedMintingUpdates, ...list };

			return list;
		} catch (error) {
			this.logger.error('Failed to update MintingUpdates V2 from indexer', error);
			// Data remains in memory from previous successful fetch
		}
	}

	async getOwnerFees(owner: Address): Promise<ApiMintingUpdateListing> {
		return this.ownerFeesCache.getOrCompute(normalizeAddress(owner), () => this.fetchOwnerFees(owner));
	}

	private async fetchOwnerFees(owner: Address): Promise<ApiMintingUpdateListing> {
		const version1 = await this.fetchAllPages<MintingUpdateQueryV1>(
			PONDER_CLIENT,
			gql`
					query ($after: String) {
						mintingHubV1MintingUpdateV1s(
							orderBy: "created"
						 	orderDirection: "desc"
							where: { owner: "${normalizeAddress(owner)}", feePaid_gt: "0" }
							limit: 1000
							after: $after
							) {
							items {
								count
								txHash
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			'mintingHubV1MintingUpdateV1s'
		);

		const version2 = await this.fetchAllPages<MintingUpdateQueryV2>(
			PONDER_CLIENT,
			gql`
					query ($after: String) {
						mintingHubV2MintingUpdateV2s(where: { owner: "${normalizeAddress(owner)}", feePaid_gt: "0" }, orderBy: "count", orderDirection: "desc", limit: 1000, after: $after) {
							items {
								count
								txHash
								created
								position
								owner
								isClone
								collateral
								collateralName
								collateralSymbol
								collateralDecimals
								size
								price
								minted
								sizeAdjusted
								priceAdjusted
								mintedAdjusted
								annualInterestPPM
								basePremiumPPM
								riskPremiumPPM
								reserveContribution
								feeTimeframe
								feePPM
								feePaid
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			'mintingHubV2MintingUpdateV2s'
		);

		const items: MintingUpdateQuery[] = [...version1, ...version2];

		return {
			num: items.length,
			list: items,
		};
	}

	async getOwnerDebt(owner: Address): Promise<ApiOwnerDebt> {
		return this.ownerDebtCache.getOrCompute(normalizeAddress(owner), () => this.fetchOwnerDebt(owner));
	}

	private async fetchOwnerDebt(owner: Address): Promise<ApiOwnerDebt> {
		owner = normalizeAddress(owner);
		const history = await this.getOwnerHistory(owner);

		const years = Object.keys(history).map((i) => Number(i));

		const yearlyDebt: {
			[key: number]: string;
		} = {};

		for (const y of years) {
			const positions = history[y];

			let debt = 0n;
			for (const pos of positions) {
				const updates = this.fetchedMintingUpdates[normalizeAddress(pos)] || [];
				const itemsUntil = updates.filter((i) => i.created * 1000 < new Date(String(y + 1)).getTime());
				const selected = itemsUntil.at(0);
				if (selected != undefined) {
					const m = BigInt(selected.minted);
					const r = BigInt(selected.reserveContribution);
					debt += (m * (BigInt(1_000_000) - r)) / BigInt(1_000_000);
				}
			}

			yearlyDebt[y] = String(debt);
		}

		return yearlyDebt;
	}

	async getOwnerHistory(owner: Address): Promise<ApiOwnerHistory> {
		return this.ownerHistoryCache.getOrCompute(normalizeAddress(owner), () => this.fetchOwnerHistory(owner));
	}

	private async fetchOwnerHistory(owner: Address): Promise<ApiOwnerHistory> {
		owner = normalizeAddress(owner);
		const transfers = await this.getOwnerTransfers(owner);

		const years = transfers.list
			.map((i) => new Date(i.created * 1000).getFullYear())
			.reduce((a, b) => {
				return a.includes(b) ? a : [...a, b];
			}, [] as number[]);

		const currentYear = new Date().getFullYear();
		if (!years.includes(currentYear)) years.push(currentYear);

		const yearlyPositions: {
			[key: number]: Address[];
		} = {};

		for (const y of years) {
			if (yearlyPositions[y] == undefined) yearlyPositions[y] = [] as Address[];
			const isCurrentYear = new Date().getFullYear() == y;
			const itemsUntil = transfers.list.filter((i) => new Date(i.created * 1000).getFullYear() <= y);

			for (const tr of itemsUntil) {
				if (tr.newOwner == owner && !yearlyPositions[y].includes(tr.position)) {
					yearlyPositions[y].push(tr.position);
				} else if (tr.previousOwner == owner && yearlyPositions[y].includes(tr.position)) {
					yearlyPositions[y] = yearlyPositions[y].filter((p) => p != tr.position);
				}

				const position = this.getPositionsList().list.find((p) => normalizeAddress(p.position) == normalizeAddress(tr.position));

				if (!isCurrentYear && position.expiration * 1000 < new Date(String(y + 1)).getTime()) {
					yearlyPositions[y] = yearlyPositions[y].filter((p) => p != tr.position);
				} else if (isCurrentYear && position.expiration * 1000 < new Date().getTime()) {
					yearlyPositions[y] = yearlyPositions[y].filter((p) => p != tr.position);
				}
			}
		}

		if (yearlyPositions[currentYear].length == 0) {
			delete yearlyPositions[currentYear];
		}

		return yearlyPositions;
	}

	async getOwnerTransfers(owner: Address): Promise<ApiOwnerTransfersListing> {
		return this.ownerTransfersCache.getOrCompute(normalizeAddress(owner), () => this.fetchOwnerTransfers(owner));
	}

	private async fetchOwnerTransfers(owner: Address): Promise<ApiOwnerTransfersListing> {
		const version1 = await this.fetchAllPages<OwnerTransferQuery>(
			PONDER_CLIENT,
			gql`
					query ($after: String) {
						mintingHubV1OwnerTransfersV1s(
							orderBy: "created"
						 	orderDirection: "desc"
							where: { OR: [ { previousOwner: "${normalizeAddress(owner)}" }, { newOwner: "${normalizeAddress(owner)}" }] }
							limit: 1000
							after: $after
							) {
							items {
								version
								count
								txHash
								created
								position
								previousOwner
								newOwner
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			'mintingHubV1OwnerTransfersV1s'
		);

		const version2 = await this.fetchAllPages<OwnerTransferQuery>(
			PONDER_CLIENT,
			gql`
					query ($after: String) {
						mintingHubV2OwnerTransfersV2s(
							orderBy: "created"
						 	orderDirection: "desc"
							where: { OR: [ { previousOwner: "${normalizeAddress(owner)}" }, { newOwner: "${normalizeAddress(owner)}" }] }
							limit: 1000
							after: $after
							) {
							items {
								version
								count
								txHash
								created
								position
								previousOwner
								newOwner
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}
				`,
			'mintingHubV2OwnerTransfersV2s'
		);

		const items: OwnerTransferQuery[] = [...version1, ...version2].sort((a, b) => a.created - b.created);

		return {
			num: items.length,
			list: items,
		};
	}
}
