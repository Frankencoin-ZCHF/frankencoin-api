import { Controller, Get, Param } from '@nestjs/common';
import { PositionsService } from './positions.service';
import {
	ApiMintingUpdateListing,
	ApiMintingUpdateMapping,
	ApiMintingUpdateOwnerDebt,
	ApiMintingUpdateOwnerFees,
	ApiPositionsListing,
	ApiPositionsMapping,
	ApiPositionsOwners,
	MintingUpdateQuery,
} from './positions.types';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Address, isAddress, zeroAddress } from 'viem';

@ApiTags('Positions Controller')
@Controller('positions')
export class PositionsController {
	constructor(private readonly positionsService: PositionsService) {}

	@Get('list')
	@ApiResponse({
		description: 'Returns a list of all positions',
	})
	getList(): ApiPositionsListing {
		return this.positionsService.getPositionsList();
	}

	@Get('mapping')
	@ApiResponse({
		description: 'Returns a mapping of all positions',
	})
	getMapping(): ApiPositionsMapping {
		return this.positionsService.getPositionsMapping();
	}

	@Get('open')
	@ApiResponse({
		description: 'Returns a filtered mapping of open positions',
	})
	getOpen(): ApiPositionsMapping {
		return this.positionsService.getPositionsOpen();
	}

	@Get('requests')
	@ApiResponse({
		description: 'Returns a filtered mapping of requested positions (default: less then 5 days old)',
	})
	getRequestPositions(): ApiPositionsMapping {
		return this.positionsService.getPositionsRequests();
	}

	@Get('owners')
	@ApiResponse({
		description: 'Returns a mapping of positions mapped by owner',
	})
	getOwners(): ApiPositionsOwners {
		return this.positionsService.getPositionsOwners();
	}

	@Get('mintingupdates/list')
	@ApiResponse({
		description: 'Returns a list of all latest mintingupdates, limit: 1000',
	})
	getMintingList(): ApiMintingUpdateListing {
		return this.positionsService.getMintingUpdatesList();
	}

	@Get('mintingupdates/mapping')
	@ApiResponse({
		description: 'Returns a mapping of all latest mintingupdates, limit: 1000',
	})
	geMintingMapping(): ApiMintingUpdateMapping {
		return this.positionsService.getMintingUpdatesMapping();
	}

	@Get('mintingupdates/position/:version/:address')
	@ApiResponse({
		description: 'Returns a list of all latest mintingupdates of a versioned position, limit: 1000',
	})
	async getMintingPosition(@Param('version') version: string, @Param('address') position: string): Promise<ApiMintingUpdateListing> {
		return await this.positionsService.getMintingUpdatesPosition(
			isAddress(position) ? (position as Address) : zeroAddress,
			Number(version)
		);
	}

	@Get('mintingupdates/owner/:address')
	@ApiResponse({
		description: 'Returns a list of all latest mintingupdates of an owner, limit: 1000',
	})
	async getMintingOwner(@Param('address') owner: string): Promise<ApiMintingUpdateListing | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		return await this.positionsService.getMintingUpdatesOwner(owner);
	}

	@Get('mintingupdates/owner/:address/fees')
	@ApiResponse({
		description: 'Returns a list of all latest fees paid by owner, limit: 1000',
	})
	async getMintingOwnerFees(@Param('address') owner: string): Promise<ApiMintingUpdateOwnerFees> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		const updates = await this.positionsService.getMintingUpdatesOwnerFees(owner);
		const entries = updates.list.filter((l) => BigInt(l.feePaid) > 0).map((l) => ({ t: Number(l.created), f: l.feePaid }));
		return entries;
	}

	@Get('mintingupdates/owner/:address/debt')
	@ApiResponse({
		description: 'Returns a list of yearly latest debt entry of an owner, limit: 1000',
	})
	async getMintingOwnerDebt(@Param('address') owner: string): Promise<ApiMintingUpdateOwnerDebt> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		const updates = (await this.positionsService.getMintingUpdatesOwner(owner)).list;
		const mapping: { [key: Address]: MintingUpdateQuery[] } = {};

		// mapping to position
		for (const m of updates) {
			const k = m.position.toLowerCase();
			if (mapping[k] == undefined) mapping[k] = [m];
			else mapping[k].push(m);
		}

		const positions = Object.keys(mapping);
		const latestByPos: ApiMintingUpdateOwnerDebt = {}; // mapped by year and address, latest entry

		for (const p of positions) {
			const items = mapping[p] as MintingUpdateQuery[];
			const sorted = items.sort((a, b) => (BigInt(a.count) > BigInt(b.count) ? 1 : -1));

			for (const i of sorted) {
				const year = new Date(i.created * 1000).getFullYear();
				const payload = { t: i.created, p: i.position.toLowerCase() as Address, m: i.minted, r: i.reserveContribution };
				if (latestByPos[year] == undefined) latestByPos[year] = {};
				latestByPos[year][p] = payload;
			}
		}

		return latestByPos;
	}
}
