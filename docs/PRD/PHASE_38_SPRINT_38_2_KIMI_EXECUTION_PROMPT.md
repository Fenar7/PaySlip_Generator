# Kimi Prompt for Phase 38 Sprint 38.2

## Summary

Use this prompt for **PDF Studio Phase 38 Sprint 38.2**.

It keeps the same rules, quality bar, workflow, and branch discipline as the earlier sprint prompts, and it explicitly handles the current constraint:

- **Sprint 38.1 is not approved/merged yet**
- So **Sprint 38.2 must branch from `feature/pdf-studio-phase-38`**
- It must **not** branch from `feature/pdf-studio-phase-38-sprint-38-1`

## Copy-Paste Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to implement PDF Studio Phase 38, Sprint 38.2 — Documentation, Runbook, and Workflow Closure — in this repository.

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

Key scripts:
- npm run test
- npm run build
- npm run lint

Current branch context:
- Integration branch: pdf-studio-continuation
- Phase branch: feature/pdf-studio-phase-38
- Sprint 38.1 branch exists and has an open PR: feature/pdf-studio-phase-38-sprint-38-1
- Sprint 38.1 has NOT been approved/merged yet

Non-negotiable implication:
- Do not base Sprint 38.2 on Sprint 38.1
- Do not depend on unmerged Sprint 38.1 behavior
- Create Sprint 38.2 from the current head of feature/pdf-studio-phase-38
- PR target must be feature/pdf-studio-phase-38

Do not touch unrelated docs/noise such as:
- docs/opencode/
- docs/codex/
- docs/copilot/
- unrelated prompt artifacts in docs/PRD unless this sprint explicitly requires them

Authoritative scope:
- Read docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Use Phase 38
- Specifically Sprint 38.2 — Documentation, Runbook, and Workflow Closure

Sprint 38.2 objective:
- Make the documentation set as reliable as the codebase.

Sprint 38.2 in scope:
- Update or supersede stale historical PDF Studio docs where needed
- Reconcile launch checklist, readiness docs, support runbook, and future-roadmap language
- Produce a short final engineering handoff summary for the completed PDF Studio suite
- Ensure the team workflow and branch conventions are documented consistently

Implementation surfaces:
- PDF Studio launch checklist
- PDF Studio support runbook
- Any stale forward-looking PDF Studio status documents that would mislead future work

Acceptance criteria:
- The team can identify one clear forward execution/history story without conflicting status documents
- Launch and support docs match actual current suite behavior
- Branching and merge workflow are explicitly documented for future remediation work

Required tests from the PRD:
- Documentation review against current code and registry
- Manual verification of referenced routes and support paths

Mandatory branching rules:
1. Never work on master
2. Never work directly on pdf-studio-continuation
3. Never work directly on feature/pdf-studio-phase-38
4. Never branch from feature/pdf-studio-phase-38-sprint-38-1
5. Create Sprint 38.2 from the current head of feature/pdf-studio-phase-38
6. Open the PR from Sprint 38.2 back into feature/pdf-studio-phase-38

Exact branch name:
- feature/pdf-studio-phase-38-sprint-38-2

Required branch flow:
git checkout feature/pdf-studio-phase-38
git pull origin feature/pdf-studio-phase-38
git checkout -b feature/pdf-studio-phase-38-sprint-38-2

Execution standards:

Quality bar:
- No placeholder docs
- No stale or contradictory status language
- No speculative rewrites outside sprint scope
- No AI slop prose
- No fake completion claims
- Keep naming aligned with existing PDF Studio patterns
- Prefer reconciling or superseding stale docs over adding duplicate docs

Reliability bar:
- Documentation must match actual current registry, routes, support lanes, readiness surfaces, and branch workflow
- Do not describe work as complete if it is still pending approval or pending manual verification
- Do not preserve conflicting future-roadmap language if the feature already exists
- Do not preserve old workflow guidance that conflicts with the actual phase/sprint branch model now in use

Token-efficiency bar:
- Keep progress messages short
- Do not narrate every step
- Read only the smallest slices needed
- Use rg first
- Summarize findings compactly
- Avoid pasting large doc blocks unless necessary

Primary implementation requirements:

1. Reconcile the documentation set
- Inspect all current PDF Studio docs that can conflict with the present product state
- Identify stale historical status docs, outdated future-tense roadmap language, or obsolete workflow notes
- Decide whether each stale document should be:
  - updated in place
  - explicitly superseded
  - archived in a clearly non-authoritative state
- End state: one clear documentation story, not competing versions of truth

2. Align launch, readiness, and support materials with current behavior
- Review launch checklist, readiness material, support docs/runbooks, and QA/handbook docs
- Ensure they reflect actual current suite behavior across:
  - live tool catalog
  - browser-first vs processing vs hybrid execution
  - support lanes
  - retention/history behavior
  - plan-gate behavior
  - public vs workspace route truth
