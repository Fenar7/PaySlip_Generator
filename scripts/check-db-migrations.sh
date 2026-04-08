#!/usr/bin/env bash
# Verifies that all Prisma migrations have been applied to the connected database.
# Exits with code 1 if the database is out of sync.
# Usage: npm run db:check

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Source .env if present
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is not set. Cannot check migration status."
  exit 1
fi

echo "▶ Checking Prisma migration status..."
OUTPUT=$(npx prisma migrate status 2>&1) || true

if echo "$OUTPUT" | grep -q "Database schema is up to date"; then
  echo "✓ Database schema is up to date with all migrations."
  exit 0
fi

if echo "$OUTPUT" | grep -q "Following migration"; then
  echo ""
  echo "✗ DATABASE SCHEMA DRIFT DETECTED"
  echo "  The connected database is behind the Prisma schema."
  echo ""
  echo "$OUTPUT" | grep -A100 "Following migration"
  echo ""
  echo "  Fix: run 'npx prisma migrate deploy' or 'npm run supabase:start'"
  echo ""
  exit 1
fi

if echo "$OUTPUT" | grep -q "P1001"; then
  echo "✗ Cannot connect to database at ${DATABASE_URL%%@*}@..."
  echo "  Is Supabase running? Try: npm run supabase:start"
  exit 1
fi

# Unexpected output — show it
echo "$OUTPUT"
exit 1
