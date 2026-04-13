import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import {
	ApiBidsBidders,
	ApiBidsChallenges,
	ApiBidsListing,
	ApiBidsMapping,
	ApiBidsPositions,
	ApiChallengesChallengers,
	ApiChallengesListing,
	ApiChallengesMapping,
	ApiChallengesPositions,
	ApiChallengesPrices,
} from './challenges.types';

@ApiTags('Challenges Controller')
@Controller('challenges')
export class ChallengesController {
	constructor(private readonly challengesService: ChallengesService) {}

	@Get('list')
	@ApiOperation({
		summary: 'Get all challenges',
		description:
			'Returns: ApiChallengesListing, a complete list of all collateral liquidation challenges in the Frankencoin ecosystem. ' +
			'Challenges occur when a position is undercollateralized and can be challenged by anyone. ' +
			'Includes challenge status, bidding information, size, liquidation price, and acquired collateral.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns an array of all challenges with their complete details',
		schema: {
			type: 'ApiChallengesListing',
			properties: {
				num: { type: 'number', description: 'Total number of challenges' },
				list: {
					type: 'array',
					description: 'Array of challenge objects',
					items: { type: 'ChallengesQueryItem' },
				},
			},
			example: {
				num: 2,
				list: [
					{
						position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
						number: '3',
						challenger: '0x963ec454423cd543db08bc38fc7b3036b425b301',
						start: '1763408135',
						created: '1763408135',
						duration: '86400',
						size: '20000000',
						liqPrice: '750000000000000000000000000000000',
						bids: '1',
						filledSize: '20000000',
						acquiredCollateral: '20000000',
						status: 'Success',
						__typename: 'MintingHubV2ChallengeV2',
						version: 2,
						id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
					},
				],
			},
		},
	})
	getChallenges(): ApiChallengesListing {
		return this.challengesService.getChallenges();
	}

	@Get('mapping')
	@ApiOperation({
		summary: 'Get all challenges as a mapping',
		description:
			'Returns: ApiChallengesMapping, all challenges organized as a key-value mapping where challenge IDs are keys. ' +
			'This format provides efficient lookup by challenge ID and includes an array of all challenge IDs for iteration.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of challenge IDs to their details',
		schema: {
			type: 'ApiChallengesMapping',
			properties: {
				num: { type: 'number', description: 'Total number of challenges' },
				challenges: {
					type: 'array',
					description: 'Array of challenge IDs',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of challenge ID to challenge object',
					additionalProperties: { type: 'ChallengesQueryItem' },
				},
			},
			example: {
				num: 13,
				challenges: ['0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3'],
				map: {
					'0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3': {
						position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
						number: '3',
						challenger: '0x963ec454423cd543db08bc38fc7b3036b425b301',
						start: '1763408135',
						created: '1763408135',
						duration: '86400',
						size: '20000000',
						liqPrice: '750000000000000000000000000000000',
						bids: '1',
						filledSize: '20000000',
						acquiredCollateral: '20000000',
						status: 'Success',
						__typename: 'MintingHubV2ChallengeV2',
						version: 2,
						id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
					},
				},
			},
		},
	})
	getChallengesMapping(): ApiChallengesMapping {
		return this.challengesService.getChallengesMapping();
	}

	@Get('challengers')
	@ApiOperation({
		summary: 'Get challenges grouped by challenger',
		description:
			'Returns: ApiChallengesChallengers, all challenges organized by challenger address. ' +
			'Each challenger address maps to an array of challenges they initiated, making it easy to view all challenges initiated by a specific address.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of challenger addresses to their challenge arrays',
		schema: {
			type: 'ApiChallengesChallengers',
			properties: {
				num: { type: 'number', description: 'Total number of unique challengers' },
				challengers: {
					type: 'array',
					description: 'Array of challenger addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of challenger address to array of their challenges',
					additionalProperties: {
						type: 'array',
						items: { type: 'ChallengesQueryItem' },
					},
				},
			},
			example: {
				num: 1,
				challengers: ['0x963eC454423CD543dB08bc38fC7B3036B425b301'],
				map: {
					'0x963eC454423CD543dB08bc38fC7B3036B425b301': [
						{
							version: 1,
							id: '0x39d618052651f897367c7816b60636f8fb37bedb-challenge-6',
							position: '0x39d618052651f897367c7816b60636f8fb37bedb',
							number: '6',
							challenger: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
							start: '1732014887',
							created: '1732014887',
							duration: '604800',
							size: '16394',
							liqPrice: '6000000000000000000000000000000000000',
							bids: '1',
							filledSize: '16394',
							acquiredCollateral: '16394',
							status: 'Success',
						},
					],
				},
			},
		},
	})
	getChallengesChallengers(): ApiChallengesChallengers {
		return this.challengesService.getChallengersMapping();
	}

