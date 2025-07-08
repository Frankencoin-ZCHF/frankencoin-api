import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemFpsService } from './ecosystem.fps.service';
import { ApiEcosystemFpsInfo } from './ecosystem.fps.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/fps')
export class EcosystemFpsController {
	constructor(private readonly fps: EcosystemFpsService) {}

	@Get('info')
	@ApiResponse({
		description: 'Returns info about the FPS token',
	})
	getInfo(): ApiEcosystemFpsInfo {
		return this.fps.getEcosystemFpsInfo();
	}
}
