import { Module } from '@nestjs/common';
import { EcosystemModule } from 'modules/ecosystem/ecosystem.module';
import { FcsModule } from 'modules/fcs/fcs.module';
import { PositionsModule } from 'modules/positions/positions.module';
import { SavingsModule } from 'modules/savings/savings.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
	imports: [PositionsModule, EcosystemModule, SavingsModule, FcsModule],
	controllers: [AnalyticsController],
	providers: [AnalyticsService],
	exports: [AnalyticsService],
})
export class AnalyticsModule {}
