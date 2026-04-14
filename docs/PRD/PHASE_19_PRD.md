# Phase 19 PRD — Slipwise One
## SW Docs Control Plane + Unified Document Vault + Template Governance

**Version:** 1.0  
**Date:** 2026-04-13  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Post Phase 18](#2-current-state-post-phase-18)
3. [Phase 19 Objectives and Non-Goals](#3-phase-19-objectives-and-non-goals)
4. [Sprint 19.1 — Unified SW Docs Foundation](#4-sprint-191--unified-sw-docs-foundation)
5. [Sprint 19.2 — Lifecycle, Timeline, and State Normalization](#5-sprint-192--lifecycle-timeline-and-state-normalization)
6. [Sprint 19.3 — Attachments, Sharing, and Document Operations](#6-sprint-193--attachments-sharing-and-document-operations)
7. [Sprint 19.4 — Template Governance and Marketplace Operations](#7-sprint-194--template-governance-and-marketplace-operations)
8. [Sprint 19.5 — Hardening, Backfills, and Release Readiness](#8-sprint-195--hardening-backfills-and-release-readiness)
9. [Database Schema Additions and Extensions](#9-database-schema-additions-and-extensions)
10. [Route Map](#10-route-map)
11. [Background Jobs and Backfills](#11-background-jobs-and-backfills)
12. [Plan Gates](#12-plan-gates)
13. [Edge Cases and Acceptance Criteria](#13-edge-cases-and-acceptance-criteria)
14. [Test Plan](#14-test-plan)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Environment Variables](#16-environment-variables)
17. [Risk Register](#17-risk-register)
18. [Branch Strategy and PR Workflow](#18-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 19 completes the part of Slipwise One that the master plan originally described as `SW> Docs`, but which the product still does not fully deliver as a coherent operational suite.

Slipwise One already has strong document creation and persistence for:

- invoices
- vouchers
- salary slips
- quotes
- templates
- PDF Studio

However, those capabilities still operate as a set of powerful individual modules rather than one unified document operations system.

Today, the repo already includes:

- dedicated list/detail/create flows for invoices, vouchers, salary slips, and quotes
- template browsing and a marketplace surface
- archive and duplicate behavior on individual document types
- invoice-specific timeline/state behavior
- attachment infrastructure
- document-specific search and filters

But the product still lacks the operational control plane expected from the master plan:

- there is no true `/app/docs` suite home for document operations
- there is no `/app/docs/vault` unified Document Vault
- document lifecycle behavior is inconsistent across document types
- timeline and event history are stronger for invoices than for vouchers, salary slips, and quotes
- template governance is incomplete even though marketplace submission and purchase/install flows exist
- quotes exist as real documents in the product, but are not yet treated as first-class citizens in a unified document operations model

Phase 19 solves that.

### Strategic outcome

By the end of Phase 19, Slipwise One should support this working model:

1. Admins and operators can manage all business documents from one SW Docs control surface.
2. Invoices, vouchers, salary slips, and quotes appear inside a unified Document Vault with normalized listing, filtering, and search.
3. Every major document lifecycle event produces coherent timeline history and operational auditability.
4. Attachments, sharing, duplication, archiving, restore, and access behavior are consistent across all document types.
5. Template browsing, installation, publishing, review, approval, rejection, archive, and revision history become operationally governed rather than loosely marketplace-driven.

### Business value

| Problem today | Phase 19 outcome |
| --- | --- |
| Documents exist, but operations are fragmented by module | SW Docs becomes a real document operations suite |
| Users can list invoices/vouchers/slips/quotes separately, but not manage them together | Unified vault and normalized document listing become first-class |
| Invoice lifecycle is stronger than other documents | Lifecycle, timeline, and archive/restore behavior become consistent |
| Attachments and sharing are uneven across document types | Document actions and attachment handling become normalized |
| Template marketplace exists, but governance is incomplete | Review, moderation, revisioning, and template safety become enforceable |
| Quotes are present but not fully integrated into document operations | Quotes become full first-class documents in the unified layer |

### Why this phase now

This is the correct next phase after Phase 18.

Phase 18 completed Flow configuration, delivery operations, customer collaboration, and operational analytics. That means the platform now has:

- workflow control
- notification delivery
- customer collaboration
- reporting and operational visibility

The next logical gap is document operations coherence.

Without Phase 19, Slipwise One risks having:

- strong payments, workflow, and reporting layers built around documents
- but no unified control plane for the documents themselves

Phase 19 closes that gap by turning SW Docs into the operational suite that the master PRD intended.

---

## 2. Current State Post Phase 18

Slipwise One now has substantial coverage across:

- `SW Docs`
- `SW Pay`
- `SW Flow`
- `SW Books`
- `SW Auth & Access`
- `SW Intel`
- customer portal

### Existing document surfaces already live

Current SW Docs routes already in the repo include:

- `/app/docs/invoices`
- `/app/docs/invoices/new`
- `/app/docs/invoices/[id]`
- `/app/docs/vouchers`
- `/app/docs/vouchers/new`
- `/app/docs/vouchers/[id]`
- `/app/docs/salary-slips`
- `/app/docs/salary-slips/new`
- `/app/docs/salary-slips/[id]`
- `/app/docs/quotes`
- `/app/docs/quotes/new`
- `/app/docs/quotes/[id]`
- `/app/docs/templates`
- `/app/docs/templates/marketplace`
- `/app/docs/templates/my-templates`
- `/app/docs/templates/publish`
- `/app/docs/pdf-studio/*`

### Existing document models already in the schema

Relevant Prisma models already present:

- `Invoice`
- `InvoiceLineItem`
- `InvoiceStateEvent`
- `Voucher`
- `VoucherLine`
- `SalarySlip`
- `SalaryComponent`
- `Quote`
- `QuoteLineItem`
- `FileAttachment`
- `MarketplaceTemplate`
- `MarketplacePurchase`
- `MarketplaceReview`
- `MarketplaceRevenue`

### Existing strengths

The current product already supports a strong baseline:

- persistent save/reopen/edit/archive flows
- duplicate flows on core document types
- invoice lifecycle and reissue behavior
- quote acceptance/decline/convert behavior
- template browsing and default template selection
- marketplace purchase/install/publish flows
- PDF Studio utility surfaces

### Remaining product gaps that Phase 19 must close

| Existing capability | Current gap |
| --- | --- |
| Per-document list pages | no unified Document Vault across all document types |
| Individual detail pages | no normalized cross-document timeline/event model |
| Archive/duplicate flows | inconsistent lifecycle semantics across doc types |
| `FileAttachment` | no clearly unified attachment behavior across all docs, especially quotes |
| Template marketplace | no admin review queue, approval flow, rejection handling, or revision discipline |
| SW Docs suite | no coherent `/app/docs` operational home |
| Quotes | present, but not yet fully integrated into a normalized SW Docs operations layer |

### Architecture rules Phase 19 must preserve

Phase 19 must stay consistent with the established architecture:

- Next.js App Router
- Prisma-backed modular monolith
- server actions in `actions.ts`
- auth and org context via `requireOrgContext()`
- privileged writes via `requireRole("admin")` where applicable
- current action result shape:
  - `{ success: true, data }`
  - `{ success: false, error }`
- current attachment framework through `FileAttachment`
- current template/marketplace framework through `MarketplaceTemplate` and related models

### Non-negotiable engineering rules carried forward

1. The unified document layer must extend existing document source-of-truth models rather than replacing them.
2. Existing detail routes remain authoritative for document editing and type-specific logic.
3. Timeline/event history must be append-only and auditable.
4. Template revisioning must not silently alter already-issued or already-bound document behavior.
5. Quote support is fully in scope for Phase 19.

---

## 3. Phase 19 Objectives and Non-Goals

### Objectives

| # | Objective | Sprint |
| --- | --- | --- |
| O1 | Create a real SW Docs suite home and unified Document Vault | 19.1 |
| O2 | Normalize cross-document listing, filtering, and search across invoices, vouchers, salary slips, and quotes | 19.1 |
| O3 | Introduce a coherent timeline/event system across all document types | 19.2 |
| O4 | Normalize lifecycle behavior including archive, restore, duplicate, and state history | 19.2 |
| O5 | Standardize attachment, sharing, and document action behavior across all documents | 19.3 |
| O6 | Bring quotes into full first-class support inside the document operations model | 19.3 |
| O7 | Add template governance workflows including moderation, approval, rejection, archive, and revision control | 19.4 |
| O8 | Make template safety and compatibility enforceable for installed and published templates | 19.4 |
| O9 | Backfill and harden the normalized document layer for existing org data | 19.5 |
| O10 | Deliver a release-ready SW Docs control plane suitable for daily admin/operator use | 19.5 |

### Non-goals

Phase 19 intentionally does **not** include:

1. a full visual template builder
2. a generic CMS or arbitrary content-management system
3. a new document rendering engine replacing the existing invoice/voucher/salary/quote renderers
4. a rewrite of PDF Studio architecture
5. a procurement, CRM, or contract-management expansion
6. a new public marketplace moderation back office outside the minimal admin review functionality needed for template governance
7. cross-org shared document workspaces

### Product positioning for this phase

Phase 19 is the **SW Docs completion phase**.

It is not:

- a minor SW Docs polish sprint
- a template-only phase
- a quote-only phase
- a PDF Studio expansion phase

It is the phase that unifies document operations into one coherent suite.

---

## 4. Sprint 19.1 — Unified SW Docs Foundation

**Goal:** Establish SW Docs as a real operational suite with a suite home and unified vault model.

**Epic ownership:** SW Docs + SW Intel support for listing performance  
**Dependencies:** existing Invoice, Voucher, SalarySlip, Quote, Template, and attachment persistence layers

### 4.1 SW Docs suite home

Add `/app/docs` as the actual suite entry point for SW Docs.

Required behavior:

- present a SW Docs overview rather than just quick links
- surface:
  - recent documents
  - document counts by type
  - draft/open/recently-updated summary blocks
  - primary entry actions
  - links to vault, templates, and PDF Studio

### 4.2 Document Vault

Add `/app/docs/vault` as the unified cross-document operations surface.

Required behavior:

- one list for:
  - invoices
  - vouchers
  - salary slips
  - quotes
- normalized columns/fields:
  - document type
  - document number
  - primary title/summary
  - status
  - counterparty/employee label
  - amount where applicable
  - primary date
  - updated date
  - archived state
- filter by:
  - type
  - status
  - archived
  - date range
- search by:
  - document number
  - customer/vendor/employee
  - quote title
- sort by:
  - latest updated
  - latest created
  - date
  - amount where meaningful

### 4.3 Normalized listing layer

Phase 19 should define a normalized document listing model.

Recommended implementation:

- add `DocumentIndex`
- source-of-truth remains the original document models
- `DocumentIndex` is the operational listing and search layer

Required fields:

- `id`
- `orgId`
- `docType`
- `documentId`
- `documentNumber`
- `titleOrSummary`
- `counterpartyLabel`
- `status`
- `primaryDate`
- `updatedAt`
- `amount`
- `currency`
- `archivedAt`

### 4.4 Acceptance gate for Sprint 19.1

- `/app/docs` and `/app/docs/vault` are live
- vault works across all four document types
- quotes are included in the vault
- vault filtering and search are org-scoped and accurate
- vault performance is acceptable at realistic document counts

---

## 5. Sprint 19.2 — Lifecycle, Timeline, and State Normalization

**Goal:** Normalize lifecycle and history behavior across all SW Docs document types.

**Epic ownership:** SW Docs + SW Flow event discipline  
**Dependencies:** Sprint 19.1 normalized listing layer, existing invoice lifecycle, quote lifecycle, archive/duplicate flows

### 5.1 Unified timeline/event model

Introduce a normalized document timeline model.

Recommended implementation:

- add `DocumentEvent`

Required event coverage:

- created
- updated
- duplicated
- archived
- restored
- issued
- approved
- released
- paid-related document state changes where the document surface reflects them
- quote accepted
- quote declined
- quote converted
- sent/shared/exported where Phase 19 chooses to expose those actions in the document layer

Required fields:

- `id`
- `orgId`
- `docType`
- `documentId`
- `eventType`
- `actorId`
- `actorLabel`
- `eventAt`
- `metadata`

### 5.2 Lifecycle normalization

Normalize document operations across:

- Invoice
- Voucher
- SalarySlip
- Quote

Required behavior:

- archive and restore rules are explicit and consistent
- duplicate behavior creates clean new records without mutating the original
- detail pages show timeline/event history consistently
- lifecycle labels are product-coherent even when underlying types differ

### 5.3 Quote first-class treatment

Quotes must be fully included in Phase 19.

Required behavior:

- appear in vault
- appear in normalized timeline
- support archive/restore/duplicate in the same operational pattern as other docs
- conversion to invoice is reflected as a document event

### 5.4 Acceptance gate for Sprint 19.2

- all four document types produce timeline history
- archive/restore/duplicate behavior is operationally consistent
- quote acceptance/decline/convert history is visible and correct
- timeline ordering and actor attribution are auditable

---

## 6. Sprint 19.3 — Attachments, Sharing, and Document Operations

**Goal:** Standardize document actions beyond persistence so SW Docs becomes operationally complete.

**Epic ownership:** SW Docs + storage/access control  
**Dependencies:** Sprint 19.2 document event model, existing `FileAttachment` framework

### 6.1 Attachment normalization

Required behavior:

- align attachment UX and access patterns across:
  - invoices
  - vouchers
  - salary slips
  - quotes
- quote attachments must be supported as first-class behavior
- attachment listing, download, and metadata display should feel consistent on detail pages and in vault context

Recommended schema extension:

- extend `FileAttachment` support to quotes if not already present through relation wiring

### 6.2 Document actions

Standardize visible actions for applicable document types:

- export
- print
- send/share
- duplicate
- archive
- restore

Phase 19 should define which actions are valid per document type and make the UI/permissions explicit.

### 6.3 Access/share traceability

For tokenized or link-based document access flows:

- log access/share events where needed for traceability
- reflect those events in document timeline where appropriate
- do not create a second access-log system where one already exists; extend existing patterns

### 6.4 Acceptance gate for Sprint 19.3

- attachments work consistently across all document types
- quote attachment support is operational
- document actions are visible, permissioned, and correct
- access/share activity is traceable for applicable flows

---

## 7. Sprint 19.4 — Template Governance and Marketplace Operations

**Goal:** Turn the current template ecosystem into a governed operational system.

**Epic ownership:** SW Docs + SW Auth & Access + commercial operations  
**Dependencies:** existing marketplace schema and install/purchase/publish flows

### 7.1 Admin review queue

Add admin governance surfaces for marketplace template submissions.

Required routes:

- `/app/docs/templates/review`
- `/app/docs/templates/review/[templateId]`

Required actions:

- approve
- reject
- archive
- publish
- unpublish if needed by governance policy

### 7.2 Review metadata

Extend marketplace template governance with explicit review metadata.

Recommended fields on `MarketplaceTemplate`:

- `reviewedBy`
- `reviewedAt`
- `publishedAt`
- `rejectionReason`
- `reviewNotes`
- `archivedAt` if separate from `status`

### 7.3 Template revisioning

Introduce explicit revision/version history.

Recommended model:

- `MarketplaceTemplateRevision`

Required behavior:

- templates have immutable revisions
- installed templates and already-bound document uses must remain stable
- revision publication must not silently mutate older document render assumptions
- review should operate at the revision level where appropriate

### 7.4 Compatibility and safety rules

Phase 19 must explicitly define:

- which document types a template revision supports
- how installed templates resolve to active revisions
- how existing documents preserve their intended rendering behavior

### 7.5 Acceptance gate for Sprint 19.4

- review queue is operational
- templates can be approved/rejected/archived through admin flows
- template revisions are explicit and safe
- install/purchase behavior remains coherent after governance changes

---

## 8. Sprint 19.5 — Hardening, Backfills, and Release Readiness

**Goal:** Make the new SW Docs control plane stable, performant, and merge-ready.

**Epic ownership:** platform hardening + QA + data migration readiness  
**Dependencies:** all prior Phase 19 sprint outputs

### 8.1 Backfills

Add backfills for existing production data into the new normalized layers.

Required backfills:

- populate `DocumentIndex` for all existing invoices, vouchers, salary slips, and quotes
- populate `DocumentEvent` from reconstructable historical state where possible
- backfill template governance metadata defaults where necessary

### 8.2 Drift repair and consistency checks

Add repair/consistency jobs where needed:

- document index sync/repair
- event backfill retry safety
- template revision integrity checks if needed

### 8.3 Permissions and audit completeness

Ensure all new SW Docs operations are correctly permissioned and auditable:

- vault access
- document restore
- governance actions
- template review actions
- attachment/share operations

### 8.4 Performance and release checks

Required validation:

- vault query performance
- search/filter correctness
- timeline rendering performance
- template review list performance
- no regression in existing per-document edit/detail flows

### 8.5 Acceptance gate for Sprint 19.5

- build and targeted tests are green
- vault/index/event backfills are idempotent
- permissions are correct
- audit coverage is complete
- Phase 19 is ready for merge into `feature/phase-19`

---

## 9. Database Schema Additions and Extensions

### New models

#### `DocumentIndex`

Purpose:

- normalized unified listing/search layer for all document types

Fields:

- `id`
- `orgId`
- `docType`
- `documentId`
- `documentNumber`
- `titleOrSummary`
- `counterpartyLabel`
- `status`
- `primaryDate`
- `updatedAt`
- `amount`
- `currency`
- `archivedAt`

Indexes:

- `orgId + docType`
- `orgId + status`
- `orgId + archivedAt`
- search-supporting indexes as appropriate for database capabilities

#### `DocumentEvent`

Purpose:

- normalized timeline/event history for all documents

Fields:

- `id`
- `orgId`
- `docType`
- `documentId`
- `eventType`
- `actorId`
- `actorLabel`
- `eventAt`
- `metadata`

Indexes:

- `orgId + docType + documentId + eventAt`
- `orgId + eventType + eventAt`

#### `MarketplaceTemplateRevision`

Purpose:

- explicit immutable revision history for governed templates

Fields:

- `id`
- `templateId`
- `version`
- `templateData`
- `previewImageUrl`
- `previewPdfUrl`
- `status`
- `createdBy`
- `createdAt`
- `reviewedBy`
- `reviewedAt`
- `reviewNotes`
- `rejectionReason`
- `publishedAt`

Indexes:

- `templateId + version`
- `templateId + status`

### Existing model extensions

#### `MarketplaceTemplate`

Extend with governance metadata if not pushed into revisions alone:

- `reviewedBy`
- `reviewedAt`
- `publishedAt`
- `rejectionReason`
- `archivedAt`

#### `Quote`

Ensure quote supports the same operational document behaviors as the other document models:

- attachment relation support
- vault/index sync
- document event history

#### `FileAttachment`

Extend relation wiring and operational usage for quote support and unified SW Docs attachment UX.

---

## 10. Route Map

### New routes

- `/app/docs`
- `/app/docs/vault`
- `/app/docs/templates/review`
- `/app/docs/templates/review/[templateId]`

### Existing routes Phase 19 must extend, not replace

- `/app/docs/invoices`
- `/app/docs/invoices/[id]`
- `/app/docs/vouchers`
- `/app/docs/vouchers/[id]`
- `/app/docs/salary-slips`
- `/app/docs/salary-slips/[id]`
- `/app/docs/quotes`
- `/app/docs/quotes/[id]`
- `/app/docs/templates`
- `/app/docs/templates/marketplace`
- `/app/docs/templates/my-templates`
- `/app/docs/templates/publish`

### UI expectations

- Vault is the cross-document management layer
- Existing document detail pages remain the type-specific authority
- Template review is admin-only
- Quote surfaces must be visually and operationally aligned with the rest of SW Docs

---

## 11. Background Jobs and Backfills

Phase 19 should define these jobs or one-off backfills:

- document index backfill
- document event backfill
- ongoing document index sync/repair job if needed
- template revision integrity/backfill job if governance model requires migration from current marketplace data

Rules:

- all jobs must be idempotent
- no duplicate index rows
- no duplicate event reconstruction
- backfills must be resumable if interrupted

---

## 12. Plan Gates

### Gate 19.1

- SW Docs home and vault exist
- vault lists all four document types accurately

### Gate 19.2

- timeline exists across all four document types
- lifecycle normalization is complete

### Gate 19.3

- attachments and document actions are consistent across SW Docs
- quote document operations are fully first-class

### Gate 19.4

- template review/governance and revisioning are operational
- no silent template mutation risk remains

### Gate 19.5

- backfills and hardening are complete
- Phase 19 is ready for final branch review and eventual merge path toward `master`

---

## 13. Edge Cases and Acceptance Criteria

Phase 19 must explicitly account for:

- archived documents appearing or not appearing correctly in vault results
- quote conversion without duplicate or misleading timeline history
- duplicate actions generating correct new document identity and numbering
- template revision publication without breaking existing installed or already-used templates
- attachments on quotes following the same access and rendering rules as other docs
- backfills running safely on organizations with partial or inconsistent historical data
- vault search returning mixed-document results without cross-org leakage
- document event ordering remaining correct when multiple updates occur quickly

### Acceptance criteria summary

Phase 19 is complete when:

1. SW Docs has a real operational home
2. Document Vault works across invoices, vouchers, salary slips, and quotes
3. Document lifecycle and timeline behavior are coherent and auditable
4. Attachments and document actions are standardized
5. Template governance and revisioning are operational
6. Backfills and hardening make the phase release-ready

---

## 14. Test Plan

### Unit and integration tests

- vault query builder across all document types
- document index sync logic
- document event creation on lifecycle actions
- archive/restore/duplicate behaviors
- quote conversion event handling
- attachment authorization and quote attachment flows
- template review/approve/reject/archive logic
- template revision selection and compatibility logic
- backfill idempotency

### UI and route tests

- `/app/docs`
- `/app/docs/vault`
- document detail timeline rendering
- template review queue
- quote inclusion in vault and timeline

### Acceptance scenarios

1. Admin searches vault for all documents linked to a customer and gets mixed results correctly.
2. User archives and restores a quote and sees correct vault/timeline updates.
3. User duplicates a salary slip and the new record is independently visible in vault.
4. Admin reviews a submitted marketplace template, rejects it, then approves a revised version later.
5. Existing organizations receive fully backfilled document index and event history without duplication.

---

## 15. Non-Functional Requirements

- vault responses must stay performant at realistic SMB and mid-market document volumes
- normalized listing and event models must be auditable and deterministic
- search/filter behavior must remain org-scoped and secure
- timeline/event creation must not break existing document save/update flows
- template governance changes must not degrade marketplace purchase/install reliability
- backfill jobs must be resumable and safe for production datasets

---

## 16. Environment Variables

Phase 19 should avoid introducing new infrastructure dependencies unless clearly required.

Expected likely reuse:

- existing database connection and Prisma configuration
- existing storage credentials for attachments and preview assets
- existing Razorpay configuration for template marketplace purchase flows

If template moderation introduces admin notification hooks, reuse the current notification stack rather than introducing a new service.

---

## 17. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Normalized document index drifts from source records | vault becomes unreliable | backfill + repair job + deterministic sync hooks |
| Template revisions silently change old documents | rendering trust is damaged | immutable revisions + compatibility rules |
| Quote support is treated as partial | unified document model becomes inconsistent | keep quotes explicitly first-class in every sprint |
| Timeline backfill cannot reconstruct every legacy event | historical completeness varies by doc type | document partial-history rules explicitly and backfill what is reconstructable |
| Vault performance degrades with cross-document queries | core docs UX slows down | normalized index + pagination + indexed filters |
| Governance workflows become too broad | delivery slows and scope drifts | keep review/moderation minimal and product-operational only |

---

## 18. Branch Strategy and PR Workflow

### Parent branch

- `feature/phase-19`

### Sprint branches

- `feature/phase-19.1`
- `feature/phase-19.2`
- `feature/phase-19.3`
- `feature/phase-19.4`
- `feature/phase-19.5`

### Delivery flow

1. Create `feature/phase-19` from the current post-Phase-18 integration baseline.
2. Each sprint is implemented on its own sprint branch.
3. Each sprint branch opens a PR into `feature/phase-19`.
4. Each sprint PR is reviewed, approved, and merged before the next sprint starts.
5. After Sprint 19.5 and final verification, `feature/phase-19` is reviewed as the completed phase branch.
6. Once Phase 19 is complete and stable, merge `feature/phase-19` into `master`.

### Required reviewer expectations

Each sprint PR should include:

- summary of delivered sprint scope
- schema changes and migration name if any
- routes added or extended
- test evidence
- unresolved risks or deferred items

### Phase completion requirement

Phase 19 must not merge to `master` until:

- all five sprint PRs are merged into `feature/phase-19`
- the vault, timeline, template governance, and hardening scope are complete
- targeted build and test gates are green
- final audit confirms no major document-operation regressions remain

