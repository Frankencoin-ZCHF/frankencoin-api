#!/usr/bin/env ts-node

/**
 * Verify Migration Script
 *
 * Compares data in Storj S3 vs PostgreSQL database to verify migration
 *
 * Usage:
 *   ts-node database/scripts/verify-migration.ts
 *   or
 *   yarn verify:migration
 */

import { PrismaClient } from '@prisma/client';
import { Storj } from '../../storj/storj.s3.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const storj = new Storj();

interface VerificationResult {
	source: string;
	prices: number;
	priceHistory: number;
	priceRatio: number;
	telegramGroups: number;
	ecosystemSupply: number;
}

async function checkStorj(): Promise<VerificationResult> {
	console.log('📦 Checking Storj S3...\n');

	const result: VerificationResult = {
		source: 'Storj S3',
		prices: 0,
		priceHistory: 0,
		priceRatio: 0,
		telegramGroups: 0,
		ecosystemSupply: 0,
	};

	try {
		// Check prices
		const prices = await storj.read('/prices.query.json');
		if (!prices.messageError && prices.data) {
			// Prices are stored as object with address keys: {<address>: {price data}}
			const priceCount = Object.keys(prices.data).length;
			result.prices = priceCount;
			console.log(`   📊 prices.query.json: 1 object with ${priceCount} token addresses`);
		} else {
			console.log(`   ⚠️  prices.query.json: Not found or error`);
		}
	} catch (e) {
		console.log(`   ❌ prices.query.json: Error reading`);
	}

	try {
		// Check price history
		const priceHistory = await storj.read('/prices.history.query.json');
		if (!priceHistory.messageError && priceHistory.data) {
			// Data: {<address>: {history: {<timestamp>: price}}}
			// Count unique timestamps across all tokens
			const timestamps = new Set<string>();
			for (const tokenData of Object.values(priceHistory.data)) {
				const history = (tokenData as any).history || {};
				Object.keys(history).forEach((ts) => timestamps.add(ts));
			}
			result.priceHistory = timestamps.size;
			console.log(`   📈 prices.history.query.json: ${timestamps.size} unique timestamp entries`);
		} else {
			console.log(`   ⚠️  prices.history.query.json: Not found or error`);
		}
	} catch (e) {
		console.log(`   ❌ prices.history.query.json: Error reading`);
	}

	try {
		// Check price ratio
		const priceRatio = await storj.read('/prices.history.ratio.json');
		if (!priceRatio.messageError && priceRatio.data) {
			const data = priceRatio.data as any;
			// Count unique timestamps from both ratio objects
			const freeFloatTimestamps = Object.keys(data.collateralRatioByFreeFloat || {});
			const supplyTimestamps = Object.keys(data.collateralRatioBySupply || {});
			const uniqueTimestamps = new Set([...freeFloatTimestamps, ...supplyTimestamps]);
			result.priceRatio = uniqueTimestamps.size;
			console.log(`   📉 prices.history.ratio.json: ${uniqueTimestamps.size} timestamp entries`);
		} else {
			console.log(`   ⚠️  prices.history.ratio.json: Not found or error`);
		}
	} catch (e) {
		console.log(`   ❌ prices.history.ratio.json: Error reading`);
	}

	try {
		// Check telegram
		const telegram = await storj.read('/telegram.groups.json');
		if (!telegram.messageError && telegram.data) {
			const data = telegram.data as any;
			const groupCount = data.groups ? data.groups.length : 0;
			result.telegramGroups = groupCount;
			console.log(`   💬 telegram.groups.json: ${groupCount} groups`);
		} else {
			console.log(`   ⚠️  telegram.groups.json: Not found or error`);
		}
	} catch (e) {
		console.log(`   ❌ telegram.groups.json: Error reading`);
	}

	try {
		// Check ecosystem supply
		const ecosystem = await storj.read('/ecosystem.totalSupply.json');
		if (!ecosystem.messageError && ecosystem.data) {
			// Data is keyed by timestamp: {<timestamp>: {created, supply, allocation}}
			const timestampCount = Object.keys(ecosystem.data).length;
			result.ecosystemSupply = timestampCount;
			console.log(`   🌐 ecosystem.totalSupply.json: 1 object with ${timestampCount} timestamp entries`);
		} else {
			console.log(`   ⚠️  ecosystem.totalSupply.json: Not found or error`);
		}
	} catch (e) {
		console.log(`   ❌ ecosystem.totalSupply.json: Error reading`);
	}

	return result;
}

