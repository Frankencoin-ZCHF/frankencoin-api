## Frankencoin API

### Setup

```bash
yarn install
cp .env.example .env   # fill in values
```

### Development

```bash
yarn infra:up   # start local docker stack
yarn dev        # install deps + watch mode
```

### NPM package

```bash
# bump version in package.json first
npm login
yarn npm:build
yarn npm:publish
```

### Database

```bash
# apply schema to deployment db (e.g. Railway)
DATABASE_URL=postgresql://... yarn prisma:push

# run a migration script
DATABASE_URL=postgresql://... yarn migrate:subscriptions
```

### DB backup / restore

```bash
# dump to prisma/backup/
DATABASE_URL=postgresql://... yarn prisma:backup

# restore a dump from prisma/backup/
DATABASE_URL=postgresql://... yarn prisma:restore backup_2026-06-24_12-00-00.dump
```

### Environment variables

```
PORT=3030

CONFIG_APP_URL=https://app.frankencoin.com
CONFIG_INDEXER_URL=https://ponder.frankencoin.com
CONFIG_BACKUP_INDEXER_URL=https://ponder.frankencoin.com

# Database configuration (optional - set DISABLE_DATABASE=true to skip)
DATABASE_URL=postgresql://user:password@localhost:5432/frankencoin
DISABLE_DATABASE=false

ALCHEMY_RPC_KEY=...
COINGECKO_API_KEY=CG-...
TELEGRAM_BOT_NAME=...
TELEGRAM_BOT_TOKEN=...
THE_GRAPH_KEY=...
```

MIT licensed.

## GodEye

Interactive fund-flow map of the protocol at `/godeye` (served by the API itself).

- Mirrors the complete ERC20 transfer history (`ERC20Balance` in the indexer) of every tracked token into a compact in-memory ledger, synced incrementally every minute. First start takes about a minute for ZCHF mainnet (~145k transfers).
- Mints and burns that go through a position are routed `0x0 -> position -> owner` (joined on the MintingUpdate tx hash), so loans are traceable end to end.
- Canvas UI: pan/zoom like a map, 3D orbit (`3`), time travel scrubber with playback (`space`), category view (wallets / positions / savings / equity / bridges / DEXes), focus mode (double-click), address history and 2-hop funding origin. State is kept in the URL hash. The address detail links to a deep timeline (`#view=timeline&address=0x…`): one account day by day with its counterparties, insights, activity feed and the same time travel scrubber.
- JSON endpoints (see Swagger, "GodEye Controller"): `/godeye/tokens`, `/godeye/graph`, `/godeye/holders`, `/godeye/timeline`, `/godeye/address/:address`, `/godeye/address/:address/journey`, `/godeye/search`.
