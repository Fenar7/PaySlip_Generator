# Phase 19 Post-Audit Remediation PRD
## Slipwise One — Phase 19 Audit Findings, Release Blockers, and High-Priority Corrections

**Version:** 1.0  
**Date:** 2026-04-14  
**Prepared for:** Slipwise One Software Engineering Team  
**Prepared by:** Codex Engineering Assistant  
**Audit Scope:** Blockers + High-Impact Issues Only

---

## 1. Executive Summary

This document is a post-implementation remediation PRD for **Phase 19** of Slipwise One:

- `SW Docs Control Plane`
- `Unified Document Vault`
- `Template Governance`

This is **not** a new feature PRD and it is **not** a speculative roadmap document.

It exists because the Phase 19 code was produced through AI-assisted implementation and now requires a focused engineering audit handoff covering:

- release blockers
- security flaws
- logical/data integrity defects
- high-impact functional gaps
- high-risk governance and workflow defects

The goal is to give the software engineering team a **decision-complete remediation plan** that can be executed immediately before any final release or merge-to-`master` decision.

### Critical baseline clarification

The current local checkout inspected during this audit is on `master`, but `master` does **not** contain the completed Phase 19 implementation.

The real Phase 19 implementation baseline is:

- `origin/feature/phase-19`

This PRD therefore treats **`origin/feature/phase-19` as the source of truth** for all findings and remediation work.

### Outcome expected from this PRD

After the engineering team completes the work described here:

1. Phase 19 will have a safe release boundary.
2. Template governance will have correct authorization and lifecycle controls.
3. Template revisioning will be data-consistent and install-safe.
4. Installed templates will remain pinned to approved revisions instead of drifting with mutable template state.
5. Release readiness for `feature/phase-19` will be evidence-based and verifiable.

---

## 2. Audit Baseline and Method

This remediation PRD is based on targeted audit review of the actual Phase 19 branch and its supporting continuity docs.

### Audit baseline branch

- `origin/feature/phase-19`

### Primary audited documents and surfaces

- `docs/PRD/PHASE_19_PRD.md`
- `docs/copilot/PHASE_19_CONTEXT.md`
- `docs/production/RELEASE_READINESS_CHECKLIST.md`
- `prisma/schema.prisma`
- `scripts/backfill-template-revisions.ts`
- `src/lib/docs-vault.ts`
- `src/lib/document-events.ts`
- `src/app/app/docs/templates/marketplace/actions.ts`
- `src/app/app/docs/templates/review/actions.ts`
- `src/app/app/docs/templates/review/page.tsx`
- `src/app/app/docs/templates/my-templates/page.tsx`
- `src/lib/auth/require-org.ts`

### Scope intentionally included

- release blockers
- security and authorization defects
- high-impact data integrity defects
- high-impact logical/functional defects
- high-impact install/governance lifecycle defects

### Scope intentionally excluded

- medium-priority cleanup
- low-priority UI polish
- stylistic refactors
- broad architecture rewrites unrelated to Phase 19 release safety

---

## 3. Audit Findings Summary

The audit found that Phase 19 is materially implemented on `feature/phase-19`, but it is **not yet safe to treat as fully release-ready**.

The most important problems are concentrated in the template governance and revisioning layers.

### Confirmed high-priority issues

| ID | Title | Severity | Release Impact |
| --- | --- | --- | --- |
| P19-R1 | Phase 19 release baseline is not aligned with `master` | High | Release and merge confusion |
| P19-R2 | Marketplace review queue uses tenant admin auth instead of platform governance auth | Critical | Unauthorized moderation exposure |
| P19-R3 | Template revision creator field is semantically wrong and type-unsafe | Critical | Data integrity and migration risk |
| P19-R4 | Installed templates are not operationally pinned to purchased revisions end-to-end | Critical | Silent behavior drift after install |
| P19-R5 | Governance state transitions are under-specified and non-idempotent | High | Duplicate publish and inconsistent moderation history |
| P19-R6 | Template detail visibility is not safely constrained by publication/review state | High | Unpublished/rejected data exposure |
| P19-R7 | Marketplace/install display contract is inconsistent for publisher identity | High | User-facing correctness defect |
| P19-R8 | Backfill and release-readiness gates are insufficiently enforced | High | Unsafe rollout risk |

---

