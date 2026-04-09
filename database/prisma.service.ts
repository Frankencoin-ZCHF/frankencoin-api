import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Database client with NestJS lifecycle integration
 *
 * Features:
 * - Automatic connection on module init
 * - Graceful disconnection on module destroy
 * - Optional database via DISABLE_DATABASE env var
 * - Logging and error handling
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(PrismaService.name);
	private readonly isDatabaseDisabled: boolean;

	constructor() {
		// Only initialize PrismaClient if database is enabled
		const disabled = process.env.DISABLE_DATABASE === 'true';

		super(
			disabled
				? undefined
				: {
						log: ['error', 'warn'],
						errorFormat: 'minimal',
				  }
		);

		this.isDatabaseDisabled = disabled;

		if (this.isDatabaseDisabled) {
			this.logger.warn('Database is DISABLED - running with in-memory data only');
		}
	}

	async onModuleInit() {
		if (this.isDatabaseDisabled) {
			this.logger.log('Skipping database connection (DISABLE_DATABASE=true)');
			return;
		}

		try {
			await this.$connect();
			this.logger.log('Database connected successfully');
		} catch (error) {
			this.logger.error('Failed to connect to database', error);
			throw error;
		}
	}

	async onModuleDestroy() {
		if (this.isDatabaseDisabled) {
			return;
		}

		try {
			await this.$disconnect();
			this.logger.log('Database disconnected');
		} catch (error) {
			this.logger.error('Error disconnecting from database', error);
		}
	}

	/**
	 * Check if database operations are enabled
	 */
	isEnabled(): boolean {
		return !this.isDatabaseDisabled;
	}

	/**
	 * Safe wrapper for database operations
	 * Returns null if database is disabled, otherwise executes the operation
	 */
	async safeExecute<T>(operation: () => Promise<T>): Promise<T | null> {
		if (this.isDatabaseDisabled) {
			return null;
		}

		try {
			return await operation();
		} catch (error) {
			this.logger.error('Database operation failed', error);
			return null;
		}
	}
}
