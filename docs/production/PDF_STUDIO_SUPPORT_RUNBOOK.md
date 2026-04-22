# PDF Studio Support Runbook

Use this runbook for worker-backed PDF Studio issues in the Phase 34 launch stack.

## Scope

- Office conversions
- HTML to PDF
- batch jobs
- retry/dead-letter handling
- download retention and bundle expiry questions

## Minimum support payload

Collect all of the following before escalating engineering work:

1. Job ID
2. Tool name
3. Current status (`pending`, `processing`, `retry_pending`, `completed`, `dead_letter`)
4. Failure code
5. Failure message
6. Whether **Retry** is available
7. Active plan and retention window shown in the workspace

## First-line support workflow

1. Open **PDF Studio → Readiness & Diagnostics**
2. Find the job in **Recent failures and retries**
3. Confirm whether the job is still retrying automatically
4. Open the linked troubleshooting guide for the failure code
5. Ask the user to retry only if the guide says the source input is still valid

## Escalate immediately when

- the same job hits `storage_error` twice
- `conversion_failed` repeats after a retry
- a user reports missing outputs but the job is `completed`
- the job is no longer retryable and the failure code is unclear

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

## Recovery notes

- `retry_pending` means the worker will retry automatically; do not manually restart it unless it becomes `dead_letter`
- `dead_letter` means the job exhausted retries or hit a permanent failure
- expired downloads are expected after the plan retention window; rerun the job to generate new outputs