## 4. Current-State Findings in Detail

### P19-R1 — Phase 19 release baseline is not aligned with `master`

#### Observed state

- The local checkout used for this audit is on `master`.
- `master` tops out below Phase 19.
- The complete Phase 19 implementation exists on `origin/feature/phase-19`.

#### Why this matters

- Teams may incorrectly assume Phase 19 is already merged.
- Release verification may accidentally run against the wrong baseline.
- Bugs can be mis-triaged as “missing in code” when they are actually “missing in the wrong branch.”

#### Required remediation outcome

The engineering team must treat `feature/phase-19` as the only valid release candidate branch for this remediation program.

No final go-live or merge-to-`master` decision can happen until:

1. this remediation PRD is completed on top of `feature/phase-19`
2. verification is re-run on `feature/phase-19`
3. branch diff against `master` is explicitly reviewed

---

### P19-R2 — Marketplace review queue uses tenant admin auth instead of platform governance auth

#### Affected surface

- `src/app/app/docs/templates/review/actions.ts`
- `src/lib/auth/require-org.ts`

#### Observed state

Marketplace governance actions currently rely on:

- `requireRole("admin")`

From the audited auth layer, `requireRole("admin")` is an **organization-role check** using the hierarchy:

- `member`
- `admin`
- `owner`

This is tenant-org authorization, not a platform moderation boundary.

The review actions currently guarded this way include:

- review queue access
- template-for-review access
- approve template
- reject template
- archive template

#### Why this matters

This creates a high-probability authorization defect:

- any org admin may gain access to marketplace-wide moderation operations
- tenant admins may be able to inspect or govern templates outside their tenant authority
- platform governance becomes indistinguishable from customer-org administration

#### Required remediation outcome

Introduce a dedicated marketplace governance authorization boundary.

This must not reuse plain tenant admin authorization.

#### Required implementation direction

Add a dedicated auth primitive, such as:

- `requireMarketplaceModerator()`
- or equivalent platform-governance guard

This guard must be backed by an explicit permission model.

Valid implementation options include:

- dedicated platform staff identity list
- dedicated workspace-level governance role
- explicit allowlist bound to secure configuration or persistent access control

The implementer must not leave this as org-admin-based access.

#### Acceptance criteria

1. Tenant org admins without governance rights cannot access review queue routes.
2. Tenant org admins without governance rights cannot approve, reject, or archive templates.
3. Authorized marketplace moderators can perform governance operations.
4. Unauthorized attempts produce safe denial behavior and no data leakage.

---

### P19-R3 — Template revision creator field is semantically wrong and type-unsafe

#### Affected surface

- `prisma/schema.prisma`
- `src/app/app/docs/templates/review/actions.ts`
- `scripts/backfill-template-revisions.ts`

#### Observed state

`MarketplaceTemplateRevision` currently includes:

- `createdBy String? @db.Uuid`

But the approval and backfill flows populate this field using:

- `template.publisherOrgId`

`publisherOrgId` is an organization id, not a user UUID.

This is a semantic mismatch and a data-shape defect.

#### Why this matters

- revision provenance becomes inaccurate
- future relation expansion becomes unsafe
- migration/backfill correctness is compromised
- analytics, moderation history, and auditability become ambiguous

#### Required remediation outcome

Split creator identity semantics clearly and permanently.

The engineering team must choose and implement one of these models:

1. `createdByUserId` for user actor provenance
2. `createdByOrgId` for publisher organization provenance
3. both fields, if both meanings are operationally required

#### Locked default for implementation

The recommended default is:

- `createdByOrgId` for publisher provenance
- `reviewedByUserId` for moderator provenance

Reason:

- marketplace template publishing is currently organization-owned
- moderation is user-actor-owned
- this cleanly separates publisher identity from reviewer identity

#### Required implementation direction

Update schema, migrations, backfill logic, and create/update flows so revision provenance is internally consistent.

Legacy rows created under the wrong semantic contract must be repaired during migration.

#### Acceptance criteria

1. Revision creator provenance is stored in correctly typed fields.
2. No code path writes org ids into user-UUID fields.
3. Backfills repair legacy incorrect rows.
4. Approval and revision creation use corrected semantics consistently.

---

### P19-R4 — Installed templates are not operationally pinned to purchased revisions end-to-end

#### Affected surface

