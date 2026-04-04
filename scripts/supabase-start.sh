#!/usr/bin/env bash
# Loads env vars from .env and starts self-hosted Supabase.
# Automatically enables Brevo SMTP in config.toml when credentials are present.
# Usage: npm run supabase:start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
CONFIG_FILE="$ROOT_DIR/supabase/config.toml"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "✓ Loaded env vars from .env"
else
  echo "⚠ No .env file found at $ENV_FILE"
  echo "  Create one from .env.example"
fi

cd "$ROOT_DIR"

# Dynamically enable/disable Brevo SMTP in config.toml based on credentials
if [ -n "$BREVO_SMTP_USER" ] && [ -n "$BREVO_SMTP_KEY" ]; then
  echo "✓ Brevo credentials found — enabling SMTP (smtp-relay.brevo.com)"
  echo "  BREVO_SMTP_USER = $BREVO_SMTP_USER"
  echo "  BREVO_SMTP_KEY  = (set)"
  sed -i.bak 's/^enabled = false/enabled = true/' "$CONFIG_FILE"
  rm -f "${CONFIG_FILE}.bak"
else
  echo "ℹ No Brevo credentials — using local Inbucket mailbox"
  echo "  View emails at http://127.0.0.1:55324"
  sed -i.bak 's/^enabled = true/enabled = false/' "$CONFIG_FILE"
  rm -f "${CONFIG_FILE}.bak"
fi

echo ""
echo "▶ Starting Supabase (self-hosted)..."
supabase start --ignore-health-check
