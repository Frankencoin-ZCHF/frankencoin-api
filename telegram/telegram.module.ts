import { Module } from '@nestjs/common';
import { DatabaseModule } from 'database/database.module';
import { ChallengesModule } from 'challenges/challenges.module';
import { EcosystemModule } from 'ecosystem/ecosystem.module';
import { PositionsModule } from 'positions/positions.module';
import { PricesModule } from 'prices/prices.module';
import { SavingsModule } from 'savings/savings.module';
import { TelegramService } from './telegram.service';

@Module({
	imports: [DatabaseModule, PositionsModule, EcosystemModule, ChallengesModule, PricesModule, SavingsModule],
	providers: [TelegramService],
	exports: [TelegramService],
})
export class TelegramModule {}
