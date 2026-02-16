// CORE IMPORTS
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// DATABASE
import { DatabaseModule } from 'database/database.module';

// DATA SOURCE
import { DataSourceModule } from 'data-source/data-source.module';

// SERVICE IMPORTS
import { ApiService } from 'api.service';
import { EcosystemCollateralService } from 'ecosystem/ecosystem.collateral.service';
import { EcosystemFpsService } from 'ecosystem/ecosystem.fps.service';
import { EcosystemFrankencoinService } from 'ecosystem/ecosystem.frankencoin.service';
import { EcosystemMinterService } from 'ecosystem/ecosystem.minter.service';
import { SavingsLeadrateService } from 'savings/savings.leadrate.service';
import { SavingsCoreService } from 'savings/savings.core.service';
import { SavingsReferrerService } from 'savings/savings.referrer.service';
import { PositionsService } from 'positions/positions.service';
import { PricesService } from 'prices/prices.service';
import { ChallengesService } from 'challenges/challenges.service';
import { AnalyticsService } from 'analytics/analytics.service';
import { TransferReferenceService } from 'transfer/transfer.reference.service';
import { TelegramService } from 'telegram/telegram.service';

// CONTROLLER IMPORTS
import { EcosystemMinterController } from 'ecosystem/ecosystem.minter.controller';
import { EcosystemCollateralController } from 'ecosystem/ecosystem.collateral.controller';
import { EcosystemFpsController } from 'ecosystem/ecosystem.fps.controller';
import { EcosystemFrankencoinController } from 'ecosystem/ecosystem.frankencoin.controller';
import { EcosystemCoinmarketcapController } from 'ecosystem/ecosystem.coinmarketcap.controller';
import { SavingsLeadrateController } from 'savings/savings.leadrate.controller';
import { SavingsCoreController } from 'savings/savings.core.controller';
import { SavingsReferrerController } from 'savings/savings.referrer.controller';
import { PositionsController } from 'positions/positions.controller';
import { PricesController } from 'prices/prices.controller';
import { ChallengesController } from 'challenges/challenges.controller';
import { AnalyticsController } from 'analytics/analytics.controller';
import { TransferReferenceController } from 'transfer/tranfer.reference.controller';
import { HttpModule } from '@nestjs/axios';
import { PricesHistoryService } from 'prices/prices.history.service';
import { PricesHistoryController } from 'prices/prices.history.controller';

// APP MODULE
@Module({
	imports: [ConfigModule.forRoot(), ScheduleModule.forRoot(), HttpModule, DatabaseModule, DataSourceModule],
	controllers: [
		PositionsController,
		EcosystemMinterController,
		EcosystemCollateralController,
		EcosystemFpsController,
		EcosystemFrankencoinController,
		EcosystemCoinmarketcapController,
		SavingsLeadrateController,
		SavingsCoreController,
		SavingsReferrerController,
		PricesController,
		PricesHistoryController,
		ChallengesController,
		TransferReferenceController,
		AnalyticsController,
	],
	providers: [
		PositionsService,
		EcosystemMinterService,
		EcosystemCollateralService,
		EcosystemFpsService,
		EcosystemFrankencoinService,
		SavingsLeadrateService,
		SavingsCoreService,
		SavingsReferrerService,
		PricesService,
		PricesHistoryService,
		ChallengesService,
		TransferReferenceService,
		TelegramService,
		ApiService,
		AnalyticsService,
	],
})
export class AppModule {}
