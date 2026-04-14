#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

if [ ! -f "$ROOT_DIR/node_modules/tsx/dist/loader.mjs" ]; then
  echo "tsx runtime not found at node_modules/tsx/dist/loader.mjs"
  exit 1
fi

cd "$ROOT_DIR"

node --import tsx scripts/backfill-document-index.ts
node --import tsx scripts/backfill-template-revisions.ts
