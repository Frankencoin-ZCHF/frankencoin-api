import { Controller, Get, Param } from '@nestjs/common';
import { PositionsService } from './positions.service';
import {
	ApiMintingUpdateListing,
	ApiMintingUpdateMapping,
	ApiOwnerDebt,
	ApiOwnerFees,
	ApiOwnerHistory,
	ApiOwnerTransfersListing,
	ApiPositionsListing,
	ApiPositionsMapping,
	ApiPositionsOwners,
} from './positions.types';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Address, isAddress, zeroAddress } from 'viem';

@ApiTags('Positions')
@Controller('positions')
export class PositionsController {
	constructor(private readonly positionsService: PositionsService) {}

	@Get('list')
	@ApiOperation({
		summary: 'Get all positions',
		description:
			'Returns: ApiPositionsListing, a complete list of all collateral positions in the Frankencoin ecosystem. ' +
			'Includes both original positions and clones, with detailed information about collateral, minting limits, ' +
			'interest rates, and current status.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns an array of all positions with their complete details',
		schema: {
			type: 'ApiPositionsListing',
			properties: {
				num: { type: 'number', description: 'Total number of positions' },
				list: {
					type: 'array',
					description: 'Array of position objects',
					items: { type: 'PositionQuery' },
				},
			},
			example: {
				num: 2,
				list: [
					{
						version: 1,
						position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						zchf: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
						collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						price: '550000000000000000000000000000000',
						created: 1711816751,
						isOriginal: true,
						isClone: false,
						denied: false,
						closed: false,
						original: '0x0000000000000000000000000000000000000000',
						minimumCollateral: '5000000000',
						annualInterestPPM: 20000,
						reserveContribution: 100000,
						start: 1711816751,
						cooldown: 259200,
						expiration: 0,
						challengePeriod: 259200,
						zchfName: 'Frankencoin',
						zchfSymbol: 'ZCHF',
						zchfDecimals: 18,
						collateralName: 'Wrapped BTC',
						collateralSymbol: 'WBTC',
						collateralDecimals: 8,
						collateralBalance: '8500000000',
						limitForPosition: '4675000000000000000000000',
						limitForClones: '0',
						availableForPosition: '25000000000000000000000',
						availableForClones: '0',
						minted: '4650000000000000000000000',
					},
				],
			},
		},
	})
	getList(): ApiPositionsListing {
		return this.positionsService.getPositionsList();
	}

	@Get('mapping')
	@ApiOperation({
		summary: 'Get all positions as a mapping',
		description:
			'Returns: ApiPositionsMapping, all positions organized as a key-value mapping where position addresses are keys. ' +
			'This format provides efficient lookup by address and includes an array of all position addresses for iteration.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of position addresses to their details',
		schema: {
			type: 'ApiPositionsMapping',
			properties: {
				num: { type: 'number', description: 'Total number of positions' },
				addresses: {
					type: 'array',
					description: 'Array of position addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of position address to position object',
					additionalProperties: { type: 'PositionQuery' },
				},
			},
			example: {
				num: 2,
				addresses: ['0x98725eE62833096C1c9bE26001F3cDA9a6241EF3', '0x49c431454C40eCbf848096f2753B2ABc3a699a10'],
				map: {
					'0x98725eE62833096C1c9bE26001F3cDA9a6241EF3': {
						version: 1,
						position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						zchf: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
						collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						price: '550000000000000000000000000000000',
						created: 1711816751,
						isOriginal: true,
						isClone: false,
						denied: false,
						closed: false,
						original: '0x0000000000000000000000000000000000000000',
						minimumCollateral: '5000000000',
						annualInterestPPM: 20000,
						reserveContribution: 100000,
						start: 1711816751,
						cooldown: 259200,
						expiration: 0,
						challengePeriod: 259200,
						zchfName: 'Frankencoin',
						zchfSymbol: 'ZCHF',
						zchfDecimals: 18,
						collateralName: 'Wrapped BTC',
						collateralSymbol: 'WBTC',
						collateralDecimals: 8,
						collateralBalance: '8500000000',
						limitForPosition: '4675000000000000000000000',
						limitForClones: '0',
						availableForPosition: '25000000000000000000000',
						availableForClones: '0',
						minted: '4650000000000000000000000',
					},
				},
			},
		},
	})
	getMapping(): ApiPositionsMapping {
		return this.positionsService.getPositionsMapping();
	}