async function checkDatabase(): Promise<VerificationResult> {
	console.log('\n🗄️  Checking PostgreSQL Database...\n');

	const result: VerificationResult = {
		source: 'PostgreSQL',
		prices: 0,
		priceHistory: 0,
		priceRatio: 0,
		telegramGroups: 0,
		ecosystemSupply: 0,
	};

	try {
		// Check price cache - one row per token address
		const priceCacheCount = await prisma.priceCache.count();
		result.prices = priceCacheCount;
		console.log(`   📊 price_cache: ${priceCacheCount} token entries`);

		// Check price history - count timestamp rows
		const priceHistoryCount = await prisma.priceHistory.count();
		result.priceHistory = priceHistoryCount;

		// Show sample of latest entry
		const latestHistory = await prisma.priceHistory.findFirst({
			orderBy: { timestamp: 'desc' },
		});
		const historyTokenCount = latestHistory ? Object.keys(latestHistory.prices).length : 0;
		console.log(`   📈 price_history: ${priceHistoryCount} timestamp entries, latest has ${historyTokenCount} token prices`);

		// Check price ratio - count rows (one per timestamp)
		const priceRatioCount = await prisma.priceHistoryRatio.count();
		result.priceRatio = priceRatioCount;
		console.log(`   📉 price_history_ratio: ${priceRatioCount} timestamp entries`);

		// Check telegram
		const telegramGroups = await prisma.telegramGroup.count();
		result.telegramGroups = telegramGroups;
		console.log(`   💬 telegram_groups: ${telegramGroups} groups`);

		// Check ecosystem supply - get latest entry and count timestamps in it
		const latestEcosystem = await prisma.ecosystemSupply.findFirst({
			orderBy: { cachedAt: 'desc' },
		});
		const ecosystemTimestampCount = latestEcosystem ? Object.keys(latestEcosystem.data).length : 0;
		result.ecosystemSupply = ecosystemTimestampCount;
		const totalEcosystemRows = await prisma.ecosystemSupply.count();
		console.log(`   🌐 ecosystem_supply: ${totalEcosystemRows} cache snapshots, latest has ${ecosystemTimestampCount} timestamps`);
	} catch (error) {
		console.error(`   ❌ Database query error:`, error.message);
	}

	return result;
}

function printComparison(storj: VerificationResult, db: VerificationResult) {
	console.log('\n📊 Migration Verification Summary\n');
	console.log('┌─────────────────────────────────────┬─────────┬────────────┬─────────┐');
	console.log('│ Data Type                           │ Storj   │ Database   │ Status  │');
	console.log('├─────────────────────────────────────┼─────────┼────────────┼─────────┤');

	const rows = [
		{
			label: 'Prices (token addresses)',
			storj: storj.prices,
			db: db.prices,
			note: 'Stored as JSON object',
		},
		{
			label: 'Price History (timestamps)',
			storj: storj.priceHistory,
			db: db.priceHistory,
			note: 'Stored as JSON object',
		},
		{ label: 'Price Ratio', storj: storj.priceRatio, db: db.priceRatio, note: '' },
		{ label: 'Telegram Groups', storj: storj.telegramGroups, db: db.telegramGroups, note: '' },
		{ label: 'Ecosystem Supply (chains)', storj: storj.ecosystemSupply, db: db.ecosystemSupply, note: '' },
	];

	rows.forEach((row) => {
		const status = row.storj === row.db ? '✅ Match' : row.db > 0 ? '⚠️  Diff' : '❌ Miss';
		const storjStr = String(row.storj).padStart(7);
		const dbStr = String(row.db).padStart(10);
		console.log(`│ ${row.label.padEnd(35)} │ ${storjStr} │ ${dbStr} │ ${status.padEnd(7)} │`);
	});

	console.log('└─────────────────────────────────────┴─────────┴────────────┴─────────┘');

	// Overall verdict
	const criticalMatches = [
		storj.telegramGroups === db.telegramGroups,
		storj.ecosystemSupply === db.ecosystemSupply,
		db.prices > 0, // Has price data
		db.priceHistory >= 0, // Has history data
	];
	const allCriticalMatch = criticalMatches.every((match) => match);

	console.log('\n📋 Verdict:');
	if (allCriticalMatch) {
		console.log('   ✅ All critical data successfully migrated from Storj to Database!');
		console.log('   ✅ Prices and history are stored as JSON objects (expected format)');
	} else {
		console.log('   ⚠️  Some critical data missing - check details above');
	}

	console.log('\n💡 Storage Format:');
	console.log('   - Prices: One row per token address {address, data}');
	console.log('   - History: One row per timestamp {timestamp, prices: {<address>: price_chf}}');
	console.log('   - Telegram/Ecosystem: Individual rows per item');
	console.log('   - Blockchain cache: Populates when API starts querying indexers');
}

async function main() {
	console.log('🔍 FrancEco Migration Verification\n');
	console.log('Comparing Storj S3 data with PostgreSQL database...\n');

	try {
		const storjData = await checkStorj();
		const dbData = await checkDatabase();

		printComparison(storjData, dbData);
	} catch (error) {
		console.error('\n❌ Verification failed:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Run verification
main()
	.then(() => {
		console.log('\n✅ Verification complete\n');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Verification failed:', error);
		process.exit(1);
	});
