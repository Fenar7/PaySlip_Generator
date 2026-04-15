# Phase 20 PRD — Slipwise One
## Ecosystem + Enterprise Completion

**Version:** 1.0  
**Date:** 2026-04-14  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State After Phase 19](#2-current-state-after-phase-19)
3. [Phase 20 Objectives and Non-Goals](#3-phase-20-objectives-and-non-goals)
4. [Sprint 20.1 — Marketplace Publisher Payout Operations](#4-sprint-201--marketplace-publisher-payout-operations)
5. [Sprint 20.2 — GST Filing Automation and Compliance Operations](#5-sprint-202--gst-filing-automation-and-compliance-operations)
6. [Sprint 20.3 — Enterprise Identity and Access Completion](#6-sprint-203--enterprise-identity-and-access-completion)
7. [Sprint 20.4 — Partner Operating System and Ecosystem Surfaces](#7-sprint-204--partner-operating-system-and-ecosystem-surfaces)
8. [Sprint 20.5 — Hardening, Backfills, and Release Readiness](#8-sprint-205--hardening-backfills-and-release-readiness)
9. [Database Schema Additions and Extensions](#9-database-schema-additions-and-extensions)
10. [Route Map](#10-route-map)
11. [API and Integration Surface](#11-api-and-integration-surface)
12. [Background Jobs and Operational Workflows](#12-background-jobs-and-operational-workflows)
13. [Plan Gates and Permissions](#13-plan-gates-and-permissions)
14. [Edge Cases and Acceptance Criteria](#14-edge-cases-and-acceptance-criteria)
15. [Test Plan](#15-test-plan)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Environment Variables and External Dependencies](#17-environment-variables-and-external-dependencies)
18. [Risk Register](#18-risk-register)
19. [Branch Strategy and PR Workflow](#19-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 20 completes the part of Slipwise One that the master plan and Phase 15 already promised, but which the product still does not fully deliver in production-ready form: a strong ecosystem layer and a truly enterprise-grade operating model.

By the end of Phase 19, Slipwise One has:

- a unified SW Docs control plane
- governed template marketplace operations
- strong accounting, notification, workflow, and document foundations
- a developer portal, OAuth, webhook, GST export, partner, and enterprise settings surfaces

However, several high-value ecosystem and enterprise capabilities still remain deferred, partial, or intentionally disabled:

- marketplace publisher payout automation is still not operational
- GST reporting exists, but filing automation and filing operations are incomplete
- enterprise SSO exists as configuration UX, but production SAML verification and session issuance are not complete
- partner capabilities exist, but they are not yet a robust cross-org operating system
- ecosystem surfaces are present, but they do not yet feel like one coherent enterprise-grade layer

Phase 20 solves that.

### Strategic outcome

By the end of Phase 20, Slipwise One should support this operating model:

1. Marketplace publishers can onboard payout details, accrue revenue, review settlement state, and receive auditable payouts through a controlled operations workflow.
2. Finance and compliance teams can move from GST report export toward structured filing operations with validation, filing-run state, reconciliation, and recoverability.
3. Enterprise customers can configure and safely enforce SSO with production-grade SAML validation, session issuance, and operational recovery paths.
4. Partners such as accountant firms, agencies, and resellers can operate across managed client organizations through explicit lifecycle, permissions, reporting, and governance.
5. All of the above work as one coherent enterprise-and-ecosystem layer, not as separate partially finished features.

### Business value

| Problem today | Phase 20 outcome |
| --- | --- |
| Marketplace economics exist, but publisher payouts are still operationally manual or undefined | Marketplace revenue becomes settlement-ready and finance-operable |
| GST reports are available, but filing workflows remain incomplete | GST moves from export utility toward compliance operations |
| Enterprise SSO settings exist, but runtime production SSO is intentionally disabled | Enterprise identity becomes safely enforceable and customer-ready |
| Partner surfaces exist, but client governance and partner operations are lightweight | Partner program becomes a real business operating subsystem |
| Ecosystem features are fragmented by area | Slipwise gains a coherent ecosystem and enterprise completion layer |

### Why this phase now

This is the correct next phase after Phase 19.

Phase 19 made SW Docs operationally coherent. The next strongest product gap is no longer document control; it is ecosystem and enterprise completion. The master plan and Phase 15 already established that Slipwise One should become:

- enterprise-ready in identity, control, and compliance
- developer-friendly and integration-capable
- network-effect driven through marketplace and partner channels

Phase 20 closes the highest-value remaining gaps without opening unrelated new product lines.

---

## 2. Current State After Phase 19

Slipwise One now has strong coverage across:

- `SW Docs`
- `SW Pay`
- `SW Flow`
- `SW Books`
- `SW Auth & Access`
- `SW Intel`
- partner and collaboration surfaces

### Current ecosystem and enterprise surfaces already in the repo

The current product already includes visible surfaces for:

- template marketplace browse, install, publish, review, and governance
- marketplace purchase and revenue tracking
- GST reporting and export
- OAuth app management
- webhook management and replay
- partner application and partner dashboard flows
- enterprise settings such as custom domain, white label, and email-domain controls
- SSO / SAML settings and callback/initiation routes

### Current strengths

The product already supports a strong baseline:

- marketplace template governance is now structured rather than informal
- GST exports and tax reporting exist as real operator-facing surfaces
- OAuth and webhook v2 exist as ecosystem plumbing
- enterprise settings already have visible product entry points
- partner data models and managed-org relationships already exist

### Current product gaps that Phase 20 must close

| Existing capability | Current gap |
| --- | --- |
| `MarketplaceRevenue` and marketplace purchase/install | no end-to-end publisher payout operations system |
| GSTR exports and GST reporting | no structured filing lifecycle, submission orchestration, or recovery workflow |
| SSO settings and SAML metadata generation | production runtime is intentionally disabled pending verification and session issuance |
| Partner dashboard and managed-org records | no fully governed partner lifecycle, scoped operations model, or partner performance layer |
| Developer + marketplace + partner + enterprise surfaces | no fully unified ecosystem operating model |

### Repo evidence that informs this phase

Phase 20 is grounded in current repo truth and prior decisions:

- Phase 15 defined marketplace payouts, GST filing automation, OAuth/webhooks, and partner program as strategic surfaces.
- Phase 16 explicitly deferred:
  - marketplace payout automation via RazorpayX
  - GST portal/API submission automation
- enterprise SSO exists in the repo, but production runtime is still disabled until SAML signature verification and session issuance are implemented.
- partner program actions exist, but the current model is too light for enterprise-grade operations.

### Architecture rules Phase 20 must preserve

Phase 20 must stay consistent with the established architecture:

- Next.js App Router
- Prisma-backed modular monolith
- server actions in `actions.ts`
- auth and org context via `requireOrgContext()`
- privileged writes via `requireRole("admin")` or stronger explicit role boundaries where needed
- auditable, append-only eventing for sensitive operational actions
- plan enforcement via existing feature/plan gates
- adapter boundaries for external providers rather than provider-specific logic leaking through product code

### Non-negotiable engineering rules carried forward

1. External integrations must be idempotent and recoverable.
2. Enterprise auth changes must be safe to enforce and safe to disable.
3. Filing and payout workflows must be auditable and finance-operable.
4. Cross-org partner access must be explicitly permissioned and reversible.
5. Phase 20 must extend the existing platform rather than introducing disconnected subsystems.

---

## 3. Phase 20 Objectives and Non-Goals

### Objectives

| # | Objective | Sprint |
| --- | --- | --- |
| O1 | Operationalize publisher payout workflows for marketplace revenue | 20.1 |
| O2 | Move GST reporting toward structured filing operations with validation and reconciliation | 20.2 |
| O3 | Complete production-grade enterprise SSO and identity enforcement | 20.3 |
| O4 | Turn partner features into a governed operating system for accountants, agencies, and resellers | 20.4 |
| O5 | Unify ecosystem surfaces so marketplace, partner, developer, and enterprise operations are coherent | 20.4 |
| O6 | Finish Phase 20 with migration, backfill, observability, and release readiness discipline | 20.5 |

### Non-goals

Phase 20 does not include:

1. A completely new product line outside ecosystem and enterprise completion.
2. Replacing existing OAuth/webhook foundations with a new integration stack.
3. Full ERP-grade tax or payroll modules beyond the GST filing/compliance operational gap already identified.
4. Reworking the core SW Docs control plane delivered in Phase 19 except where needed to support payouts, compliance, partner, or enterprise completion.
5. A broad visual redesign of enterprise, partner, or developer surfaces unless required to support functional completion.

---

## 4. Sprint 20.1 — Marketplace Publisher Payout Operations

**Goal:** Convert marketplace revenue tracking into an operational payout system that finance teams and marketplace publishers can trust.

### Current gap

The repo already supports marketplace template publishing, purchase/install flows, governance, and revenue tracking. It does not yet provide:

- payout beneficiary onboarding
- payout eligibility and settlement states
- payout execution orchestration
- payout reconciliation and failure handling
- publisher-facing payout transparency

This was explicitly deferred out of Phase 16 and must now be completed.

### Roles

| Role | Needs |
| --- | --- |
| Publisher org admin | See earned revenue, payout readiness, payout failures, and payout history |
| Platform finance/admin | Review payout queue, hold/release items, reconcile provider responses |
| Platform moderator/admin | Freeze payouts tied to governance/compliance issues |
| Support/ops | Diagnose payout failures without mutating financial truth silently |

### Required product behavior

#### Publisher payout setup

- Add a publisher payout settings surface under template marketplace/publisher operations.
- A publisher can configure payout destination details through a dedicated onboarding flow.
- Payout details must support a verification state before the account becomes payout-eligible.
- Changes to payout details must create audit history and may require re-verification depending on the change.

#### Revenue settlement model

- Marketplace revenue must move through explicit states such as:
  - `pending`
  - `eligible`
  - `on_hold`
  - `queued_for_payout`
  - `paid`
  - `failed`
  - `reversed` or equivalent if finance correction is needed
- Revenue should not become payout-eligible until:
  - payment is settled
  - refund/reversal hold windows are respected
  - template governance status remains payout-safe
  - beneficiary onboarding is complete

#### Payout execution

- The system must support finance-approved payout runs.
- A payout run may include one or many publisher settlement items.
- Provider transport must live behind an adapter boundary.
- Each payout attempt must be idempotent and correlated to local payout records.
- Retry strategy must prevent duplicate settlements.

#### Reconciliation and failure handling

- Finance/admin users need a reconciliation surface for:
  - queued payouts
  - successful payouts
  - failures with provider reason
  - held payouts
  - manual review flags
- Failed payouts must not disappear from the ledger.
- Retrying a failed payout must preserve financial traceability.

#### Publisher visibility

- Publishers need a payout summary view with:
  - total earned
  - amount pending
  - amount on hold
  - last paid date
  - payout history
- Statement/export support should exist for publisher support and finance reconciliation.

### Required routes and surfaces

- `/app/docs/templates/publisher/payouts`
- `/app/docs/templates/publisher/payouts/setup`
- `/app/admin/marketplace/payouts`
- `/app/admin/marketplace/payouts/[runId]`

### Required APIs and jobs

- payout beneficiary onboarding endpoints/actions
- payout queue build and execution endpoints/actions
- payout reconciliation action or scheduled sync job
- finance hold/release action
- payout statement export endpoint

### Acceptance criteria

1. A verified publisher can accrue payout-eligible marketplace revenue.
2. Finance can create and execute a payout run without duplicate settlement.
3. Failed payouts remain visible, retryable, and auditable.
4. A publisher can see payout readiness and payout history without access to platform finance controls.

---

## 5. Sprint 20.2 — GST Filing Automation and Compliance Operations

**Goal:** Upgrade GST from report export capability into a structured filing operations system with validation, filing-run state, and recoverability.

### Current gap

Slipwise already exposes GST reporting and GSTR export. That is useful but not enough for businesses that want operational compliance. Current gaps include:

- no filing-run workflow by period
- no submit/lock/reconcile model
- no operator-facing validation pipeline before submission
- no formal provider boundary for GST portal/API automation
- no structured failure recovery after attempted submission

### Roles

| Role | Needs |
| --- | --- |
| Org admin / finance operator | Prepare, validate, and track filing status for a GST period |
| Accountant / partner operator | Assist client filing work with scoped access and auditability |
| Platform support/admin | Diagnose adapter and filing failures |

### Required product behavior

#### Filing workspace

- Add a GST filing operations workspace for each filing period.
- A filing period must show:
  - period identifier
  - preparation state
  - validation status
  - submission status
  - last export/submission attempt
  - reconciliation notes
- Filing runs must be explicit records, not inferred from downloads alone.

#### Validation before submission

- The system must validate for:
  - missing or malformed GSTIN
  - invalid or missing HSN/SAC
  - mismatched tax totals
  - duplicate invoice inclusion risk
  - filing on locked or already-submitted periods
- Validation failures must produce actionable operator messages.

#### Submission orchestration

- Submission logic must live behind an adapter boundary.
- The product must support sandbox/test and live modes.
- If direct portal/API automation is not available in every environment, the system must still support:
  - filing package generation
  - operator review
  - submission intent tracking
  - post-submit marking and reconciliation

#### Reconciliation and recovery

- Filing attempts must produce auditable run records.
- Operators need to see:
  - draft
  - validated
  - submission in progress
  - submitted
  - failed
  - reconciled
- Failed submissions must support safe retry without duplicate filing state.
- Post-submit adjustments must be visible and permissioned.

### Required routes and surfaces

- `/app/intel/gst-filings`
- `/app/intel/gst-filings/[period]`
- `/app/intel/gst-filings/[period]/history`
- optional admin/support filing diagnostics surface if required by implementation

### Required APIs and jobs

- filing-run creation and validation actions
- GST payload/package generation endpoint
- submission adapter action
- filing status sync/reconciliation job
- filing export endpoints for audit/compliance teams

### Acceptance criteria

1. A finance operator can create a filing run for a period and receive clear validation output.
2. The product can track filing state independently of raw export downloads.
3. Failed submission attempts are visible, retryable, and do not corrupt period state.
4. Filing history is auditable by period.

---

## 6. Sprint 20.3 — Enterprise Identity and Access Completion

**Goal:** Complete production-grade enterprise SSO and identity enforcement so enterprise customers can safely adopt Slipwise as an access-controlled system of record.

### Current gap

The product already has SSO settings and SAML metadata generation, but runtime production SSO remains intentionally disabled until:

- SAML signature verification is implemented
- assertion validation is complete
- session issuance is implemented safely

That means the current SSO surface is configuration-forward but not enterprise-ready.

### Roles

| Role | Needs |
| --- | --- |
| Enterprise org admin | Configure IdP, test login, enforce SSO, and recover safely |
| Platform support/admin | Help diagnose auth failures without bypassing security silently |
| End user | Complete SSO login reliably and understand fallback behavior |

### Required product behavior

#### SAML verification and login issuance

- Implement production-safe SAML response verification.
- Validate:
  - signature
  - audience
  - issuer
  - assertion timing
  - recipient / ACS destination
  - subject / NameID extraction
- Map verified identity to local user/session creation rules.

#### Enforcement model

- Enterprise org admins must be able to:
  - configure SSO
  - test SSO before enforcement
  - enable enforcement only when runtime conditions are valid
- Enforcement must define:
  - who is forced through SSO
  - whether invited/manual users can bypass
  - emergency break-glass behavior
  - fallback behavior during IdP outage

#### Certificate and metadata lifecycle

- Support metadata URL and XML ingestion with validation.
- Support certificate rotation and config revalidation.
- Show the last successful test time and config health status.

#### Auditability and recovery

- All sensitive auth configuration changes must be audit logged.
- SSO failures should produce operator-visible diagnostics without leaking secrets.
- Break-glass recovery must be explicit, limited, and auditable.

### Required routes and surfaces

- `/app/settings/security/sso`
- `/app/settings/security/sso/test`
- `/api/auth/sso/[orgSlug]/initiate`
- `/api/auth/sso/[orgSlug]/callback`

### Required APIs and jobs

- config validation action
- SSO test/login initiation
- callback assertion verification flow
- certificate/metadata refresh job if metadata URL mode is supported

### Acceptance criteria

1. Enterprise SSO can be enabled in production without disabling app access incorrectly.
2. Invalid or tampered SAML assertions are rejected safely.
3. Enterprise admins can test SSO before enforcement.
4. Support and security teams can audit config changes and login failures.

---

## 7. Sprint 20.4 — Partner Operating System and Ecosystem Surfaces

**Goal:** Turn the current partner program into a governed multi-tenant operating system and unify the surrounding ecosystem surfaces.

### Current gap

Current partner flows allow basic application and managed-org records, but they do not yet deliver:

- strong partner lifecycle governance
- explicit approval/revocation workflows
- clear scoped cross-org permissions
- partner reporting and operating metrics
- consistent ecosystem storytelling across marketplace, developer, and partner surfaces

### Roles

| Role | Needs |
| --- | --- |
| Partner org admin | Apply, onboard, manage clients, track value and revenue |
| Platform admin | Approve/reject/suspend partners and audit client access |
| Managed client org admin | Understand and control partner access to their organization |
| Developer/ecosystem user | See a coherent integration + partner + marketplace story |

### Required product behavior

#### Partner lifecycle and governance

- Partners must move through explicit states such as:
  - `applied`
  - `under_review`
  - `approved`
  - `suspended`
  - `revoked`
- Approval and suspension must be admin-controlled and auditable.
- Partner profile changes may require re-review depending on the change.

#### Managed client operations

- Client-org assignments must be explicit and revocable.
- Partner actions across client organizations must be scoped by role and capability.
- Sensitive actions performed on behalf of a client must carry actor attribution.
- Clients must be able to see which partner has what scope.

#### Partner reporting

- Partners need dashboards for:
  - managed clients
  - template/economics performance where relevant
  - compliance/reporting actions performed
  - activity history
- Platform admins need partner oversight across the full partner population.

#### Ecosystem surface coherence

- The product should present a more coherent ecosystem layer spanning:
  - marketplace publishing and template economy
  - developer apps and webhooks
  - partner program
  - enterprise-ready onboarding for larger customers
- If a public ecosystem or marketplace marketing surface is missing or incomplete, Phase 20 should define the minimal production-ready version required.

### Required routes and surfaces

- `/app/partner`
- `/app/partner/clients`
- `/app/partner/reports`
- `/app/admin/partners`
- `/(marketing)/marketplace` or equivalent public ecosystem surface if not yet delivered to production-ready standard

### Required APIs and jobs

- partner approval/suspension/revocation actions
- client assignment and removal actions
- scoped partner activity log retrieval
- partner metrics rollup job if needed for dashboard performance

### Acceptance criteria

1. Platform admins can approve, suspend, and revoke partners with a visible audit trail.
2. Partner-managed client access is explicit, scoped, and reversible.
3. Client organizations can understand partner access to their org.
4. Partner and public ecosystem surfaces feel coherent rather than fragmented.

---

## 8. Sprint 20.5 — Hardening, Backfills, and Release Readiness

**Goal:** Finish Phase 20 with the migration safety, observability, supportability, and release discipline required for merge readiness.

### Required workstreams

#### Data and migration readiness

- add any missing schema migrations for payout, filing, SSO, or partner models
- backfill legacy marketplace, GST, SSO, or partner data if new invariants require it
- ensure backfills are idempotent and dry-run-safe where practical

#### Authorization and concurrency hardening

- verify all sensitive actions use correct permission boundaries
- review duplicate payout, duplicate filing, and repeated enforcement edge cases
- ensure race conditions do not create duplicate side effects

#### Observability and support readiness

- add operational visibility for:
  - payout failures
  - submission failures
  - SSO/auth failures
  - partner access failures
- define support runbook requirements

#### Release readiness

- complete branch verification against the Phase 20 branch baseline
- verify migrations applied
- verify external provider configuration gates
- update release checklist and rollback expectations

### Acceptance criteria

1. Phase 20 data migrations and backfills complete safely.
2. Support can diagnose the main failure classes without inspecting raw provider payloads manually.
3. Release-readiness checklist is updated and enforceable.
4. The phase is ready for final review before any merge to `master`.

---

## 9. Database Schema Additions and Extensions

The exact schema names may evolve during implementation, but Phase 20 should define the following conceptual additions.

### Marketplace payout domain

- publisher payout destination / beneficiary model
- payout run model
- payout item model
- payout attempt / provider response model
- payout hold / release reason fields
- payout statement/export support fields

### GST filing domain

- GST filing period/run model
- filing validation summary model or structured fields
- filing submission attempt model
- filing reconciliation/status history model

### Enterprise identity domain

- stronger SSO config validation and health fields
- certificate / metadata refresh state
- SSO test result or last verified markers
- auth audit events if not already normalized elsewhere

### Partner operating domain

- partner lifecycle and review metadata
- managed client assignment scope model or expanded fields
- partner activity / reporting support fields

### Event and audit discipline

- all sensitive ecosystem and enterprise workflows should emit append-only auditable events

---

## 10. Route Map

### Existing routes extended in Phase 20

- `/app/settings/security/sso`
- `/app/settings/enterprise`
- `/app/partner`
- `/app/docs/templates/marketplace`
- `/app/intel/gst-reports`

### New routes expected in Phase 20

- `/app/docs/templates/publisher/payouts`
- `/app/docs/templates/publisher/payouts/setup`
- `/app/admin/marketplace/payouts`
- `/app/admin/marketplace/payouts/[runId]`
- `/app/intel/gst-filings`
- `/app/intel/gst-filings/[period]`
- `/app/intel/gst-filings/[period]/history`
- `/app/settings/security/sso/test`
- `/app/partner/clients`
- `/app/partner/reports`
- `/app/admin/partners`
- public ecosystem or marketplace route if required to close the current marketing gap

---

## 11. API and Integration Surface

### Marketplace payout operations

- payout onboarding actions/endpoints
- payout queue build and execute actions/endpoints
- payout reconciliation/status sync endpoints or jobs
- payout export endpoints

### GST filing operations

- filing run creation and validation actions/endpoints
- GST package generation endpoint
- submission adapter action/endpoint
- filing status refresh/reconcile actions

### Enterprise identity

- SSO config validation action
- SSO initiate and callback routes
- metadata refresh action if URL-based metadata remains supported

### Partner operations

- partner application review actions
- partner suspension/revocation actions
- managed-client assignment/revocation actions
- scoped partner reporting endpoints/actions

### Integration principles

1. Provider-specific behavior must live behind adapters.
2. Idempotency keys or equivalent correlation must exist for all side-effecting external operations.
3. Failed provider interactions must remain visible to operators.

---

## 12. Background Jobs and Operational Workflows

Phase 20 should add or formalize jobs for:

- payout queue processing
- payout reconciliation sync
- GST filing status sync or reconciliation
- SSO metadata refresh/health verification if metadata URL mode is used
- partner metrics rollup if dashboard aggregation requires it

Operational workflows should be explicit for:

- payout holds and releases
- filing retries
- auth incident response
- partner suspension and client unassignment

---

## 13. Plan Gates and Permissions

### Plan gates

| Capability | Minimum plan |
| --- | --- |
| Marketplace publish/publisher payout operations | Pro or higher, subject to existing marketplace gating |
| GST filing operations | Pro or Enterprise |
| Enterprise SSO enforcement | Enterprise |
| Partner operating system | plan-gated per existing partner strategy, at minimum not Free |

### Permission model expectations

| Surface | Required role boundary |
| --- | --- |
| Publisher payout setup | publisher org admin |
| Finance payout run controls | platform finance/admin |
| GST filing approval/submission | org admin or delegated finance/compliance role |
| SSO enforcement | enterprise org admin |
| Partner approval/suspension | platform admin |
| Partner managed-client operations | approved partner role with explicit scope |

Phase 20 must not rely on vague admin assumptions where platform-admin and tenant-admin boundaries differ.

---

## 14. Edge Cases and Acceptance Criteria

### Marketplace payout operations

| Scenario | Expected behavior |
| --- | --- |
| Same payout run retried after timeout | no duplicate settlement is created |
| Publisher changes payout details after earning revenue | already-earned items follow explicit hold/revalidation rules |
| Template purchase refunded before settlement | related revenue never reaches paid state silently |
| Provider returns ambiguous status | payout remains reconcilable and operator-visible |

### GST filing operations

| Scenario | Expected behavior |
| --- | --- |
| Filing run created for already submitted period | blocked or explicitly marked as correction workflow |
| Submission fails mid-flight | filing run remains in recoverable failed state |
| Invoice data changes after validation but before submit | run becomes stale and requires revalidation |
| Duplicate submit action triggered | idempotent protection prevents duplicate submission intent |

### Enterprise SSO

| Scenario | Expected behavior |
| --- | --- |
| Invalid signature in SAML response | login denied safely |
| IdP metadata rotates certificate | admin can refresh and revalidate config |
| SSO enforced but provider unavailable | break-glass policy works as designed and is auditable |
| User identity does not map to org membership | access denied with operator-visible reason |

### Partner operations

| Scenario | Expected behavior |
| --- | --- |
| Suspended partner tries to access managed client | access revoked immediately |
| Client org removes partner relationship | partner actions for that org stop immediately |
| Same client linked to partner twice | no duplicate relationship is created |
| Partner performs sensitive action for client | action is attributed to both actor and client scope |

---

## 15. Test Plan

### Sprint 20.1

- payout state machine unit tests
- payout adapter contract tests
- payout idempotency and retry tests
- finance/admin authorization tests
- publisher visibility integration tests

### Sprint 20.2

- GST filing validation unit tests
- filing-run lifecycle integration tests
- submission retry/idempotency tests
- period reconciliation tests
- compliance operator UI tests

### Sprint 20.3

- SAML assertion validation unit tests
- callback/session issuance integration tests
- enforcement and fallback tests
- auth audit-log tests
- negative-path security tests for invalid assertions

### Sprint 20.4

- partner lifecycle state tests
- cross-org authorization tests
- managed-client assignment/revocation tests
- partner/admin dashboard integration tests
- ecosystem surface smoke tests

### Sprint 20.5

- migration and backfill verification
- authorization regression tests
- observability and failure-handling tests
- `npm run test`
- `npm run lint`
- `npm run build`
- targeted e2e flows for payouts, GST filing, SSO, and partner operations

---

## 16. Non-Functional Requirements

1. Side-effecting financial and compliance operations must be idempotent.
2. Sensitive actions must be auditable.
3. External provider outages must degrade safely.
4. Enterprise auth must fail closed by default, except for explicitly designed break-glass paths.
5. Partner cross-org access must be explicit and revocable with minimal delay.
6. Phase 20 additions must preserve current modular-monolith conventions and avoid broad architectural churn.

---

## 17. Environment Variables and External Dependencies

Phase 20 is expected to depend on environment configuration for:

- payout provider credentials and account identifiers
- GST submission adapter credentials if live submission is supported
- SAML/SSO runtime configuration
- metadata refresh or provider endpoints
- alerting/ops notification channels for payout, filing, and auth failures

Representative external dependency classes:

- payout provider such as RazorpayX
- GST filing or portal integration boundary
- enterprise IdPs such as Okta, Azure AD, Google Workspace, or custom SAML

Exact variable names may be finalized during implementation, but the PRD requires production-safe secrets management and environment separation.

---

## 18. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Payout provider semantics create duplicate-settlement risk | Medium | Critical | idempotency keys, reconciliation model, manual review hold path |
| GST submission automation differs by portal/provider realities | Medium | High | adapter boundary, submission-intent tracking, export fallback |
| SSO enforcement causes customer lockout | Medium | Critical | test-before-enforce flow, break-glass path, audit trail |
| Partner cross-org access leaks data | Low | Critical | strict scope enforcement, actor attribution, admin/client visibility |
| Phase 20 grows too broad | Medium | High | keep scope anchored to enterprise/ecosystem completion only |

---

## 19. Branch Strategy and PR Workflow

Phase 20 must be developed from the current post-Phase-19 baseline, not from `master`.

### Required branch strategy

1. Base branch for Phase 20 planning and implementation: `feature/phase-19`
2. Create the phase branch from that baseline:
   - `feature/phase-20`
3. Create one sprint sub-branch at a time from `feature/phase-20`, for example:
   - `feature/phase-20-sprint-20-1`
   - `feature/phase-20-sprint-20-2`
   - `feature/phase-20-sprint-20-3`
   - `feature/phase-20-sprint-20-4`
   - `feature/phase-20-sprint-20-5`
4. Each sprint branch must open a PR back into `feature/phase-20`.
5. Phase 20 should only merge into `master` after:
   - all sprint PRs are merged into `feature/phase-20`
   - all acceptance criteria are verified
   - release readiness is complete

### Review workflow

- sprint PRs are reviewed individually
- changes should remain sprint-scoped and reviewable
- unresolved sprint issues should not be silently deferred without updating the PRD or follow-up planning artifact

### Final merge rule

`feature/phase-20` must not merge into `master` until the full phase has passed verification and sign-off.