	@Get('open')
	@ApiOperation({
		summary: 'Get open positions',
		description:
			'Returns: ApiPositionsMapping, only positions that are currently open and active. ' +
			'Excludes closed, denied, or expired positions. Useful for displaying active borrowing positions.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of open position addresses to their details',
		schema: {
			type: 'ApiPositionsMapping',
			properties: {
				num: { type: 'number', description: 'Total number of open positions' },
				addresses: {
					type: 'array',
					description: 'Array of open position addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of position address to position object',
					additionalProperties: { type: 'PositionQuery' },
				},
			},
			example: {
				num: 1,
				addresses: ['0x98725eE62833096C1c9bE26001F3cDA9a6241EF3'],
				map: {
					'0x98725eE62833096C1c9bE26001F3cDA9a6241EF3': {
						version: 1,
						position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						zchf: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
						collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						price: '550000000000000000000000000000000',
						created: 1711816751,
						isOriginal: true,
						isClone: false,
						denied: false,
						closed: false,
						original: '0x0000000000000000000000000000000000000000',
						minimumCollateral: '5000000000',
						annualInterestPPM: 20000,
						reserveContribution: 100000,
						start: 1711816751,
						cooldown: 259200,
						expiration: 0,
						challengePeriod: 259200,
						zchfName: 'Frankencoin',
						zchfSymbol: 'ZCHF',
						zchfDecimals: 18,
						collateralName: 'Wrapped BTC',
						collateralSymbol: 'WBTC',
						collateralDecimals: 8,
						collateralBalance: '8500000000',
						limitForPosition: '4675000000000000000000000',
						limitForClones: '0',
						availableForPosition: '25000000000000000000000',
						availableForClones: '0',
						minted: '4650000000000000000000000',
					},
				},
			},
		},
	})
	getOpen(): ApiPositionsMapping {
		return this.positionsService.getPositionsOpen();
	}

	@Get('requests')
	@ApiOperation({
		summary: 'Get recently requested positions',
		description:
			'Returns: ApiPositionsMapping, positions that have been recently requested and are awaiting approval. ' +
			'By default, returns positions created within the last 5 days. ' +
			'These positions are in the initialization period before they can be used for minting.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of recently requested position addresses',
		schema: {
			type: 'ApiPositionsMapping',
			properties: {
				num: { type: 'number', description: 'Total number of requested positions' },
				addresses: {
					type: 'array',
					description: 'Array of requested position addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of position address to position object',
					additionalProperties: { type: 'PositionQuery' },
				},
			},
			example: {
				num: 1,
				addresses: ['0x826C54287c0C1E2A4D0fbF81E2e734c85C48d3f4'],
				map: {
					'0x826C54287c0C1E2A4D0fbF81E2e734c85C48d3f4': {
						version: 2,
						position: '0x826C54287c0C1E2A4D0fbF81E2e734c85C48d3f4',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						zchf: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
						collateral: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
						price: '2500000000000000000000',
						created: 1768247747,
						isOriginal: true,
						isClone: false,
						denied: false,
						closed: false,
						original: '0x826C54287c0C1E2A4D0fbF81E2e734c85C48d3f4',
						parent: '0x826C54287c0C1E2A4D0fbF81E2e734c85C48d3f4',
						minimumCollateral: '2000000000000000000',
						annualInterestPPM: 25000,
						riskPremiumPPM: 10000,
						reserveContribution: 250000,
						start: 1768679747,
						cooldown: 1768679747,
						expiration: 1830887747,
						challengePeriod: 86400,
						zchfName: 'Frankencoin',
						zchfSymbol: 'ZCHF',
						zchfDecimals: 18,
						collateralName: 'Wrapped liquid staked Ether 2.0',
						collateralSymbol: 'wstETH',
						collateralDecimals: 18,
						collateralBalance: '500000000000000000000',
						limitForPosition: '1250000000000000000000000',
						limitForClones: '5000000000000000000000000',
						availableForClones: '3750000000000000000000000',
						availableForMinting: '5000000000000000000000000',
						availableForPosition: '1250000000000000000000000',
						minted: '0',
					},
				},
			},
		},
	})
	getRequestPositions(): ApiPositionsMapping {
		return this.positionsService.getPositionsRequests();
	}