	@Get('positions')
	@ApiOperation({
		summary: 'Get challenges grouped by position',
		description:
			'Returns: ApiChallengesPositions, all challenges organized by position address. ' +
			'Each position address maps to an array of challenges against that position, useful for viewing liquidation history of specific positions.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of position addresses to their challenge arrays',
		schema: {
			type: 'ApiChallengesPositions',
			properties: {
				num: { type: 'number', description: 'Total number of positions with challenges' },
				positions: {
					type: 'array',
					description: 'Array of position addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of position address to array of challenges',
					additionalProperties: {
						type: 'array',
						items: { type: 'ChallengesQueryItem' },
					},
				},
			},
			example: {
				num: 1,
				positions: ['0x39d618052651f897367c7816b60636f8fb37bedb'],
				map: {
					'0x39d618052651f897367c7816b60636f8fb37bedb': [
						{
							version: 1,
							id: '0x39d618052651f897367c7816b60636f8fb37bedb-challenge-6',
							position: '0x39d618052651f897367c7816b60636f8fb37bedb',
							number: '6',
							challenger: '0x963eC454423CD543dB08bc38fC7B3036B425b301',
							start: '1732014887',
							created: '1732014887',
							duration: '604800',
							size: '16394',
							liqPrice: '6000000000000000000000000000000000000',
							bids: '1',
							filledSize: '16394',
							acquiredCollateral: '16394',
							status: 'Success',
						},
					],
				},
			},
		},
	})
	getChallengesPositions(): ApiChallengesPositions {
		return this.challengesService.getChallengesPositions();
	}

	@Get('prices')
	@ApiOperation({
		summary: 'Get active auction prices for challenges',
		description:
			'Returns: ApiChallengesPrices, current auction prices for all active challenges. ' +
			'Maps challenge IDs to their current auction price. Auction prices decrease over time during the challenge period. ' +
			'Only includes active challenges',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of challenge IDs to their current auction prices',
		schema: {
			type: 'ApiChallengesPrices',
			properties: {
				num: { type: 'number', description: 'Total number of active challenges' },
				ids: {
					type: 'array',
					description: 'Array of challenge IDs',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of challenge ID to current auction price',
					additionalProperties: { type: 'string' },
				},
			},
			example: {
				num: 1,
				ids: ['0x39d618052651f897367c7816b60636f8fb37bedb-challenge-7'],
				map: {
					'0x39d618052651f897367c7816b60636f8fb37bedb-challenge-7': '5800000000000000000000000000000000000',
				},
			},
		},
	})
	getAuctionActivePrices(): ApiChallengesPrices {
		return this.challengesService.getChallengesPrices();
	}

	@Get('bids/list')
	@ApiOperation({
		summary: 'Get all challenge bids',
		description:
			'Returns: ApiBidsListing, a complete list of all bids placed on challenges in the Frankencoin ecosystem. ' +
			'Bids are offers to buy collateral from challenged positions. ' +
			'Includes bid type (Averted or Succeeded), amount, price, and collateral acquired.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns an array of all bids with their complete details',
		schema: {
			type: 'ApiBidsListing',
			properties: {
				num: { type: 'number', description: 'Total number of bids' },
				list: {
					type: 'array',
					description: 'Array of bid objects',
					items: { type: 'BidsQueryItem' },
				},
			},
			example: {
				num: 1,
				list: [
					{
						version: 2,
						id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
						position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
						number: '3',
						numberBid: '0',
						bidder: '0x43debe92a7a32dca999593fad617dbd2e6b080a5',
						created: '1763496875',
						bidType: 'Succeeded',
						bid: '14593749999999999999999',
						price: '729687499999999898137251503144960',
						filledSize: '20000000',
						acquiredCollateral: '20000000',
						challengeSize: '20000000',
					},
				],
			},
		},
	})
	getChallengesBids(): ApiBidsListing {
		return this.challengesService.getBids();
	}

	@Get('bids/mapping')
	@ApiOperation({
		summary: 'Get all bids as a mapping',
		description:
			'Returns: ApiBidsMapping, all bids organized as a key-value mapping where bid IDs are keys. ' +
			'This format provides efficient lookup by bid ID and includes an array of all bid IDs for iteration.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of bid IDs to their details',
		schema: {
			type: 'ApiBidsMapping',
			properties: {
				num: { type: 'number', description: 'Total number of bids' },
				bidIds: {
					type: 'array',
					description: 'Array of bid IDs',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of bid ID to bid object',
					additionalProperties: { type: 'BidsQueryItem' },
				},
			},
			example: {
				num: 1,
				bidIds: ['0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3'],
				map: {
					'0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3': {
						version: 2,
						id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
						position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
						number: '3',
						numberBid: '0',
						bidder: '0x43debe92a7a32dca999593fad617dbd2e6b080a5',
						created: '1763496875',
						bidType: 'Succeeded',
						bid: '14593749999999999999999',
						price: '729687499999999898137251503144960',
						filledSize: '20000000',
						acquiredCollateral: '20000000',
						challengeSize: '20000000',
					},
				},
			},
		},
	})
	getChallengesBidsMapping(): ApiBidsMapping {
		return this.challengesService.getBidsMapping();
	}

