import { Module } from '@nestjs/common';
import { IndexerHealthService } from './indexer-health.service';
import { DataSourceManagerService } from './data-source.manager.service';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';

/**
 * DataSourceModule - Provides indexer health monitoring and failover management
 *
 * Exports:
 * - IndexerHealthService: Monitors primary/backup indexer health
 * - DataSourceManagerService: Manages three-tier failover (primary -> backup -> cache)
 * - StatusService: Provides system status information
 *
 * Controllers:
 * - StatusController: GET /status endpoint for system health
 */
@Module({
	controllers: [StatusController],
	providers: [IndexerHealthService, DataSourceManagerService, StatusService],
	exports: [IndexerHealthService, DataSourceManagerService, StatusService],
})
export class DataSourceModule {}
