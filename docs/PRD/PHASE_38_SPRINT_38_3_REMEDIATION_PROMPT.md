# PR #195 Remediation Prompt

## Summary

Use this as the follow-up prompt for Kimi K2.5/K2.6 to update the Sprint 38.3 PR on the existing branch `feature/pdf-studio-phase-38-sprint-38-3`. This is a narrow remediation pass for the remaining Sprint 38.3 review issues: inspection-only heavy-workflow verification and incorrect blocker classification in the release sign-off.

## Copy-Paste Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to update the existing PDF Studio Phase 38 Sprint 38.3 PR with a narrow remediation pass.

Current PR context:
- Repo: /Users/mac/Fenar/Zenxvio/product-works/payslip-generator
- Branch: feature/pdf-studio-phase-38-sprint-38-3
- PR target: feature/pdf-studio-phase-38
- Do not open a replacement PR
- Do not create a new branch unless the current branch is unusable
- Keep the fix scoped to Sprint 38.3 remediation

Authoritative scope:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Phase 38
- Sprint 38.3 — Release Sign-Off and Production Closure

Relevant PRD requirements:
- Objective: decide whether PDF Studio can be called operationally complete
- Acceptance criteria:
  - full release checklist passes for PDF Studio
  - representative heavy workflows complete within acceptable product limits
  - no unresolved Phase 36-38 blocking issue remains
  - product, engineering, and QA agree PDF Studio can be treated as complete baseline after this phase
- Required tests:
  - focused build/test/lint verification on touched PDF Studio surfaces
  - manual performance and operational verification against defined heavy scenarios

Confirmed review findings to fix:

1. Heavy-workflow verification is inspection-only, not manual verification
- The current sign-off says no runtime browser or server execution was performed
- Sprint 38.3 requires manual performance and operational verification against representative heavy scenarios
- Code inspection and limit analysis are not sufficient to satisfy that requirement

2. Current release blockers are understated
- The sign-off says the only blockers are procedural
- But the current phase branch still contains stale launch/support docs, which means current launch/support/readiness material is not actually current on this branch
- Because Sprint 38.3 cannot depend on unmerged Sprint 38.2 outputs, these are real current-branch blockers, not just future merge notes

Execution standards:
- No placeholder sign-off material
- No fake runtime claims
- No minimized blockers
- No speculative rewrites outside this remediation
- Keep naming aligned with existing PDF Studio patterns
- Keep tokens efficient and progress updates short

Implementation requirements:

1. Replace inspection-only heavy-workflow verification with real evidence
- Update the release sign-off so heavy scenarios are either:
  - actually executed and recorded with observed runtime results, or
  - explicitly left unverified and treated as blockers/no-go conditions
- At minimum cover:
  - a large browser-first workflow
  - a worker-backed conversion workflow
  - a hybrid protect/unlock workflow
  - a recovery/history/retention-oriented workflow if it is claimed in sign-off
- Record:
  - scenario
  - environment/context
  - observed result
  - pass/fail
- Do not invent numbers or runtime outcomes

2. Treat stale launch/support/readiness materials as real blockers on the current branch
- Re-evaluate the sign-off against current branch truth, not hoped-for future merges
- If launch/support/readiness docs are still stale on this branch, classify that as a blocker
- Either:
  - pull the needed doc alignment into this PR if appropriate, or
  - document the blocker honestly and downgrade the release recommendation
- Do not mark such blockers as “low” if they prevent valid Phase 38 exit

3. Recompute the final recommendation honestly
- After the fixes above, update the recommendation to one of:
  - go
  - conditional go
  - no-go
- The recommendation must match actual evidence and actual blockers
- If manual runtime verification is still missing, the document should not read as release-ready

4. Keep the sprint scoped
- Do not widen into new product work
- Do not rewrite unrelated PDF Studio code unless needed to support real verification
- Do not assume Sprint 38.1 or 38.2 will merge; describe current branch reality honestly

Inspect first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- docs/PDF studio/pdf-studio-release-signoff.md
- docs/production/PDF_STUDIO_LAUNCH_CHECKLIST.md
- docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md
- src/features/docs/pdf-studio/lib/tool-registry.ts
- src/features/docs/pdf-studio/lib/plan-gates.ts
- src/features/docs/pdf-studio/lib/support.ts
- src/app/pdf-studio/page.tsx
- src/app/app/docs/pdf-studio/page.tsx
- src/app/app/docs/pdf-studio/readiness/page.tsx

Implementation order:
1. Inspect the PRD and current release-signoff document
2. Identify every place where static inspection is being presented as runtime/manual verification
3. Decide what can be genuinely verified now and what must remain a blocker
4. Reclassify blockers based on current branch truth
5. Update the final recommendation accordingly
6. Re-read the document for internal consistency
7. Prepare a clean PR update summary

Testing and validation requirements:
- Run:
  - npm run test -- src/features/docs/pdf-studio/
- Perform and record actual manual verification for any heavy scenarios claimed as verified
- If additional focused build/lint checks are used to support the sign-off, record them explicitly

Minimum checks:
1. No section presents code inspection alone as satisfying manual performance/operational verification
2. No blocker is dismissed as merely procedural if it leaves current launch/support/readiness material stale on this branch
3. The final recommendation matches the actual evidence
4. The sign-off clearly distinguishes runtime-verified behavior from inferred/static analysis

Final response format:
1. Branch / PR
- branch name
- PR target branch
- whether PR is ready again

2. What you changed
- concise bullets grouped by heavy-workflow verification fixes and blocker/recommendation fixes

3. Tests and validation
- exact checks performed
- pass/fail outcome
- note any unrelated existing failures only if relevant

4. Risks / follow-ups
- only real residual risks
- explicitly say whether PDF Studio is now go, conditional go, or no-go

Important non-negotiables:
- Update the existing Sprint 38.3 PR instead of replacing it
- Do not treat code inspection as a substitute for required manual runtime verification
- Do not minimize current-branch blockers as procedural if they still block valid sign-off
- Keep the fix scoped, accurate, and evidence-backed
```

## Test / Review Notes

- Local verification run completed: `npm run test -- src/features/docs/pdf-studio/` -> `49` files, `354` tests passed
- No direct security issue was found in this PR
- The remaining issues are release-signoff rigor and honest blocker classification

## Assumptions

- You want a narrow remediation prompt for the existing Sprint 38.3 PR, not a replacement implementation prompt
- The current branch/PR should stay open and be amended in place
- The final recommendation may become `go`, `conditional go`, or `no-go` depending on real verification evidence
