# Phase 37 Sprint 37.2 PR #191 Second Remediation Prompt

## Kimi K2.6 Prompt

```text
You are a senior software engineering team updating the existing PDF Studio Sprint 37.2 PR in this repository:

- /Users/mac/Fenar/Zenxvio/product-works/payslip-generator

This is a narrow second remediation pass for PR #191. Do not open a replacement PR. Update the existing branch and PR only.

Current PR context:
- Branch: feature/pdf-studio-phase-37-sprint-37-2
- PR target: feature/pdf-studio-phase-37
- PR URL: https://github.com/Fenar7/PaySlip_Generator/pull/191

---

## Authoritative scope

Read first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md

Use specifically:
- Phase 37
- Sprint 37.2 — Processing Conversion Reliability and Retry Closure

Sprint 37.2 still requires:
- Retry/dead-letter behavior for processing-lane conversions
- Validation of retryable vs non-retryable failure classification
- Resume/retry behavior when original inputs are still available
- Clear history/status presentation for processing jobs

Acceptance criteria still relevant for this pass:
- Retryable failures requeue correctly and preserve user-facing recovery guidance
- Permanent validation failures do not churn in retry loops
- Dead-letter jobs expose enough information for support and users to act correctly
- Processing-lane history and readiness views agree on failure/retry counts

---

## Remaining review findings you must fix

These are the only issues in scope for this pass.

### Finding 1: mixed batch jobs can still report sourceAvailable=true when some required sources are already missing

Current issue:
- src/features/docs/pdf-studio/lib/conversion-jobs.ts
- checkSourcesAvailable() filters manifests down to only those that still have storageKey
- It then checks existence only for those surviving keys

Why this is wrong:
- For a batch job where one required pending source has already lost its storageKey and another still exists, the function can return true
- That causes history/job/readiness surfaces to treat the batch as source-available even though the batch is not actually resumable/retryable without source repair
- This violates Sprint 37.2’s requirement that retry/resume only work when original inputs are still available

Required fix:
- Source availability for a batch must be based on the full required pending-source set
- If any required pending source is already missing its storageKey, the batch must not be considered source-available
- Do not let surviving sources hide missing ones
- Ensure sourceAvailable, canRetry, and recovery-state derivation all reflect full-batch truth

### Finding 2: file existence verification collapses transient/storage/platform errors into permanent source loss

Current issue:
- src/lib/storage/upload-server.ts
- fileExistsServer() returns false for every non-404 storage failure

Why this is wrong:
- Residency failures, auth/provider issues, Supabase errors, and transient storage problems are not proof that the file is missing
- Returning false converts verification problems into permanent source_unavailable behavior
- That can tell users to re-upload when the real issue is infrastructure/storage verification
- This is a failure-classification bug against Sprint 37.2

Required fix:
- Replace the current boolean-only existence check with an explicit result that can distinguish:
  - exists
  - missing
  - verification_error
- Only actual missing-object results may drive source_unavailable / source_repair UX
- Verification/storage/provider/auth failures must preserve retry/support semantics rather than forcing re-upload guidance
- Keep observability/logging for verification errors

---

## Implementation requirements

1. Keep scope tight
- Do not widen into Sprint 37.3 copy cleanup
- Do not refactor unrelated PDF Studio features
- Do not redesign unrelated storage utilities beyond what is needed for correct classification

2. Preserve branch and PR
- Work only on feature/pdf-studio-phase-37-sprint-37-2
- Update PR #191

3. Shared behavior must stay consistent
- Workspace history and readiness must continue to use shared recovery-state derivation
- After your changes, source-repair must only appear for true missing-source cases

4. Production quality bar
- No placeholders
- No dead code
- No AI slop
- No broad speculative refactors

---

## Files to inspect first

- src/features/docs/pdf-studio/lib/conversion-jobs.ts
- src/lib/storage/upload-server.ts
- src/features/docs/pdf-studio/lib/support.ts
- src/app/app/docs/pdf-studio/readiness/page.tsx
- src/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace.tsx
- relevant tests under:
  - src/features/docs/pdf-studio/lib/*.test.ts
  - src/lib/storage/__tests__/
  - src/features/docs/pdf-studio/components/server-conversion/*.test.tsx

---

## Required behavior after the fix

### Batch source availability
- A batch is source-available only when every required pending source is still available
- If one pending source is missing, the batch must not present retry/manual-retry as available
- Recovery state must resolve to source-repair when the missing-source condition is definitive

### Existence verification semantics
- Missing object and verification failure must not be treated as the same thing
- Only definitive “object missing” should map to source_unavailable / source_repair
- Verification failure must retain a failure classification that supports retry/escalation instead of re-upload guidance

### UI / readiness parity
- Workspace and readiness must stay aligned after the new verification result is introduced
- No user-facing surface should show source-repair unless the source is definitively gone

---

## Test requirements

Add or update tests for the remaining defects.

Minimum required coverage:

1. conversion-jobs tests
- mixed batch with one missing pending source and one existing source reports sourceAvailable=false
- mixed batch dead-letter history does not resolve to terminal/manual-retry when source repair is required
- manual retry is blocked when any required pending source is actually missing

2. storage helper tests
- definitive missing object returns missing
- non-404 verification/storage/provider/auth/residency failure does not collapse to missing
- verification-error path remains observable

3. support/readiness/workspace tests
- source-repair state appears only for true missing-source cases
- verification failures do not tell users to re-upload
- shared recovery-state logic remains aligned across readiness and workspace

4. regression coverage
- existing Sprint 37.2 tests that already pass must stay green

Run at minimum:
- focused Sprint 37.2 test slice first
- npm run test
- npm run lint on touched files at minimum
- npm run build

If full build still fails because of the unrelated pre-existing type error outside PDF Studio, call that out clearly and separate it from this PR.

---

## Git / PR rules

- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Update PR #191

Suggested commit sequence:
1. fix(pdf-studio): treat mixed batch source loss as unavailable
2. fix(storage): distinguish missing objects from verification failures
3. test(pdf-studio): cover mixed batch and verification failure recovery states

Update the PR description to mention:
- full-batch source availability correctness
- tri-state storage verification / classification hardening
- recovery-state accuracy for readiness and workspace

---

## Final response format

When done, reply with:

1. Branch / PR
- branch
- PR URL
- whether PR is updated and ready

2. Fixes applied
- batch source-availability logic
- storage verification classification
- readiness/workspace behavior
- tests

3. Validation
- exact commands run
- result summary
- any unrelated repo-wide issue still present

4. Residual risks
- only real remaining risks
- mention anything intentionally left for Sprint 37.3
```
