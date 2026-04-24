# PDF Studio Phases 36-38 Execution PRD

**Module:** PDF Studio  
**Document Type:** Forward execution PRD and engineering handoff  
**Status:** Ready for implementation planning and branch creation  
**Baseline:** `pdf-studio-continuation` includes completed work through **Phase 35**  
**Audience:** Product, engineering, QA, and release owners  

---

## 1. Purpose

This document defines the **remaining full PDF Studio work** after completion of Phase 35 and converts it into a clean execution roadmap for **Phase 36**, **Phase 37**, and **Phase 38**.

The goal is to give the software engineering team a single document they can execute from directly, without depending on fragmented historical notes or older PDF Studio phase documents.

This PRD is intentionally **forward-looking**:

- It treats **Phase 29 through Phase 35** as completed baseline work.
- It does **not** re-plan already merged capabilities.
- It organizes the remaining hardening, reliability, and release-closure work into concrete future phases and sprints.

---

## 2. Source of Truth Policy

Historical PDF Studio documents are useful input, but they are not equally reliable.

For Phases 36-38, precedence is:

1. **Current code on `pdf-studio-continuation`**
2. **Merged PDF Studio branch history through Phase 35**
3. **Current production/support docs**
4. **Historical PDF Studio phase docs and context notes**

This matters because older status/context docs conflict on whether some OCR, password, and session-recovery gaps are already fully closed. The engineering team must treat **live code and current branch state** as primary truth, and treat older documents as backlog input only.

Historical input documents:

- `docs/pdf-studio-phase2-plan.md`
- `docs/PDF studio/pdf-studio-phase2-slices-6-9-prd.md`
- `docs/status/slipwise-product-status-2026-04-03.md`
- `docs/copilot/context-2026-04-02.md`
- `docs/production/PDF_STUDIO_LAUNCH_CHECKLIST.md`

---

## 3. Current Baseline Through Phase 35

### 3.1 Completed baseline that must not be re-planned

The following PDF Studio phase line is treated as complete baseline:

- **Phase 29:** PDF Studio foundation and public surface setup
- **Phase 30:** Core page operations
- **Phase 31:** Document finishing tools
- **Phase 32:** Conversion hardening
- **Phase 33:** OCR workspace, deskew, scan cleanup, repair recovery hardening
- **Phase 34:** Plan gates, analytics/history, readiness, support, public/workspace hub improvements
- **Phase 35:** Public browser-lane hardening, create/jpg public-surface fixes, watermark workspace completion

### 3.2 Live PDF Studio capability baseline

The active baseline includes a broad tool catalog across:

- Page organization: create, merge, split, extract-pages, delete-pages, organize, rotate, resize-pages, alternate-mix
- Edit and enhance: editor, fill-sign, create-forms, page-numbers, bates, metadata, rename, remove-annotations, bookmarks, flatten, n-up, protect, unlock, watermark, grayscale, header-footer, repair, ocr, deskew
- Convert and export: pdf-to-image, extract-images, pdf-to-text, pdf-to-word, pdf-to-excel, pdf-to-ppt, word-to-pdf, html-to-pdf, jpg-to-pdf

### 3.3 What remains after Phase 35

The remaining work is **not** about adding another large family of missing tools. It is about making the full PDF Studio suite operationally complete, reliable, and release-ready.

The remaining backlog clusters into four themes:

- OCR production fidelity and operator control
- Security/protect/unlock hardening and policy consistency
- Processing-lane conversion/retry/recovery hardening
- End-to-end release closure, QA, support, and sign-off

---

## 4. Workflow and Branching Convention

This workflow is mandatory for all Phases 36-38.

### 4.1 Integration branch

The PDF Studio integration branch is:

- `pdf-studio-continuation`

No sprint branch or phase branch should target `master` directly.

### 4.2 Phase branch rule

Each phase is created from `pdf-studio-continuation`.

Examples:

- `feature/pdf-studio-phase-36`
- `feature/pdf-studio-phase-37`
- `feature/pdf-studio-phase-38`

### 4.3 Sprint branch rule

Each sprint branch is created from the **current head of its phase branch**, not from `master`.

Examples:

- `feature/pdf-studio-phase-36-sprint-36-1`
- `feature/pdf-studio-phase-36-sprint-36-2`
- `feature/pdf-studio-phase-36-sprint-36-3`

