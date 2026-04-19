# Public API v1.0

## Overview

The Slipwise Public API allows you to integrate your systems with Slipwise programmatically. All endpoints are versioned under `/api/v1/`.

## Authentication

All API requests require a Bearer token:

```bash
curl -H "Authorization: Bearer sk_live_xxxx" \
  https://app.slipwise.com/api/v1/invoices
```

Generate API tokens in **Settings → Developer → API Keys**.

## Rate Limits

Rate limits depend on your subscription tier:

| Tier | Requests/minute | Burst |
|------|----------------|-------|
| Free | 60 | 10 |
| Pro | 300 | 50 |
| Enterprise | 1,000 | 100 |

Rate limit headers are included in every response:
- `X-RateLimit-Limit` — Your tier limit
- `X-RateLimit-Remaining` — Requests remaining
- `X-RateLimit-Reset` — Unix timestamp when the window resets

## Endpoints

### Invoices
- `GET /api/v1/invoices` — List invoices
- `POST /api/v1/invoices` — Create invoice
- `GET /api/v1/invoices/:id` — Get invoice
- `PATCH /api/v1/invoices/:id` — Update invoice

### Customers
- `GET /api/v1/customers` — List customers
- `POST /api/v1/customers` — Create customer
- `GET /api/v1/customers/:id` — Get customer

### Webhooks
- `GET /api/v1/webhooks` — List webhook endpoints
- `POST /api/v1/webhooks` — Register endpoint
- `DELETE /api/v1/webhooks/:id` — Delete endpoint

## Error Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Line items must have a positive quantity",
    "details": [{ "field": "lineItems[0].quantity", "issue": "must be > 0" }]
  }
}
```

## Webhooks

Configure webhook endpoints to receive real-time events:
- `invoice.created`, `invoice.paid`, `invoice.overdue`
- `payment.received`, `payment.failed`
- `customer.created`, `customer.updated`

Failed deliveries are retried with exponential backoff (5 attempts).
