import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemMinterService } from './ecosystem.minter.service';
import { ApiMinterListing } from './ecosystem.minter.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/minter')
export class EcosystemMinterController {
	constructor(private readonly minter: EcosystemMinterService) {}

	@Get('list')
	@ApiResponse({
		description: 'Returns a list of all minter proposals',
	})
	getList(): ApiMinterListing {
		return this.minter.getMintersList();
	}

	@Get('list/:chainId')
	@ApiResponse({
		description: 'Returns a list of chainId dependent minter proposals',
	})
	getListChainId(@Param('chainId') chainId: string): ApiMinterListing {
		return this.minter.getMintersListChainId(parseInt(chainId));
	}
}