### 4.4 PR target rule

- Each sprint PR targets its **phase branch**
- Each later sprint branches from the updated phase branch after the earlier sprint is merged
- Only when the full phase is complete and verified does the **phase branch** merge into `pdf-studio-continuation`

### 4.5 Phase completion rule

A phase is considered complete only when:

- All phase sprints are merged into the phase branch
- Focused lint and test coverage for the phase pass
- Phase acceptance criteria are satisfied
- Release owner and QA sign off on the phase summary
- The phase branch is merged into `pdf-studio-continuation`

---

## 5. Roadmap Summary

| Phase | Goal | Sprints |
| --- | --- | --- |
| **Phase 36** | OCR production hardening and recovery closure | 36.1, 36.2, 36.3 |
| **Phase 37** | Security, conversion, and recovery hardening | 37.1, 37.2, 37.3 |
| **Phase 38** | Final QA, documentation closure, and production sign-off | 38.1, 38.2, 38.3 |

The roadmap intentionally stops at **Phase 38**. If further work is discovered after full Phase 38 verification, it should be handled as a new post-roadmap remediation phase, not silently added into these three phases.

---

## 6. Phase 36 — OCR Production Hardening

### 6.1 Phase objective

Make PDF Studio OCR reliable enough to be considered fully operational across image-based and scanned-document workflows, with correct searchable output, stable operator controls, and predictable restore/retry behavior.

### 6.2 Phase-level in scope

- Searchable text-layer fidelity
- OCR language and scope controls
- Retry/cancel/resume consistency
- OCR-heavy session recovery behavior
- Clear user messaging around partially recoverable OCR and watermark session state

### 6.3 Phase-level out of scope

- New OCR provider integrations
- Server-side OCR architecture replacement
- New pricing or entitlement model changes
- New non-OCR tool families

### Sprint 36.1 — OCR Fidelity and Searchable Output

**Objective:** Make OCR output trustworthy as a searchable PDF feature, not just an extracted-text convenience.

**In scope**

- Validate searchable text layer positioning against page geometry
- Ensure OCR text alignment remains correct with rotation, crop, deskew, and scan cleanup inputs
- Eliminate duplicate or stale OCR text-layer artifacts when pages are reprocessed
- Standardize low-confidence handling so the workspace distinguishes valid low-confidence output from outright OCR failure
- Ensure exported OCR-enabled PDFs preserve usable selection/search behavior page by page

**Implementation surfaces**

- OCR processing pipeline
- PDF generation/text-layer application logic
- OCR workspace result handling
- Scan-input and geometry helpers
- OCR-related tests

**Expected interface / behavior changes**

- OCR result state remains file/page based; no new user-facing data model beyond what current OCR types already support
- Low-confidence output remains exportable, but must be explicitly surfaced as low-confidence rather than silently treated as complete-quality text
- Searchable PDF export behavior becomes deterministic across all supported OCR input paths

**Acceptance criteria**

- A scanned PDF with multiple pages exports with selectable/searchable text that follows the correct page order
- Rotated or deskewed input does not produce visibly misaligned searchable text
- Re-running OCR on the same page replaces prior OCR output cleanly
- No page can end in an ambiguous state where OCR appears complete but exports no searchable text

**Required tests**

- Unit tests for text-layer placement helpers and OCR output normalization
- Workspace tests for low-confidence, failure, and rerun behavior
- Focused export tests that validate selectable text presence for representative OCR scenarios

### Sprint 36.2 — OCR Controls and Operator UX

**Objective:** Turn OCR into a controllable workflow rather than a one-shot action.

**In scope**

- Unify OCR control behavior across the dedicated OCR workspace and shared PDF Studio OCR-enabled flows
- Formalize language selection and make the chosen language visible wherever OCR is initiated
- Add page-scope controls for OCR runs where applicable
- Make retry, cancel, and rerun semantics consistent across single-page and multi-page OCR
- Ensure plan/limit messaging for OCR is explicit, honest, and consistent with current plan gates

**Implementation surfaces**

- `ocr-workspace.tsx`
- OCR enhancement/progress panels
- Shared OCR state handling in the main PDF Studio workspace
- Plan-gate copy and analytics hooks

**Expected interface / behavior changes**

