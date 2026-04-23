# PDF Studio Support Runbook

Use this runbook for PDF Studio issues in the Phase 34 launch stack. Worker-backed conversions have persistent job diagnostics; browser-first utilities rely on telemetry plus the suite recovery guide.

## Support lanes

### Worker-backed conversions

- Office conversions
- HTML to PDF
- batch jobs
- retry/dead-letter handling
- download retention and bundle expiry questions

### Browser-first utilities

- merge / split / organize / rotate / repair / OCR and other in-browser tools
- upload/runtime/export failures that do not create server jobs
- recovery questions that depend on route, browser, and failure stage rather than job IDs

## Minimum support payload

### Worker-backed conversions

Collect all of the following before escalating engineering work:

1. Job ID
2. Tool name
3. Current status (`pending`, `processing`, `retry_pending`, `completed`, `dead_letter`)
4. Failure code
5. Failure message
6. Whether **Retry** is available
7. Active plan and retention window shown in the workspace

### Browser-first utilities

Collect all of the following before escalating engineering work:

1. Tool route
2. Tool name
3. Failure stage (`upload`, `process`, `render`, or `generate`)
4. Failure reason shown in recovery guidance when available
5. Browser + OS
6. Whether refresh and re-upload changed the result

## First-line support workflow

1. Open **PDF Studio → Readiness & Diagnostics**
2. Decide which support lane applies:
   - worker-backed conversion -> use the readiness page and job guide
   - browser-first utility -> use the suite support guide and telemetry-backed recovery path
3. For worker-backed conversions, find the job in **Recent failures and retries**
4. Confirm whether the job is still retrying automatically
5. Open the linked troubleshooting guide for the failure code or browser failure reason
6. Ask the user to retry only if the guide says the source input is still valid

## Escalate immediately when

- the same job hits `storage_error` twice
- `conversion_failed` repeats after a retry
- a user reports missing outputs but the job is `completed`
- the job is no longer retryable and the failure code is unclear
- a browser-first runtime/export failure repeats after refresh and re-upload

## Engineering handoff template

Include:

- job ID
- org ID
- user ID (if available)
- tool ID
- target format
- failure code
- failure message
- retry count
- whether the source was single-file or batch

For browser-first escalations, replace job-specific fields with:

- tool route
- failure stage
- failure reason
- browser + OS
- whether refresh/re-upload changed the outcome

## Recovery notes

- `retry_pending` means the worker will retry automatically; do not manually restart it unless it becomes `dead_letter`
- `dead_letter` means the job exhausted retries or hit a permanent failure
- expired downloads are expected after the plan retention window; rerun the job to generate new outputs
- browser-first tools do not expose persistent job IDs; support depends on sanitized telemetry plus the suite guide at `/help/troubleshooting/pdf-studio-support`
