# Phase 37 Sprint 37.2 PR #191 Remediation Prompt

## Kimi K2.6 Prompt

```text
You are a senior software engineering team working on PDF Studio production hardening in this repository:

- /Users/mac/Fenar/Zenxvio/product-works/payslip-generator

Your task is to update the existing Sprint 37.2 branch and PR so the implementation fully satisfies the Sprint 37.2 PRD and closes the remaining correctness/reliability gaps found in review.

Current PR context:
- Branch: feature/pdf-studio-phase-37-sprint-37-2
- PR target: feature/pdf-studio-phase-37
- PR URL: https://github.com/Fenar7/PaySlip_Generator/pull/191

Do not open a replacement PR. Update the existing branch and PR.

---

## Authoritative scope

Read first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md

Use specifically:
- Phase 37
- Sprint 37.2 — Processing Conversion Reliability and Retry Closure

Sprint 37.2 objective:
- Make worker-backed conversion tools resumable, diagnosable, and trustworthy under failure and retry conditions.

Acceptance criteria that still matter for this remediation:
- Retryable failures requeue correctly and preserve user-facing recovery guidance
- Permanent validation failures do not churn in retry loops
- Dead-letter jobs expose enough information for support and users to act correctly
- Processing-lane history and readiness views agree on failure/retry counts

---

## Review findings you must fix

These findings are concrete and already verified against the branch code. Fix all of them.

### Finding 1: source availability is computed from payload shape, not real storage state

Current issue:
- src/features/docs/pdf-studio/lib/conversion-jobs.ts
- hasAvailableSources() only checks whether a source manifest still has a storageKey string
- It does not verify the source object still exists in storage

Why this is wrong:
- A deleted/missing source file can still leave a storage key in payload
- That makes sourceAvailable and canRetry report true when the source is actually gone
- This violates Sprint 37.2’s requirement that retry/resume behavior only work when original inputs are still available

Required fix:
- Add a real storage existence check in the server storage layer used by PDF Studio conversions
- Use actual storage existence, not just presence of a storageKey string, when computing:
  - sourceAvailable
  - canRetry
  - manual retry eligibility in retryPdfStudioConversionJob()
  - history/job status surfaces
- Keep org-scoped and secure behavior intact

### Finding 2: batch jobs can be marked completed even when some pending sources are missing

Current issue:
- src/features/docs/pdf-studio/lib/process-conversion-job.ts filters batch sources down to only those with a storageKey
- It processes only those available entries
- Then it calls markPdfStudioConversionComplete()
- src/features/docs/pdf-studio/lib/conversion-jobs.ts does not verify that all expected outputs exist before setting status to completed

Why this is wrong:
- A partially missing batch can be reported as fully completed
- Missing inputs are silently skipped
- failedItems / retry / support semantics become inaccurate
- This breaks the trustworthiness requirement of Sprint 37.2

Required fix:
- For batch jobs, missing pending sources must be treated as a real failure state
- Do not silently skip missing pending sources and still complete the job
- Preserve any already-generated outputs
- If remaining sources are unavailable, fail the job with deterministic source-unavailable behavior
- Harden markPdfStudioConversionComplete() so it cannot mark a job completed unless output coverage matches totalItems

### Finding 3: readiness/diagnostics do not match workspace recovery semantics

Current issue:
- src/features/docs/pdf-studio/lib/support.ts
- src/app/app/docs/pdf-studio/readiness/page.tsx
- workspace history now distinguishes:
  - Automatic retry queued
  - Failed — manual retry available
  - Failed — source repair required
  - Failed — terminal error
- readiness still renders generic Retry queued / Failed states and generic recovery messaging

Why this is wrong:
- Sprint 37.2 requires processing-lane history and readiness views to agree
- Right now workspace and readiness do not share the same recovery-state semantics

Required fix:
- Create one shared recovery-state helper or equivalent shared derivation
- Use it in both:
  - server-conversion workspace/history
  - readiness/support diagnostics
- Readiness must render the same recovery-state distinctions as workspace history
- source_unavailable must show source-repair guidance, not generic failed-job copy

---

## Implementation requirements

Follow these rules:

1. Keep scope tightly on the findings above
- Do not widen into Sprint 37.3 cleanup across unrelated tool families
- Do not refactor unrelated PDF Studio features

2. Preserve existing contracts unless required by the fix
- Avoid unnecessary route shape changes
- Keep org authorization and feature gating intact

3. Prefer shared logic over duplicated UI mapping
- Recovery-state derivation should not exist separately in multiple inconsistent forms

4. Production-quality only
- No placeholders
- No dead code
- No comments that explain obvious code
- No AI slop

---

## Files to inspect first

- src/features/docs/pdf-studio/lib/conversion-jobs.ts
- src/features/docs/pdf-studio/lib/process-conversion-job.ts
- src/features/docs/pdf-studio/lib/support.ts
- src/app/app/docs/pdf-studio/readiness/page.tsx
- src/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace.tsx
- src/lib/storage/upload-server.ts
- related tests under:
  - src/features/docs/pdf-studio/lib/*.test.ts
  - src/features/docs/pdf-studio/components/server-conversion/*.test.tsx
  - src/app/api/pdf-studio/conversions/**/__tests__/

---

## Required behavior after the fix

### Source availability
- sourceAvailable must reflect actual storage reality for attachment-backed jobs
- canRetry must only be true when retry is both logically allowed and the source still exists
- Manual retry must fail deterministically if the underlying source object is gone

### Batch job correctness
- A batch job is completed only when outputs cover every expected input item
- Partial output plus missing remaining source must not produce completed status
- Partial output must remain diagnosable
- Job status and counts must remain trustworthy for support and users

### Readiness / workspace parity
- Readiness and workspace must present aligned recovery states
- At minimum keep these states aligned:
  - automatic_retry
  - manual_retry
  - source_repair
  - terminal_error

---

## Test requirements

Add or update tests for all fixed behaviors.

Minimum required coverage:

1. conversion-jobs tests
- sourceAvailable false when payload still has a storage key but storage object no longer exists
- canRetry false when source manifest exists but backing file is missing
- manual retry rejects when storage existence check fails

2. process-conversion-job tests
- batch job with mixed available and missing pending sources must not be marked completed
- partial outputs remain preserved while job lands in failed/dead-letter behavior
- completion path cannot succeed when outputs do not cover totalItems

3. support/readiness tests
- readiness recent issue cards show the same recovery-state distinctions as workspace history
- source_unavailable maps to source-repair guidance
- retry_pending and dead_letter manual retry remain visually distinct

4. regression protection
- existing Sprint 37.2 behaviors that already work must stay green

Run at minimum:
- focused Sprint 37.2 tests first
- npm run test
- npm run build
- npm run lint on touched files at minimum

If full-repo lint or type debt remains outside this sprint, report it clearly and separate it from this PR’s fixes.

---

## Git / PR rules

- Work only on feature/pdf-studio-phase-37-sprint-37-2
- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Update PR #191

Suggested commit sequence:
1. fix(pdf-studio): verify source availability from storage state
2. fix(pdf-studio): prevent partial batch completion on missing sources
3. fix(pdf-studio): align readiness recovery states with workspace history
4. test(pdf-studio): add sprint 37.2 remediation coverage

Suggested PR title remains acceptable. Update the PR body to mention:
- real storage-backed source availability checks
- batch completion invariant hardening
- readiness/workspace recovery-state alignment

---

## Final response format

When done, reply with:

1. Branch / PR
- branch
- PR URL
- whether PR is updated and ready

2. Fixes applied
- backend
- readiness/UI
- test coverage

3. Validation
- exact commands run
- result summary
- any unrelated repo-wide issues still present

4. Residual risks
- only real remaining risks
- mention anything that should intentionally wait for Sprint 37.3
```
