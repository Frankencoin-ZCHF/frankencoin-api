import { Address } from 'viem';
import { SubscriptionGroups } from './dtos/groups.dto';

// @dev: timestamps of last trigger emits
export type TelegramState = {
	minterApplied: number;
	minterVetoed: number;
	leadrateProposal: number;
	leadrateChanged: number;
	positions: number;
	positionsExpiringSoon7: number;
	positionsExpiringSoon3: number;
	positionsExpired: number;
	positionsPriceAlert: Map<Address, PositionPriceAlertState>;
	mintingUpdates: number;
	challenges: number;
	bids: number;
};

export type PositionPriceAlertState = {
	warningPrice: number; // e.g. below 110%
	warningTimestamp: number;
	alertPrice: number; // e.g. below 105%
	alertTimestamp: number;
	lowestPrice: number;
	lowestTimestamp: number;
};

export type TelegramGroupState = {
	apiVersion: string;
	createdAt: number;
	updatedAt: number;
	groups: string[];
	ignore: string[];
	subscription: {
		[key: string]: SubscriptionGroups;
	};
};
