import { Module } from '@nestjs/common';
import { DatabaseModule } from 'core/database/database.module';
import { ChallengesModule } from 'modules/challenges/challenges.module';
import { EcosystemModule } from 'modules/ecosystem/ecosystem.module';
import { PositionsModule } from 'modules/positions/positions.module';
import { PricesModule } from 'modules/prices/prices.module';
import { SavingsModule } from 'modules/savings/savings.module';
import { TelegramService } from './telegram.service';

@Module({
	imports: [DatabaseModule, PositionsModule, EcosystemModule, ChallengesModule, PricesModule, SavingsModule],
	providers: [TelegramService],
	exports: [TelegramService],
})
export class TelegramModule {}