- OCR controls should expose explicit run scope and explicit language selection wherever OCR execution begins
- Cancelled, failed, pending, and completed states must remain distinct and user-visible
- Retry actions must act only on eligible pages and must not reset already-good OCR pages unless the user explicitly reruns the entire set

**Acceptance criteria**

- Users can identify which pages failed, which were cancelled, and which are low-confidence
- Users can retry only the pages that need OCR reruns
- OCR controls do not hide plan-limit behavior or silently downgrade the requested workflow
- OCR cancellation never leaves the UI in a false “processing” state

**Required tests**

- Workspace/component tests for OCR controls, plan-limit messaging, and retry/cancel flows
- Analytics tests where OCR action source or outcome tracking changes
- Focused manual QA on multi-page scanned PDFs and mixed-quality inputs

### Sprint 36.3 — OCR Session Recovery and Restore Hardening

**Objective:** Make OCR session recovery reliable enough for interrupted work and browser refresh scenarios.

**In scope**

- Harden OCR session persistence and restore semantics
- Ensure completed OCR text is reusable after reload where current session policy permits it
- Preserve clear restore messaging for ephemeral assets such as watermark image blob URLs
- Remove ambiguous restore states where users cannot tell what must be rerun versus what was safely restored
- Ensure export after restore uses restored OCR state correctly and does not force unnecessary reruns

**Implementation surfaces**

- Session storage utilities
- Main PDF Studio workspace restore logic
- OCR workspace restore behavior
- Restore banners and user messaging

**Expected interface / behavior changes**

- Restored OCR work must explicitly show whether it is fully restorable, partially restorable, or requires re-upload/rerun
- Image watermark restore limitations remain explicit and honest
- Passwords continue to be excluded from persistence

**Acceptance criteria**

- Reloading an OCR-heavy session does not silently lose completed OCR text where restore is supported
- Users see a clear and specific restore warning when image watermark assets cannot survive reload
- Export after restore behaves consistently with the restored session state

**Required tests**

- Session-storage tests for OCR-complete, OCR-failed, OCR-cancelled, and watermark-image-cleared states
- Workspace tests for restore banners and post-restore export behavior
- Focused regression tests for password stripping during save/restore

### 6.4 Phase 36 exit criteria

- OCR output is searchable, stable, and geometry-correct on representative inputs
- OCR controls are explicit and consistent
- Restore behavior is understandable and safe
- No unresolved Phase 36 P1 bug remains open before merge to `pdf-studio-continuation`

---

## 7. Phase 37 — Security, Conversion, and Recovery Hardening

### 7.1 Phase objective

Close the remaining security and reliability gaps in protect/unlock flows and processing-lane conversions so PDF Studio behaves predictably across browser-first and worker-backed tools.

### 7.2 Phase-level in scope

- Password/protect/unlock hardening
- Validation and error consistency for protected or malformed inputs
- Worker conversion retry/recovery reliability
- Processing-lane support/error taxonomy cleanup

### 7.3 Phase-level out of scope

- New storage systems or new persistent product subsystems
- New office/conversion tool categories
- Billing or plan model redesign

### Sprint 37.1 — Protect/Unlock and Password Hardening

**Objective:** Make password protection and unlock workflows operationally safe and behaviorally consistent.

**In scope**

- Harden owner-password, user-password, and permission validation behavior
- Standardize protect/unlock error messages across browser and server paths
- Ensure tools that cannot operate on protected PDFs fail early with actionable guidance
- Remove mismatches between password settings UI, validation helpers, and actual encrypt/decrypt behavior
- Verify session persistence boundaries remain secure for password-related fields

**Implementation surfaces**

- Protect/unlock workspace
- Password settings panel and password utilities
- Encryptor route/client integration
- Browser and server PDF-read guards

**Expected interface / behavior changes**

- Permission presets remain the public UI contract
- Invalid or unsupported password combinations fail with deterministic copy
- All tools encountering protected PDFs must either block with correct guidance or route users to unlock first

**Acceptance criteria**

- Protect and unlock succeed for supported password scenarios
- Invalid passwords or malformed protected inputs fail clearly and safely
- Password-related state never persists to local storage or session restore payloads
- Browser and processing tools show aligned recovery guidance for protected inputs

**Required tests**

- Password utility tests
- Protect/unlock workspace tests
- API/route tests for encryption and protected-input handling
- Reader/client tests for protected PDF detection

