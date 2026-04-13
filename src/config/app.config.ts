import { registerAs } from '@nestjs/config';
import { SupportedChainIds, ChainId } from '@frankencoin/zchf';

export default registerAs('app', () => ({
	appUrl: process.env.CONFIG_APP_URL || 'https://app.frankencoin.com',
	port: parseInt(process.env.PORT, 10) || 3000,
	databaseEnabled: process.env.DISABLE_DATABASE !== 'true',
	supportedChainIds: SupportedChainIds as ChainId[],
}));
