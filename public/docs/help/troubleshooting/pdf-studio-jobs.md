# PDF Studio Job Recovery

Use this guide when a worker-backed PDF Studio job fails, retries, or needs support follow-up.

## What to collect before escalating

Always keep:

1. **Job ID** — shown in the conversion workspace and readiness diagnostics page
2. **Failure code** — shown next to the job error when the worker returns a specific reason
3. **Tool name** — for example `PDF to Word`, `HTML to PDF`, or `Word to PDF`
4. **Current status** — `retry_pending`, `dead_letter`, or `completed` with an expired result

## First recovery steps

1. Open **PDF Studio → Readiness & Diagnostics**
2. Check whether the job is still retrying automatically
3. If the job is in `dead_letter`, reopen the tool workspace and use the **Retry** action when available
4. If the retry is unavailable, review the failure code table below and correct the source input before rerunning

## Failure codes and actions

<h3 id="feature_not_available"><code>feature_not_available</code></h3>

- The current plan does not allow that tool or job shape.
- Reopen the workspace route and confirm the active organization plan.

<h3 id="rate_limited"><code>rate_limited</code></h3>

- The workspace hit a request throttle.
- Wait for the queue to settle, then retry.

<h3 id="too_many_active_jobs"><code>too_many_active_jobs</code></h3>

- The org already has the maximum number of queued/processing conversion jobs.
- Wait for one of the existing jobs to finish before starting another.

<h3 id="unsupported_input"><code>unsupported_input</code></h3>

- The worker rejected the file or source type.
- Re-export the source in a supported format and retry.

<h3 id="file_too_large"><code>file_too_large</code></h3>

- The source file is larger than the supported limit.
- Reduce size, split the source, or move to the appropriate plan where applicable.

<h3 id="page_limit_exceeded"><code>page_limit_exceeded</code></h3>

- The source file exceeds the supported page-count limit.
- Reduce the page count or switch to the required plan tier.

<h3 id="password_protected"><code>password_protected</code></h3>

- The worker cannot process a locked file.
- Unlock the file first, then retry.

<h3 id="malformed_pdf"><code>malformed_pdf</code></h3>

- The PDF is damaged or unsafe to parse.
- Try the repair tool first or re-export the source PDF from the authoring system.

<h3 id="malformed_docx"><code>malformed_docx</code></h3>

- The DOCX could not be rendered reliably.
- Re-save or re-export the document, then retry.

<p id="html_asset_blocked"></p>
<h3 id="html_remote_disabled"><code>html_remote_disabled</code> / <code>html_asset_blocked</code></h3>

- Remote HTML assets were blocked.
- Keep HTML exports self-contained: inline fonts, CSS, and images where possible.

<h3 id="html_render_timeout"><code>html_render_timeout</code></h3>

- HTML rendering exceeded the processing window.
- Simplify the document or split the export into smaller runs.

<h3 id="storage_error"><code>storage_error</code></h3>

- Source or output storage failed.
- Retry once. If it repeats, escalate with the job ID and failure code.

<h3 id="conversion_failed"><code>conversion_failed</code></h3>

- The worker failed without a more specific recovery code.
- Retry once, then escalate with the job ID if the failure repeats.

## When to escalate

Escalate after:

- a repeated `storage_error`
- a repeated `conversion_failed`
- any `dead_letter` job that still fails after the recommended retry
- a job that remains stuck in `retry_pending` longer than the readiness page indicates

When escalating, include the **job ID**, **failure code**, **tool**, and a short note about the source file type.