### Sprint 37.2 — Processing Conversion Reliability and Retry Closure

**Objective:** Make worker-backed conversion tools resumable, diagnosable, and trustworthy under failure and retry conditions.

**In scope**

- Retry/dead-letter behavior for processing-lane conversions
- Validation of retryable vs non-retryable failure classification
- Resume/retry behavior when original inputs are still available
- Failure handling for malformed, oversized, or unsupported source documents
- Clear history/status presentation for processing jobs

**Implementation surfaces**

- Conversion job orchestration
- Process-conversion job logic
- Server conversion policy and converters
- Server conversion workspace and history surfaces

**Expected interface / behavior changes**

- Conversion jobs keep deterministic retry and dead-letter semantics
- Recovery guidance must match the actual failure class
- History surfaces must reflect whether a job can be retried, resumed, or requires source repair

**Acceptance criteria**

- Retryable failures requeue correctly and preserve user-facing recovery guidance
- Permanent validation failures do not churn in retry loops
- Dead-letter jobs expose enough information for support and users to act correctly
- Processing-lane history and readiness views agree on failure/retry counts

**Required tests**

- Conversion-jobs tests
- Process-conversion-job tests
- Server-conversion-policy tests
- Workspace tests for retry/recovery surfaces

### Sprint 37.3 — Unified Recovery and Diagnostics Closure

**Objective:** Make failure recovery coherent across the full suite rather than fragmented by tool.

**In scope**

- Align browser-first and worker-backed support notices
- Normalize failure-code mapping, recovery copy, and escalation guidance
- Ensure readiness/diagnostics pages reflect current suite behavior and plan gating honestly
- Tighten analytics taxonomy for failure, retry, support, and upgrade-intent events where PDF Studio support flows rely on them

**Implementation surfaces**

- Support helpers and notices
- Readiness page
- Hub/support copy
- Analytics helpers

**Expected interface / behavior changes**

- Browser-first tools remain honest about lacking worker job IDs
- Worker-backed tools retain job ID, failure-code, and readiness workflows
- Support/recovery copy becomes consistent across public and workspace surfaces

**Acceptance criteria**

- No PDF Studio tool presents misleading recovery instructions for its execution mode
- Support surfaces correctly distinguish browser-first from worker-backed diagnostics
- Readiness content and support notices reflect the actual current suite state

**Required tests**

- Support helper tests
- Dashboard/readiness tests
- Hub/support notice tests
- Analytics tests for touched support flows

### 7.4 Phase 37 exit criteria

- Protect/unlock behavior is consistent and hardened
- Worker-backed conversions have deterministic retry/dead-letter behavior
- Support and diagnostics surfaces no longer conflict about recovery expectations
- No unresolved Phase 37 P1 bug remains open before merge to `pdf-studio-continuation`

---

## 8. Phase 38 — Final QA, Documentation Closure, and Production Sign-Off

### 8.1 Phase objective

Close the roadmap by converting the now-complete PDF Studio feature set into a fully verified, documented, and sign-off-ready suite.

### 8.2 Phase-level in scope

- Full tool-by-tool QA coverage
- Documentation cleanup and source-of-truth reconciliation
- Release and operational sign-off
- Performance and readiness closure

### 8.3 Phase-level out of scope

- New product features unrelated to closure
- New monetization or plan redesign
- Non-PDF-Studio platform work

### Sprint 38.1 — Full Suite QA Matrix

**Objective:** Build and execute the final acceptance matrix across the entire live PDF Studio catalog.

**In scope**

- Define tool-by-tool verification across public and workspace routes
- Verify browser-first versus processing execution behavior matches the live registry
- Validate plan gates, limits, support messaging, and retention copy
- Add or tighten focused test coverage where coverage gaps are discovered during QA design

**Implementation surfaces**

- QA handbook entries for PDF Studio
- Focused Vitest coverage where gaps are found
- Public/workspace route verification checklists

**Acceptance criteria**

- Every live PDF Studio tool has a documented verification path
- Public/workspace availability matches the registry and gating rules
- No “hidden route” or “Soon” behavior exists for tools advertised as live

**Required tests**

- Focused Vitest for any uncovered high-risk gaps
- Manual QA checklist execution across representative browser-first and worker-backed tools

### Sprint 38.2 — Documentation, Runbook, and Workflow Closure

**Objective:** Make the documentation set as reliable as the codebase.

