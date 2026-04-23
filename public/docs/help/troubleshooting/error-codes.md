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

## PDF Studio Conversion Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `feature_not_available` | The tool or action is not available on the current plan | Reopen the tool in the workspace and verify the active plan |
| `rate_limited` | The org has hit a queue or request throttle | Wait for the Retry-After window, then retry with the same job ID |
| `too_many_active_jobs` | The workspace queue is already full | Wait for current jobs to finish before queuing another conversion |
| `unsupported_input` | The uploaded file type or source is not supported | Re-export the source into a supported format and retry |
| `file_too_large` | The source file is above the supported size limit | Reduce file size, split the source, or upgrade where applicable |
| `page_limit_exceeded` | The source file exceeds the supported page cap | Reduce the page count or move to the required plan tier |
| `password_protected` | The source file is locked | Unlock the file first, then retry the conversion |
| `malformed_pdf` | The PDF cannot be parsed safely | Repair or re-export the PDF before retrying |
| `malformed_docx` | The DOCX cannot be rendered into a stable conversion input | Re-export the DOCX from the authoring tool before retrying |
| `html_remote_disabled` | HTML export attempted to load remote content | Inline required assets and keep the HTML self-contained |
| `html_asset_blocked` | An external HTML asset was blocked | Package the asset locally and retry |
| `html_render_timeout` | HTML rendering exceeded the allowed processing window | Simplify the document or split the export into smaller runs |
| `storage_error` | Source or output storage failed | Retry once. If it fails again, escalate with the job ID and failure code |
| `conversion_failed` | The conversion worker failed without a more specific code | Open the PDF Studio recovery guide and escalate with the job ID if the retry fails |

## Debugging Tips

1. **Check the response body** — Error details include field-level information
2. **Use idempotency keys** — For POST requests, include `X-Idempotency-Key` header
3. **Enable verbose logging** — Set `DEBUG=slipwise:*` in your integration
4. **Check webhook logs** — Settings → Developer → Webhooks shows delivery history
5. **Keep PDF Studio job IDs** — Include the job ID and failure code when you escalate a conversion issue
