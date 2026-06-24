#!/usr/bin/env ts-node
/**
 * Resets TelegramUserAlert table and seeds every known TelegramGroup with
 * the two default alert types: governance (GOV) and allPositions (ALL).
 *
 * Usage:
 *   yarn migrate:subscriptions          ← dry run (default)
 *   yarn migrate:subscriptions true     ← execute
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const execute = process.argv[2] === 'true';

const DEFAULT_ALERTS: { type: string; address: string }[] = [
	{ type: 'governance', address: '' },
	{ type: 'allPositions', address: '' },
];

async function main() {
	console.log(execute ? '🚀 Execute mode\n' : '🔍 Dry run — pass "true" to execute\n');

	const groups = await prisma.telegramGroup.findMany({ select: { chatId: true } });

	if (groups.length === 0) {
		console.log('No telegram groups found — nothing to migrate.');
		return;
	}

	console.log(`Found ${groups.length} group(s).\n`);

	if (execute) {
		const deleted = await prisma.telegramUserAlert.deleteMany();
		console.log(`Deleted ${deleted.count} existing alert(s).\n`);
	} else {
		const count = await prisma.telegramUserAlert.count();
		console.log(`Dry run: would delete ${count} existing alert(s).\n`);
	}

	let totalCreated = 0;

	for (const group of groups) {
		console.log(`  ${group.chatId}: governance + allPositions`);

		if (execute) {
			for (const alert of DEFAULT_ALERTS) {
				await prisma.telegramUserAlert.create({
					data: { telegramId: group.chatId, type: alert.type, address: alert.address },
				});
				totalCreated++;
			}
		} else {
			totalCreated += DEFAULT_ALERTS.length;
		}
	}

	console.log(execute ? `\nDone. ${totalCreated} alert(s) created.` : `\nDry run complete. Would create ${totalCreated} alert(s).`);
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
