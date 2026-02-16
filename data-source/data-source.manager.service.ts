import { Injectable, Logger } from '@nestjs/common';
import { IndexerHealthService } from './indexer-health.service';
import { PONDER_CLIENT, PONDER_CLIENT_BACKUP } from 'api.config';
import { DocumentNode, TypedDocumentNode } from '@apollo/client/core';

export type DataSource = 'primary' | 'backup';

export interface QueryOptions {
	query: DocumentNode | TypedDocumentNode<any, any>;
	variables?: any;
}

/**
 * DataSourceManagerService - Coordinates two-tier failover architecture
 *
 * Query Priority:
 * 1. Primary Indexer (if healthy)
 * 2. Backup Indexer (if primary down and backup healthy)
 *
 * Features:
 * - Automatic failover based on indexer health
 * - Tracks current active data source
 * - Data cached in-memory by individual services
 */
@Injectable()
export class DataSourceManagerService {
	private readonly logger = new Logger(DataSourceManagerService.name);
	private currentSource: DataSource = 'primary';

	constructor(private readonly indexerHealth: IndexerHealthService) {}

	/**
	 * Determine which data source to use
	 */
	determineSource(): DataSource {
		this.currentSource = this.indexerHealth.determineDataSource();
		return this.currentSource;
	}

	/**
	 * Get current active data source
	 */
	getCurrentSource(): DataSource {
		return this.currentSource;
	}

	/**
	 * Query with automatic failover
	 * Tries primary -> backup in order
	 */
	async queryWithFailover<T = any>(options: QueryOptions): Promise<T | null> {
		const source = this.determineSource();

		try {
			// Try indexer (primary or backup)
			if (source === 'primary') {
				return await this.queryPrimary<T>(options);
			} else {
				return await this.queryBackup<T>(options);
			}
		} catch (error) {
			this.logger.error(`Query failed on ${source}`, error);
			return null;
		}
	}

	/**
	 * Query primary indexer
	 */
	async queryPrimary<T = any>(options: QueryOptions): Promise<T> {
		this.logger.debug('Querying primary indexer');
		const result = await PONDER_CLIENT.query({
			query: options.query,
			variables: options.variables,
			fetchPolicy: 'no-cache',
		});

		return result.data as T;
	}

	/**
	 * Query backup indexer
	 */
	async queryBackup<T = any>(options: QueryOptions): Promise<T> {
		if (!PONDER_CLIENT_BACKUP) {
			throw new Error('Backup indexer not configured');
		}

		this.logger.debug('Querying backup indexer');
		const result = await PONDER_CLIENT_BACKUP.query({
			query: options.query,
			variables: options.variables,
			fetchPolicy: 'no-cache',
		});

		return result.data as T;
	}
}
