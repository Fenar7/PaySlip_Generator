#!/usr/bin/env bash
# Verifies that the configured Prisma datasource is reachable, has all migrations
# applied, and matches the current Prisma schema.
# Usage: npm run db:check

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Source .env if present
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

TARGET_DATABASE_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [ -z "$TARGET_DATABASE_URL" ]; then
  echo "✗ DIRECT_URL or DATABASE_URL must be set. Cannot check migration status."
  exit 1
fi

REDACTED_TARGET=$(printf '%s' "$TARGET_DATABASE_URL" | sed -E 's#(postgres(ql)?://)[^@]+@#\1***:***@#')

echo "▶ Prisma datasource target"
echo "  $REDACTED_TARGET"
echo ""

echo "▶ Validating Prisma schema..."
npx prisma validate >/dev/null
echo "✓ Prisma schema is valid"
echo ""

echo "▶ Checking Prisma migration status..."
STATUS_OUTPUT=$(npx prisma migrate status 2>&1) || STATUS_CODE=$?
STATUS_CODE=${STATUS_CODE:-0}

if echo "$STATUS_OUTPUT" | grep -q "P1001"; then
  echo "✗ DATABASE UNREACHABLE"
  echo "$STATUS_OUTPUT" | sed -n '/P1001/,$p'
  echo ""
  echo "  Fix: start the expected database target, then rerun 'npm run db:check'."
  exit 1
fi

if echo "$STATUS_OUTPUT" | grep -q "Following migrations have not yet been applied:"; then
  echo "✗ PENDING MIGRATIONS DETECTED"
  echo "  The configured database is reachable, but it is behind the migration history."
  echo ""
  echo "$STATUS_OUTPUT" | sed -n '/Following migrations have not yet been applied:/,$p'
  echo ""
  echo "  Fix: run 'npx prisma migrate deploy' against the same datasource."
  exit 1
fi

if [ "$STATUS_CODE" -ne 0 ]; then
  echo "$STATUS_OUTPUT"
  exit 1
fi

echo "✓ All recorded migrations are applied"
echo ""

echo "▶ Checking live schema drift..."
DIFF_OUTPUT=$(npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code 2>&1) || DIFF_CODE=$?
DIFF_CODE=${DIFF_CODE:-0}

if [ "$DIFF_CODE" -eq 0 ]; then
  echo "✓ Live schema matches prisma/schema.prisma"
  exit 0
fi

if [ "$DIFF_CODE" -eq 2 ]; then
  echo "✗ LIVE SCHEMA DRIFT DETECTED"
  echo "  The database is migrated, but its live schema still differs from prisma/schema.prisma."
  echo ""
  echo "$DIFF_OUTPUT"
  exit 1
fi

echo "$DIFF_OUTPUT"
exit 1
