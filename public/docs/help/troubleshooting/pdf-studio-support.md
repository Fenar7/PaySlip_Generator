# PDF Studio Support & Recovery

Use this guide for suite-level PDF Studio support triage across both browser-first utilities and worker-backed conversions.

## Two support lanes

PDF Studio has two different recovery models:

1. **Browser-first tools** run in the current tab. They do not create persistent server job IDs. Support depends on the tool route, failure stage/reason, and whether the issue repeats after refresh or re-upload.
2. **Worker-backed conversions** create tracked jobs with job IDs, failure codes, and readiness diagnostics. Use the dedicated [PDF Studio Job Recovery](/help/troubleshooting/pdf-studio-jobs) guide for those tools.

## Browser-first tools: what to collect

When a browser-first tool fails, keep:

1. **Tool name and route** — for example `Merge PDFs` on `/app/docs/pdf-studio/merge`
2. **Failure stage** — upload, process, render, or generate
3. **Failure reason** — when the UI surfaces one through the recovery guidance
4. **Browser + OS** — browser version matters for PDF/OCR/runtime failures
5. **Whether refresh/re-upload changes the result**

Browser-first tools emit sanitized support telemetry for real runtime/export failures, but they do **not** expose persistent job IDs or queue depth.

## Browser-first recovery steps

1. Refresh the tool route once and retry with the same source file
2. Re-upload the source so the browser session rebuilds local state
3. Open the workspace **Readiness & Diagnostics** page to confirm whether the issue is browser-only or a worker-backed incident
4. If the tool still fails, use the reason-specific guidance below before escalating

<h3 id="pdf-read-failed"><code>pdf-read-failed</code></h3>

- The browser could not parse the uploaded PDF safely.
- Re-export the source PDF or try a cleaner copy before retrying.

<h3 id="pdf-runtime-failed"><code>pdf-runtime-failed</code></h3>

- The in-browser PDF runtime failed unexpectedly.
- Refresh once, re-upload, and retry in the same browser before escalating.

<h3 id="processing-failed"><code>processing-failed</code></h3>

- The browser-side transform failed during edit/export work.
- Retry once, then narrow the operation (fewer pages, smaller range, or simpler settings).

<h3 id="render-failed"><code>render-failed</code></h3>

- Page rendering or preview generation failed in the browser.
- Refresh the route and retry with the same file. If it repeats, escalate with the tool route and browser version.

<h3 id="ocr-unavailable"><code>ocr-unavailable</code></h3>

- OCR could not initialize in the current browser session.
- Refresh the page, retry OCR, and confirm the browser still supports the local OCR runtime.

<h3 id="encryption-failed"><code>encryption-failed</code></h3>

- Browser-side protect/unlock processing could not finish the encryption step.
- Recheck password settings, retry once, and try a smaller source file if the output stays blocked.

<h3 id="no-recoverable-pages"><code>no-recoverable-pages</code> / <code>image-only-output</code></h3>

- The tool could not recover or reconstruct a usable result from the source pages.
- Retry only after simplifying the input or switching to a better source export.

## Worker-backed conversions

Worker-backed tools keep richer diagnostics:

- job IDs
- failure codes
- retry/dead-letter state
- queue depth and history on the readiness page

Use the dedicated [PDF Studio Job Recovery](/help/troubleshooting/pdf-studio-jobs) guide whenever the tool queues a tracked conversion job.

## When to escalate

Escalate after:

- a browser-first runtime/export failure repeats after refresh and re-upload
- the same browser-first issue reproduces across browsers or devices
- a worker-backed conversion keeps failing after the job-recovery steps

Include the tool route, support lane (browser-first or worker-backed), failure stage/reason or failure code, and whether the retry changed the result.
