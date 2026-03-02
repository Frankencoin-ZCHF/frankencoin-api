#!/usr/bin/env ts-node

/**
 * Storj to Database Migration Script
 *
 * Migrates all data from Storj S3 to PostgreSQL database:
 * - Price data (current, history, ratios)
 * - Telegram groups and ignore list
 * - Ecosystem supply data
 *
 * Usage:
 *   ts-node database/scripts/migrate-storj-to-db.ts
 *   or
 *   yarn migrate:storj
 */

import { PrismaClient } from '@prisma/client';
import { Storj } from '../../storj/storj.s3.service';
import * as dotenv from 'dotenv';
import { timestampStartOfDay } from '../../utils/format';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const storj = new Storj();

async function migrate() {
	console.log('🚀 Starting Storj → Database migration...\n');

	try {
		// ========================================
		// 1. Migrate Price Query (Current Prices)
		// ========================================
		console.log('📊 Migrating prices.query.json...');
		try {
			const prices = await storj.read('/prices.query.json');
			if (!prices.messageError && prices.data) {
				const entries = Object.entries(prices.data as Record<string, any>);
				let migratedCount = 0;
				for (const [address, data] of entries) {
					await prisma.priceCache.upsert({
						where: { address },
						create: { address, data },
						update: { data },
					});
					migratedCount++;
				}
				console.log(`   ✅ Migrated current prices (${migratedCount} entries)`);
			} else {
				console.log(`   ⚠️  No price data found or error: ${prices.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate prices: ${error.message}`);
		}

		// ========================================
		// 2. Migrate Price History
		// ========================================
		console.log('📈 Migrating prices.history.query.json...');
		try {
			const priceHistory = await storj.read('/prices.history.query.json');
			if (!priceHistory.messageError && priceHistory.data) {
				const data = priceHistory.data as any;

				// Data structure: {<address>: {history: {<timestamp>: price}}}
				// Transform to: {<timestamp>: {<address>: price}}

				const timestampPrices: Record<string, Record<string, number>> = {};

				// Iterate through each token
				for (const [address, tokenData] of Object.entries(data)) {
					const history = (tokenData as any).history || {};

					// For each timestamp in this token's history
					for (const [timestamp, price] of Object.entries(history)) {
						const timestampDay = timestampStartOfDay(timestamp);
						if (!timestampPrices[timestampDay]) {
							timestampPrices[timestampDay] = {};
						}
						timestampPrices[timestampDay][address.toLowerCase()] = price as number;
					}
				}

				// Insert each timestamp as a row
				let migratedCount = 0;
				for (const [timestamp, prices] of Object.entries(timestampPrices)) {
					try {
						await prisma.priceHistory.upsert({
							where: { timestamp: BigInt(timestamp) },
							create: { timestamp: BigInt(timestamp), prices: prices },
							update: { prices: prices },
						});
						migratedCount++;
					} catch (err) {
						// Skip errors
					}
				}

				console.log(`   ✅ Migrated price history (${migratedCount} daily entries)`);
			} else {
				console.log(`   ⚠️  No price history found or error: ${priceHistory.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate price history: ${error.message}`);
		}

		// ========================================
		// 3. Migrate Price History Ratio
		// ========================================
		console.log('📉 Migrating prices.history.ratio.json...');
		try {
			const priceRatio = await storj.read('/prices.history.ratio.json');
			if (!priceRatio.messageError && priceRatio.data) {
				const data = priceRatio.data as any;

				// Data structure: { collateralRatioByFreeFloat: {<ts>: ratio}, collateralRatioBySupply: {<ts>: ratio} }
				const freeFloatRatios = data.collateralRatioByFreeFloat || {};
				const supplyRatios = data.collateralRatioBySupply || {};

				// Deduplicate to daily timestamps — last write per day wins
				const byDay: Record<string, { freeFloat: number; supply: number }> = {};
				for (const ts of new Set([...Object.keys(freeFloatRatios), ...Object.keys(supplyRatios)])) {
					const day = timestampStartOfDay(ts);
					byDay[day] = {
						freeFloat: freeFloatRatios[ts] ?? byDay[day]?.freeFloat ?? 0,
						supply: supplyRatios[ts] ?? byDay[day]?.supply ?? 0,
					};
				}

				let migratedCount = 0;
				for (const [day, { freeFloat, supply }] of Object.entries(byDay)) {
					try {
						await prisma.priceHistoryRatio.upsert({
							where: { timestamp: BigInt(day) },
							create: { timestamp: BigInt(day), collateralRatioByFreeFloat: freeFloat, collateralRatioBySupply: supply },
							update: { collateralRatioByFreeFloat: freeFloat, collateralRatioBySupply: supply },
						});
						migratedCount++;
					} catch (err) {
						// Skip errors
					}
				}

				console.log(`   ✅ Migrated price history ratio (${migratedCount} daily entries)`);
			} else {
				console.log(`   ⚠️  No price ratio found or error: ${priceRatio.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate price ratio: ${error.message}`);
		}
		/*
		// ========================================
		// 4. Migrate Telegram Groups
		// ========================================
		console.log('💬 Migrating telegram.groups.json...');
		try {
			const telegramData = await storj.read('/telegram.groups.json');
			if (!telegramData.messageError && telegramData.data) {
				const data = telegramData.data as any;

				console.log(`   📋 Telegram data structure: ${JSON.stringify(Object.keys(data)).substring(0, 100)}`);

				// Migrate groups - handle both old and new format
				let groups = [];
				if (data.groups && Array.isArray(data.groups)) {
					groups = data.groups;
				} else if (Array.isArray(data)) {
					// Data might be directly an array
					groups = data;
				} else if (data.subscription && typeof data.subscription === 'object') {
					// Old format: subscription object with chatIds as keys
					groups = Object.entries(data.subscription).map(([chatId, subscriptions]) => ({
						chatId,
						subscriptions,
					}));
				}

				console.log(`   📊 Found ${groups.length} groups to migrate`);

				let migratedCount = 0;
				for (const group of groups) {
					try {
						// Handle different property names
						const chatId = group.chatId || group.id || group.chat_id || String(group);

						if (!chatId) {
							console.log(`   ⚠️  Skipping group with no chatId: ${JSON.stringify(group).substring(0, 50)}`);
							continue;
						}

						await prisma.telegramGroup.upsert({
							where: { chatId: String(chatId) },
							create: {
								chatId: String(chatId),
								title: group.title || group.name || null,
								subscriptions: group.subscriptions || {},
								createdAt: new Date(),
							},
							update: {
								title: group.title || group.name || null,
								subscriptions: group.subscriptions || {},
								updatedAt: new Date(),
							},
						});
						migratedCount++;
					} catch (err) {
						console.log(`   ⚠️  Failed to migrate group: ${err.message.substring(0, 100)}`);
					}
				}
				console.log(`   ✅ Migrated ${migratedCount} telegram groups`);
			} else {
				console.log(`   ⚠️  No telegram data found or error: ${telegramData.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate telegram data: ${error.message}`);
		}

		*/

		// ========================================
		// 5. Migrate Ecosystem Supply
		// ========================================
		console.log('🌐 Migrating ecosystem.totalSupply.json...');
		try {
			const ecosystemSupply = await storj.read('/ecosystem.totalSupply.json');
			if (!ecosystemSupply.messageError && ecosystemSupply.data) {
				const data = ecosystemSupply.data as Record<string, any>;

				// Data is organized by timestamp: {<timestamp>: {created, supply, allocation}}
				let migratedCount = 0;
				for (const [timestamp, entry] of Object.entries(data)) {
					try {
						await prisma.ecosystemSupply.upsert({
							where: { timestamp: BigInt(timestamp) },
							create: { timestamp: BigInt(timestamp), data: entry },
							update: { data: entry },
						});
						migratedCount++;
					} catch (err) {
						// Skip errors
					}
				}

				console.log(`   ✅ Migrated ecosystem supply (${migratedCount} timestamp entries)`);
			} else {
				console.log(`   ⚠️  No ecosystem supply found or error: ${ecosystemSupply.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate ecosystem supply: ${error.message}`);
		}

		console.log('\n✨ Migration completed successfully!');
		console.log('\n📝 Summary:');
		console.log('   - Price data migrated to price_cache, price_history, price_history_ratio tables');
		console.log('   - Telegram data migrated to telegram_groups, telegram_ignore tables');
		console.log('   - Ecosystem supply migrated to ecosystem_supply table');
		console.log('\n💡 Note: Original Storj data is preserved. You can remove STORJ_* env vars after verification.');
	} catch (error) {
		console.error('\n❌ Migration failed:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Run migration
migrate()
	.then(() => {
		console.log('\n✅ Migration script completed');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Migration script failed:', error);
		process.exit(1);
	});
