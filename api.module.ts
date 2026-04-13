import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Core infrastructure
import { DatabaseModule } from 'database/database.module';
import { DataSourceModule } from 'data-source/data-source.module';

// Config namespaces
import { appConfig, ponderConfig, viemConfig, coingeckoConfig } from 'config/index';

// Feature modules
import { AnalyticsModule } from 'analytics/analytics.module';
import { ChallengesModule } from 'challenges/challenges.module';
import { EcosystemModule } from 'ecosystem/ecosystem.module';
import { PositionsModule } from 'positions/positions.module';
import { PricesModule } from 'prices/prices.module';
import { SavingsModule } from 'savings/savings.module';
import { TelegramModule } from 'telegram/telegram.module';
import { TransferModule } from 'transfer/transfer.module';

// Root orchestration service
import { ApiService } from 'api.service';

@Module({
	imports: [
		// Framework
		ConfigModule.forRoot({
			isGlobal: true,
			load: [appConfig, ponderConfig, viemConfig, coingeckoConfig],
		}),
		ScheduleModule.forRoot(),

		// Core infrastructure
		DatabaseModule,
		DataSourceModule,

		// Feature modules
		PositionsModule,
		EcosystemModule,
		PricesModule,
		SavingsModule,
		ChallengesModule,
		TransferModule,
		AnalyticsModule,
		TelegramModule,
	],
	providers: [ApiService],
})
export class AppModule {}
