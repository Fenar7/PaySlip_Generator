# Phase 38 Sprint 38.1 Kimi K2.6 Execution Prompt

## Execution Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

Your task is to implement PDF Studio Phase 38, Sprint 38.1 — Full Suite QA Matrix — in this repository.

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

Current branch context:
- Integration branch: pdf-studio-continuation
- Phase 37 is complete
- You are now starting Phase 38
- This sprint must use a new phase branch and a sprint branch under it

Non-negotiable branching rules:
- Do not work on master
- Do not work directly on pdf-studio-continuation
- Create the new phase branch from pdf-studio-continuation
- Create Sprint 38.1 from the current head of the new phase branch
- PR target must be the phase branch, not pdf-studio-continuation, not master

Exact branch names:
- Phase branch: feature/pdf-studio-phase-38
- Sprint branch: feature/pdf-studio-phase-38-sprint-38-1

Required branch flow:
git checkout pdf-studio-continuation
git pull origin pdf-studio-continuation
git checkout -b feature/pdf-studio-phase-38
git push -u origin feature/pdf-studio-phase-38
git checkout -b feature/pdf-studio-phase-38-sprint-38-1

Do not touch unrelated docs/noise such as:
- docs/opencode/
- docs/codex/
- docs/copilot/

Authoritative scope:
- Read docs/PDF studio/pdf-studio-phases-36-38-prd.md
- Use the Phase 38 section, specifically Sprint 38.1 — Full Suite QA Matrix

Sprint 38.1 objective:
- Build and execute the final acceptance matrix across the entire live PDF Studio catalog.

In scope:
- Define tool-by-tool verification across public and workspace routes
- Verify browser-first versus processing execution behavior matches the live registry
- Validate plan gates, limits, support messaging, and retention copy
- Add or tighten focused test coverage where coverage gaps are discovered during QA design

Implementation surfaces:
- QA handbook entries for PDF Studio
- Focused Vitest coverage where gaps are found
- Public/workspace route verification checklists

Acceptance criteria:
- Every live PDF Studio tool has a documented verification path
- Public/workspace availability matches the registry and gating rules
- No “hidden route” or “Soon” behavior exists for tools advertised as live

Required tests:
- Focused Vitest for any uncovered high-risk gaps
- Manual QA checklist execution across representative browser-first and worker-backed tools

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
- Do not mark a tool as verified unless the route, gating, and execution mode were actually checked
- Do not invent QA claims that are not backed by code or route inspection
- Keep plan-gate and support-lane claims tied to live code and registry truth
- Do not widen scope into new PDF Studio features
- Preserve current auth, org, and plan behavior

Token-efficiency bar:
- Do not narrate every step
- Keep progress messages short
- Use repo inspection instead of asking obvious questions
- Do not paste large code blocks into chat unless necessary
- Summarize findings compactly
- Batch searches when possible

Implementation requirements:

1. Build the live tool verification matrix
- Inspect the live PDF Studio registry and enumerate the actual current tool catalog
- Separate tools by:
  - public vs workspace availability
  - browser-first vs worker-backed vs hybrid execution
  - plan-gated vs not plan-gated
- Produce a real verification matrix, not a guessed one
- Every tool advertised as live must have an explicit verification path

2. Verify routing and visibility honesty
- Check that public/workspace routes match the live registry
- Find any mismatch where a tool is:
  - listed but missing
  - routed but hidden
  - marked live but still behaves like “Soon”
  - publicly framed incorrectly versus workspace-only reality
- Fix only the inconsistencies needed for Sprint 38.1 closure

3. Verify plan gates, limits, and support messaging
- Validate that live tool surfaces reflect the actual plan gate and limit behavior
- Confirm support messaging remains honest for browser-first versus worker-backed tools
- Confirm retention/history framing matches actual workspace behavior
- Tighten tests where the current behavior is high-risk or weakly protected

4. Add QA documentation and checklists
- Add or update a PDF Studio QA handbook/checklist artifact for Sprint 38.1
- The checklist must be usable by another engineer or QA person without guessing
- Include representative manual verification coverage across both:
  - browser-first tools
  - worker-backed tools
- Include route, gating, and support-lane verification steps