	@Get('owners')
	@ApiOperation({
		summary: 'Get positions grouped by owner',
		description:
			'Returns: ApiPositionsOwners, all positions organized by owner address. ' +
			'Each owner address maps to an array of their positions, making it easy to view all positions controlled by a specific address.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of owner addresses to their position arrays',
		schema: {
			type: 'ApiPositionsOwners',
			properties: {
				num: { type: 'number', description: 'Total number of unique owners' },
				owners: {
					type: 'array',
					description: 'Array of owner addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of owner address to array of their positions',
					additionalProperties: {
						type: 'array',
						items: { type: 'PositionQuery' },
					},
				},
			},
			example: {
				num: 2,
				owners: ['0x963eC454423CD543dB08bc38fC7B3036B425b301', '0x6a4a629d14EC0fc8e2b7DB41949FefaA4F63327F'],
				map: {
					'0x963eC454423CD543dB08bc38fC7B3036B425b301': [
						{
							version: 1,
							position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
							owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
							zchf: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
							collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
							price: '550000000000000000000000000000000',
							created: 1711816751,
							isOriginal: true,
							isClone: false,
							denied: false,
							closed: false,
							original: '0x0000000000000000000000000000000000000000',
							minimumCollateral: '5000000000',
							annualInterestPPM: 20000,
							reserveContribution: 100000,
							start: 1711816751,
							cooldown: 259200,
							expiration: 0,
							challengePeriod: 259200,
							zchfName: 'Frankencoin',
							zchfSymbol: 'ZCHF',
							zchfDecimals: 18,
							collateralName: 'Wrapped BTC',
							collateralSymbol: 'WBTC',
							collateralDecimals: 8,
							collateralBalance: '8500000000',
							limitForPosition: '4675000000000000000000000',
							limitForClones: '0',
							availableForPosition: '25000000000000000000000',
							availableForClones: '0',
							minted: '4650000000000000000000000',
						},
					],
				},
			},
		},
	})
	getOwners(): ApiPositionsOwners {
		return this.positionsService.getPositionsOwners();
	}

	@Get('mintingupdates/list')
	@ApiOperation({
		summary: 'Get minting updates list',
		description:
			'Returns: ApiMintingUpdateListing, a list of the latest minting update events across all positions. ' +
			'Minting updates occur when ZCHF is minted or burned against a position. ' +
			'Includes collateral size changes, price adjustments, fees paid, and interest rates. Limited to 1000 most recent updates.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns an array of the latest minting update events (max 1000)',
		schema: {
			type: 'ApiMintingUpdateListing',
			properties: {
				num: { type: 'number', description: 'Total number of minting updates returned' },
				list: {
					type: 'array',
					description: 'Array of minting update objects',
					items: { type: 'MintingUpdateQuery' },
				},
			},
			example: {
				num: 2,
				list: [
					{
						version: 1,
						count: 18,
						txHash: '0x86e4bee59948f0577498bd0203fe954533a8d27bb63aa337c2d36897f0c4e5a4',
						created: 1760784815,
						position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						isClone: false,
						collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						collateralName: 'Wrapped BTC',
						collateralSymbol: 'WBTC',
						collateralDecimals: 8,
						size: '8500000000',
						price: '550000000000000000000000000000000',
						minted: '4650000000000000000000000',
						sizeAdjusted: '1840000000',
						priceAdjusted: '-150000000000000000000000000000000',
						mintedAdjusted: '0',
						annualInterestPPM: 20000,
						reserveContribution: 100000,
						feeTimeframe: 13671936,
						feePPM: 8670,
						feePaid: '0',
					},
				],
			},
		},
	})
	getMintingList(): ApiMintingUpdateListing {
		return this.positionsService.getMintingUpdatesList();
	}

