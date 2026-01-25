import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { formatUnits } from 'viem';

@ApiTags('Analytics Controller')
@Controller('analytics')
export class AnalyticsController {
	constructor(private readonly analytics: AnalyticsService) {}

	@Get('profitLossLog')
	@ApiOperation({
		summary: 'Get profit and loss log',
		description:
			'Returns: object with num and logs array, a complete log of all profit and loss events in the Frankencoin ecosystem. ' +
			'Tracks gains and losses from various sources including minting, burning, fees, and interest accrual. ' +
			'Limited to 1000 most recent events. Sidechain P/Ls have an asynchronous effect on the Frankencoin reserve',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns profit/loss events with cumulative totals',
		schema: {
			type: 'object',
			properties: {
				num: { type: 'number', description: 'Total number of profit/loss events' },
				logs: {
					type: 'array',
					description: 'Array of profit/loss event objects',
					items: {
						type: 'object',
						properties: {
							chainId: { type: 'number', description: 'Blockchain chain ID' },
							minter: { type: 'string', description: 'Minter contract address' },
							created: { type: 'string', description: 'Event timestamp' },
							count: { type: 'string', description: 'Sequential event counter' },
							kind: { type: 'string', description: 'Event type: Profit or Loss' },
							amount: { type: 'string', description: 'Amount gained or lost (in wei)' },
							profits: { type: 'string', description: 'Cumulative total profits (in wei)' },
							losses: { type: 'string', description: 'Cumulative total losses (in wei)' },
							perFPS: { type: 'string', description: 'Profit/loss per FPS token (in wei)' },
						},
					},
				},
			},
			example: {
				num: 1000,
				logs: [
					{
						chainId: 100,
						minter: '0xbf594d0fed79ae56d910cb01b5dd4f4c57b04402',
						created: '1769352300',
						count: '5372',
						kind: 'Loss',
						amount: '1440511571493302392',
						profits: '1136590707253052819761165',
						losses: '44486556006992373908072',
						perFPS: '0',
						__typename: 'FrankencoinProfitLoss',
					},
					{
						chainId: 1,
						minter: '0x7c047b3528e047dcbb5ca4bf38039c7470d504a1',
						created: '1768940567',
						count: '5247',
						kind: 'Profit',
						amount: '94485000000000000000',
						profits: '1136590707253052819761165',
						losses: '43610599958636739904845',
						perFPS: '10727015606043024',
						__typename: 'FrankencoinProfitLoss',
					},
				],
			},
		},
	})
	getProfitLossLog() {
		return this.analytics.getProfitLossLog();
	}

