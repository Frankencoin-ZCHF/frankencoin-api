jest.mock('app.config', () => ({
	PONDER_CLIENT: { query: jest.fn() },
}));

import { PONDER_CLIENT } from 'app.config';
import { print } from 'graphql';
import { Address } from 'viem';
import { TransferReferenceQuery } from './transfer.reference.types';
import { TransferReferenceService } from './transfer.reference.service';

const ponderQuery = PONDER_CLIENT.query as jest.Mock;
const address = '0x0000000000000000000000000000000000000001' as Address;

function makeReference(count: number): TransferReferenceQuery {
	return {
		amount: 1n,
		chainId: 1,
		count,
		created: 1,
		from: address,
		reference: `reference ${count}`,
		sender: address,
		targetChain: '1',
		to: address,
		txHash: `0x${count.toString(16).padStart(64, '0')}`,
	};
}

describe('TransferReferenceService complete history pagination', () => {
	beforeEach(() => ponderQuery.mockReset());

	it.each(['from', 'to'] as const)('collects every Ponder page for history by %s', async (direction) => {
		const firstPage = Array.from({ length: 1000 }, (_, index) => makeReference(index + 1));
		const secondPage = Array.from({ length: 1000 }, (_, index) => makeReference(index + 1001));
		const thirdPage = [makeReference(2001)];
		ponderQuery
			.mockResolvedValueOnce({
				data: {
					transferReferences: {
						items: firstPage,
						pageInfo: { endCursor: 'cursor-1000', hasNextPage: true },
					},
				},
			})
			.mockResolvedValueOnce({
				data: {
					transferReferences: {
						items: secondPage,
						pageInfo: { endCursor: 'cursor-2000', hasNextPage: true },
					},
				},
			})
			.mockResolvedValueOnce({
				data: {
					transferReferences: {
						items: thirdPage,
						pageInfo: { endCursor: 'cursor-2001', hasNextPage: false },
					},
				},
			});

		const service = new TransferReferenceService();
		const result =
			direction === 'from'
				? await service.getHistoryByFromFilter({ from: address })
				: await service.getHistoryByToFilter({ to: address });

		expect(Array.isArray(result)).toBe(true);
		if (!Array.isArray(result)) throw new Error('Expected complete transfer history array.');
		expect(result).toHaveLength(2001);
		expect(result.at(-1)?.count).toBe(2001);
		expect(ponderQuery).toHaveBeenCalledTimes(3);
		expect(ponderQuery.mock.calls[0][0].variables).toEqual({ after: null });
		expect(ponderQuery.mock.calls[1][0].variables).toEqual({ after: 'cursor-1000' });
		expect(ponderQuery.mock.calls[2][0].variables).toEqual({ after: 'cursor-2000' });
		expect(print(ponderQuery.mock.calls[0][0].query)).toContain('after: $after');
		expect(print(ponderQuery.mock.calls[0][0].query)).toContain('hasNextPage');
		expect(print(ponderQuery.mock.calls[0][0].query)).toContain('limit: 1000');
	});

	it('returns an error instead of silently returning partial history when Ponder omits the next cursor', async () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		ponderQuery.mockResolvedValueOnce({
			data: {
				transferReferences: {
					items: [makeReference(1)],
					pageInfo: { endCursor: null, hasNextPage: true },
				},
			},
		});

		const service = new TransferReferenceService();
		const result = await service.getHistoryByFromFilter({ from: address });

		expect(result).toHaveProperty('error');
		expect(ponderQuery).toHaveBeenCalledTimes(1);
		consoleError.mockRestore();
	});
});
