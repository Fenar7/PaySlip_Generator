# Phase 37 Sprint 37.2 Kimi K2.6 Execution Prompt

## Execution Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to implement PDF Studio Phase 37, Sprint 37.2 — Processing Conversion Reliability and Retry Closure — in this repository.

Repository context:
- Repo: /Users/mac/Fenar/Zenxvio/product-works/payslip-generator
- Product area: PDF Studio
- Stack:
  - Next.js App Router
  - TypeScript
  - React
  - Prisma
  - Vitest
  - ESLint
- Key scripts:
  - npm run test
  - npm run build
  - npm run lint

Current branch state:
- Integration branch: pdf-studio-continuation
- Phase branch: feature/pdf-studio-phase-37
- A reviewed-but-not-yet-approved Sprint 37.1 branch exists: feature/pdf-studio-phase-37-sprint-37-1
- Sprint 37.1 has NOT been approved/merged yet

Non-negotiable implication:
- Do not base Sprint 37.2 on Sprint 37.1
- Do not depend on unmerged Sprint 37.1 behavior
- Create Sprint 37.2 from the current head of feature/pdf-studio-phase-37
- PR target must be feature/pdf-studio-phase-37

Do not touch unrelated untracked docs such as:
- docs/opencode/
- docs/codex/
- docs/copilot/

Authoritative scope:
- Read docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Use the Phase 37 section, specifically Sprint 37.2 — Processing Conversion Reliability and Retry Closure

Sprint 37.2 objective:
- Make worker-backed conversion tools resumable, diagnosable, and trustworthy under failure and retry conditions.

In scope:
- Retry/dead-letter behavior for processing-lane conversions
- Validation of retryable vs non-retryable failure classification
- Resume/retry behavior when original inputs are still available
- Failure handling for malformed, oversized, or unsupported source documents
- Clear history/status presentation for processing jobs

Implementation surfaces:
- Conversion job orchestration
- Process-conversion job logic
- Server conversion policy and converters
- Server conversion workspace and history surfaces

Expected behavior changes:
- Conversion jobs keep deterministic retry and dead-letter semantics
- Recovery guidance must match the actual failure class
- History surfaces must reflect whether a job can be retried, resumed, or requires source repair

Acceptance criteria:
- Retryable failures requeue correctly and preserve user-facing recovery guidance
- Permanent validation failures do not churn in retry loops
- Dead-letter jobs expose enough information for support and users to act correctly
- Processing-lane history and readiness views agree on failure/retry counts

Required tests:
- Conversion-jobs tests
- Process-conversion-job tests
- Server-conversion-policy tests
- Workspace tests for retry/recovery surfaces

Inspect these files first before editing:
- src/features/docs/pdf-studio/lib/conversion-jobs.ts
- src/features/docs/pdf-studio/lib/process-conversion-job.ts
- src/features/docs/pdf-studio/lib/server-conversion-policy.ts
- src/features/docs/pdf-studio/lib/server-converters.ts
- src/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace.tsx
- src/app/api/pdf-studio/conversions/route.ts
- src/app/api/pdf-studio/conversions/[jobId]/process/route.ts
- src/app/api/pdf-studio/conversions/[jobId]/retry/route.ts
- src/app/app/docs/pdf-studio/readiness/page.tsx

Inspect relevant tests:
- src/features/docs/pdf-studio/lib/conversion-jobs.test.ts
- src/features/docs/pdf-studio/lib/process-conversion-job.test.ts
- src/features/docs/pdf-studio/lib/server-conversion-policy.test.ts
- route tests under src/app/api/pdf-studio/conversions/**/__tests__/
- workspace/history tests for server conversion UI if present

Use rg first. Read only the smallest slices needed. Be token-efficient.

Branching rules:
1. Never work on master.
2. Never work directly on pdf-studio-continuation.
3. Never work directly on feature/pdf-studio-phase-37.
4. Never branch from feature/pdf-studio-phase-37-sprint-37-1.
5. Create Sprint 37.2 from the current head of feature/pdf-studio-phase-37.
6. Open the PR from Sprint 37.2 back into feature/pdf-studio-phase-37.

Exact branch name:
- feature/pdf-studio-phase-37-sprint-37-2

Required branch flow:
git checkout feature/pdf-studio-phase-37
git pull origin feature/pdf-studio-phase-37
git checkout -b feature/pdf-studio-phase-37-sprint-37-2

Execution standards:

Quality bar:
- No placeholder code
- No dead code
- No fake abstraction
- No speculative rewrites
- No broad refactors outside sprint scope
- No AI slop comments or repetitive boilerplate
- Keep naming aligned with existing PDF Studio patterns
- Reuse existing utilities and conventions before adding new ones

Security and reliability bar:
- Classify retryable vs permanent failures deliberately and consistently
- Do not create infinite retry loops
- Do not lose the ability to diagnose why a job failed
- Ensure retry/resume behavior only occurs when source prerequisites still exist
- Ensure user-facing recovery guidance matches the underlying failure class
- Preserve supportability: failure codes, retry counts, dead-letter visibility, and actionable status text

