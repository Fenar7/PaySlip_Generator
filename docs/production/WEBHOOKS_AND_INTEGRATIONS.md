# Webhooks and Integrations

## Webhook signature verification

Slipwise signs webhook deliveries with these headers:

- `X-Slipwise-Signature: sha256=<hex-hmac>`
- `X-Slipwise-Timestamp: <unix-seconds>`
- `X-Slipwise-Delivery: <delivery-id>`
- `X-Slipwise-Event: <event-type>`

Consumers should:

1. Read the **raw** request body without re-serializing it.
2. Compute `HMAC_SHA256(signingSecret, timestamp + "." + rawBody)`.
3. Prefix the hex digest with `sha256=` and compare it to `X-Slipwise-Signature`.
4. Reject stale timestamps and replayed `X-Slipwise-Delivery` values.

Legacy endpoints created before the canonical v2 stack may not have a usable signing secret stored. Those endpoints must rotate their secret in **Settings → Webhooks** before signed deliveries resume.

## Integration token storage

QuickBooks and Zoho access/refresh tokens are still stored in the `OrgIntegration` table without application-layer encryption. This lane documents that risk instead of claiming it is solved.

Required platform controls until application-level encryption is added:

1. Database storage and backups must remain encrypted at rest.
2. Production database access must stay restricted to a minimal operator set.
3. Any database snapshot export must be handled as credential-bearing material.
4. If database exposure is suspected, rotate the affected provider credentials and reconnect the integrations.
