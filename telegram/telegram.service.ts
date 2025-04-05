import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { PositionsService } from 'positions/positions.service';
import { TelegramGroupState, TelegramState } from './telegram.types';
import { EcosystemMinterService } from 'ecosystem/ecosystem.minter.service';
import { MinterProposalMessage } from './messages/MinterProposal.message';
import { PositionProposalMessage } from './messages/PositionProposal.message';
import { Storj } from 'storj/storj.s3.service';
import { Groups, SubscriptionGroups } from './dtos/groups.dto';
import { WelcomeGroupMessage } from './messages/WelcomeGroup.message';
import { ChallengesService } from 'challenges/challenges.service';
import { ChallengeStartedMessage } from './messages/ChallengeStarted.message';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PricesService } from 'prices/prices.service';
import { MintingUpdateMessage } from './messages/MintingUpdate.message';
import { HelpMessage } from './messages/Help.message';
import { MinterProposalVetoedMessage } from './messages/MinterProposalVetoed.message';
import { SavingsLeadrateService } from 'savings/savings.leadrate.service';
import { LeadrateProposalMessage } from './messages/LeadrateProposal.message';
import { LeadrateChangedMessage } from './messages/LeadrateChanged.message';
import { BidTakenMessage } from './messages/BidTaken.message';
import { PositionExpiringSoonMessage } from './messages/PositionExpiringSoon.message';
import { PositionExpiredMessage } from './messages/PositionExpired.message';
import { Address, formatUnits } from 'viem';
import { PriceQuery } from 'prices/prices.types';
import { PositionPriceAlert, PositionPriceLowest, PositionPriceWarning } from './messages/PositionPrice.message';

@Injectable()
export class TelegramService {
	private readonly startUpTime = Date.now();
	private readonly logger = new Logger(this.constructor.name);
	private readonly bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
	private readonly storjPath: string = '/telegram.groups.json';
	private telegramHandles: string[] = ['/MintingUpdates', '/help'];
	private telegramState: TelegramState;
	private telegramGroupState: TelegramGroupState;

	constructor(
		private readonly storj: Storj,
		private readonly minter: EcosystemMinterService,
		private readonly leadrate: SavingsLeadrateService,
		private readonly position: PositionsService,
		private readonly prices: PricesService,
		private readonly challenge: ChallengesService
	) {
		const time: number = Date.now();
		this.telegramState = {
			minterApplied: time,
			minterVetoed: time,
			leadrateProposal: time,
			leadrateChanged: time,
			positions: time,
			positionsExpiringSoon7: time,
			positionsExpiringSoon3: time,
			positionsExpired: time,
			positionsPriceAlert: new Map(),
			mintingUpdates: time,
			challenges: time,
			bids: time,
		};

		this.telegramGroupState = {
			apiVersion: process.env.npm_package_version,
			createdAt: time,
			updatedAt: time,
			groups: [],
			ignore: [],
			subscription: {},
		};

		this.readBackupGroups();
	}

	async readBackupGroups() {
		this.logger.log(`Reading backup groups from storj`);
		const response = await this.storj.read(this.storjPath, Groups);

		if (response.messageError || response.validationError.length > 0) {
			this.logger.error(response.messageError);
			this.logger.log(`Telegram group state created...`);
		} else {
			this.telegramGroupState = { ...this.telegramGroupState, ...response.data };
			this.logger.log(`Telegram group state restored...`);
		}

		await this.applyListener();
	}

	async writeBackupGroups() {
		this.telegramGroupState.apiVersion = process.env.npm_package_version;
		this.telegramGroupState.updatedAt = Date.now();
		const response = await this.storj.write(this.storjPath, this.telegramGroupState);
		const httpStatusCode = response['$metadata'].httpStatusCode;
		if (httpStatusCode == 200) {
			this.logger.log(`Telegram group backup stored`);
		} else {
			this.logger.error(`Telegram group backup failed. httpStatusCode: ${httpStatusCode}`);
		}
	}

	async sendMessageAll(message: string) {
		if (this.telegramGroupState.groups.length == 0) return;
		for (const group of this.telegramGroupState.groups) {
			await this.sendMessage(group, message);
		}
	}

	async sendMessageGroup(groups: string[], message: string) {
		if (groups.length == 0) return;
		for (const group of groups) {
			await this.sendMessage(group, message);
		}
	}