- `src/app/app/docs/templates/marketplace/actions.ts`
- `src/app/app/docs/templates/my-templates/page.tsx`
- downstream template application flows that read mutable template records

#### Observed state

The Phase 19 branch introduces:

- `MarketplaceTemplateRevision`
- `MarketplacePurchase.revisionId`

Purchase creation now attempts to bind installs to the latest revision.

However, installed-template retrieval still reads:

- `include: { template: true }`

and the current installed-templates page renders from the mutable main template object rather than a revision-bound snapshot.

#### Why this matters

Without end-to-end revision pinning:

- orgs can silently drift to later template changes
- approved template state can mutate after purchase/install
- historical reproducibility is weakened
- the core Phase 19 template governance promise is violated

#### Required remediation outcome

Installed templates must be revision-bound operationally, not only in schema.

#### Required implementation direction

1. Treat `MarketplacePurchase.revisionId` as the canonical installed-template pointer.
2. Update installed-template queries to include revision data and prefer it over mutable template data.
3. Ensure downstream document creation or template application flows read the installed revision snapshot where applicable.
4. After backfill completion, `revisionId` must be treated as required for all completed purchases.

#### Acceptance criteria

1. Every installed template resolves to a stable revision snapshot.
2. Later template edits do not silently alter previously installed behavior.
3. Installed-template UI and template application paths read revision-aware data.
4. Legacy purchases with null revision bindings are repaired and verified.

---

### P19-R5 — Governance state transitions are under-specified and non-idempotent

#### Affected surface

- `src/app/app/docs/templates/review/actions.ts`
- `prisma/schema.prisma`

#### Observed state

The governance action layer does not currently enforce a rigorous moderation state machine.

Examples of risk:

- repeated approval may create duplicate published revisions
- approval can proceed without strong transition validation
- reject/archive behavior does not clearly distinguish valid source states
- published-template archival rules are not fully constrained

#### Why this matters

- moderation history can become contradictory
- duplicate publish records may be created
- support teams may face irreconcilable review states
- release safety decreases because governance behavior is not deterministic

#### Required remediation outcome

Define and enforce a strict governance state machine for:

- `DRAFT`
- `PENDING_REVIEW`
- `PUBLISHED`
- `REJECTED`
- `ARCHIVED`

#### Required implementation direction

Approval, rejection, archive, and any future republish path must be:

- transition-validated
- idempotent where needed
- duplicate-safe
- audit-friendly

The engineering team must define explicit valid transitions and implement them in the action layer.

#### Acceptance criteria

1. Invalid status transitions are rejected safely.
2. Re-approving an already published template is idempotent or explicitly forbidden.
3. Duplicate published revisions are prevented.
4. Reject and archive actions preserve coherent moderation history.

---

### P19-R6 — Template detail visibility is not safely constrained by publication or review state

#### Affected surface

- `src/app/app/docs/templates/marketplace/actions.ts`

#### Observed state

`getTemplateDetail(templateId)` reads template details by id and includes reviews, but does not appear to enforce strong visibility rules by status.

This creates a high risk that:

- unpublished templates
- rejected templates
- pending-review templates

may be retrievable outside the intended governance context.

#### Why this matters

- pending-review submissions may leak before moderation
- rejected content may remain accessible when it should not be
- internal review state may become visible to unauthorized users

#### Required remediation outcome

Implement explicit visibility rules for template detail access.

#### Required implementation direction

The system must distinguish at least these access modes:

1. Public marketplace viewer
2. Publishing org member
3. Marketplace moderator

The rules should be:

- public users can view only `PUBLISHED` templates
- publishers can view their own `DRAFT`, `PENDING_REVIEW`, and `REJECTED` templates
- moderators can view all moderation-relevant states

#### Acceptance criteria

1. Public marketplace reads cannot expose non-published templates.
2. Rejected and pending templates are visible only to authorized actors.
3. Review notes and rejection metadata are not leaked through public detail reads.

---

### P19-R7 — Marketplace and installed-template display contract is inconsistent

#### Affected surface

- `src/app/app/docs/templates/my-templates/page.tsx`
- marketplace UI contracts

#### Observed state

Installed-template rendering currently expects fields such as:

- `publisherId`

while the underlying data model uses publisher naming fields differently.

This is a correctness and contract-quality issue rather than a cosmetic-only issue.