**In scope**

- Update or supersede stale historical PDF Studio docs where needed
- Reconcile launch checklist, readiness docs, support runbook, and future-roadmap language
- Produce a short final engineering handoff summary for the completed PDF Studio suite
- Ensure the team workflow and branch conventions are documented consistently

**Implementation surfaces**

- PDF Studio launch checklist
- PDF Studio support runbook
- Any stale forward-looking PDF Studio status documents that would mislead future work

**Acceptance criteria**

- The team can identify one clear forward execution/history story without conflicting status documents
- Launch and support docs match actual current suite behavior
- Branching and merge workflow are explicitly documented for future remediation work

**Required tests**

- Documentation review against current code and registry
- Manual verification of referenced routes and support paths

### Sprint 38.3 — Release Sign-Off and Production Closure

**Objective:** Decide whether PDF Studio can be called operationally complete.

**In scope**

- Final release-readiness gate review
- Performance and limit verification for representative heavy workflows
- Final support/recovery audit
- Go/no-go checklist for PDF Studio completion

**Implementation surfaces**

- Readiness checklist
- Release sign-off notes
- Performance verification notes

**Acceptance criteria**

- Full release checklist passes for PDF Studio
- Representative heavy workflows complete within acceptable product limits
- No unresolved Phase 36-38 blocking issue remains
- Product, engineering, and QA agree PDF Studio can be treated as complete baseline after this phase

**Required tests**

- Focused build/test/lint verification on touched PDF Studio surfaces
- Manual performance and operational verification against defined heavy scenarios

### 8.4 Phase 38 exit criteria

- Tool-by-tool QA is complete
- Documentation is reconciled and trustworthy
- Launch/support/readiness material is current
- Final sign-off is documented and Phase 38 is merged into `pdf-studio-continuation`

---

## 9. Engineering Rules for All Phases

The following rules apply to every sprint from 36.1 through 38.3.

### 9.1 Definition of done for each sprint

A sprint is not done until all of the following are true:

- Sprint code is merged into its phase branch
- Focused lint passes on touched PDF Studio files
- Focused test coverage passes for touched areas
- Any relevant docs or support copy changes are included in the sprint
- The sprint acceptance criteria in this PRD are satisfied

### 9.2 No silent scope creep

If a sprint reveals unrelated PDF Studio bugs:

- Fix only if they block the sprint objective or create correctness risk
- Otherwise record them as follow-up backlog
- Do not silently expand sprint scope without updating the phase summary

### 9.3 No fake “complete” claims

The team must not describe PDF Studio as “fully complete” until Phase 38 exits successfully. Feature existence in code is not enough; completion requires verification, readiness, supportability, and documentation closure.

---

## 10. Public Interfaces and Technical Assumptions

### 10.1 Public interface assumptions

- No new top-level PDF Studio product module is planned in Phases 36-38
- Existing tool routes remain the primary delivery surface
- User-visible changes are expected to be hardening, controls, recovery, and readiness improvements rather than net-new tool categories

### 10.2 Type and schema assumptions

- No new database tables are planned as part of this roadmap
- No migration is planned by default for Phases 36-38
- Existing application-layer job, OCR, and session models should be extended only if absolutely required by the sprint scope

### 10.3 Security assumptions

- Password material must continue to be excluded from persistence
- Browser-first tools must remain honest about runtime and support limitations
- Worker-backed tools must preserve recoverability and support traceability

---

## 11. Explicit Exclusions

The following are out of scope for this PRD unless a future document explicitly reopens them:

- User accounts, persistent drafts, and team collaboration flows
- New non-PDF-Studio product modules
- Mobile-native apps
- A rewrite of PDF Studio architecture
- Major pricing-model redesign
- New conversion categories beyond the current live catalog

---

## 12. Final Completion Condition

PDF Studio can be treated as complete after this roadmap only when all of the following are true:

- Phases 36, 37, and 38 are complete
- Each phase branch has been merged into `pdf-studio-continuation`
- Phase-level acceptance criteria are satisfied
- Release/readiness/support docs are current
- No unresolved blocking issue remains in OCR fidelity, protect/unlock hardening, conversion recovery, or final suite QA

At that point, any additional PDF Studio work should be treated as:

- post-completion enhancement work, or
- targeted remediation work

and should begin from a new PRD rather than extending this one.
