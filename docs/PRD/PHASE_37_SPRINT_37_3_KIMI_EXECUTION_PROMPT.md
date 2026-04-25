# Phase 37 Sprint 37.3 Kimi K2.6 Execution Prompt

## Execution Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to implement PDF Studio Phase 37, Sprint 37.3 — Unified Recovery and Diagnostics Closure — in this repository.

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
- Sprint 37.2 branch exists and has an open PR: feature/pdf-studio-phase-37-sprint-37-2
- Sprint 37.2 has NOT been approved/merged yet

Non-negotiable implication:
- Do not base Sprint 37.3 on Sprint 37.2
- Do not depend on unmerged Sprint 37.2 behavior
- Create Sprint 37.3 from the current head of feature/pdf-studio-phase-37
- PR target must be feature/pdf-studio-phase-37

Do not touch unrelated untracked docs such as:
- docs/opencode/
- docs/codex/
- docs/copilot/

Authoritative scope:
- Read docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Use the Phase 37 section, specifically Sprint 37.3 — Unified Recovery and Diagnostics Closure

Sprint 37.3 objective:
- Make failure recovery coherent across the full suite rather than fragmented by tool.

In scope:
- Align browser-first and worker-backed support notices
- Normalize failure-code mapping, recovery copy, and escalation guidance
- Ensure readiness/diagnostics pages reflect current suite behavior and plan gating honestly
- Tighten analytics taxonomy for failure, retry, support, and upgrade-intent events where PDF Studio support flows rely on them

Implementation surfaces:
- Support helpers and notices
- Readiness page
- Hub/support copy
- Analytics helpers

Expected behavior changes:
- Browser-first tools remain honest about lacking worker job IDs
- Worker-backed tools retain job ID, failure-code, and readiness workflows
- Support/recovery copy becomes consistent across public and workspace surfaces

Acceptance criteria:
- No PDF Studio tool presents misleading recovery instructions for its execution mode
- Support surfaces correctly distinguish browser-first from worker-backed diagnostics
- Readiness content and support notices reflect the actual current suite state

Required tests:
- Support helper tests
- Dashboard/readiness tests
- Hub/support notice tests
- Analytics tests for touched support flows

Inspect these files first before editing:
- src/features/docs/pdf-studio/lib/support.ts
- src/app/app/docs/pdf-studio/readiness/page.tsx
- src/features/docs/pdf-studio/components/pdf-studio-support-notice.tsx
- src/features/docs/pdf-studio/components/pdf-studio-hub.tsx
- src/features/docs/pdf-studio/lib/analytics.ts
- src/features/docs/pdf-studio/components/pdf-studio-analytics-panel.tsx
- src/features/docs/pdf-studio/lib/plan-gates.ts

Inspect relevant tests:
- src/features/docs/pdf-studio/lib/support.test.ts
- src/features/docs/pdf-studio/lib/analytics.test.ts
- src/features/docs/pdf-studio/lib/dashboard.test.ts
- hub/support notice/readiness tests if present
- workspace tests for touched public/workspace support surfaces

Use rg first. Read only the smallest slices needed. Be token-efficient.

Branching rules:
1. Never work on master.
2. Never work directly on pdf-studio-continuation.
3. Never work directly on feature/pdf-studio-phase-37.
4. Never branch from feature/pdf-studio-phase-37-sprint-37-2.
5. Create Sprint 37.3 from the current head of feature/pdf-studio-phase-37.
6. Open the PR from Sprint 37.3 back into feature/pdf-studio-phase-37.

Exact branch name:
- feature/pdf-studio-phase-37-sprint-37-3

Required branch flow:
git checkout feature/pdf-studio-phase-37
git pull origin feature/pdf-studio-phase-37
git checkout -b feature/pdf-studio-phase-37-sprint-37-3

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
- Do not let support copy imply capabilities the product does not actually have
- Do not leak raw filenames, raw error text, storage keys, or unsafe diagnostics into analytics
- Keep browser-first and worker-backed execution-mode boundaries explicit and honest
- Preserve current auth, plan-gate, and org-scoped behavior on workspace surfaces
- Maintain sanitized analytics taxonomy for support-related events

Token-efficiency bar:
- Do not narrate every step
- Keep progress messages short
- Use repo inspection instead of asking obvious questions
- Do not paste large code blocks into chat unless necessary
- Summarize findings compactly
- Batch searches when possible

Implementation requirements:

1. Support lane honesty
- Review every touched PDF Studio support surface and make the browser-first vs worker-backed distinction explicit and consistent
- Browser-first tools must not imply job IDs, retained history, dead-letter visibility, or worker diagnostics
- Worker-backed tools must retain job ID, failure-code, recovery-guide, and readiness/diagnostics framing
- Remove copy mismatches between public pages, workspace notices, hub messaging, and readiness content