	@Get('transactionLog/json')
	@ApiOperation({
		summary: 'Get transaction log in JSON format',
		description:
			'Returns: object with num, logs array and pageInfo, a paginated log of all transactions affecting the Frankencoin ecosystem. ' +
			'Includes minting, burning, and other operations with complete financial metrics like total supply, equity, FPS price, and interest rates. ' +
			'Supports pagination with cursor-based navigation.',
	})
	@ApiQuery({
		name: 'firstItem',
		required: false,
		type: Boolean,
		description: 'If true, returns oldest items first. Default: false (newest first)',
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of items to return. Default: 50',
	})
	@ApiQuery({
		name: 'after',
		required: false,
		type: String,
		description: 'Cursor for pagination. Use endCursor from previous response',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns transaction log with pagination info',
		schema: {
			type: 'object',
			properties: {
				num: { type: 'number', description: 'Total number of transactions in this response' },
				logs: {
					type: 'array',
					description: 'Array of transaction log objects',
					items: {
						type: 'object',
						properties: {
							chainId: { type: 'number', description: 'Blockchain chain ID' },
							count: { type: 'string', description: 'Sequential transaction counter' },
							timestamp: { type: 'string', description: 'Unix timestamp' },
							kind: { type: 'string', description: 'Transaction type (e.g., Savings:Withdrawn, Frankencoin:Burn)' },
							amount: { type: 'string', description: 'Transaction amount (in wei)' },
							txHash: { type: 'string', description: 'Transaction hash' },
							totalInflow: { type: 'string', description: 'Cumulative total inflow fees (in wei)' },
							totalOutflow: { type: 'string', description: 'Cumulative total outflow fees (in wei)' },
							totalTradeFee: { type: 'string', description: 'Cumulative total trade fees (in wei)' },
							totalSupply: { type: 'string', description: 'Total ZCHF supply (in wei)' },
							totalEquity: { type: 'string', description: 'Total equity in reserve (in wei)' },
							totalSavings: { type: 'string', description: 'Total savings deposits (in wei)' },
							fpsTotalSupply: { type: 'string', description: 'Total FPS token supply (in wei)' },
							fpsPrice: { type: 'string', description: 'FPS token price (in wei)' },
							totalMintedV1: { type: 'string', description: 'Total minted from V1 positions (in wei)' },
							totalMintedV2: { type: 'string', description: 'Total minted from V2 positions (in wei)' },
							currentLeadRate: { type: 'string', description: 'Current lead interest rate (in wei)' },
							projectedInterests: { type: 'string', description: 'Projected interest payments (in wei)' },
							annualV1Interests: { type: 'string', description: 'Annual V1 interest payments (in wei)' },
							annualV2Interests: { type: 'string', description: 'Annual V2 interest payments (in wei)' },
							annualV1BorrowRate: { type: 'string', description: 'Annual V1 borrow rate (in wei)' },
							annualV2BorrowRate: { type: 'string', description: 'Annual V2 borrow rate (in wei)' },
							annualNetEarnings: { type: 'string', description: 'Projected annual net earnings (in wei)' },
							realizedNetEarnings: { type: 'string', description: 'Realized net earnings (in wei)' },
							earningsPerFPS: { type: 'string', description: 'Earnings per FPS token (in wei)' },
						},
					},
				},
				pageInfo: {
					type: 'object',
					description: 'Pagination information',
					properties: {
						startCursor: { type: 'string', description: 'Cursor to first item' },
						endCursor: { type: 'string', description: 'Cursor to last item' },
						hasNextPage: { type: 'boolean', description: 'Whether more items exist' },
					},
				},
			},
			example: {
				num: 1,
				logs: [
					{
						chainId: 1,
						count: '6788',
						timestamp: '1769349443',
						kind: 'Savings:Withdrawn',
						amount: '11114190782590627133232',
						txHash: '0x41660cd2d7c726fe5a76cc7586a0d77d7bc07bc1a80f863282f2c6b843db98d9',
						totalInflow: '1136590707253052819761165',
						totalOutflow: '44481533249377602588670',
						totalTradeFee: '59734354529232473307738',
						totalSupply: '20516447970535677996752270',
						totalEquity: '3568161467526286248560062',
						totalSavings: '8083179944697927545220667',
						fpsTotalSupply: '8762117095160688215312',
						fpsPrice: '1221677853231491140185',
						totalMintedV1: '4709999999899999999999999',
						totalMintedV2: '17020047769588271729033232',
						currentLeadRate: '40000000000000000',
						projectedInterests: '323327197787917101808826',
						annualV1Interests: '94199999997999999999999',
						annualV2Interests: '721303294900477701534774',
						annualV1BorrowRate: '19999999999999999',
						annualV2BorrowRate: '42379628110639938',
						annualNetEarnings: '492176097110560599725947',
						realizedNetEarnings: '490706084649344763179171',
						earningsPerFPS: '125651799497032985606',
						__typename: 'AnalyticTransactionLog',
					},
				],
				pageInfo: {
					startCursor:
						'eyJjb3VudCI6eyJfX3R5cGUiOiJiaWdpbnQiLCJ2YWx1ZSI6IjY3ODgifSwiY2hhaW5JZCI6MSwidGltZXN0YW1wIjp7Il9fdHlwZSI6ImJpZ2ludCIsInZhbHVlIjoiMTc2OTM0OTQ0MyJ9LCJraW5kIjoiU2F2aW5nczpXaXRoZHJhd24ifQ==',
					endCursor:
						'eyJjb3VudCI6eyJfX3R5cGUiOiJiaWdpbnQiLCJ2YWx1ZSI6IjY3ODgifSwiY2hhaW5JZCI6MSwidGltZXN0YW1wIjp7Il9fdHlwZSI6ImJpZ2ludCIsInZhbHVlIjoiMTc2OTM0OTQ0MyJ9LCJraW5kIjoiU2F2aW5nczpXaXRoZHJhd24ifQ==',
					hasNextPage: true,
					__typename: 'PageInfo',
				},
			},
		},
	})
	getTransactionLogJson(@Query('firstItem') firstItem?: string, @Query('limit') limit?: number, @Query('after') after?: string) {
		return this.analytics.getTransactionLog(firstItem == 'true' ? false : true, limit ?? 50, after ?? '');
	}

