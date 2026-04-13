import { Module } from '@nestjs/common';
import { DataSourceModule } from 'data-source/data-source.module';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';

@Module({
	imports: [DataSourceModule],
	controllers: [PositionsController],
	providers: [PositionsService],
	exports: [PositionsService],
})
export class PositionsModule {}