- Remove contradictory or stale forward-looking language

3. Produce the final engineering handoff summary
- Add a short, high-signal engineering handoff summary for PDF Studio as it exists after Phase 38.2
- This should help a future engineer quickly understand:
  - what is live
  - where the authoritative docs are
  - what the branch workflow is for future remediation
  - what still remains for Sprint 38.3 release sign-off
- Keep it concise and operationally useful

4. Document branch and merge workflow clearly
- Explicitly document the branch model used for PDF Studio roadmap execution:
  - integration branch
  - phase branches
  - sprint branches under phase branches
  - sprint PR target rules
  - phase merge flow
  - what to do for later remediation after roadmap completion
- Make sure future engineers do not have to infer workflow from old PRs or scattered notes

5. Verify referenced routes and support paths
- Manually verify any routes, help paths, readiness pages, and support docs referenced by the updated documentation
- Do not leave dead references or outdated route examples
- Ensure docs point to real, current paths

Inspect these areas first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- docs/PDF studio/
- docs/PRD/ for prior PDF Studio execution/remediation prompt artifacts only as contextual history, not authority
- src/features/docs/pdf-studio/lib/tool-registry.ts
- src/features/docs/pdf-studio/lib/plan-gates.ts
- src/features/docs/pdf-studio/lib/support.ts
- src/app/pdf-studio/[tool]/page.tsx
- src/app/app/docs/pdf-studio/page.tsx
- src/app/app/docs/pdf-studio/readiness/page.tsx
- PDF Studio help/support route references if present

Use rg first. Read only the smallest slices needed. Be token-efficient.

Implementation order:
1. Read the Sprint 38.2 PRD section
2. Inventory the currently authoritative and stale PDF Studio docs
3. Compare docs against current code/registry/support/readiness truth
4. Reconcile docs and remove conflicting status language
5. Add/update the engineering handoff summary
6. Add/update explicit workflow/branch guidance
7. Manually verify referenced routes/support paths
8. Run any focused validation needed for touched surfaces
9. Prepare a clean PR summary

Do not start by writing new docs blindly. First determine which existing docs are authoritative, stale, redundant, or misleading.

Testing and validation requirements:
- Perform a documentation review against current code and registry
- Manually verify referenced routes and support paths
- Run focused validation where touched code/docs rely on tested helpers
- At minimum run:
  - npm run test -- src/features/docs/pdf-studio/
  - touched-file lint if code/test files are touched
- Run npm run build only if your documentation updates require validating touched code paths, and call out unrelated pre-existing failures separately

Coding and editing rules:
- Prefer updating existing authoritative docs over creating competing new documents
- Keep TypeScript types precise if code changes are needed
- Avoid any
- Keep changes scoped to Sprint 38.2
- Do not rewrite unrelated PDF Studio tools
- Do not silently introduce new product scope beyond the sprint
- If you mark a doc as superseded, do it clearly and intentionally
- If multiple docs overlap, leave one clear source of truth

Git / commit rules:
- Use meaningful commits
- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Keep branch clean
- Do not merge the branch yourself into the phase branch
- Open a PR targeting feature/pdf-studio-phase-38

Suggested PR title:
- docs(pdf-studio): implement sprint 38.2 documentation and runbook closure

PR body should include:
1. Summary
2. What changed
3. Docs reconciled or superseded
4. Runbook / readiness / launch alignment
5. Workflow / branch documentation updates
6. Manual route and support-path verification
7. Validation run results
8. Any unrelated pre-existing repo issues still blocking full green build/lint, if present

Final response format:

1. Branch / PR
- branch name
- PR target branch
- whether PR is ready

2. What you changed
- concise bullet list grouped by documentation reconciliation, workflow docs, and verification

3. Tests and validation
- exact commands run
- pass/fail outcome
- note any unrelated existing failures

4. Risks / follow-ups
- only real residual risks
- mention anything that should intentionally wait for Sprint 38.3 release sign-off

Important non-negotiables:
- Base Sprint 38.2 on feature/pdf-studio-phase-38, not Sprint 38.1
- Do not assume Sprint 38.1 code is approved or available
- Do not import or depend on unmerged Sprint 38.1 behavior
- Keep the implementation production-grade, accurate, and test-backed where applicable
- Use tokens efficiently while still doing complete engineering work
```

## Assumptions

- This is for Kimi K2.6, same style as the earlier sprint execution prompts
- You want Sprint 38.2 only, not a combined Phase 38 prompt
- Sprint 38.2 should stay doc/runbook/workflow-focused and not drift into Sprint 38.3 release sign-off work
