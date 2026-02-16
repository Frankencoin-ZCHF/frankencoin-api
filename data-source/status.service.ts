import { Injectable } from '@nestjs/common';
import { IndexerHealthService } from 'data-source/indexer-health.service';
import { PrismaService } from 'database/prisma.service';
import { CONFIG } from 'api.config';

@Injectable()
export class StatusService {
	private startTime = Date.now();

	constructor(
		private readonly indexerHealth: IndexerHealthService,
		private readonly prisma: PrismaService
	) {}

	getSystemStatus() {
		const healthStatus = this.indexerHealth.getHealthStatus();
		const uptime = Math.floor((Date.now() - this.startTime) / 1000);

		return {
			api: {
				status: 'healthy',
				version: process.env.npm_package_version || '0.3.14',
				uptime,
			},
			dataSources: {
				current: healthStatus.currentSource,
				primary: healthStatus.primary
					? {
							url: healthStatus.primary.url,
							status: healthStatus.primary.isHealthy ? 'healthy' : 'unhealthy',
							blockNumber: healthStatus.primary.blockNumber.toString(),
							blockTimestamp: healthStatus.primary.blockTimestamp,
							latency: healthStatus.primary.latency,
							consecutiveFailures: healthStatus.primary.consecutiveFailures,
							lastChecked: healthStatus.primary.lastCheckedAt.toISOString(),
							error: healthStatus.primary.error || null,
					  }
					: {
							url: CONFIG.indexer,
							status: 'unknown',
							blockNumber: '0',
							blockTimestamp: 0,
							latency: 0,
							consecutiveFailures: 0,
							lastChecked: null,
							error: 'Not yet checked',
					  },
				backup: healthStatus.backup
					? {
							url: healthStatus.backup.url,
							status: healthStatus.backup.isHealthy ? 'healthy' : 'unhealthy',
							blockNumber: healthStatus.backup.blockNumber.toString(),
							blockTimestamp: healthStatus.backup.blockTimestamp,
							latency: healthStatus.backup.latency,
							consecutiveFailures: healthStatus.backup.consecutiveFailures,
							lastChecked: healthStatus.backup.lastCheckedAt.toISOString(),
							error: healthStatus.backup.error || null,
					  }
					: CONFIG.backupIndexer
					? {
							url: CONFIG.backupIndexer,
							status: 'unknown',
							blockNumber: '0',
							blockTimestamp: 0,
							latency: 0,
							consecutiveFailures: 0,
							lastChecked: null,
							error: 'Not yet checked',
					  }
					: null,
			},
			database: {
				status: this.prisma.isEnabled() ? 'connected' : 'disabled',
				enabled: this.prisma.isEnabled(),
			},
		};
	}
}
