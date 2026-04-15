import { registerAs } from '@nestjs/config';

export default registerAs('viem', () => ({
	alchemyRpcKey: process.env.ALCHEMY_RPC_KEY,
}));
