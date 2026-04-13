import { Module } from '@nestjs/common';
import { TransferReferenceController } from './tranfer.reference.controller';
import { TransferReferenceService } from './transfer.reference.service';

@Module({
	controllers: [TransferReferenceController],
	providers: [TransferReferenceService],
	exports: [TransferReferenceService],
})
export class TransferModule {}