	@Get('transactionLog/csvE18')
	@ApiOperation({
		summary: 'Get transaction log in CSV format',
		description:
			'Returns: CSV string, the transaction log formatted as CSV with all values adjusted from wei to decimal (1e18). ' +
			'Includes headers and optionally appends pagination info at the end. Useful for importing into spreadsheets or data analysis tools.',
	})
	@ApiQuery({
		name: 'pageInfo',
		required: false,
		type: Boolean,
		description: 'If true, appends pagination info JSON at end of CSV. Default: false',
	})
	@ApiQuery({
		name: 'firstItem',
		required: false,
		type: Boolean,
		description: 'If true, returns oldest items first. Default: false (newest first)',
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of items to return. Default: 50',
	})
	@ApiQuery({
		name: 'after',
		required: false,
		type: String,
		description: 'Cursor for pagination',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns CSV formatted transaction log',
		schema: {
			type: 'string',
			example:
				'timestamp, kind, amount, totalInflow, totalOutflow, totalTradeFee, totalSupply, totalEquity, totalSavings, fpsTotalSupply, fpsPrice, totalMintedV1, totalMintedV2, currentLeadRate, projectedInterests, annualV1Interests, annualV2Interests, annualV1BorrowRate, annualV2BorrowRate, annualNetEarnings, realizedNetEarnings, earningsPerFPS \n' +
				'1769349443, Savings:Withdrawn, 11114.190782590627133232, 1136590.707253052819761165, 44481.533249377602588670, 59734.354529232473307738, 20516447.970535677996752270, 3568161.467526286248560062, 8083179.944697927545220667, 8762.117095160688215312, 1221.677853231491140185, 4709999.999899999999999999, 17020047.769588271729033232, 0.040000000000000000, 323327.197787917101808826, 94199.999997999999999999, 721303.294900477701534774, 0.019999999999999999, 0.042379628110639938, 492176.097110560599725947, 490706.084649344763179171, 125.651799497032985606',
		},
	})
	async getTransactionLogCsvE18(
		@Query('pageInfo') pageInfo?: string,
		@Query('firstItem') firstItem?: string,
		@Query('limit') limit?: number,
		@Query('after') after?: string
	) {
		const data = await this.analytics.getTransactionLog(firstItem == 'true' ? false : true, limit ?? 50, after ?? '');
		const headerKeys = Object.keys(data.logs[0]).filter((i) => i != 'count' && i != 'txHash');
		const header = data.logs.length > 0 ? headerKeys.slice(1, -1).join(', ') + ' \n' : '';
		let csv: string = header ?? '';

		for (const e of data.logs) {
			const toStore = [
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
				formatUnits(e.projectedInterests, 18),

				formatUnits(e.annualV1Interests, 18),
				formatUnits(e.annualV2Interests, 18),
				formatUnits(e.annualV1BorrowRate, 18),
				formatUnits(e.annualV2BorrowRate, 18),

				formatUnits(e.annualNetEarnings, 18),
				formatUnits(e.realizedNetEarnings, 18),
				formatUnits(e.earningsPerFPS, 18),
			];
			csv += toStore.join(', ') + ' \n';
		}

		if (pageInfo == 'true') {
			csv += `${JSON.stringify(data.pageInfo)}`;
		}

		return csv;
	}