	async sendMessage(group: string | number, message: string) {
		try {
			this.logger.log(`Sending message to group id: ${group}`);
			await this.bot.sendMessage(group.toString(), message, { parse_mode: 'Markdown', disable_web_page_preview: true });
		} catch (error) {
			const msg = {
				notFound: 'chat not found',
				deleted: 'the group chat was deleted',
				blocked: 'bot was blocked by the user',
			};

			if (typeof error === 'object') {
				if (error?.message.includes(msg.deleted)) {
					this.logger.warn(msg.deleted + `: ${group}`);
					this.removeTelegramGroup(group);
				} else if (error?.message.includes(msg.notFound)) {
					this.logger.warn(msg.notFound + `: ${group}`);
					this.removeTelegramGroup(group);
				} else if (error?.message.includes(msg.blocked)) {
					this.logger.warn(msg.blocked + `: ${group}`);
					this.removeTelegramGroup(group);
				} else {
					this.logger.warn(error?.message);
				}
			} else {
				this.logger.warn(error);
			}
		}
	}

	async updateTelegram() {
		// give indexer and start up some time before starting with msg, alert, ...
		if (Date.now() < this.startUpTime + 10 * 60 * 1000) return; // 10min

		this.logger.debug('Updating Telegram');

		// break if no groups are known
		if (this.telegramGroupState?.groups == undefined) return;
		if (this.telegramGroupState.groups.length == 0) return;

		// DEFAULT
		// Minter Proposal
		const mintersList = this.minter.getMintersList().list.filter((m) => m.applyDate * 1000 > this.telegramState.minterApplied);
		if (mintersList.length > 0) {
			this.telegramState.minterApplied = Date.now(); // do first, allows new income to handle next loop
			for (const minter of mintersList) {
				this.sendMessageAll(MinterProposalMessage(minter));
			}
		}

		// Minter Proposal Vetoed
		const mintersVetoed = this.minter
			.getMintersList()
			.list.filter((m) => m.denyDate > 0 && m.denyDate * 1000 > this.telegramState.minterVetoed);
		if (mintersVetoed.length > 0) {
			this.telegramState.minterVetoed = Date.now();
			for (const minter of mintersVetoed) {
				this.sendMessageAll(MinterProposalVetoedMessage(minter));
			}
		}

		// Leadrate Proposal
		const leadrateProposal = this.leadrate.getProposals().list.filter((p) => p.created * 1000 > this.telegramState.leadrateProposal);
		const leadrateRates = this.leadrate.getRates();
		if (leadrateProposal.length > 0) {
			this.telegramState.leadrateProposal = Date.now();
			this.sendMessageAll(LeadrateProposalMessage(leadrateProposal[0], leadrateRates));
		}

		// Leadrate Changed
		if (leadrateRates.created * 1000 > this.telegramState.leadrateChanged) {
			this.telegramState.leadrateChanged = Date.now();
			this.sendMessageAll(LeadrateChangedMessage(leadrateRates.list[0]));
		}

		// Positions requested
		const requestedPosition = Object.values(this.position.getPositionsRequests().map).filter(
			(r) => r.start * 1000 > Date.now() && r.created * 1000 > this.telegramState.positions
		);
		if (requestedPosition.length > 0) {
			this.telegramState.positions = Date.now();
			for (const p of requestedPosition) {
				this.sendMessageAll(PositionProposalMessage(p));
			}
		}

		// Positions expiring soon (7 days)
		const expiringSoonPosition7 = Object.values(this.position.getPositionsOpen().map).filter((p) => {
			const stateDate = new Date(this.telegramState.positionsExpiringSoon7).getTime();
			const warningDays = 7 * 24 * 60 * 60 * 1000;
			const isSoon = p.expiration * 1000 < Date.now() + warningDays;
			const isNew = isSoon && stateDate + warningDays < p.expiration * 1000;
			return isSoon && isNew;
		});
		if (expiringSoonPosition7.length > 0) {
			this.telegramState.positionsExpiringSoon7 = Date.now();
			for (const p of expiringSoonPosition7) {
				this.sendMessageAll(PositionExpiringSoonMessage(p));
			}
		}

		// Positions expiring soon (3 days)
		const expiringSoonPosition3 = Object.values(this.position.getPositionsOpen().map).filter((p) => {
			const stateDate = new Date(this.telegramState.positionsExpiringSoon3).getTime();
			const warningDays = 3 * 24 * 60 * 60 * 1000;
			const isSoon = p.expiration * 1000 < Date.now() + warningDays;
			const isNew = isSoon && stateDate + warningDays < p.expiration * 1000;
			return isSoon && isNew;
		});
		if (expiringSoonPosition3.length > 0) {
			this.telegramState.positionsExpiringSoon3 = Date.now();
			for (const p of expiringSoonPosition3) {
				this.sendMessageAll(PositionExpiringSoonMessage(p));
			}
		}

		// Positions expired
		const expiredPosition = Object.values(this.position.getPositionsOpen().map).filter((p) => {
			const stateDate = new Date(this.telegramState.positionsExpired).getTime();
			const isExpired = p.expiration * 1000 < Date.now();
			const isNew = isExpired && stateDate < p.expiration * 1000;
			return isExpired && isNew;
		});
		if (expiredPosition.length > 0) {
			this.telegramState.positionsExpired = Date.now();
			for (const p of expiredPosition) {
				this.sendMessageAll(PositionExpiredMessage(p));
			}
		} else {
			// @dev: fixes issue if ponder indexes and stateDate didnt change,
			// it might happen that an old state will trigger this due to re-indexing

			// reset to last 1h
			if (Date.now() - this.telegramState.positionsExpired > 60 * 60 * 1000) {
				this.telegramState.positionsExpired = Date.now() - 5 * 60 * 1000; // reduce 5min to allow latest expiration
			}
		}

		// Position Price Warning
		Object.values(this.position.getPositionsOpen().map).map((p) => {
			const posPrice = parseFloat(formatUnits(BigInt(p.price), 36 - p.collateralDecimals));
			const THRES_LOWEST = 1; // 100%
			const THRES_ALERT = 1.05; // 105%
			const THRES_WARN = 1.1; // 110%
			const DELAY_LOWEST = 10 * 60 * 1000; // 10min guard
			const DELAY_ALERT = 6 * 60 * 60 * 1000; // 6h guard
			const DELAY_WARNING = 12 * 60 * 60 * 1000; // 12h guard

			// price query
			const priceQuery: PriceQuery | undefined = this.prices.getPricesMapping()[p.collateral.toLowerCase()];
			if (priceQuery == undefined || priceQuery?.timestamp == 0) return false; // not found or still searching

			// price check
			const price = priceQuery.price.chf;
			if (posPrice * THRES_WARN < price) return false; // below threshold

			// get latest or make available
			let last = this.telegramState.positionsPriceAlert.get(p.position.toLowerCase() as Address);
			if (last == undefined) {
				last = {
					warningPrice: 0,
					warningTimestamp: 0,
					alertPrice: 0,
					alertTimestamp: 0,
					lowestPrice: 0,
					lowestTimestamp: 0,
				};
			}

			if (price < posPrice * THRES_LOWEST) {
				// below 100%
				if (last.lowestTimestamp + DELAY_LOWEST < Date.now()) {
					// delay guard passed
					if (last.lowestPrice == 0 || last.lowestPrice > price) {
						this.sendMessageAll(PositionPriceLowest(p, priceQuery, last));
						last.lowestPrice = price;
					}
					last.lowestTimestamp = Date.now();
				}
			} else if (price < posPrice * THRES_ALERT) {
				// below 105%
				if (last.alertTimestamp + DELAY_ALERT < Date.now()) {
					// delay guard passed
					this.sendMessageAll(PositionPriceAlert(p, priceQuery, last));
					last.alertTimestamp = Date.now();
					last.alertPrice = price;
				}
			} else if (price < posPrice * THRES_WARN) {
				// if below 110 -> warning
				if (last.alertTimestamp + DELAY_WARNING < Date.now()) {
					if (last.warningTimestamp + DELAY_WARNING < Date.now()) {
						// delay guard passed
						this.sendMessageAll(PositionPriceWarning(p, priceQuery, last));
						last.warningTimestamp = Date.now();
						last.warningPrice = price;
					}
				}
			}

			// reset lowest price
			if (price > posPrice * THRES_ALERT && last.lowestTimestamp > 0) {
				last.lowestTimestamp = 0;
				last.lowestPrice = 0;
			}

			// update state
			this.telegramState.positionsPriceAlert.set(p.position.toLowerCase() as Address, last);
		});

		// Challenges started
		const challengesStarted = Object.values(this.challenge.getChallengesMapping().map).filter(
			(c) => parseInt(c.created.toString()) * 1000 > this.telegramState.challenges
		);
		if (challengesStarted.length > 0) {
			this.telegramState.challenges = Date.now();
			for (const c of challengesStarted) {
				const pos = this.position.getPositionsList().list.find((p) => p.position == c.position);
				if (pos == undefined) return;
				this.sendMessageAll(ChallengeStartedMessage(pos, c));
			}
		}

		// Bids taken
		const bidsTaken = Object.values(this.challenge.getBidsMapping().map).filter(
			(b) => parseInt(b.created.toString()) * 1000 > this.telegramState.bids
		);
		if (bidsTaken.length > 0) {
			this.telegramState.bids = Date.now();
			for (const b of bidsTaken) {
				const position = this.position.getPositionsList().list.find((p) => p.position.toLowerCase() == b.position.toLowerCase());
				const challenge = this.challenge
					.getChallenges()
					.list.find((c) => c.id == `${b.position.toLowerCase()}-challenge-${b.number}`);
				if (position == undefined || challenge == undefined) return;
				this.sendMessageAll(BidTakenMessage(position, challenge, b));
			}
		}

		// SUPSCRIPTION
		// MintingUpdates
		const requestedMintingUpdates = this.position
			.getMintingUpdatesList()
			.list.filter((m) => m.created * 1000 > this.telegramState.mintingUpdates && BigInt(m.mintedAdjusted) > 0n);
		if (requestedMintingUpdates.length > 0) {
			this.telegramState.mintingUpdates = Date.now();
			for (const m of requestedMintingUpdates) {
				const groups = this.telegramGroupState.subscription['/MintingUpdates']?.groups || [];
				const prices = this.prices.getPricesMapping();
				this.sendMessageGroup(groups, MintingUpdateMessage(m, prices));
			}
		}
	}