Token-efficiency bar:
- Do not narrate every step
- Keep progress messages short
- Use repo inspection instead of asking obvious questions
- Do not paste large code blocks into chat unless necessary
- Summarize findings compactly
- Batch searches when possible

Implementation requirements:

1. Retry / dead-letter semantics
- Ensure conversion jobs have deterministic retry behavior
- Retryable failures should move through the intended retry path and preserve retry counts/history
- Permanent failures must stop retrying and route to terminal/dead-letter behavior as appropriate
- Dead-letter records must retain enough structured diagnosis for support and UI surfaces

2. Failure classification correctness
- Review how failures are classified today across:
  - validation failures
  - malformed input
  - oversized input
  - unsupported input
  - transient processor/runtime failures
  - missing or unavailable source material on resume/retry
- Ensure retryability classification matches actual recoverability
- Normalize inconsistent handling if the orchestration layer, processor layer, and converter layer disagree

3. Resume / retry behavior
- Retry and resume should work when original inputs are still valid and available
- If original source material is no longer available, fail deterministically with correct guidance
- Prevent misleading retry-available UI when the retry cannot actually succeed from current state

4. History / readiness consistency
- History/status UI must clearly indicate whether a failed job:
  - is retrying automatically
  - can be manually retried
  - can be resumed
  - requires source repair
  - is terminal/dead-lettered
- Readiness/diagnostics views must agree with history surfaces on counts and status meaning
- Remove mismatches between backend retry state and frontend labels/calls to action

5. API / route hardening
- Review route handlers for retry/process/conversion endpoints
- Ensure error responses, retry actions, and failure payloads expose the correct actionable information
- Keep behavior deterministic and consistent with the job model

Implementation order:
1. Inspect the Sprint 37.2 PRD section and current PDF Studio conversion architecture
2. Inspect existing retry/dead-letter/status behavior across orchestration, processing, routes, workspace UI, and readiness UI
3. Identify exact mismatches against Sprint 37.2 acceptance criteria
4. Implement backend classification and orchestration fixes first
5. Implement retry/resume/dead-letter state fixes second
6. Update UI status/history/readiness presentation third
7. Add and expand tests
8. Run focused tests
9. Run broader validation
10. Prepare a clean PR summary

Do not start with cosmetic UI edits.

Testing requirements:
- Add or update tests that prove the sprint is complete

Minimum coverage:
- conversion-jobs tests
- process-conversion-job tests
- server-conversion-policy tests
- route tests for conversion processing/retry behavior
- workspace/history tests for retry/recovery/status surfaces
- readiness/history consistency checks where applicable

At minimum, cover:
1. Retryable failure requeues correctly
2. Permanent validation failure does not loop
3. Dead-letter path preserves actionable diagnosis
4. Retry counts and terminal state are correct
5. Resume/retry fails clearly when source input is gone or invalid
6. Malformed / oversized / unsupported inputs map to the correct class
7. History UI shows the correct retry/resume/source-repair state
8. Readiness/diagnostics counts agree with history semantics

Validation sequence:
- npm run test
- npm run build
- npm run lint

If build or lint fail because of clearly pre-existing unrelated repo debt, do not hide it. Call it out explicitly in the final summary and separate it from Sprint 37.2 results.

Coding rules:
- Prefer existing repo patterns over inventing new ones
- Keep TypeScript types precise
- Avoid any
- Keep changes scoped to Sprint 37.2
- Do not rewrite unrelated PDF Studio tools
- Do not silently introduce new product scope beyond the sprint
- Do not hand-wave around error handling
- If you add helper abstractions, they must remove real duplication or clarify real invariants

Git / commit rules:
- Use meaningful commits
- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Keep branch clean
- Do not merge the branch yourself into the phase branch
- Open a PR targeting feature/pdf-studio-phase-37

Suggested PR title:
- feat(pdf-studio): implement sprint 37.2 conversion retry and recovery hardening

PR body should include:
1. Summary
2. What changed
3. Retry/dead-letter behavior fixed
4. Failure classification changes
5. History/readiness UI changes
6. Tests added/updated
7. Validation run results
8. Any unrelated pre-existing repo issues still blocking full green build/lint, if present

Final response format:

1. Branch / PR
- branch name
- PR target branch
- whether PR is ready

2. What you changed
- concise bullet list grouped by backend, routes, and UI/history

3. Tests and validation
- exact commands run
- pass/fail outcome
- note any unrelated existing failures

4. Risks / follow-ups
- only real residual risks
- mention if Sprint 37.3 should absorb any remaining cross-surface recovery alignment work

Important non-negotiables:
- Base Sprint 37.2 on feature/pdf-studio-phase-37, not Sprint 37.1
- Do not assume Sprint 37.1 code is approved or available
- Do not import or depend on unmerged Sprint 37.1 behavior
- Keep the implementation production-grade, secure, and test-backed
- Use tokens efficiently while still doing complete engineering work
```
