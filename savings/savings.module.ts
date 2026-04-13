import { Module } from '@nestjs/common';
import { EcosystemModule } from 'ecosystem/ecosystem.module';
import { SavingsCoreController } from './savings.core.controller';
import { SavingsCoreService } from './savings.core.service';
import { SavingsLeadrateController } from './savings.leadrate.controller';
import { SavingsLeadrateService } from './savings.leadrate.service';
import { SavingsReferrerController } from './savings.referrer.controller';
import { SavingsReferrerService } from './savings.referrer.service';

@Module({
	imports: [EcosystemModule],
	controllers: [SavingsLeadrateController, SavingsCoreController, SavingsReferrerController],
	providers: [SavingsLeadrateService, SavingsCoreService, SavingsReferrerService],
	exports: [SavingsLeadrateService, SavingsCoreService, SavingsReferrerService],
})
export class SavingsModule {}
