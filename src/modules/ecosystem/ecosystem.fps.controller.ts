import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EcosystemFpsService } from './ecosystem.fps.service';
import { ApiEcosystemFpsInfo } from './ecosystem.fps.types';

@ApiTags('Ecosystem Controller')
@Controller('ecosystem/fps')
export class EcosystemFpsController {
	constructor(private readonly fps: EcosystemFpsService) {}

	@Get('info')
	@ApiOperation({
		summary: 'Get FPS ecosystem information',
		description:
			'Returns: ApiEcosystemFpsInfo, comprehensive information about the Frankencoin Pool Share (FPS) token including ERC20 details, chain deployments, token metrics (price, supply, market cap), earnings (profit/loss), and reserve balances.',
	})
	@ApiResponse({
		status: 200,
		description: 'Returns complete FPS ecosystem information',
		schema: {
			type: 'ApiEcosystemFpsInfo',
			properties: {
				erc20: {
					type: 'object',
					properties: {
						name: { type: 'string', description: 'Token name' },
						symbol: { type: 'string', description: 'Token symbol' },
						decimals: { type: 'number', description: 'Token decimals' },
					},
				},
				chains: {
					type: 'object',
					description: 'Chain deployment addresses',
				},
				token: {
					type: 'object',
					properties: {
						price: { type: 'number', description: 'Current FPS price' },
						totalSupply: { type: 'number', description: 'Total FPS supply' },
						marketCap: { type: 'number', description: 'Market capitalization' },
					},
				},
				earnings: {
					type: 'object',
					properties: {
						profit: { type: 'number', description: 'Total profits' },
						loss: { type: 'number', description: 'Total losses' },
					},
				},
				reserve: {
					type: 'object',
					properties: {
						balance: { type: 'number', description: 'Total reserve balance' },
						equity: { type: 'number', description: 'Equity in reserve' },
						minter: { type: 'number', description: 'Minter contributions' },
					},
				},
			},
			example: {
				erc20: {
					name: 'Frankencoin Pool Share',
					symbol: 'FPS',
					decimals: 18,
				},
				chains: {
					'1': {
						chainId: 1,
						address: '0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2',
					},
				},
				token: {
					price: 1234.49,
					totalSupply: 8807.14,
					marketCap: 10872305.11,
				},
				earnings: {
					profit: 1136496.22,
					loss: 43256.17,
				},
				reserve: {
					balance: 8052591.35,
					equity: 3624101.7,
					minter: 4428489.65,
				},
			},
		},
	})
	getInfo(): ApiEcosystemFpsInfo {
		return this.fps.getEcosystemFpsInfo();
	}
}
