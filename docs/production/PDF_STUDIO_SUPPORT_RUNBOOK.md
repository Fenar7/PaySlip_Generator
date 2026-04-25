# PDF Studio Support Runbook

**Version:** Phase 38 baseline  
**Date:** 2026-04-25  
**Scope:** PDF Studio 37-tool suite  

Use this runbook for PDF Studio support issues. Worker-backed conversions have persistent job diagnostics; browser-first utilities rely on telemetry plus the suite recovery guide.

---

## 1. Support Lanes

### Worker-backed conversions (7 tools)

Tools that enqueue tracked server jobs:

- `pdf-to-word` — PDF to DOCX
- `pdf-to-excel` — PDF to XLSX
- `pdf-to-ppt` — PDF to PPTX
- `word-to-pdf` — DOCX to PDF
- `html-to-pdf` — HTML to PDF
- `protect` — AES-256 password encryption (hybrid)
- `unlock` — Password removal / lossy decryption (hybrid)

Support scope:
- Job IDs, failure codes, queue depth, retry state
- Download retention and bundle expiry
- Batch job questions

### Browser-first utilities (30 tools)

All remaining tools run entirely in the browser:

- **Page Organization:** create, jpg-to-pdf, merge, alternate-mix, split, extract-pages, delete-pages, organize, rotate, resize-pages
- **Edit & Enhance:** fill-sign, editor, create-forms, page-numbers, bates, metadata, rename, watermark, grayscale, header-footer, remove-annotations, bookmarks, flatten, repair, deskew
- **Convert & Export:** ocr, pdf-to-image, extract-images, pdf-to-text, n-up

Support scope:
- Upload, runtime, render, and export failures
- Recovery depends on route, browser, and failure stage (no job IDs)

---

## 2. Minimum Support Payload

### Worker-backed conversions

Collect all of the following before escalating engineering work:

1. Job ID
2. Tool name
3. Current status (`pending`, `processing`, `retry_pending`, `completed`, `dead_letter`)
4. Failure code (e.g., `malformed_pdf`, `storage_error`, `rate_limited`, `conversion_failed`)
5. Failure message
6. Whether **Retry** is available
7. Active plan and retention window shown in the workspace

### Browser-first utilities

Collect all of the following before escalating engineering work:

1. Tool route (e.g., `/pdf-studio/merge`)
2. Tool name
3. Failure stage (`upload`, `process`, `render`, or `generate`)
4. Failure reason shown in recovery guidance when available
5. Browser + OS
6. Whether refresh and re-upload changed the result

---

## 3. First-Line Support Workflow

1. Open **PDF Studio → Readiness & Diagnostics** (`/app/docs/pdf-studio/readiness`)
2. Decide which support lane applies:
   - Worker-backed conversion → use the readiness page and job guide (`/help/troubleshooting/pdf-studio-jobs`)
   - Browser-first utility → use the suite support guide (`/help/troubleshooting/pdf-studio-support`) and telemetry-backed recovery path
3. For worker-backed conversions, find the job in **Recent failures and retries**
4. Confirm whether the job is still retrying automatically (`retry_pending`)
5. Open the linked troubleshooting guide for the failure code or browser failure reason
6. Ask the user to retry only if the guide says the source input is still valid

---

## 4. Escalate Immediately When

- The same job hits `storage_error` twice
- `conversion_failed` repeats after a retry
- A user reports missing outputs but the job is `completed`
- The job is no longer retryable and the failure code is unclear
- A browser-first runtime/export failure repeats after refresh and re-upload
- Plan-gate behavior appears incorrect (e.g., Pro tool accessible on Starter)

---

## 5. Engineering Handoff Template

Include:

- Job ID (worker-backed only)
- Org ID
- User ID (if available)
- Tool ID
- Target format (conversions only)
- Failure code
- Failure message
- Retry count
- Whether the source was single-file or batch

For browser-first escalations, replace job-specific fields with:

- Tool route
- Failure stage
- Failure reason
- Browser + OS
- Whether refresh/re-upload changed the outcome

---

## 6. Recovery Notes

- `retry_pending` — the worker will retry automatically; do not manually restart unless it becomes `dead_letter`
- `dead_letter` — the job exhausted retries or hit a permanent failure
- Expired downloads are expected after the plan retention window; rerun the job to generate new outputs
- Browser-first tools do not expose persistent job IDs; support depends on sanitized telemetry plus the suite guide
- Retention windows: Free/Starter = 24h, Pro = 72h (3 days), Enterprise = 168h (7 days)
- History limits: Starter = 10 entries, Pro = 25, Enterprise = 50, Free = 0

---

## 7. Key Routes and References

| Route | Purpose |
|---|---|
| `/app/docs/pdf-studio/readiness` | Diagnostics dashboard |
| `/help/troubleshooting/pdf-studio-support` | Suite support guide (browser-first) |
| `/help/troubleshooting/pdf-studio-jobs` | Worker job guide (processing-lane) |
| `/pdf-studio` | Public hub (discovery) |
| `/app/docs/pdf-studio` | Workspace hub (signed-in) |

---

*For suite state and handoff, see `docs/PDF studio/pdf-studio-engineering-handoff.md`.*  
*For launch readiness, see `docs/production/PDF_STUDIO_LAUNCH_CHECKLIST.md`.*
