#!/usr/bin/env bash
# Stops self-hosted Supabase (preserves DB data by default).
# Usage: npm run supabase:stop
# Pass --no-backup to also wipe DB volumes.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"
echo "■ Stopping Supabase..."
supabase stop "$@"
echo "✓ Done"