#### Why this matters

- users may see wrong or blank publisher identity
- installed-template cards become unreliable
- front-end and server-action contracts drift apart

#### Required remediation outcome

Define one canonical display contract for template cards and installed-template records.

#### Required implementation direction

Normalize server payloads so UI components consume a stable shape for:

- template name
- template type
- publisher display name
- installed revision version
- installed date
- preview asset

#### Acceptance criteria

1. Installed-template views display correct publisher identity.
2. Marketplace card and installed card contracts are internally consistent.
3. UI no longer depends on ad hoc field assumptions.

---

### P19-R8 — Backfill and release-readiness gates are insufficiently enforced

#### Affected surface

- `scripts/backfill-template-revisions.ts`
- `docs/production/RELEASE_READINESS_CHECKLIST.md`
- Phase 19 release workflow

#### Observed state

Phase 19 includes backfill and hardening work, but the current operational contract is still too loose for a confident release:

- revision backfill is present, but depends on incorrect revision creator semantics
- backfill integrity checks are not formalized as acceptance gates
- branch readiness and baseline validation are not enforced strongly enough

#### Why this matters

- rollout may succeed partially while leaving corrupted provenance
- purchases may remain incompletely revision-bound
- release claims may be made without full phase-branch verification

#### Required remediation outcome

Formalize a release-ready remediation gate for `feature/phase-19`.

#### Required implementation direction

1. Correct schema semantics first.
2. Update backfill logic to match corrected schema.
3. Add post-backfill verification queries and acceptance metrics.
4. Update release-readiness checklist to include Phase 19-specific gates.
5. Require explicit verification on `feature/phase-19` before any merge to `master`.

#### Acceptance criteria

1. Backfill is idempotent.
2. Backfill is schema-correct.
3. Legacy purchases are revision-bound successfully.
4. Release checklist includes Phase 19 remediation verification items.
5. No merge-to-`master` happens without successful remediation verification.

---

## 5. Remediation Workstreams

This remediation must be executed through four tightly scoped workstreams.

### Workstream A — Authorization and Governance Security

#### Objective

Eliminate unauthorized access to marketplace moderation surfaces.

#### Required changes

- introduce a dedicated marketplace moderator authorization guard
- remove plain org-admin eligibility from governance routes/actions
- protect review queue, review detail, and moderation mutations
- ensure public marketplace reads cannot expose moderation-only data

#### Deliverables

- updated auth primitive for marketplace moderation
- updated review actions and review pages
- tests covering authorized and unauthorized access paths

---

### Workstream B — Revision Model Integrity and Purchase Pinning

#### Objective

Make template revisioning structurally correct and install-safe.

#### Required changes

- correct revision creator identity fields
- migrate existing bad provenance rows
- ensure every completed purchase points to a stable revision
- ensure installed-template reads use revision-bound data
- ensure template application flows prefer purchased revision snapshots

#### Deliverables

- schema migration
- data repair/backfill script updates
- revision-aware query contract for installed templates
- tests proving no silent post-install drift

---

### Workstream C — Governance State Machine and Moderation Correctness

#### Objective

Make moderation deterministic, duplicate-safe, and auditable.

#### Required changes

- define valid governance transitions explicitly
- prevent duplicate publish revision creation
- enforce approval/rejection/archive rules by current state
- ensure moderation metadata remains coherent across retries and repeated actions

#### Deliverables

- explicit transition rules
- idempotent moderation operations
- tests for repeated approval, invalid transitions, and moderation history

---

### Workstream D — Release Readiness and Deployment Safety

#### Objective

Convert Phase 19 from “implemented” to “evidence-backed release candidate.”

#### Required changes

- update release checklist with Phase 19-specific verification gates
- require branch-baseline verification against `master`
- require schema migration verification
- require backfill verification
- require authorization and revision-pinning verification

#### Deliverables

- updated release checklist
- remediation sign-off checklist for `feature/phase-19`
- verification evidence package for engineering and QA

---

## 6. Required Public Interface and Data Contract Changes

The remediation work changes internal and user-visible interfaces.

### Auth interface changes

Add a dedicated marketplace governance authorization primitive.

Examples:

- `requireMarketplaceModerator()`
- `getMarketplaceGovernanceContext()`

