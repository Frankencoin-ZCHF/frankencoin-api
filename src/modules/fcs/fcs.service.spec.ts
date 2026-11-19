import { FcsService } from './fcs.service';
import { VIEM_CONFIG } from 'app.config';

jest.mock('app.config', () => ({ VIEM_CONFIG: { 1: { getBlock: jest.fn(), readContract: jest.fn() } }, PONDER_CLIENT: {} }), {
	virtual: true,
});
jest.mock('utils/format', () => ({ formatFloat: (value: bigint) => Number(value) / 1e18 }), { virtual: true });
const client = VIEM_CONFIG[1] as unknown as { getBlock: jest.Mock; readContract: jest.Mock };
const block = { number: 123n, hash: `0x${'ab'.repeat(32)}`, timestamp: 1794441600n };
let service: FcsService;
beforeEach(() => {
	jest.resetAllMocks();
	service = new FcsService();
	client.getBlock.mockResolvedValue(block);
	client.readContract.mockImplementation(async ({ functionName }) => (functionName === 'isBinding' ? false : 2n * 10n ** 18n));
});

test('all five reads use one block and metadata survives repeated cached responses', async () => {
	await service.updateFcsInfo();
	expect(client.readContract).toHaveBeenCalledTimes(5);
	for (const [args] of client.readContract.mock.calls) expect(args.blockNumber).toBe(block.number);
	expect(client.getBlock.mock.calls).toEqual([[{ blockTag: 'latest' }], [{ blockNumber: block.number }]]);
	const info = service.getFcsInfo();
	expect(info.metadata).toMatchObject({
		blockNumber: '123',
		blockHash: block.hash,
		blockTimestamp: 1794441600,
		sameBlock: true,
		readStatus: { bid: 'available' },
	});
	expect(info.token).toEqual({ ask: 2, bid: 2, totalAssets: 2, totalSupply: 2, isBinding: false });
	expect(new Date(info.metadata.fetchedAt).getTime()).not.toBeNaN();
	expect(service.getFcsInfo()).toBe(info);
});

test.each(['read failure', 'reorg', 'missing block'])(
	'failed refresh retains previous data and original timestamps: %s',
	async (failure) => {
		await service.updateFcsInfo();
		const previous = service.getFcsInfo();
		if (failure === 'read failure') client.readContract.mockRejectedValue(new Error('unavailable'));
		if (failure === 'reorg')
			client.getBlock.mockResolvedValueOnce(block).mockResolvedValueOnce({ ...block, hash: `0x${'cd'.repeat(32)}` });
		if (failure === 'missing block') client.getBlock.mockResolvedValueOnce({ number: null, hash: null });
		await expect(service.updateFcsInfo()).rejects.toThrow();
		expect(service.getFcsInfo()).toBe(previous);
	}
);

test.each([true, false])('bid failure is distinguishable from a legitimate zero: fallback=%s', async (fails) => {
	client.readContract.mockImplementation(async ({ functionName }) => {
		if (functionName === 'bid' && fails) throw new Error('reverted');
		return functionName === 'isBinding' ? false : 0n;
	});
	await service.updateFcsInfo();
	expect(service.getFcsInfo().token.bid).toBe(0);
	expect(service.getFcsInfo().metadata.readStatus.bid).toBe(fails ? 'fallback' : 'available');
});