2. Failure-code and recovery copy normalization
- Normalize support language so the same failure class does not get different recovery guidance across touched surfaces without a good reason
- Keep recovery guidance consistent with actual execution mode and actual available diagnostics
- Preserve existing shared helpers where possible; centralize duplicated copy if it improves consistency
- Do not invent new failure-code taxonomy unless needed to prevent a concrete mismatch

3. Readiness and plan-gating honesty
- Ensure readiness and support pages reflect the current suite truthfully:
  - what is browser-first
  - what is worker-backed
  - which surfaces require signed-in workspace access
  - which capabilities depend on plan tier
- Remove ambiguous copy that could mislead support or users about retained downloads, diagnostics depth, or upgrade path
- Keep current plan-gate messaging accurate to the real product state

4. Analytics taxonomy tightening
- Review PDF Studio analytics helpers and any touched support/upgrade/recovery event calls
- Ensure failure/retry/support/upgrade-intent events use consistent taxonomy and safe metadata
- Keep analytics sanitized:
  - no raw filenames
  - no raw error bodies
  - no storage keys
  - no sensitive document identifiers
- Align event semantics with actual support lanes so browser-first and worker-backed flows are distinguishable

5. Public/workspace copy consistency
- Align:
  - support notice
  - readiness page
  - hub copy
  - analytics panel support framing
- The result should feel like one coherent support model, not separate local copy islands

Implementation order:
1. Inspect the Sprint 37.3 PRD section and current support/diagnostics surfaces
2. Inspect existing browser-first vs worker-backed messaging across support notice, readiness, hub, and analytics helpers
3. Identify exact copy/taxonomy inconsistencies against Sprint 37.3 acceptance criteria
4. Implement shared support/helper and analytics taxonomy fixes first
5. Update readiness and notice/hub surfaces second
6. Add and expand tests
7. Run focused tests
8. Run broader validation
9. Prepare a clean PR summary

Do not start by rewriting visuals or unrelated layout.

Testing requirements:
- Add or update tests that prove Sprint 37.3 is complete

Minimum coverage:
- support helper tests
- readiness/dashboard tests for support-lane truthfulness
- support notice / hub tests for execution-mode honesty
- analytics tests for failure/retry/support/upgrade-intent taxonomy on touched flows

At minimum, cover:
1. Browser-first surfaces do not imply worker job IDs or retained worker history
2. Worker-backed surfaces still expose the correct diagnostics framing
3. Readiness/support copy matches actual plan gating and workspace/public distinctions
4. Shared recovery/support helpers produce consistent labels and guidance
5. Analytics events for touched flows stay sanitized and lane-aware
6. Upgrade-intent and support-related analytics use consistent taxonomy

Validation sequence:
- npm run test
- npm run build
- npm run lint

If build or lint fail because of clearly pre-existing unrelated repo debt, do not hide it. Call it out explicitly in the final summary and separate it from Sprint 37.3 results.

Coding rules:
- Prefer existing repo patterns over inventing new ones
- Keep TypeScript types precise
- Avoid any
- Keep changes scoped to Sprint 37.3
- Do not rewrite unrelated PDF Studio tools
- Do not silently introduce new product scope beyond the sprint
- Do not hand-wave around support-state or analytics semantics
- If you add shared helpers, they must remove real duplication or enforce real consistency

Git / commit rules:
- Use meaningful commits
- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Keep branch clean
- Do not merge the branch yourself into the phase branch
- Open a PR targeting feature/pdf-studio-phase-37

Suggested PR title:
- feat(pdf-studio): implement sprint 37.3 recovery and diagnostics closure

PR body should include:
1. Summary
2. What changed
3. Browser-first vs worker-backed support alignment
4. Recovery/failure copy normalization
5. Readiness/hub/support notice updates
6. Analytics taxonomy updates
7. Tests added/updated
8. Validation run results
9. Any unrelated pre-existing repo issues still blocking full green build/lint, if present

Final response format:

1. Branch / PR
- branch name
- PR target branch
- whether PR is ready

2. What you changed
- concise bullet list grouped by support helpers, UI/copy surfaces, and analytics

3. Tests and validation
- exact commands run
- pass/fail outcome
- note any unrelated existing failures

4. Risks / follow-ups
- only real residual risks
- mention whether any remaining cross-suite support harmonization should wait for a later phase

Important non-negotiables:
- Base Sprint 37.3 on feature/pdf-studio-phase-37, not Sprint 37.2
- Do not assume Sprint 37.2 code is approved or available
- Do not import or depend on unmerged Sprint 37.2 behavior
- Keep the implementation production-grade, secure, and test-backed
- Use tokens efficiently while still doing complete engineering work
```