	@Get('dailyLog/json')
	@ApiOperation({
		summary: 'Get daily aggregated log in JSON format',
		description:
			'Returns: object with num and logs array, a daily aggregated view of Frankencoin ecosystem metrics. ' +
			'Each entry represents one day with aggregated values for supply, equity, FPS price, minting totals, and interest rates. ' +
			'Useful for historical analysis and charting daily trends.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns daily aggregated metrics',
		schema: {
			type: 'object',
			properties: {
				num: { type: 'number', description: 'Total number of days' },
				logs: {
					type: 'array',
					description: 'Array of daily log objects',
					items: {
						type: 'object',
						properties: {
							date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
							timestamp: { type: 'string', description: 'Unix timestamp in milliseconds' },
							txHash: { type: 'string', description: 'Representative transaction hash for the day' },
							totalInflow: { type: 'string', description: 'Cumulative total inflow fees (in wei)' },
							totalOutflow: { type: 'string', description: 'Cumulative total outflow fees (in wei)' },
							totalTradeFee: { type: 'string', description: 'Cumulative total trade fees (in wei)' },
							totalSupply: { type: 'string', description: 'Total ZCHF supply (in wei)' },
							totalEquity: { type: 'string', description: 'Total equity in reserve (in wei)' },
							totalSavings: { type: 'string', description: 'Total savings deposits (in wei)' },
							fpsTotalSupply: { type: 'string', description: 'Total FPS token supply (in wei)' },
							fpsPrice: { type: 'string', description: 'FPS token price (in wei)' },
							totalMintedV1: { type: 'string', description: 'Total minted from V1 positions (in wei)' },
							totalMintedV2: { type: 'string', description: 'Total minted from V2 positions (in wei)' },
							currentLeadRate: { type: 'string', description: 'Current lead interest rate (in wei)' },
							projectedInterests: { type: 'string', description: 'Projected interest payments (in wei)' },
							annualV1Interests: { type: 'string', description: 'Annual V1 interest payments (in wei)' },
							annualV2Interests: { type: 'string', description: 'Annual V2 interest payments (in wei)' },
							annualV1BorrowRate: { type: 'string', description: 'Annual V1 borrow rate (in wei)' },
							annualV2BorrowRate: { type: 'string', description: 'Annual V2 borrow rate (in wei)' },
							annualNetEarnings: { type: 'string', description: 'Projected annual net earnings (in wei)' },
							realizedNetEarnings: { type: 'string', description: 'Realized net earnings (in wei)' },
							earningsPerFPS: { type: 'string', description: 'Earnings per FPS token (in wei)' },
						},
					},
				},
			},
			example: {
				num: 648,
				logs: [
					{
						date: '2026-01-25',
						timestamp: '1769299200000',
						txHash: '0x41660cd2d7c726fe5a76cc7586a0d77d7bc07bc1a80f863282f2c6b843db98d9',
						totalInflow: '1136590707253052819761165',
						totalOutflow: '44481533249377602588670',
						totalTradeFee: '59734354529232473307738',
						totalSupply: '20516447970535677996752270',
						totalEquity: '3568161467526286248560062',
						totalSavings: '8083179944697927545220667',
						fpsTotalSupply: '8762117095160688215312',
						fpsPrice: '1221677853231491140185',
						totalMintedV1: '4709999999899999999999999',
						totalMintedV2: '17020047769588271729033232',
						currentLeadRate: '40000000000000000',
						projectedInterests: '323327197787917101808826',
						annualV1Interests: '94199999997999999999999',
						annualV2Interests: '721303294900477701534774',
						annualV1BorrowRate: '19999999999999999',
						annualV2BorrowRate: '42379628110639938',
						annualNetEarnings: '492176097110560599725947',
						realizedNetEarnings: '490706084649344763179171',
						earningsPerFPS: '125651799497032985606',
						__typename: 'AnalyticDailyLog',
					},
				],
			},
		},
	})
	getDailyLogJson() {
		return this.analytics.getDailyLog();
	}

