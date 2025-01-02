import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { formatUnits } from 'viem';

@ApiTags('Analytics Controller')
@Controller('analytics')
export class AnalyticsController {
	constructor(private readonly analytics: AnalyticsService) {}

	@Get('profitLossLog')
	@ApiResponse({
		description: 'Returns earnings from the FPS token',
	})
	getProfitLossLog() {
		return this.analytics.getProfitLossLog();
	}

	@Get('transactionLog/json')
	@ApiResponse({
		description: 'Returns a transaction log in JSON format, default: latest on tail of array idx: 0',
	})
	@ApiQuery({
		name: 'firstItem',
		required: false,
		type: Boolean,
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
	})
	@ApiQuery({
		name: 'after',
		required: false,
		type: String,
	})
	getTransactionLogJson(@Query('firstItem') firstItem?: string, @Query('limit') limit?: number, @Query('after') after?: string) {
		return this.analytics.getTransactionLog(firstItem == 'true' ? false : true, limit ?? 50, after ?? '');
	}

	@Get('transactionLog/csv')
	@ApiResponse({
		description: 'Returns a transaction log in CSV format, default: latest on line: 1',
	})
	@ApiQuery({
		name: 'pageInfo',
		required: false,
		type: Boolean,
	})
	@ApiQuery({
		name: 'firstItem',
		required: false,
		type: Boolean,
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
	})
	@ApiQuery({
		name: 'after',
		required: false,
		type: String,
	})
	async getTransactionLogCsv(
		@Query('pageInfo') pageInfo?: string,
		@Query('firstItem') firstItem?: string,
		@Query('limit') limit?: number,
		@Query('after') after?: string
	) {
		const data = await this.analytics.getTransactionLog(firstItem == 'true' ? false : true, limit ?? 50, after ?? '');
		const header = data.logs.length > 0 ? Object.keys(data.logs[0]).slice(1, -1).join(', ') + ' \n' : '';
		let csv: string = header ?? '';

		for (const e of data.logs) {
			const toStrore = [
				e.timestamp,
				e.kind,
				e.amount,

				e.totalInflow,
				e.totalOutflow,
				e.totalTradeFee,

				e.totalSupply,
				e.totalEquity,
				e.equityToSupplyRatio,
				e.totalSavings,
				e.savingsToSupplyRatio,

				e.fpsTotalSupply,
				e.fpsPrice,

				e.totalMintedV1,
				e.totalMintedV2,
				e.mintedV1ToSupplyRatio,
				e.mintedV2ToSupplyRatio,

				e.currentLeadRate,
				e.claimableInterests,
				e.projectedInterests,
				e.impliedV1Interests,
				e.impliedV2Interests,

				e.impliedV1AvgBorrowRate,
				e.impliedV2AvgBorrowRate,

				e.netImpliedEarnings,
				e.netImpliedEarningsToSupplyRatio,
				e.netImpliedEarningsToEquityRatio,
				e.netImpliedEarningsPerToken,
				e.netImpliedEarningsPerTokenYield,

				e.netRealized365Earnings,
				e.netRealized365EarningsToSupplyRatio,
				e.netRealized365EarningsToEquityRatio,
				e.netRealized365EarningsPerToken,
				e.netRealized365EarningsPerTokenYield,
			];
			csv += toStrore.join(', ') + ' \n';
		}

		if (pageInfo == 'true') {
			csv += `${JSON.stringify(data.pageInfo)}`;
		}

		return csv;
	}

	@Get('transactionLog/csv1e18')
	@ApiResponse({
		description: 'Returns a transaction log in CSV format, 1e18 adjusted values, default: latest on line: 1',
	})
	@ApiQuery({
		name: 'pageInfo',
		required: false,
		type: Boolean,
	})
	@ApiQuery({
		name: 'firstItem',
		required: false,
		type: Boolean,
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
	})
	@ApiQuery({
		name: 'after',
		required: false,
		type: String,
	})
	async getTransactionLogCsv1e18(
		@Query('pageInfo') pageInfo?: string,
		@Query('firstItem') firstItem?: string,
		@Query('limit') limit?: number,
		@Query('after') after?: string
	) {
		const data = await this.analytics.getTransactionLog(firstItem == 'true' ? false : true, limit ?? 50, after ?? '');
		const header = data.logs.length > 0 ? Object.keys(data.logs[0]).slice(1, -1).join(', ') + ' \n' : '';
		let csv: string = header ?? '';

		for (const e of data.logs) {
			const toStrore = [
				e.timestamp,
				e.kind,
				formatUnits(e.amount, 18),

				formatUnits(e.totalInflow, 18),
				formatUnits(e.totalOutflow, 18),
				formatUnits(e.totalTradeFee, 18),

				formatUnits(e.totalSupply, 18),
				formatUnits(e.totalEquity, 18),
				formatUnits(e.equityToSupplyRatio, 18),
				formatUnits(e.totalSavings, 18),
				formatUnits(e.savingsToSupplyRatio, 18),

				formatUnits(e.fpsTotalSupply, 18),
				formatUnits(e.fpsPrice, 18),

				formatUnits(e.totalMintedV1, 18),
				formatUnits(e.totalMintedV2, 18),
				formatUnits(e.mintedV1ToSupplyRatio, 18),
				formatUnits(e.mintedV2ToSupplyRatio, 18),

				formatUnits(e.currentLeadRate, 18),
				formatUnits(e.claimableInterests, 18),
				formatUnits(e.projectedInterests, 18),
				formatUnits(e.impliedV1Interests, 18),
				formatUnits(e.impliedV2Interests, 18),

				formatUnits(e.impliedV1AvgBorrowRate, 18),
				formatUnits(e.impliedV2AvgBorrowRate, 18),

				formatUnits(e.netImpliedEarnings, 18),
				formatUnits(e.netImpliedEarningsToSupplyRatio, 18),
				formatUnits(e.netImpliedEarningsToEquityRatio, 18),
				formatUnits(e.netImpliedEarningsPerToken, 18),
				formatUnits(e.netImpliedEarningsPerTokenYield, 18),

				formatUnits(e.netRealized365Earnings, 18),
				formatUnits(e.netRealized365EarningsToSupplyRatio, 18),
				formatUnits(e.netRealized365EarningsToEquityRatio, 18),
				formatUnits(e.netRealized365EarningsPerToken, 18),
				formatUnits(e.netRealized365EarningsPerTokenYield, 18),
			];
			csv += toStrore.join(', ') + ' \n';
		}

		if (pageInfo == 'true') {
			csv += `${JSON.stringify(data.pageInfo)}`;
		}

		return csv;
	}

	@Get('fps/exposure')
	@ApiResponse({
		description: 'Returns info about the exposures within the FPS token',
	})
	getExposure() {
		return this.analytics.getCollateralExposure();
	}

	@Get('fps/earnings')
	@ApiResponse({
		description: 'Returns earnings from the FPS token',
	})
	getEarnings() {
		return this.analytics.getFpsEarnings();
	}
}