	@Get('mintingupdates/mapping')
	@ApiOperation({
		summary: 'Get minting updates as a mapping',
		description:
			'Returns: ApiMintingUpdateMapping, minting updates organized by position address. ' +
			'Each position address maps to an array of its minting update history. ' +
			'Useful for viewing the complete minting history of specific positions. Limited to 1000 updates per position.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of position addresses to their minting update arrays (max 1000 per position)',
		schema: {
			type: 'ApiMintingUpdateMapping',
			properties: {
				num: { type: 'number', description: 'Total number of positions with updates' },
				positions: {
					type: 'array',
					description: 'Array of position addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of position address to array of minting updates',
					additionalProperties: {
						type: 'array',
						items: { type: 'MintingUpdateQuery' },
					},
				},
			},
			example: {
				num: 2,
				positions: ['0x98725eE62833096C1c9bE26001F3cDA9a6241EF3', '0xF68acA3D30672c7B81ced1215198B2a288E46afb'],
				map: {
					'0x98725eE62833096C1c9bE26001F3cDA9a6241EF3': [
						{
							version: 1,
							count: 18,
							txHash: '0x86e4bee59948f0577498bd0203fe954533a8d27bb63aa337c2d36897f0c4e5a4',
							created: 1760784815,
							position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
							owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
							isClone: false,
							collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
							collateralName: 'Wrapped BTC',
							collateralSymbol: 'WBTC',
							collateralDecimals: 8,
							size: '8500000000',
							price: '550000000000000000000000000000000',
							minted: '4650000000000000000000000',
							sizeAdjusted: '1840000000',
							priceAdjusted: '-150000000000000000000000000000000',
							mintedAdjusted: '0',
							annualInterestPPM: 20000,
							reserveContribution: 100000,
							feeTimeframe: 13671936,
							feePPM: 8670,
							feePaid: '0',
						},
					],
				},
			},
		},
	})
	geMintingMapping(): ApiMintingUpdateMapping {
		return this.positionsService.getMintingUpdatesMapping();
	}

	@Get('mintingupdates/position/:version/:address')
	@ApiOperation({
		summary: 'Get minting updates for a specific position',
		description:
			'Returns: ApiMintingUpdateListing, the complete minting history for a specific position identified by version and address. ' +
			'Includes all minting and burning events, collateral adjustments, fees paid, and interest accrual. ' +
			'Limited to 1000 most recent updates.',
	})
	@ApiParam({
		name: 'version',
		description: 'Position version number (1 or 2)',
		example: '2',
	})
	@ApiParam({
		name: 'address',
		description: 'Position contract address (Ethereum address)',
		example: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns minting update history for the specified position (max 1000)',
		schema: {
			type: 'ApiMintingUpdateListing',
			properties: {
				num: { type: 'number', description: 'Total number of minting updates for this position' },
				list: {
					type: 'array',
					description: 'Array of minting update objects for this position',
					items: { type: 'MintingUpdateQuery' },
				},
			},
			example: {
				num: 1,
				list: [
					{
						version: 1,
						count: 18,
						txHash: '0x86e4bee59948f0577498bd0203fe954533a8d27bb63aa337c2d36897f0c4e5a4',
						created: 1760784815,
						position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						isClone: false,
						collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						collateralName: 'Wrapped BTC',
						collateralSymbol: 'WBTC',
						collateralDecimals: 8,
						size: '8500000000',
						price: '550000000000000000000000000000000',
						minted: '4650000000000000000000000',
						sizeAdjusted: '1840000000',
						priceAdjusted: '-150000000000000000000000000000000',
						mintedAdjusted: '0',
						annualInterestPPM: 20000,
						reserveContribution: 100000,
						feeTimeframe: 13671936,
						feePPM: 8670,
						feePaid: '0',
					},
				],
			},
		},
	})
	async getMintingPosition(@Param('version') version: string, @Param('address') position: string): Promise<ApiMintingUpdateListing> {
		return await this.positionsService.getMintingUpdatesPosition(
			isAddress(position) ? (position as Address) : zeroAddress,
			Number(version)
		);
	}

