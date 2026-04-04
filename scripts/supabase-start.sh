#!/usr/bin/env bash
# Loads env vars from .env and starts self-hosted Supabase with SMTP configured.
# Usage: npm run supabase:start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "✓ Loaded env vars from .env"
  if [ -z "$BREVO_SMTP_USER" ]; then
    echo "  ⚠ BREVO_SMTP_USER is not set — check .env"
  else
    echo "  BREVO_SMTP_USER = $BREVO_SMTP_USER"
  fi
  if [ -z "$BREVO_SMTP_KEY" ]; then
    echo "  ⚠ BREVO_SMTP_KEY is not set — check .env"
  else
    echo "  BREVO_SMTP_KEY  = (set)"
  fi
else
  echo "⚠ No .env file found at $ENV_FILE"
  echo "  Create one from .env.example and add BREVO_SMTP_USER + BREVO_SMTP_KEY"
fi

cd "$ROOT_DIR"
echo ""
echo "▶ Starting Supabase (self-hosted)..."
supabase start --ignore-health-check