	@Get('dailyLog/csvE18')
	@ApiOperation({
		summary: 'Get daily log in CSV format',
		description:
			'Returns: CSV string, the daily aggregated log formatted as CSV with all values adjusted from wei to decimal (1e18). ' +
			'Includes headers and is useful for importing into spreadsheets for analysis.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns CSV formatted daily log',
		schema: {
			type: 'string',
			example:
				'date, timestamp, totalInflow, totalOutflow, totalTradeFee, totalSupply, totalEquity, totalSavings, fpsTotalSupply, fpsPrice, totalMintedV1, totalMintedV2, currentLeadRate, projectedInterests, annualV1Interests, annualV2Interests, annualV1BorrowRate, annualV2BorrowRate, annualNetEarnings, realizedNetEarnings, earningsPerFPS \n' +
				'2026-01-25, 1769299200000, 1136590.707253052819761165, 44481.533249377602588670, 59734.354529232473307738, 20516447.970535677996752270, 3568161.467526286248560062, 8083179.944697927545220667, 8762.117095160688215312, 1221.677853231491140185, 4709999.999899999999999999, 17020047.769588271729033232, 0.040000000000000000, 323327.197787917101808826, 94199.999997999999999999, 721303.294900477701534774, 0.019999999999999999, 0.042379628110639938, 492176.097110560599725947, 490706.084649344763179171, 125.651799497032985606',
		},
	})
	async getDailyLogCsvE18() {
		const data = this.analytics.getDailyLog();
		const headerKeys = Object.keys(data.logs[0]).filter((i) => i != 'count' && i != 'txHash');
		const header = data.logs.length > 0 ? headerKeys.slice(0, -1).join(', ') + ' \n' : '';
		let csv: string = header ?? '';

		for (const e of data.logs) {
			const toStore = [
				e.date,
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
				formatUnits(e.projectedInterests, 18),

				formatUnits(e.annualV1Interests, 18),
				formatUnits(e.annualV2Interests, 18),
				formatUnits(e.annualV1BorrowRate, 18),
				formatUnits(e.annualV2BorrowRate, 18),

				formatUnits(e.annualNetEarnings, 18),
				formatUnits(e.realizedNetEarnings, 18),
				formatUnits(e.earningsPerFPS, 18),
			];
			csv += toStore.join(', ') + ' \n';
		}

		return csv;
	}

