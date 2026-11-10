jest.mock(
	'app.config',
	() => ({
		PONDER_CLIENT: { query: jest.fn() },
		PONDER_CLIENT_BACKUP: null,
		VIEM_CONFIG: { 1: { readContract: jest.fn() } },
	}),
	{ virtual: true }
);
jest.mock('core/data-source/data-source.manager.service', () => ({ DataSourceManagerService: class DataSourceManagerService {} }), {
	virtual: true,
});

import { PONDER_CLIENT } from 'app.config';
import { Address, getAddress } from 'viem';
import { PositionsService } from './positions.service';
import { OwnerTransferQuery, PositionQueryV1 } from './positions.types';

const ponderQuery = PONDER_CLIENT.query as jest.Mock;
const excludedPosition = '0xf35378277191c1f0d90869426f7177aa0393f77d' as Address;
const owner = '0xaf2d29825401486577f2d1efa2e3c657c799c1d6' as Address;

function createService(): PositionsService {
	return new PositionsService({ getCurrentSource: () => 'primary' } as any);
}

function makeDeniedPosition(): PositionQueryV1 {
	return {
		version: 1,
		position: excludedPosition,
		owner,
		zchf: '0xb58e61c3098d85632df34eecfb899a1ed80921cb',
		collateral: '0x0000000000000000000000000000000000000001',
		price: '1000000000000000000',
		created: 1781097407,
		isOriginal: true,
		isClone: false,
		denied: true,
		denyDate: 1781097431,
		closed: true,
		original: excludedPosition,
		minimumCollateral: '1',
		annualInterestPPM: 20000,
		reserveContribution: 100000,
		start: 1781097407,
		cooldown: 0,
		expiration: 1812892607,
		challengePeriod: 86400,
		zchfName: 'Frankencoin',
		zchfSymbol: 'ZCHF',
		zchfDecimals: 18,
		collateralName: 'Test Collateral',
		collateralSymbol: 'TEST',
		collateralDecimals: 18,
		collateralBalance: '0',
		limitForPosition: '0',
		limitForClones: '0',
		availableForPosition: '0',
		availableForClones: '0',
		minted: '0',
	};
}

describe('PositionsService Ponder recovery', () => {
	beforeEach(() => ponderQuery.mockReset());

	it('keeps the formerly excluded position once Ponder returns its corrected state', async () => {
		ponderQuery.mockResolvedValueOnce({
			data: {
				mintingHubV1PositionV1s: {
					items: [makeDeniedPosition()],
					pageInfo: { endCursor: null, hasNextPage: false },
				},
			},
		});

		const service = createService();
		await service.updatePositonV1s();

		expect(service.getPositionsList().list).toEqual([
			expect.objectContaining({
				position: getAddress(excludedPosition),
				denied: true,
				closed: true,
			}),
		]);
	});

	it('does not crash owner history when a transfer references an unavailable position', async () => {
		const service = createService();
		const created = Math.floor(Date.now() / 1000);
		const year = new Date(created * 1000).getFullYear();
		const transfer: OwnerTransferQuery = {
			version: 1,
			count: 1,
			txHash: `0x${'1'.padStart(64, '0')}`,
			created,
			position: excludedPosition,
			previousOwner: '0x0000000000000000000000000000000000000000',
			newOwner: owner,
		};
		jest.spyOn(service, 'getOwnerTransfers').mockResolvedValue({ num: 1, list: [transfer] });

		await expect(service.getOwnerHistory(owner)).resolves.toEqual({
			[year]: [excludedPosition],
		});
	});
});