The final name may differ, but the behavior must be explicit and isolated from tenant org roles.

### Schema changes

`MarketplaceTemplateRevision` provenance fields must be corrected.

Recommended target contract:

- `createdByOrgId`
- `reviewedByUserId`

If the team decides to retain both publisher and creator-user semantics, that decision must still keep org ids and user UUIDs strictly separated.

### Installed-template read contract

Installed-template fetches must return revision-aware payloads including:

- template id
- revision id
- revision version
- display name
- template type
- publisher display name
- preview asset
- install timestamp

### Marketplace detail visibility contract

Template detail reads must explicitly enforce state-aware visibility by actor type:

- public viewer
- publisher org actor
- moderator actor

---

## 7. Test Plan

This remediation is not complete unless all tests below exist and pass.

### A. Authorization tests

1. Non-moderator org admin cannot access review queue.
2. Non-moderator org admin cannot approve a template.
3. Non-moderator org admin cannot reject a template.
4. Non-moderator org admin cannot archive a template.
5. Authorized marketplace moderator can perform all governance operations.

### B. Visibility tests

1. Public users can fetch `PUBLISHED` template detail.
2. Public users cannot fetch `DRAFT` template detail.
3. Public users cannot fetch `PENDING_REVIEW` template detail.
4. Public users cannot fetch `REJECTED` template detail.
5. Publisher can access its own pending/rejected submissions where intended.
6. Moderators can access all governance-relevant states.

### C. Governance state machine tests

1. Approval from `PENDING_REVIEW` succeeds.
2. Approval from `PUBLISHED` is idempotent or safely blocked.
3. Approval from invalid states is rejected safely.
4. Reject from invalid states is rejected safely.
5. Archive behavior follows explicit allowed transitions.
6. Duplicate published revisions are not created on repeated approval calls.

### D. Revision integrity tests

1. Revision creator fields match corrected schema semantics.
2. Approval creates a correct stable revision snapshot.
3. Legacy templates without revisions are backfilled exactly once.
4. Backfill does not duplicate existing revisions.

### E. Install and purchase pinning tests

1. Free template install binds purchase to revision.
2. Paid template purchase binds purchase to revision.
3. Installed-template reads resolve revision-aware data.
4. Later template mutations do not alter previously installed revision behavior.

### F. Release-readiness verification

1. Branch diff between `feature/phase-19` and `master` is reviewed.
2. Migration checks pass.
3. Backfill verification passes.
4. Lint/build/test pass on `feature/phase-19`.
5. QA sign-off references the corrected release checklist.

---

## 8. Delivery Plan

The engineering team should implement this remediation in the following order.

### Sequence 1 — Lock authorization boundary

- add governance-specific auth
- protect review actions and pages
- add authorization tests

### Sequence 2 — Correct schema semantics

- fix revision provenance fields
- write migration
- update approval and backfill code

### Sequence 3 — Enforce revision pinning

- update purchase/install read model
- update installed-template payloads
- verify downstream revision usage

### Sequence 4 — Harden governance transitions

- add explicit transition validation
- add idempotency guards
- prevent duplicate publish revision creation

### Sequence 5 — Backfill and verify

- run corrected backfill
- verify legacy repair
- update release-readiness documentation
- run full verification on `feature/phase-19`

---

## 9. Release Gate

Phase 19 is **no-go** for final merge to `master` until all of the following are true:

1. All remediation workstreams in this PRD are completed.
2. Authorization defects are closed.
3. Revision provenance is corrected and migrated.
4. Purchase/install revision pinning is verified.
5. Governance state machine protections are enforced.
6. Release-readiness checks pass on `feature/phase-19`.
7. Engineering and QA explicitly sign off the remediated Phase 19 branch.

Only after that may:

- `feature/phase-19` be considered release-ready
- final merge-to-`master` review begin

---

## 10. Final Notes for the Engineering Team

This remediation PRD is intentionally narrow and high-signal.

It does **not** ask the team to:

- redesign the marketplace
- rebuild the vault architecture
- replace the document models
- broaden Phase 19 scope

It asks the team to do the harder and more important thing:

- make the already-built Phase 19 implementation safe, correct, governable, and releaseable

The key principle for every fix in this document is:

**preserve the delivered Phase 19 product scope, but remove the hidden risks introduced by AI-assisted implementation shortcuts.**