	@Get('fps/exposure')
	@ApiOperation({
		summary: 'Get FPS collateral exposure analysis',
		description:
			'Returns: object with general metrics and exposures array, detailed analysis of the FPS token collateral exposure across different assets. ' +
			'Includes per-collateral breakdown of positions, minting totals, interest rates, and risk metrics. ' +
			'Shows how much of each collateral type backs the FPS token and what would happen if values drop.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns collateral exposure metrics and risk analysis',
		schema: {
			type: 'object',
			properties: {
				general: {
					type: 'object',
					description: 'Overall FPS metrics',
					properties: {
						balanceInReserve: { type: 'number', description: 'Total balance in reserve' },
						mintersContribution: { type: 'number', description: 'Total contribution from minters' },
						equityInReserve: { type: 'number', description: 'Equity portion in reserve' },
						fpsPrice: { type: 'number', description: 'Current FPS token price' },
						fpsTotalSupply: { type: 'number', description: 'Total FPS supply' },
						thetaFromPositions: {
							type: 'number',
							description: 'Total theta from all positions (daily implied interest earnings)',
						},
						thetaPerToken: { type: 'number', description: 'Theta per FPS token (daily implied interest earnings per token)' },
						earningsPerAnnum: { type: 'number', description: 'Projected annual earnings' },
						earningsPerToken: { type: 'number', description: 'Annual earnings per FPS token' },
						priceToEarnings: { type: 'number', description: 'Price-to-earning value ratio' },
						priceToBookValue: { type: 'number', description: 'Price-to-book value ratio' },
					},
				},
				exposures: {
					type: 'array',
					description: 'Per-collateral exposure details',
					items: {
						type: 'object',
						properties: {
							collateral: {
								type: 'object',
								description: 'Collateral token information',
								properties: {
									address: { type: 'string', description: 'Collateral token contract address' },
									chainId: { type: 'number', description: 'Blockchain chain ID' },
									name: { type: 'string', description: 'Collateral token name' },
									symbol: { type: 'string', description: 'Collateral token symbol' },
								},
							},
							positions: {
								type: 'object',
								description: 'Position counts for this collateral',
								properties: {
									open: { type: 'number', description: 'Total open positions' },
									originals: { type: 'number', description: 'Number of original positions' },
									clones: { type: 'number', description: 'Number of cloned positions' },
								},
							},
							mint: {
								type: 'object',
								description: 'Minting metrics for this collateral',
								properties: {
									totalMinted: { type: 'number', description: 'Total amount minted' },
									totalContribution: { type: 'number', description: 'Total contribution to reserve' },
									totalLimit: { type: 'number', description: 'Total minting limit' },
									totalMintedRatio: { type: 'number', description: 'Ratio of minted to limit' },
									interestAverage: { type: 'number', description: 'Average interest rate' },
									totalTheta: {
										type: 'number',
										description: 'Total theta from this collateral (daily implied interest earnings)',
									},
									thetaPerFpsToken: {
										type: 'number',
										description: 'Theta per FPS token for this collateral (daily implied interest earnings per token)',
									},
								},
							},
							reserveRiskWiped: {
								type: 'object',
								description: 'Risk analysis if reserve is wiped',
								properties: {
									fpsPrice: { type: 'number', description: 'FPS price if reserve wiped' },
									riskRatio: { type: 'number', description: 'Risk ratio for reserve wipe scenario' },
								},
							},
						},
					},
				},
			},
			example: {
				general: {
					balanceInReserve: 7997151.118588526,
					mintersContribution: 4428989.65106224,
					equityInReserve: 3568161.4675262864,
					fpsPrice: 1221.677853231491,
					fpsTotalSupply: 8762.117095160687,
					thetaFromPositions: 1343.7703384228791,
					thetaPerToken: 0.15336137646060935,
					earningsPerAnnum: 490476.1735243509,
					earningsPerToken: 55.97690240812241,
					priceToEarnings: 21.824677691601277,
					priceToBookValue: 3,
				},
				exposures: [
					{
						collateral: {
							address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
							chainId: 1,
							name: 'Wrapped BTC',
							symbol: 'WBTC',
						},
						positions: {
							open: 5,
							originals: 2,
							clones: 3,
						},
						mint: {
							totalMinted: 5746930.887396564,
							totalContribution: 678386.1774893128,
							totalLimit: 12711718.324,
							totalMintedRatio: 0.452097,
							interestAverage: 0.022723,
							totalTheta: 357.77400151866334,
							thetaPerFpsToken: 0.04083191283945084,
						},
						reserveRiskWiped: {
							fpsPrice: 0,
							riskRatio: 1.420492,
						},
					},
				],
			},
		},
	})
	getExposure() {
		return this.analytics.getCollateralExposure();
	}

	@Get('fps/earnings')
	@ApiOperation({
		summary: 'Get FPS earnings breakdown',
		description:
			'Returns: object with earnings breakdown, detailed breakdown of all FPS token earnings sources. ' +
			'Includes fees from minters, positions, investments, redemptions, and various profit/loss claims. ' +
			'Shows complete accounting of where FPS value comes from.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns detailed earnings breakdown',
		schema: {
			type: 'object',
			properties: {
				minterProposalFees: { type: 'number', description: 'Fees from minter modules proposals' },
				investFees: { type: 'number', description: 'Fees from FPS investments' },
				redeemFees: { type: 'number', description: 'Fees from FPS redemptions' },
				positionProposalFees: { type: 'number', description: 'Fees from new position proposals' },
				otherProfitClaims: { type: 'number', description: 'Other profit claims, interests, auctions' },
				otherContributions: {
					type: 'number',
					description: 'Other contributions to reserve, incl. ERC20 transfers, FPS investments, ...',
				},
				savingsInterestCosts: { type: 'number', description: 'Interest paid on savings' },
				otherLossClaims: { type: 'number', description: 'Other loss claims, losses from auctions' },
			},
			example: {
				minterProposalFees: 17000,
				investFees: 33584.129316535655,
				redeemFees: 26150.225212696816,
				positionProposalFees: 33000,
				otherProfitClaims: 1086590.7072530529,
				otherContributions: 2371836.405744001,
				savingsInterestCosts: 43351.40845064168,
				otherLossClaims: 44486.556006992374,
			},
		},
	})
	getEarnings() {
		return this.analytics.getFpsEarnings();
	}
}
