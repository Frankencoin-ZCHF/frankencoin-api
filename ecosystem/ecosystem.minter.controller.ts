import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemMinterService } from './ecosystem.minter.service';
import { ApiMinterListing } from './ecosystem.minter.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/frankencoin/minter')
export class EcosystemMinterController {
	constructor(private readonly minter: EcosystemMinterService) {}

	@Get('list')
	@ApiResponse({
		description: 'Returns a list of all minter proposals',
	})
	getList(): ApiMinterListing {
		return this.minter.getMintersList();
	}
}
