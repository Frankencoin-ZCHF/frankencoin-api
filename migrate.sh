#!/bin/bash
set -e

echo "🚀 Starting production migration..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
yarn prisma:generate

# Apply database migrations
echo "🗄️  Applying database migrations..."
yarn prisma:migrate:deploy

# Migrate data from Storj to PostgreSQL
echo "📊 Migrating Storj data to database..."
yarn migrate:storj

# Verify migration
echo "✅ Verifying migration..."
yarn verify:migration

echo "✨ Migration complete!"
