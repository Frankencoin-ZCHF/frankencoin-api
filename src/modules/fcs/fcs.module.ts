import { Module } from '@nestjs/common';
import { FcsController } from './fcs.controller';
import { FcsCoinmarketcapController } from './fcs.coinmarketcap.controller';
import { FcsService } from './fcs.service';

@Module({
	controllers: [FcsController, FcsCoinmarketcapController],
	providers: [FcsService],
	exports: [FcsService],
})
export class FcsModule {}