	upsertTelegramGroup(id: number | string): boolean {
		if (!id) return;
		if (this.telegramGroupState.ignore.includes(id.toString())) return false;
		if (this.telegramGroupState.groups.includes(id.toString())) return false;
		this.telegramGroupState.groups.push(id.toString());
		this.logger.log(`Upserted Telegram Group: ${id}`);
		this.sendMessage(id, WelcomeGroupMessage(id, this.telegramHandles));
		return true;
	}

	async removeTelegramGroup(id: number | string): Promise<boolean> {
		if (!id) return;
		const inGroup: boolean = this.telegramGroupState.groups.includes(id.toString());
		const inSubscription = Object.values(this.telegramGroupState.subscription)
			.map((s) => s.groups)
			.flat(1)
			.includes(id.toString());
		const update: boolean = inGroup || inSubscription;

		if (inGroup) {
			const newGroup: string[] = this.telegramGroupState.groups.filter((g) => g !== id.toString());
			this.telegramGroupState.groups = newGroup;
		}

		if (inSubscription) {
			const subs = this.telegramGroupState.subscription;
			for (const h of Object.keys(subs)) {
				subs[h].groups = subs[h].groups.filter((g) => g != id.toString());
			}
			this.telegramGroupState.subscription = subs;
		}

		if (update) {
			this.logger.log(`Removed Telegram Group: ${id}`);
			await this.writeBackupGroups();
		}

		return update;
	}

