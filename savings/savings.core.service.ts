import { gql } from '@apollo/client/core';
import { Injectable, Logger } from '@nestjs/common';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import { SavingsLeadrateService } from './savings.leadrate.service';
import { Address, formatUnits, zeroAddress } from 'viem';
import { ApiSavingsBalance, ApiSavingsInfo, ApiSavingsUserTable, SavingsBalanceQuery } from './savings.core.types';
import { PONDER_CLIENT } from 'api.config';

@Injectable()
export class SavingsCoreService {
	private readonly logger = new Logger(this.constructor.name);
	private fetchedZeroAddressTable: ApiSavingsUserTable;
	private fetchedTopBalanceTable: SavingsBalanceQuery[] = [];

	constructor(
		private readonly fc: EcosystemFrankencoinService,
		private readonly lead: SavingsLeadrateService
	) {}

	getInfo(): ApiSavingsInfo {
		const totalSavedRaw = this.fc.getEcosystemFrankencoinKeyValues()?.['Savings:TotalSaved']?.amount || 0n;
		const totalInterestRaw = this.fc.getEcosystemFrankencoinKeyValues()?.['Savings:TotalInterestCollected']?.amount || 0n;
		const totalWithdrawnRaw = this.fc.getEcosystemFrankencoinKeyValues()?.['Savings:TotalWithdrawn']?.amount || 0n;
		const rate = this.lead.getInfo().rate;

		const totalSaved: number = parseFloat(formatUnits(totalSavedRaw, 18));
		const totalInterest: number = parseFloat(formatUnits(totalInterestRaw, 18));
		const totalWithdrawn: number = parseFloat(formatUnits(totalWithdrawnRaw, 18));

		const totalSupply: number = this.fc.getEcosystemFrankencoinInfo()?.total?.supply || 1; // @dev: make available. Safer for division
		const ratioOfSupply: number = totalSaved / totalSupply;

		return {
			totalSaved,
			totalWithdrawn,
			totalBalance: totalSaved + totalInterest - totalWithdrawn,
			totalInterest,
			rate,
			ratioOfSupply,
		};
	}

	async getBalanceTable(limit: number = 20): Promise<ApiSavingsBalance> {
		return {
			ranked: this.fetchedTopBalanceTable.slice(0, limit),
		};
	}

	async updateBalanceTable() {
		const fetched = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsBalances(orderBy: "balance", orderDirection: "desc", where: { balance_not_in: "0" }, limit: 1000) {
						items {
							id
							created
							blockheight
							updated
							interest
							balance
						}
					}
				}
			`,
		});

		this.fetchedTopBalanceTable = fetched?.data?.savingsBalances?.items ?? [];
	}

	async getUserTable(userAddress: Address, limit: number = 8): Promise<ApiSavingsUserTable> {
		if (userAddress == zeroAddress) return this.fetchedZeroAddressTable;
		return this.fetchUserTable(userAddress, limit);
	}

	async updateZeroAddressTable(limit: number = 8) {
		this.logger.debug('Updating savings zeroAddress table');
		this.fetchedZeroAddressTable = await this.fetchUserTable(zeroAddress, limit);
	}

	async fetchUserTable(userAddress: Address, limit: number = 8): Promise<ApiSavingsUserTable> {
		const user: Address = userAddress == zeroAddress ? zeroAddress : (userAddress.toLowerCase() as Address);
		const savedFetched = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsSaveds(
						orderBy: "blockheight"
						orderDirection: "desc"
						${user == zeroAddress ? '' : `where: { account: "${user}" }`}
						limit: ${limit}
					) {
						items {
							id
							created
							blockheight
							txHash
							account
							amount
							rate
							total
							balance
						}
					}
				}
			`,
		});

		const withdrawnFetched = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsWithdrawns(
						orderBy: "blockheight"
						orderDirection: "desc"
						${user == zeroAddress ? '' : `where: { account: "${user}" }`}
						limit: ${limit}
					) {
						items {
							id
							created
							blockheight
							txHash
							account
							amount
							rate
							total
							balance
						}
					}
				}
			`,
		});

		const interestFetched = await PONDER_CLIENT.query({
			fetchPolicy: 'no-cache',
			query: gql`
				query {
					savingsInterests(
						orderBy: "blockheight"
						orderDirection: "desc"
						${user == zeroAddress ? '' : `where: { account: "${user}" }`}
						limit: ${limit}
					) {
						items {
							id
							created
							blockheight
							txHash
							account
							amount
							rate
							total
							balance
						}
					}
				}
			`,
		});

		return {
			save: savedFetched?.data?.savingsSaveds?.items ?? [],
			interest: interestFetched?.data?.savingsInterests?.items ?? [],
			withdraw: withdrawnFetched?.data?.savingsWithdrawns?.items ?? [],
		};
	}
}
