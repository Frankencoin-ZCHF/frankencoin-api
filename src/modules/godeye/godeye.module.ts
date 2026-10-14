import { Module } from '@nestjs/common';
import { EcosystemModule } from 'modules/ecosystem/ecosystem.module';
import { PositionsModule } from 'modules/positions/positions.module';
import { GodEyeController } from './godeye.controller';
import { GodEyeLabelsService } from './godeye.labels.service';
import { GodEyeLedgerService } from './godeye.ledger.service';
import { GodEyeService } from './godeye.service';

@Module({
	imports: [PositionsModule, EcosystemModule],
	controllers: [GodEyeController],
	providers: [GodEyeLedgerService, GodEyeLabelsService, GodEyeService],
	exports: [GodEyeService],
})
export class GodEyeModule {}
