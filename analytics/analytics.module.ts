import { Module } from '@nestjs/common';
import { EcosystemModule } from 'ecosystem/ecosystem.module';
import { PositionsModule } from 'positions/positions.module';
import { SavingsModule } from 'savings/savings.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
	imports: [PositionsModule, EcosystemModule, SavingsModule],
	controllers: [AnalyticsController],
	providers: [AnalyticsService],
	exports: [AnalyticsService],
})
export class AnalyticsModule {}