	@Get('mintingupdates/owner/:address')
	@ApiOperation({
		summary: 'Get minting updates by owner',
		description:
			'Returns: ApiMintingUpdateListing, all minting updates across all positions owned by a specific address. ' +
			'Aggregates the minting history from all positions under the owners control. ' +
			'Useful for tracking an owners complete borrowing activity. Limited to 1000 most recent updates.',
	})
	@ApiParam({
		name: 'address',
		description: 'Owner wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns minting updates for all positions owned by the address (max 1000)',
		schema: {
			type: 'ApiMintingUpdateListing',
			properties: {
				num: { type: 'number', description: 'Total number of minting updates for this owner' },
				list: {
					type: 'array',
					description: 'Array of minting update objects across all owned positions',
					items: { type: 'MintingUpdateQuery' },
				},
			},
			example: {
				num: 1,
				list: [
					{
						version: 1,
						count: 18,
						txHash: '0x86e4bee59948f0577498bd0203fe954533a8d27bb63aa337c2d36897f0c4e5a4',
						created: 1760784815,
						position: '0x98725eE62833096C1c9bE26001F3cDA9a6241EF3',
						owner: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
						isClone: false,
						collateral: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
						collateralName: 'Wrapped BTC',
						collateralSymbol: 'WBTC',
						collateralDecimals: 8,
						size: '8500000000',
						price: '550000000000000000000000000000000',
						minted: '4650000000000000000000000',
						sizeAdjusted: '1840000000',
						priceAdjusted: '-150000000000000000000000000000000',
						mintedAdjusted: '0',
						annualInterestPPM: 20000,
						reserveContribution: 100000,
						feeTimeframe: 13671936,
						feePPM: 8670,
						feePaid: '0',
					},
				],
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address not valid' },
			},
		},
	})
	async getMintingOwner(@Param('address') owner: string): Promise<ApiMintingUpdateListing | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		return await this.positionsService.getMintingUpdatesOwner(owner);
	}

	@Get('owner/:address/fees')
	@ApiOperation({
		summary: 'Get fees paid by owner',
		description:
			'Returns: ApiOwnerFees, a time series of all fees paid by an owner across their positions. ' +
			'Each entry contains a timestamp and the fee amount in ZCHF. ' +
			'Only includes non-zero fee payments. Limited to 1000 most recent fee payments.',
	})
	@ApiParam({
		name: 'address',
		description: 'Owner wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns array of fee payment events with timestamp (t) and fee amount (f)',
		schema: {
			type: 'ApiOwnerFees',
			items: {
				type: 'object',
				properties: {
					t: { type: 'number', description: 'Unix timestamp of fee payment' },
					f: { type: 'string', description: 'Fee amount paid in ZCHF (as string to preserve precision)' },
				},
			},
			example: [
				{
					t: 1744214015,
					f: '790300000000000000000',
				},
				{
					t: 1741301207,
					f: '3154050000000000000000',
				},
				{
					t: 1737116699,
					f: '11840000000000000000000',
				},
			],
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address not valid' },
			},
		},
	})
	async getMintingOwnerFees(@Param('address') owner: string): Promise<ApiOwnerFees | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		const updates = await this.positionsService.getOwnerFees(owner);
		const entries = updates.list.filter((l) => BigInt(l.feePaid) > 0).map((l) => ({ t: Number(l.created), f: l.feePaid }));
		return entries;
	}

	@Get('owner/:address/debt')
	@ApiOperation({
		summary: 'Get owner debt history',
		description:
			'Returns: ApiOwnerDebt, a yearly time series of the owners total open debt (minted ZCHF) across all their positions. ' +
			'Keys are Unix timestamps representing year boundaries, values are the total debt amount in ZCHF at that time. ' +
			'Useful for tracking debt exposure over time.',
	})
	@ApiParam({
		name: 'address',
		description: 'Owner wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns yearly mapping of timestamps to debt amounts',
		schema: {
			type: 'ApiOwnerDebt',
			description: 'Mapping of year timestamp to total debt amount',
			additionalProperties: {
				type: 'string',
				description: 'Total debt in ZCHF (as string to preserve precision)',
			},
			example: {
				'2024': '6472670608862435201252591',
				'2025': '9034709320697003718679797',
				'2026': '9259709320697003718679797',
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address not valid' },
			},
		},
	})
	async getOwnerDebt(@Param('address') owner: string): Promise<ApiOwnerDebt | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		return await this.positionsService.getOwnerDebt(owner);
	}

	@Get('owner/:address/history')
	@ApiOperation({
		summary: 'Get owner position history',
		description:
			'Returns: ApiOwnerHistory, a yearly time series of position addresses owned by this address. ' +
			'Keys are Unix timestamps representing year boundaries, values are arrays of position addresses owned at that time. ' +
			'Shows the evolution of the owners position portfolio over time.',
	})
	@ApiParam({
		name: 'address',
		description: 'Owner wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns yearly mapping of timestamps to arrays of owned position addresses',
		schema: {
			type: 'ApiOwnerHistory',
			description: 'Mapping of year timestamp to array of position addresses',
			additionalProperties: {
				type: 'array',
				items: {
					type: 'string',
					description: 'Position address (Ethereum address)',
				},
			},
			example: {
				'2024': [
					'0x5495d1a197ebb00466ac68d02f258b695bb5e20b',
					'0x7c245a2d29b88cb7c5fb118518fc7f03e85f2e99',
					'0xe4255fe5a5105b4024c462e65339bfd8e4854e97',
					'0x98725ee62833096c1c9be26001f3cda9a6241ef3',
				],
				'2025': [
					'0x98725ee62833096c1c9be26001f3cda9a6241ef3',
					'0x49c431454c40ecbf848096f2753b2abc3a699a10',
					'0x1eed91eefa0da607fa32088ad686fb8ca4254804',
				],
				'2026': [
					'0x98725ee62833096c1c9be26001f3cda9a6241ef3',
					'0x49c431454c40ecbf848096f2753b2abc3a699a10',
					'0x826c54287c0c1e2a4d0fbf81e2e734c85c48d3f4',
				],
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address not valid' },
			},
		},
	})
	async getOwnerHistory(@Param('address') owner: string): Promise<ApiOwnerHistory | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}
		return await this.positionsService.getOwnerHistory(owner);
	}

	@Get('owner/:address/transfers')
	@ApiOperation({
		summary: 'Get position ownership transfers',
		description:
			'Returns: ApiOwnerTransfersListing, all position ownership transfer events where the specified address was either the previous owner or new owner. ' +
			'Each transfer includes the position address, transaction hash, timestamp, and both parties involved. ' +
			'Useful for tracking position acquisition and disposition history. Limited to 1000 most recent transfers.',
	})
	@ApiParam({
		name: 'address',
		description: 'Owner wallet address (Ethereum address)',
		example: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns array of ownership transfer events involving the address (max 1000)',
		schema: {
			type: 'ApiOwnerTransfersListing',
			properties: {
				num: { type: 'number', description: 'Total number of transfer events' },
				list: {
					type: 'array',
					description: 'Array of ownership transfer objects',
					items: { type: 'OwnerTransferQuery' },
				},
			},
			example: {
				num: 2,
				list: [
					{
						version: 1,
						count: 1,
						txHash: '0x61cd4e8e9b29580ec28a9d19032cc2fbc8aec2c13109e0e1fe439fed509ed032',
						created: 1707226235,
						position: '0xebfa07d0e785927ecabd45634a4b8efb4bc37dcd',
						previousOwner: '0x0000000000000000000000000000000000000000',
						newOwner: '0x963ec454423cd543db08bc38fc7b3036b425b301',
					},
					{
						version: 1,
						count: 3,
						txHash: '0xe3fcfa559fdc5fb7b8d7f88083c740eb09127e3d01f947e9ed0c5b6f1fba66b3',
						created: 1711663403,
						position: '0x7c245a2d29b88cb7c5fb118518fc7f03e85f2e99',
						previousOwner: '0x7497493f6259e2b34d2b8dabbfde5a85870c88fb',
						newOwner: '0x963ec454423cd543db08bc38fc7b3036b425b301',
					},
				],
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Invalid address error',
		schema: {
			type: 'object',
			properties: {
				error: { type: 'string', example: 'Address not valid' },
			},
		},
	})
	async getOwnerTransfers(@Param('address') owner: string): Promise<ApiOwnerTransfersListing | { error: string }> {
		if (!isAddress(owner)) {
			return { error: 'Address not valid' };
		}

		return await this.positionsService.getOwnerTransfers(owner);
	}
}
