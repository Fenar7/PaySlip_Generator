# PR #194 Remediation Prompt

## Summary

Use this as the follow-up prompt for Kimi K2.5/K2.6 to update PR `#194` on the existing branch `feature/pdf-studio-phase-38-sprint-38-2`. This is a narrow remediation pass for the remaining Sprint 38.2 review issues: false completion language, canonizing unmerged Sprint 38.1 artifacts, and missing explicit route/support-path verification evidence.

## Copy-Paste Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to update the existing PDF Studio Phase 38 Sprint 38.2 PR with a narrow remediation pass.

Current PR context:
- Repo: /Users/mac/Fenar/Zenxvio/product-works/payslip-generator
- Branch: feature/pdf-studio-phase-38-sprint-38-2
- PR: #194
- PR target: feature/pdf-studio-phase-38
- Do not open a replacement PR
- Do not create a new branch unless the current branch is unusable
- Keep the fix scoped to Sprint 38.2 remediation

Authoritative scope:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Phase 38
- Sprint 38.2 — Documentation, Runbook, and Workflow Closure

Relevant PRD requirements:
- Objective: make the documentation set as reliable as the codebase
- Acceptance criteria:
  - the team can identify one clear forward execution/history story without conflicting status documents
  - launch and support docs match actual current suite behavior
  - branching and merge workflow are explicitly documented for future remediation work
- Required tests:
  - documentation review against current code and registry
  - manual verification of referenced routes and support paths

Confirmed review findings to fix:

1. False completion / merge claims
- Several new docs currently imply Sprint 38 work is already merged/completed
- Sprint 38.1 is still unapproved, Sprint 38.2 is this open PR, and Sprint 38.3 has not happened yet
- Docs must not present Phase 38 as a completed baseline today

2. Unmerged Sprint 38.1 artifacts are being treated as authoritative current baseline
- The new handoff/authority chain currently points to Sprint 38.1 outputs as authoritative merged truth
- Because Sprint 38.1 is still unapproved, those references must be downgraded or qualified

3. Manual route/support-path verification is not recorded
- The PRD explicitly requires manual verification of referenced routes and support paths
- The docs cite the relevant routes, but they do not leave a clear evidence trail that this verification was actually done

Execution standards:
- No placeholder docs
- No false completion claims
- No contradictory authority chain
- No speculative rewrites outside this remediation
- Keep naming aligned with existing PDF Studio patterns
- Keep tokens efficient and progress updates short

Implementation requirements:

1. Fix false completion/merge claims
- Remove or downgrade wording that implies Phase 38 is complete, merged, or baseline-locked today
- Specifically correct wording like:
  - “Phase 38 completion baseline”
  - “Phase 38 baseline”
  - Sprint 38.1 / 38.2 / 38.3 marked “Merged”
  - workflow phrasing that only applies after full Phase 38 completion
- Replace with state-accurate wording that reflects the real current repo/PR state

2. Stop treating unmerged Sprint 38.1 outputs as authoritative merged truth
- Review every place where Sprint 38.1 docs/results are presented as current authority
- If those docs are still useful, label them as pending sprint artifacts or conditional references
- Keep the authority chain explicit and honest:
  - PRD = roadmap authority
  - merged docs = current accepted baseline
  - pending sprint docs = reference only until approved/merged

3. Add explicit manual verification evidence
- Add a short verification section to the relevant docs or handoff material showing the referenced routes/support paths were manually checked
- At minimum record verification of:
  - /pdf-studio
  - /app/docs/pdf-studio
  - /app/docs/pdf-studio/readiness
  - /help/troubleshooting/pdf-studio-support
  - /help/troubleshooting/pdf-studio-jobs
- Keep this concise but unambiguous; the goal is a clear evidence trail

4. Keep the sprint scoped
- Do not widen into Sprint 38.3 release-signoff work
- Do not rewrite product behavior or support helpers
- Prefer updating the docs introduced in this PR instead of creating competing new docs

Inspect first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- docs/PDF studio/pdf-studio-engineering-handoff.md
- docs/PDF studio/pdf-studio-workflow.md
- docs/production/PDF_STUDIO_LAUNCH_CHECKLIST.md
- docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md
- docs/PDF studio/pdf-studio-qa-handbook.md
- src/features/docs/pdf-studio/lib/tool-registry.ts
- src/app/pdf-studio/page.tsx
- src/app/app/docs/pdf-studio/page.tsx
- src/app/app/docs/pdf-studio/readiness/page.tsx
- public/docs/help/index.json

Implementation order:
1. Inspect the PRD and current Phase 38 branch/approval reality
2. Find every doc line that overstates merge/completion status
3. Fix the authority chain so unmerged Sprint 38.1 artifacts are not canonized
4. Add explicit manual verification evidence for referenced routes/support paths
5. Re-read the updated docs for internal consistency
6. Prepare a clean PR update summary

Testing and validation requirements:
- Perform a documentation review against current repo and branch reality
- Manually verify the referenced routes/support paths
- If any code/test files are touched, run focused PDF Studio tests
- Otherwise, clearly report the manual verification performed

Minimum checks:
1. No doc claims Sprint 38.1, 38.2, or 38.3 are merged unless that is actually true
2. No doc frames Phase 38 as completed baseline before Sprint 38.3 and actual merges
3. Sprint 38.1 artifacts are not presented as authoritative merged state while still unapproved
4. Referenced PDF Studio and help routes are explicitly recorded as manually verified

Final response format:
1. Branch / PR
- branch name
- PR target branch
- whether PR is ready again

2. What you changed
- concise bullets grouped by state-truth fixes, authority-chain fixes, and verification evidence

3. Tests and validation
- exact checks performed
- pass/fail outcome
- note any unrelated existing failures only if relevant

4. Risks / follow-ups
- only real residual risks
- mention anything that intentionally remains for Sprint 38.3

Important non-negotiables:
- Update PR #194 instead of replacing it
- Do not claim Sprint 38 work is merged/completed when it is still pending
- Do not treat unmerged Sprint 38.1 artifacts as authoritative merged baseline
- Do not skip explicit route/support-path verification evidence
- Keep the fix scoped, accurate, and production-grade
```

## Test / Review Notes

- No direct security or auth issue was found in this PR
- The remaining issues are documentation truthfulness and validation evidence
- The cited help/support paths do appear to exist in the current help index, but the docs need to record that verification explicitly

## Assumptions

- You want a narrow remediation prompt for PR `#194`, not a replacement Sprint 38.2 implementation prompt
- The current branch/PR should stay open and be amended in place
- Sprint 38.3 remains the correct place for final release-signoff completion, not Sprint 38.2
