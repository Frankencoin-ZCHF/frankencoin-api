import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule - Global module providing PrismaService
 *
 * This module is marked as @Global() so PrismaService is available
 * throughout the application without needing to import DatabaseModule
 * in every feature module.
 *
 * Database can be disabled via DISABLE_DATABASE=true env var,
 * in which case the API continues with in-memory data only.
 */
@Global()
@Module({
	providers: [PrismaService],
	exports: [PrismaService],
})
export class DatabaseModule {}