	async applyListener() {
		const toggle = (handle: string, msg: TelegramBot.Message) => {
			if (handle !== msg.text) return;
			const group = msg.chat.id.toString();
			const subs = this.telegramGroupState.subscription[handle];
			if (subs == undefined) this.telegramGroupState.subscription[handle] = new SubscriptionGroups();
			if (this.telegramGroupState.subscription[handle].groups.includes(group)) {
				const newSubs = this.telegramGroupState.subscription[handle].groups.filter((g) => g != group);
				this.telegramGroupState.subscription[handle].groups = newSubs;
				this.sendMessage(group, `Removed from subscription: \n${handle}`);
			} else {
				this.telegramGroupState.subscription[handle].groups.push(group);
				this.sendMessage(group, `Added to subscription: \n${handle}`);
			}
			this.writeBackupGroups();
		};

		this.bot.on('message', async (m) => {
			if (this.upsertTelegramGroup(m.chat.id) == true) await this.writeBackupGroups();
			if (m.text === '/help')
				this.sendMessage(m.chat.id, HelpMessage(m.chat.id.toString(), this.telegramHandles, this.telegramGroupState.subscription));
			else this.telegramHandles.forEach((h) => toggle(h, m));
		});
	}

	@Cron(CronExpression.EVERY_WEEK)
	async clearIgnoreTelegramGroup(): Promise<boolean> {
		this.telegramGroupState.ignore = [];
		await this.writeBackupGroups();
		this.logger.warn('Weekly job done, cleared ignore telegram group array');
		return true;
	}
}
