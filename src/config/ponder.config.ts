import { registerAs } from '@nestjs/config';

export default registerAs('ponder', () => ({
	indexerUrl: process.env.CONFIG_INDEXER_URL || 'https://ponder.frankencoin.com',
	backupIndexerUrl: process.env.CONFIG_BACKUP_INDEXER_URL || null,
}));
