import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from 'database/database.module';
import { EcosystemModule } from 'ecosystem/ecosystem.module';
import { PositionsModule } from 'positions/positions.module';
import { PricesController } from './prices.controller';
import { PricesHistoryController } from './prices.history.controller';
import { PricesHistoryService } from './prices.history.service';
import { PricesService } from './prices.service';

@Module({
	imports: [HttpModule, DatabaseModule, PositionsModule, forwardRef(() => EcosystemModule)],
	controllers: [PricesController, PricesHistoryController],
	providers: [PricesService, PricesHistoryService],
	exports: [PricesService, PricesHistoryService],
})
export class PricesModule {}