5. Focused regression coverage
- Add or tighten Vitest coverage only where the QA pass reveals real gaps
- Prefer high-signal coverage around:
  - registry-to-route consistency
  - support-lane truthfulness
  - public/workspace gating truth
  - “live vs hidden vs soon” mismatches

Inspect these files first before editing:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md
- src/features/docs/pdf-studio/lib/tool-registry.ts
- src/features/docs/pdf-studio/lib/plan-gates.ts
- src/features/docs/pdf-studio/lib/route-metadata.ts
- src/features/docs/pdf-studio/lib/support.ts
- src/features/docs/pdf-studio/components/pdf-studio-hub.tsx
- src/features/docs/pdf-studio/components/pdf-studio-public-tool-shell.tsx
- src/app/app/docs/pdf-studio/readiness/page.tsx
- app/docs/pdf-studio and related route entrypoints if needed

Inspect relevant tests:
- existing PDF Studio registry / support / analytics / readiness tests
- hub/public-shell tests
- any route or dashboard tests that prove live-tool behavior

Use rg first. Read only the smallest slices needed. Be token-efficient.

Implementation order:
1. Read the Sprint 38.1 PRD section
2. Inspect the live tool registry and current route/catalog structure
3. Build the actual tool inventory and identify verification categories
4. Identify mismatches between registry, public/workspace availability, support lane, and plan gate messaging
5. Add/fix the QA handbook and verification checklist
6. Add/fix focused tests for uncovered high-risk gaps
7. Run focused tests
8. Run broader validation
9. Prepare a clean PR summary

Do not start by making cosmetic copy edits unless they are required to fix an identified verification mismatch.

Testing requirements:
- Add or update tests that prove Sprint 38.1 is complete

Minimum coverage:
- focused Vitest for uncovered high-risk gaps
- tests around registry/route/live-tool consistency where needed
- tests around support-lane or plan-gate honesty where touched
- documentation/checklist should reflect actual manual verification paths

At minimum, cover:
1. Every advertised live PDF Studio tool has a real verification path
2. Public/workspace availability matches the registry
3. Execution mode framing matches the live tool registry
4. No touched tool behaves like hidden/soon while still being presented as live
5. Touched plan gates, limits, and support messaging remain honest

Validation sequence:
- npm run test
- npm run build
- npm run lint

If build or lint fail because of clearly pre-existing unrelated repo debt, do not hide it. Call it out explicitly in the final summary and separate it from Sprint 38.1 results.

Coding rules:
- Prefer existing repo patterns over inventing new ones
- Keep TypeScript types precise
- Avoid any
- Keep changes scoped to Sprint 38.1
- Do not rewrite unrelated PDF Studio tools
- Do not silently introduce new product scope beyond the sprint
- Do not hand-wave around QA claims, route truth, or registry truth
- If you add helper logic, it must enforce a real verification invariant

Git / commit rules:
- Use meaningful commits
- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Keep branch clean
- Do not merge the branch yourself into the phase branch
- Open a PR targeting feature/pdf-studio-phase-38

Suggested PR title:
- feat(pdf-studio): implement sprint 38.1 full suite qa matrix

PR body should include:
1. Summary
2. What changed
3. QA matrix / handbook additions
4. Registry-to-route verification outcomes
5. Plan gate / support-lane verification outcomes
6. Tests added/updated
7. Validation run results
8. Any unrelated pre-existing repo issues still blocking full green build/lint, if present

Final response format:

1. Branch / PR
- branch name
- PR target branch
- whether PR is ready

2. What you changed
- concise bullet list grouped by QA docs/checklists, code fixes, and tests

3. Tests and validation
- exact commands run
- pass/fail outcome
- note any unrelated existing failures

4. Risks / follow-ups
- only real residual risks
- mention anything that should intentionally wait for Sprint 38.2 or 38.3

Important non-negotiables:
- Start Phase 38 from pdf-studio-continuation
- Create feature/pdf-studio-phase-38 first
- Create feature/pdf-studio-phase-38-sprint-38-1 under that phase branch
- Do not target master
- Do not skip the documented QA matrix/checklist work
- Keep the implementation production-grade, secure, and test-backed
- Use tokens efficiently while still doing complete engineering work
```
