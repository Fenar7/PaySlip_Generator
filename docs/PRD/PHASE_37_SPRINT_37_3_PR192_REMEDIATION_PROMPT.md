# Phase 37 Sprint 37.3 PR #192 Remediation Prompt

## Kimi K2.6 Prompt

```text
You are a senior software engineering team updating the existing PDF Studio Sprint 37.3 PR in this repository:

- /Users/mac/Fenar/Zenxvio/product-works/payslip-generator

This is a narrow remediation pass for PR #192. Do not open a replacement PR. Update the existing branch and PR only.

Current PR context:
- Branch: feature/pdf-studio-phase-37-sprint-37-3
- PR target: feature/pdf-studio-phase-37
- PR URL: https://github.com/Fenar7/PaySlip_Generator/pull/192

---

## Authoritative scope

Read first:
- docs/PDF studio/pdf-studio-phases-36-38-prd.md

Use specifically:
- Phase 37
- Sprint 37.3 — Unified Recovery and Diagnostics Closure

Sprint 37.3 still requires:
- Align browser-first and worker-backed support notices
- Normalize failure-code mapping, recovery copy, and escalation guidance
- Ensure readiness/diagnostics pages reflect current suite behavior and plan gating honestly
- Tighten analytics taxonomy for failure, retry, support, and upgrade-intent events where PDF Studio support flows rely on them

Acceptance criteria still relevant for this remediation:
- No PDF Studio tool presents misleading recovery instructions for its execution mode
- Support surfaces correctly distinguish browser-first from worker-backed diagnostics
- Readiness content and support notices reflect the actual current suite state

---

## Remaining review findings you must fix

These are the only issues in scope for this pass.

### Finding 1: browser-only support notices still expose a worker-only support path

Current issue:
- src/features/docs/pdf-studio/components/pdf-studio-support-notice.tsx
- The component always renders the Worker job guide link, regardless of execution mode

Why this is wrong:
- A browser-only tool can say “this tool runs locally in the browser” while still surfacing a worker-only guide in the same notice
- That violates Sprint 37.3’s requirement that no tool present misleading recovery instructions for its execution mode

Required fix:
- Make notice CTAs execution-mode aware, not just notice body copy
- Browser-only mode must not render worker-job-guide affordances
- Processing and hybrid modes may still render worker-job guidance where appropriate
- Keep generic fallback behavior only for truly unknown execution-mode cases

### Finding 2: browser-first recovery normalization helper was added but not wired into live surfaces

Current issue:
- src/features/docs/pdf-studio/lib/support.ts adds getPdfStudioBrowserFailureRecoveryHint()
- The helper is only referenced in tests, not in live runtime surfaces

Why this is wrong:
- Sprint 37.3 called for recovery copy normalization, not just adding an unused helper
- Browser-first recovery guidance remains fragmented instead of being centralized through the new shared helper

Required fix:
- Wire getPdfStudioBrowserFailureRecoveryHint() into actual browser-first recovery surfaces touched by this sprint
- Keep browser-first recovery copy free of worker-specific language:
  - no job IDs
  - no failure codes
  - no dead-letter / queue framing
  - no worker diagnostics framing
- Do not force worker-backed surfaces onto browser guidance; keep the split honest

### Finding 3: upgrade-intent analytics taxonomy is still inconsistent

Current issue:
- One missing source was fixed in pdf-studio-hub.tsx
- But public-tool upgrade intent still uses direct trackPdfStudioLifecycleEvent("pdf_studio_upgrade_intent", ...) instead of the shared trackUpgradeIntent path
- The event also lacks a normalized source field

Why this is wrong:
- Sprint 37.3 explicitly included tightening analytics taxonomy for upgrade-intent flows
- Mixed event-entry patterns make analytics harder to reason about and compare

Required fix:
- Route touched upgrade-intent flows through the shared analytics helper
- Add stable source metadata to touched upgrade CTAs
- Keep payloads sanitized and execution-lane aware

---

## Implementation requirements

1. Keep scope tight
- Do not widen into a general PDF Studio redesign
- Do not refactor unrelated tools
- Do not widen into later-phase support/marketing cleanup

2. Preserve branch and PR
- Work only on feature/pdf-studio-phase-37-sprint-37-3
- Update PR #192

3. Keep support model coherent
- Support notice, public tool shell, and touched recovery surfaces must agree on execution-mode truth
- Browser-first and worker-backed lanes must stay clearly separated

4. Production quality bar
- No placeholders
- No dead code
- No AI slop
- No broad speculative refactors

---

## Files to inspect first

- src/features/docs/pdf-studio/components/pdf-studio-support-notice.tsx
- src/features/docs/pdf-studio/components/pdf-studio-public-tool-shell.tsx
- src/features/docs/pdf-studio/lib/support.ts
- src/features/docs/pdf-studio/lib/analytics.ts
- src/features/docs/pdf-studio/components/pdf-studio-hub.tsx
- relevant tests under:
  - src/features/docs/pdf-studio/components/pdf-studio-support-notice.test.tsx
  - src/features/docs/pdf-studio/lib/support.test.ts
  - src/features/docs/pdf-studio/lib/analytics.test.ts

---

## Required behavior after the fix

### Support notice honesty
- Browser-only notices must not link users to worker-job-only guidance
- Processing and hybrid surfaces may expose worker-job guidance where it is real
- Public and workspace notice variants must remain honest about what diagnostics are actually available

### Recovery-copy normalization
- Browser-first recovery guidance must actually use the shared browser-first helper in runtime code
- Browser-first copy must stay free of worker-only diagnostics language
- Worker-backed copy must remain distinct where worker diagnostics are real

### Analytics taxonomy
- Touched upgrade-intent flows must use one shared tracking path
- Touched upgrade events must include stable source metadata
- Failure and support analytics already added in this sprint must remain intact

---

## Test requirements

Add or update tests for the remaining defects.

Minimum required coverage:

1. support notice tests
- browser mode does not render Worker job guide
- processing mode still renders Worker job guide
- hybrid mode still distinguishes browser and worker recovery honestly

2. support helper integration tests
- live browser-first recovery surfaces consume getPdfStudioBrowserFailureRecoveryHint()
- browser-first recovery copy does not mention job IDs, failure codes, or worker diagnostics

3. analytics tests
- touched upgrade-intent flows use the shared trackUpgradeIntent path
- public-tool upgrade intent includes a stable source
- touched analytics payloads remain sanitized

4. regression coverage
- current Sprint 37.3 behavior that already works must stay green

Run at minimum:
- focused Sprint 37.3 tests first
- npm run test
- npm run lint on touched files at minimum
- npm run build

If full build still fails because of unrelated pre-existing repo debt, call it out clearly and separate it from this PR.

---

## Git / PR rules

- Keep commits logically grouped
- Do not commit unrelated docs/noise
- Update PR #192

Suggested commit sequence:
1. fix(pdf-studio): remove worker-only support affordances from browser notices
2. fix(pdf-studio): wire browser recovery helper into live support surfaces
3. fix(pdf-studio): normalize upgrade-intent analytics metadata
4. test(pdf-studio): cover sprint 37.3 remediation gaps

Update the PR description to mention:
- execution-mode-aware notice CTAs
- real browser-first recovery-copy normalization
- normalized upgrade-intent analytics source metadata

---

## Final response format

When done, reply with:

1. Branch / PR
- branch
- PR URL
- whether PR is updated and ready

2. Fixes applied
- support notice behavior
- recovery-copy integration
- analytics taxonomy
- tests

3. Validation
- exact commands run
- result summary
- any unrelated repo-wide issue still present

4. Residual risks
- only real remaining risks
- mention anything intentionally left for a later phase
```