	@Get('bids/bidders')
	@ApiOperation({
		summary: 'Get bids grouped by bidder',
		description:
			'Returns: ApiBidsBidders, all bids organized by bidder address. ' +
			'Each bidder address maps to an array of bids they placed, making it easy to view all bidding activity by a specific address.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of bidder addresses to their bid arrays',
		schema: {
			type: 'ApiBidsBidders',
			properties: {
				num: { type: 'number', description: 'Total number of unique bidders' },
				bidders: {
					type: 'array',
					description: 'Array of bidder addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of bidder address to array of their bids',
					additionalProperties: {
						type: 'array',
						items: { type: 'BidsQueryItem' },
					},
				},
			},
			example: {
				num: 1,
				bidders: ['0x43debe92a7a32dca999593fad617dbd2e6b080a5'],
				map: {
					'0x43debe92a7a32dca999593fad617dbd2e6b080a5': [
						{
							version: 2,
							id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
							position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
							number: '3',
							numberBid: '0',
							bidder: '0x43debe92a7a32dca999593fad617dbd2e6b080a5',
							created: '1763496875',
							bidType: 'Succeeded',
							bid: '14593749999999999999999',
							price: '729687499999999898137251503144960',
							filledSize: '20000000',
							acquiredCollateral: '20000000',
							challengeSize: '20000000',
						},
					],
				},
			},
		},
	})
	getChallengesBidsBidders(): ApiBidsBidders {
		return this.challengesService.getBidsBiddersMapping();
	}

	@Get('bids/challenges')
	@ApiOperation({
		summary: 'Get bids grouped by challenge',
		description:
			'Returns: ApiBidsChallenges, all bids organized by challenge ID. ' +
			'Each challenge ID maps to an array of bids placed on that challenge, useful for viewing bidding history of specific challenges.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of challenge IDs to their bid arrays',
		schema: {
			type: 'ApiBidsChallenges',
			properties: {
				num: { type: 'number', description: 'Total number of challenges with bids' },
				challenges: {
					type: 'array',
					description: 'Array of challenge IDs',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of challenge ID to array of bids',
					additionalProperties: {
						type: 'array',
						items: { type: 'BidsQueryItem' },
					},
				},
			},
			example: {
				num: 1,
				challenges: ['0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3'],
				map: {
					'0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3': [
						{
							version: 2,
							id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
							position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
							number: '3',
							numberBid: '0',
							bidder: '0x43debe92a7a32dca999593fad617dbd2e6b080a5',
							created: '1763496875',
							bidType: 'Succeeded',
							bid: '14593749999999999999999',
							price: '729687499999999898137251503144960',
							filledSize: '20000000',
							acquiredCollateral: '20000000',
							challengeSize: '20000000',
						},
					],
				},
			},
		},
	})
	getChallengesBidsChallenges(): ApiBidsChallenges {
		return this.challengesService.getBidsChallengesMapping();
	}

	@Get('bids/positions')
	@ApiOperation({
		summary: 'Get bids grouped by position',
		description:
			'Returns: ApiBidsPositions, all bids organized by position address. ' +
			'Each position address maps to an array of bids placed on challenges for that position, useful for viewing liquidation bid history of specific positions.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns a mapping of position addresses to their bid arrays',
		schema: {
			type: 'ApiBidsPositions',
			properties: {
				num: { type: 'number', description: 'Total number of positions with bids' },
				positions: {
					type: 'array',
					description: 'Array of position addresses',
					items: { type: 'string' },
				},
				map: {
					type: 'object',
					description: 'Mapping of position address to array of bids',
					additionalProperties: {
						type: 'array',
						items: { type: 'BidsQueryItem' },
					},
				},
			},
			example: {
				num: 1,
				positions: ['0x0a41375abf839a1bcc793a0928e1f491878fb600'],
				map: {
					'0x0a41375abf839a1bcc793a0928e1f491878fb600': [
						{
							version: 2,
							id: '0x0a41375abf839a1bcc793a0928e1f491878fb600-challenge-3',
							position: '0x0a41375abf839a1bcc793a0928e1f491878fb600',
							number: '3',
							numberBid: '0',
							bidder: '0x43debe92a7a32dca999593fad617dbd2e6b080a5',
							created: '1763496875',
							bidType: 'Succeeded',
							bid: '14593749999999999999999',
							price: '729687499999999898137251503144960',
							filledSize: '20000000',
							acquiredCollateral: '20000000',
							challengeSize: '20000000',
						},
					],
				},
			},
		},
	})
	getChallengesBidsPositions(): ApiBidsPositions {
		return this.challengesService.getBidsPositionsMapping();
	}
}
