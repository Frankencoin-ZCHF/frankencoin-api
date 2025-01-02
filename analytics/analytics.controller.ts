import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics Controller')
@Controller('analytics')
export class AnalyticsController {
	constructor(private readonly analytics: AnalyticsService) {}

	@Get('transactionLog/json')
	@ApiResponse({
		description: 'Returns a transaction log in JSON format, latest on tail of array idx: 0',
	})
	@ApiQuery({
		name: 'latest',
		required: false,
		type: String,
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
	getTransactionLogJson(@Query('latest') latest?: string, @Query('limit') limit?: number, @Query('after') after?: string) {
		return this.analytics.getTransactionLog(latest == 'true' ? true : false, limit ?? 50, after ?? '');
	}

	@Get('transactionLog/csv')
	@ApiResponse({
		description: 'Returns a transaction log in CSV format, latest on tail of array idx: 0',
	})
	@ApiQuery({
		name: 'latest',
		required: false,
		type: String,
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
	async getTransactionLogCsv(@Query('latest') latest?: string, @Query('limit') limit?: number, @Query('after') after?: string) {
		const data = await this.analytics.getTransactionLog(latest == 'true' ? true : false, limit ?? 50, after ?? '');
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
