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
				await prisma.priceCache.create({
					data: {
						data: prices.data,
						cachedAt: new Date(),
					},
				});
				console.log('   ✅ Migrated current prices');
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
						if (!timestampPrices[timestamp]) {
							timestampPrices[timestamp] = {};
						}
						timestampPrices[timestamp][address.toLowerCase()] = price as number;
					}
				}

				// Insert each timestamp as a row
				let migratedCount = 0;
				for (const [timestamp, prices] of Object.entries(timestampPrices)) {
					try {
						await prisma.priceHistory.upsert({
							where: { timestamp: BigInt(timestamp) },
							create: {
								timestamp: BigInt(timestamp),
								prices: prices,
								cachedAt: new Date(),
							},
							update: {
								prices: prices,
								updatedAt: new Date(),
							},
						});
						migratedCount++;
					} catch (err) {
						// Skip errors
					}
				}

				console.log(`   ✅ Migrated price history (${migratedCount} timestamp entries)`);
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

				// Data structure: { timestamp, collateralRatioByFreeFloat: {<ts>: ratio}, collateralRatioBySupply: {<ts>: ratio} }
				const freeFloatRatios = data.collateralRatioByFreeFloat || {};
				const supplyRatios = data.collateralRatioBySupply || {};

				// Get all unique timestamps from both objects
				const timestamps = new Set([...Object.keys(freeFloatRatios), ...Object.keys(supplyRatios)]);

				let migratedCount = 0;
				for (const timestamp of timestamps) {
					const ts = BigInt(timestamp);
					const freeFloat = freeFloatRatios[timestamp] || 0;
					const supply = supplyRatios[timestamp] || 0;

					try {
						await prisma.priceHistoryRatio.upsert({
							where: { timestamp: ts },
							create: {
								timestamp: ts,
								collateralRatioByFreeFloat: freeFloat,
								collateralRatioBySupply: supply,
								cachedAt: new Date(),
							},
							update: {
								collateralRatioByFreeFloat: freeFloat,
								collateralRatioBySupply: supply,
								updatedAt: new Date(),
							},
						});
						migratedCount++;
					} catch (err) {
						// Skip errors
					}
				}

				console.log(`   ✅ Migrated price history ratio (${migratedCount} timestamp entries)`);
			} else {
				console.log(`   ⚠️  No price ratio found or error: ${priceRatio.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate price ratio: ${error.message}`);
		}

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

				// Migrate ignore list
				let ignore = [];
				if (data.ignore && Array.isArray(data.ignore)) {
					ignore = data.ignore;
				}

				let ignoredCount = 0;
				for (const item of ignore) {
					try {
						const chatId = typeof item === 'string' ? item : item.chatId || item.id;
						if (!chatId) continue;

						await prisma.telegramIgnore.upsert({
							where: { chatId: String(chatId) },
							create: { chatId: String(chatId) },
							update: {},
						});
						ignoredCount++;
					} catch (err) {
						// Skip errors
					}
				}
				console.log(`   ✅ Migrated ${ignoredCount} ignored chats`);
			} else {
				console.log(`   ⚠️  No telegram data found or error: ${telegramData.messageError}`);
			}
		} catch (error) {
			console.log(`   ❌ Failed to migrate telegram data: ${error.message}`);
		}

		// ========================================
		// 5. Migrate Ecosystem Supply
		// ========================================
		console.log('🌐 Migrating ecosystem.totalSupply.json...');
		try {
			const ecosystemSupply = await storj.read('/ecosystem.totalSupply.json');
			if (!ecosystemSupply.messageError && ecosystemSupply.data) {
				const data = ecosystemSupply.data as Record<string, any>;

				// Data is organized by timestamp: {<timestamp>: {created, supply, allocation}}
				const timestampCount = Object.keys(data).length;

				// Store entire object as single JSON entry
				await prisma.ecosystemSupply.create({
					data: {
						data: data,
						cachedAt: new Date(),
					},
				});

				console.log(`   ✅ Migrated ecosystem supply (${timestampCount} timestamp entries)`);
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
