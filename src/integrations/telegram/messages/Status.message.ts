import { AppUrl } from 'utils/func-helper';

export function StatusMessage(chatId: string | number, governance: boolean, allPositions: boolean, owners: string[]): string {
	const lines: string[] = [`📋 *Subscriptions* (\`${chatId}\`)\n`];

	lines.push(`🏛 Governance: ${governance ? '✅' : '❌'}`);
	lines.push(`📊 All Positions: ${allPositions ? '✅' : '❌'}`);

	if (owners.length > 0) {
		lines.push(`\n👤 *Tracked Owners:*`);
		for (const addr of owners) {
			lines.push(`• \`${addr}\``);
		}
	} else {
		lines.push(`👤 Owners: none`);
	}

	const watchesPositions = allPositions || owners.length > 0;
	if (watchesPositions || governance) {
		lines.push(`\n🔔 *When you will get an alert*`);
		lines.push(...AlertDescriptionLines(governance, watchesPositions ? (allPositions ? 'all' : 'owner') : 'none'));
	}

	lines.push(`\nv${process.env.npm_package_version} · [🌐 App](${AppUrl('')})`);
	return lines.join('\n');
}

// Describes which alerts are sent, mirroring the thresholds and cooldowns in telegram.service.ts.
export function AlertDescriptionLines(governance: boolean, positions: 'all' | 'owner' | 'none'): string[] {
	const lines: string[] = [];

	if (positions !== 'none') {
		const scope = positions === 'all' ? 'any position' : 'any position of a tracked owner';
		lines.push(
			`\n*Price* — for ${scope}, when the market price gets close to the liquidation price:`,
			`• below 110% collateralization: warning (at most every 48h)`,
			`• below 105%: alert (at most every 24h)`,
			`• below 100%: critical alert, repeated every 2h only if the price falls a further 2%`,
			`\n*Expiration* — 7 days and 1 day before a position expires, and when it has expired.`,
			`\n*Activity* — new challenges, bids and minting updates.`
		);
	}

	if (governance) {
		lines.push(
			`\n*Governance* — minter proposals and vetoes, leadrate proposals and changes. Also challenges, bids, expired positions and positions below 100% collateralization.`
		);
	}

	return lines;
}
