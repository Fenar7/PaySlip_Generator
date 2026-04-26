# PR #193 Remediation Prompt

## Summary

Use this as the follow-up prompt for Kimi K2.5/K2.6 to update PR `#193` on the existing branch `feature/pdf-studio-phase-38-sprint-38-1`. This is a narrow remediation pass for the two remaining Sprint 38.1 review issues: missing executed manual QA evidence and overclaimed route-verification coverage.

## Copy-Paste Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to update the existing PDF Studio Phase 38 Sprint 38.1 PR with a narrow remediation pass.

Current PR context:
- Repo: /Users/mac/Fenar/Zenxvio/product-works/payslip-generator
- Branch: feature/pdf-studio-phase-38-sprint-38-1
- PR: #193
- PR target: feature/pdf-studio-phase-38
- Do not open a replacement PR
- Do not create a new branch unless the current branch is unusable
- Keep the fix scoped to Sprint 38.1 remediation

Authoritative scope:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Phase 38
- Sprint 38.1 — Full Suite QA Matrix

Relevant PRD requirements:
- Objective: build and execute the final acceptance matrix across the entire live PDF Studio catalog
- Acceptance criteria:
  - every live PDF Studio tool has a documented verification path
  - public/workspace availability matches the registry and gating rules
  - no hidden route or “Soon” behavior exists for tools advertised as live
- Required tests:
  - focused Vitest for uncovered high-risk gaps
  - manual QA checklist execution across representative browser-first and worker-backed tools

Confirmed review findings to fix:

1. Manual QA execution is missing from the deliverable
- The handbook currently leaves the route / plan-gate / support-lane / execution-mode / manual quick-pass checklists unchecked
- But the sign-off section marks Sprint 38.1 complete
- This does not satisfy the PRD’s “build and execute” requirement

2. Route verification coverage is overclaimed
- Current tests mostly prove registry self-consistency, path formatting, and counts
- They do not robustly verify live route/hub behavior for the “no hidden route / no Soon behavior” acceptance criterion
- isPdfStudioToolDiscoverableOnPublicSurface() is effectively a tautology and should not be treated as proof of real public discoverability by itself

Execution standards:
- No placeholder code
- No dead code
- No fake abstractions
- No speculative rewrites
- No broad refactors outside this remediation
- Keep naming aligned with existing PDF Studio patterns
- Reuse existing helpers unless they are the source of false confidence
- Keep tokens efficient and progress updates short

Implementation requirements:

1. Fix the handbook so it reflects real execution, not assumed completion
- Either execute the required manual QA representative pass and record the results clearly, or remove/soften any sign-off language that claims execution happened when it did not
- Do not leave the handbook in a contradictory state where unchecked checklists coexist with full sign-off
- The resulting document must make it obvious:
  - what was actually executed
  - what was only documented
  - what evidence supports sprint sign-off

2. Add real route-level verification for the high-risk acceptance criteria
- Add focused tests that exercise actual route or rendered catalog behavior instead of only registry/list parity
- At minimum, cover real behavior for:
  - public hub exposes every live tool from the live catalog
  - workspace hub exposes every live tool from the live catalog
  - public tool route resolution works for every live tool slug
  - no touched public/workspace route presents a “Soon” / placeholder state for a tool advertised as live
- Prefer high-signal integration-style coverage around live route entrypoints, rendered tool cards, and slug handling
- Do not rely on regex-only path assertions as the primary proof

3. Tighten discoverability semantics
- Review whether isPdfStudioToolDiscoverableOnPublicSurface() should remain a trivial helper
- If it stays, do not use it as the primary evidence for actual public discoverability
- If you improve it, keep the change scoped and consistent with the current route model
- The core goal is honest verification, not abstraction churn

4. Keep the sprint scoped
- Do not widen into Sprint 38.2/38.3 work
- Do not refactor unrelated PDF Studio tools
- Do not change plan-gate product behavior unless needed to correct a false QA claim
- Keep this as a production-readiness remediation on PR #193

Inspect first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- docs/PDF studio/pdf-studio-qa-handbook.md
- src/features/docs/pdf-studio/lib/qa-matrix.test.ts
- src/features/docs/pdf-studio/lib/tool-registry.test.ts
- src/features/docs/pdf-studio/lib/plan-gates.ts
- src/features/docs/pdf-studio/components/pdf-studio-hub.tsx
- src/app/pdf-studio/[tool]/page.tsx
- src/app/app/docs/pdf-studio/page.tsx
- any existing tests that already render the hub or public tool shell

Implementation order:
1. Inspect the PRD and current handbook contradictions
2. Decide whether to record executed manual QA evidence or downgrade the sign-off language until execution is real
3. Add route-level/high-signal verification tests
4. Remove any overclaiming language in docs/tests/helpers
5. Run focused Sprint 38.1 tests
6. Run broader validation
7. Update the PR summary with the remediation details

Testing requirements:
- Add/update focused tests for real route/catalog behavior
- Validate the handbook/sign-off consistency
- Run:
  - npm run test -- src/features/docs/pdf-studio/
  - touched-file lint at minimum
  - npm run build if feasible, and call out unrelated pre-existing failures separately

Minimum test cases:
1. Public hub renders all live tools from the catalog
2. Workspace hub renders all live tools from the catalog
3. Every live public slug resolves through the public route entrypoint
4. No representative live tool surface renders a “Soon” or placeholder state
5. Handbook sign-off and executed checklist evidence are internally consistent

Final response format:
1. Branch / PR
- branch name
- PR target branch
- whether PR is ready again

2. What you changed
- concise bullets grouped by handbook/sign-off fixes and route-verification tests

3. Tests and validation
- exact commands run
- pass/fail outcome
- note any unrelated existing failures

4. Risks / follow-ups
- only real residual risks
- mention if any remaining full-suite manual QA should intentionally move to Sprint 38.2 instead of being implied as complete now

Important non-negotiables:
- Update PR #193 instead of replacing it
- Do not claim manual QA execution unless it was actually performed and recorded
- Do not treat registry self-consistency as full proof of route truth
- Keep the fix production-grade, scoped, and test-backed
```

## Test / Review Notes

- Local verification run completed: `npm run test -- src/features/docs/pdf-studio/` -> `50` files, `380` tests passed
- No direct security vulnerability was found in this PR
- The remaining issues are release-signoff honesty and route-verification rigor

## Assumptions

- You want a narrow remediation prompt for PR `#193`, not a fresh Sprint 38.1 implementation prompt
- The current branch/PR should stay open and be amended in place
- Manual QA can either be genuinely executed and recorded now, or the sign-off language must be downgraded until that happens
