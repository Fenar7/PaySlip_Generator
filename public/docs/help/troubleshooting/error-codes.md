# Error Codes Reference

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check your request body/params |
| 401 | Unauthorized | Verify your API token or re-login |
| 403 | Forbidden | You lack permission for this action |
| 404 | Not Found | Resource doesn't exist or wrong org |
| 409 | Conflict | Resource state conflict (e.g., already paid) |
| 422 | Unprocessable | Validation failed — check error details |
| 429 | Rate Limited | Slow down, respect Retry-After header |
| 500 | Server Error | Retry after a moment; contact support if persistent |

## Application Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `AUTH_REQUIRED` | No valid session | Log in again |
| `ORG_REQUIRED` | No org context | Select or create an organization |
| `PLAN_LIMIT` | Feature requires upgrade | Upgrade your subscription plan |
| `VALIDATION_ERROR` | Input validation failed | Check the `details` array for specifics |
| `DUPLICATE_ENTRY` | Record already exists | Use the existing record or update it |
| `STATE_CONFLICT` | Invalid state transition | Check the resource's current state |
| `RATE_LIMITED` | Too many requests | Wait and retry with backoff |
| `IDEMPOTENCY_CONFLICT` | Duplicate idempotency key | Use a new idempotency key |

## Debugging Tips

1. **Check the response body** — Error details include field-level information
2. **Use idempotency keys** — For POST requests, include `X-Idempotency-Key` header
3. **Enable verbose logging** — Set `DEBUG=slipwise:*` in your integration
4. **Check webhook logs** — Settings → Developer → Webhooks shows delivery history
