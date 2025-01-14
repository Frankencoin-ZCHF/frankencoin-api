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
				formatUnits(e.totalSavings, 18),

				formatUnits(e.fpsTotalSupply, 18),
				formatUnits(e.fpsPrice, 18),

				formatUnits(e.totalMintedV1, 18),
				formatUnits(e.totalMintedV2, 18),

				formatUnits(e.currentLeadRate, 18),
				formatUnits(e.claimableInterests, 18),
				formatUnits(e.projectedInterests, 18),

				formatUnits(e.annualV1Interests, 18),
				formatUnits(e.annualV2Interests, 18),
				formatUnits(e.annualV1BorrowRate, 18),
				formatUnits(e.annualV2BorrowRate, 18),

				formatUnits(e.annualNetEarnings, 18),
				formatUnits(e.realizedNetEarnings, 18),
			];
			csv += toStrore.join(', ') + ' \n';
		}

		if (pageInfo == 'true') {
			csv += `${JSON.stringify(data.pageInfo)}`;
		}

		return csv;
	}

	@Get('dailyLog/json')
	@ApiResponse({
		description: 'Returns a daily log in JSON format, default: latest on tail of array idx: 0',
	})
	getDailyLogJson() {
		return this.analytics.getDailyLog();
	}

	@Get('dailyLog/csv1e18')
	@ApiResponse({
		description: 'Returns a daily log in CSV format, 1e18 adjusted values, default: latest on line: 1',
	})
	async getDailyLogCsv1e18() {
		const data = this.analytics.getDailyLog();
		const header = data.logs.length > 0 ? Object.keys(data.logs[0]).slice(0, -1).join(', ') + ' \n' : '';
		let csv: string = header ?? '';

		for (const e of data.logs) {
			const toStrore = [
				e.id,
				e.timestamp,

				formatUnits(e.totalInflow, 18),
				formatUnits(e.totalOutflow, 18),
				formatUnits(e.totalTradeFee, 18),

				formatUnits(e.totalSupply, 18),
				formatUnits(e.totalEquity, 18),
				formatUnits(e.totalSavings, 18),

				formatUnits(e.fpsTotalSupply, 18),
				formatUnits(e.fpsPrice, 18),

				formatUnits(e.totalMintedV1, 18),
				formatUnits(e.totalMintedV2, 18),

				formatUnits(e.currentLeadRate, 18),
				formatUnits(e.claimableInterests, 18),
				formatUnits(e.projectedInterests, 18),

				formatUnits(e.annualV1Interests, 18),
				formatUnits(e.annualV2Interests, 18),
				formatUnits(e.annualV1BorrowRate, 18),
				formatUnits(e.annualV2BorrowRate, 18),

				formatUnits(e.annualNetEarnings, 18),
				formatUnits(e.realizedNetEarnings, 18),
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
