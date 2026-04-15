import { registerAs } from '@nestjs/config';

export default registerAs('coingecko', () => ({
	apiKey: process.env.COINGECKO_API_KEY,
}));
