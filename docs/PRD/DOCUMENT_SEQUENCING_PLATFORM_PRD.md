# Slipwise Document Sequencing Platform PRD

## 1. Overview

Slipwise currently generates invoice and voucher numbers from a simple per-org prefix and counter stored in `OrgDefaults`. This works for basic creation flows but is not sufficient for real accounting operations where organizations need:

- structured numbering formats
- predictable periodic resets
- continuity when migrating from another system
- resequencing during open periods
- protection after books are locked
- strict auditability over every numbering change

This PRD defines a production-grade sequencing platform for `invoices` and `vouchers`. The platform is inspired by the operational behavior seen in systems like Odoo, especially around periodic sequences, format changes, and controlled resequencing. It is adapted for Slipwise’s product model, which still requires:

- invoice official number assigned only on `ISSUED`
- voucher official number assigned only on `approved`
- drafts not consuming official numbers
- owner-only control over sequence governance

The prior sequencing initiative is replaced by this document. The engineering workflow, branching discipline, and phase/sprint delivery model remain the same.

## 2. Product Goal

Build a sequencing platform for invoices and vouchers that is:

- configurable
- auditable
- accounting-safe
- continuity-friendly
- lock-date-aware
- production-ready

The system must support both future sequence management and limited historical resequencing for valid open/unlocked periods.

## 3. Scope

This release covers:

- invoice numbering
- voucher numbering
- onboarding-time sequence setup
- owner-only sequence settings
- future sequence changes
- periodic resets
- continuity seeding
- open-period resequencing
- gap/irregularity visibility

This release does not cover:

- vendor bills
- salary slips
- quotes
- branch/legal-entity scoped parallel series
- arbitrary regex-defined numbering grammars
- unrestricted historical renumbering of locked periods

Vendor-bill behavior from Odoo is reference material only for product design. It is not in scope for this release.

## 4. Current State in Slipwise

Current implementation facts:

- numbering is driven by `src/lib/docs/numbering.ts`
- source of truth is `OrgDefaults`
- invoice format is effectively `PREFIX-###`
- voucher format is effectively `PREFIX-###`
- invoice numbers are assigned too early, at create-time
- voucher numbers are assigned too early, at create-time
- `issueInvoice()` changes status later, but does not allocate the invoice number
- voucher approval changes status later, but does not allocate the voucher number
- invoice and voucher numbers are unique per organization

This PRD replaces invoice and voucher numbering behavior with a dedicated sequencing subsystem.

## 5. Users and Permissions

Primary sequence administrator:

- organization `owner`

Only `owner` can:

- configure sequence settings in onboarding
- create a sequence
- edit a sequence
- activate a new future sequence
- change periodicity
- seed continuity from latest used number
- run resequencing
- confirm resequencing preview
- reset or restart a sequence

Everyone else:

- can view and use documents
- cannot mutate sequence configuration
- cannot trigger resequencing
- cannot override official numbers directly

## 6. Core Product Principles

- Official finalized document numbers are important accounting identifiers.
- Drafts must not consume official numbers.
- Sequence behavior must be predictable and previewable.
- Future sequence changes and historical resequencing are separate operations.
- Locked periods are immutable for renumbering.
- Cancelled documents keep their consumed numbers.
- Gaps and irregularities must be visible, not hidden.
- Every numbering mutation must be audit logged.

## 7. Document Sequence Model

Slipwise will manage two separate sequence families:

- `invoice sequence`
- `voucher sequence`

Each organization has:

- one active invoice sequence
- one active voucher sequence

Each sequence definition includes:

- sequence name
- document type
- format structure
- periodicity
- running number width
- current counter
- starting point
- effective period metadata
- active/retired status

## 8. Assignment Timing

### Invoice

- draft invoice: no official invoice number required
- issued invoice: official invoice number assigned
- once issued, the number becomes the official reference

### Voucher

- draft voucher: no official voucher number required
- approved voucher: official voucher number assigned
- once approved, the number becomes the official reference

This remains a core Slipwise behavior even though Odoo’s confirm-and-number flow influenced the broader design.

## 9. Format and Periodicity

### Supported v1 token model

Stored source of truth is a structured token configuration, not just free-form text.

Supported parts:

- static text
- year `YYYY`
- short year `YY`
- month `MM`
- optional month short label
- financial year label
- running number token
- separators such as `/`, `-`, `_`

Examples:

- `INV/2025/00001`
- `INV/2025/04/00001`
- `VCH/2025/00001`
- `VCH/FY25-26/00001`

Rules:

- exactly one running number token is required
- preview must always show the next generated number
- periodicity must align with the chosen token structure
- format changes must explain their effect on future numbering

### Default sequences

- invoice default: `INV/{YYYY}/{NNNNN}`
- voucher default: `VCH/{YYYY}/{NNNNN}`

### Supported periodicity

- no reset / continuous
- yearly
- monthly
- financial year

## 10. Future Sequence Changes

Slipwise must support changing the active format for future documents.

Future sequence change means:

- owner updates the active format or periodicity
- new finalized documents use the new sequence behavior
- already-finalized documents remain unchanged unless a separate resequencing operation is run

Future sequence changes may be:

- effective immediately
- effective from the next sequence period
- seeded from a specific current/latest value

The system must preview:

- current active format
- next generated number under the new format
- periodicity effect

## 11. Continuity Seeding

Organizations may already be using a numbering series outside Slipwise.

The platform must support:

- entering a custom format
- entering the latest already-used number
- deriving the next valid number automatically

Example:

- format: `INV/2025/00001`
- latest used: `INV/2025/00020`
- next generated: `INV/2025/00021`

If the latest used number does not match the configured format, setup must fail with validation.

## 12. Resequencing

### Purpose

Resequencing is for:

- imported continuity cleanup
- correcting open-period numbering
- re-aligning sequences after migration or operational mistakes

### Availability

Resequencing is owner-only.

### Supported document types

- invoices
- vouchers

### Resequencing workflow

1. owner selects documents or a valid range
2. chooses ordering:
   - keep current order
   - reorder by accounting/document date
3. enters the first new sequence value
4. system previews old number -> new number mapping
5. owner confirms
6. system applies the change atomically if validation passes

### Validation rules

Resequencing is not allowed when:

- documents are before the lock date
- the proposed sequence creates duplicates
- the proposed format/date combination is invalid for the document date
- the range is invalid
- the preview detects inconsistent period alignment

Examples of invalid cases:

- using a `2024` sequence for a `2025` invoice
- resequencing a locked-period voucher
- generating a duplicate official number inside the same organization and document type

### What resequencing changes

For valid documents in open/unlocked periods:

- official number can be rewritten
- document history must retain old and new numbers
- downstream indexes/search references must be updated
- the resequence operation must be traceable as one batch
`

### What resequencing never changes

- lock-date-protected historical periods
- unrelated documents outside the confirmed range
- audit history of the previous number

## 13. Lock Dates and Accounting Controls

Lock-date protection is mandatory.

Rules:

- finalized documents in locked periods cannot be renumbered
- sequence changes for future periods do not modify locked-period documents
- cancelled documents retain their issued/approved numbers
- deleted/voided/cancelled entries must still allow irregularities to be detected

The platform must surface:

- gaps in open-period sequences
- duplicate risks before apply
- irregular numbering warnings where relevant

## 14. Auditability

Every sequence mutation must be logged.

Audit events:

- sequence created
- sequence edited
- periodicity changed
- future sequence activated
- continuity seeded
- resequence preview generated
- resequence confirmed
- resequence rejected
- locked-period attempt blocked

For each renumbered document, retain:

- old number
- new number
- document id
- actor
- timestamp
- resequence batch id
- optional reason/context

## 15. Onboarding

Add a required onboarding step: `Document Numbering`

Owner chooses:

- use default sequencing
- set custom sequencing now

Custom onboarding asks for both invoices and vouchers:

- format
- periodicity
- latest already-used number or start fresh
- preview next generated number

Onboarding does not include bulk resequencing.

Instead:

- onboarding handles default setup or continuity seeding
- full resequencing is available later in owner settings

## 16. Settings and Operational UI

### Owner settings area

Provide a dedicated numbering settings area with:

- active invoice sequence
- active voucher sequence
- next-number preview
- future sequence change flow
- continuity seed flow
- resequencing entry point
- resequence preview and confirm flow
- history of sequence changes and resequence batches

### Document list behavior

Invoice and voucher list views should support:

- visibility of current official number
- warning/marker for irregular sequence issues when relevant
- history visibility for renumbered documents where needed

The PRD should not require true folder-based storage behavior. History is logical/audit-driven.

## 17. Data Model Requirements

The implementation should introduce a dedicated sequencing subsystem.

Required conceptual entities:

- sequence definition
- sequence period/state
- resequence batch
- resequence document change record
- sequence audit event

Document models will need:

- nullable official number until finalization
- link to applied sequence definition/period
- historical resequence traceability

Current `OrgDefaults` numbering fields remain only as migration compatibility during rollout.

## 18. Service Responsibilities

The new service layer must support:

- get active sequence
- preview next official number
- validate format and periodicity
- seed from latest used number
- assign official number at finalization
- preview resequence batch
- validate resequence constraints
- apply resequence atomically
- detect gaps/irregularities
- log all sequence mutations

## 19. Migration Requirements

Existing organizations must migrate from `OrgDefaults` safely.

Migration behavior:

- create one initial invoice sequence per org from current invoice prefix/counter
- create one initial voucher sequence per org from current voucher prefix/counter
- preserve current continuity
- backfill existing finalized documents to the initial sequence record
- keep historical numbering intact unless owner later runs a valid resequence operation

Migration must detect and report:

- duplicates
- missing numbering state
- inconsistent historical data
- sequence gaps

## 20. Non-Functional Requirements

- concurrency-safe official number assignment
- transactional resequencing
- strong duplicate protection
- lock-date enforcement
- auditability
- preview before mutation
- operational diagnostics

## 21. Acceptance Criteria

- default yearly invoice sequence works
- default yearly voucher sequence works
- drafts do not consume official numbers
- issue assigns invoice number exactly once
- approval assigns voucher number exactly once
- future sequence change updates upcoming numbering correctly
- continuity seeding derives the next number correctly
- resequencing preview is deterministic
- resequencing is blocked for locked periods
- resequencing is blocked for duplicates
- resequencing is blocked for invalid date/period mismatch
- valid open-period resequencing succeeds
- all numbering changes are owner-only
- all numbering changes are audit logged

## 22. Phase and Sprint Delivery Plan

### Phase 0: PRD and delivery setup

#### Sprint 0.1

- freeze architecture decisions
- freeze resequencing policy
- define migration approach
- define branch/PR workflow
- define Phase 1 execution readiness

### Phase 1: Sequence domain foundation

#### Sprint 1.1: Schema foundation

- add sequence domain models
- make official invoice/voucher numbers nullable until finalization
- add sequence linkage fields
- preserve compatibility with legacy numbering during transition

#### Sprint 1.2: Format engine and validation

- build token-based rendering
- build periodicity validation
- build next-number preview
- build continuity seed parser

#### Sprint 1.3: Migration scaffolding

- create initial sequences from legacy state
- backfill document linkage
- add migration diagnostics

### Phase 2: Owner governance and settings

#### Sprint 2.1

- enforce owner-only mutation
- add audit models/events

#### Sprint 2.2

- build settings console for future sequence changes

#### Sprint 2.3

- add continuity seeding and history visibility

### Phase 3: Onboarding integration

#### Sprint 3.1

- add numbering onboarding step

#### Sprint 3.2

- add custom format + periodicity setup

#### Sprint 3.3

- add onboarding recovery/fallback behavior

### Phase 4: Invoice lifecycle migration

#### Sprint 4.1

- drafts stop consuming invoice numbers

#### Sprint 4.2

- issue-time invoice numbering

#### Sprint 4.3

- invoice compatibility and downstream integrations

### Phase 5: Voucher lifecycle migration

#### Sprint 5.1

- drafts stop consuming voucher numbers

#### Sprint 5.2

- approval-time voucher numbering

#### Sprint 5.3

- voucher compatibility and downstream integrations

### Phase 6: Resequencing and controls

#### Sprint 6.1

- resequence preview engine

#### Sprint 6.2

- open-period resequencing apply flow

#### Sprint 6.3

- gap detection, irregularity surfacing, lock-date enforcement

### Phase 7: Hardening and rollout

#### Sprint 7.1

- concurrency and idempotency hardening

#### Sprint 7.2

- diagnostics and support tooling

#### Sprint 7.3

- final regression, rollout checklist, production readiness

## 23. Branch Workflow

Root branch:

- `feature/sequence-platform`

Phase branches:

- `feature/sequence-platform-phase-0-delivery`
- `feature/sequence-platform-phase-1-foundation`
- and so on

Sprint branches:

- `feature/sequence-platform-phase-X-sprint-Y-name`

Merge order:

- sprint branch -> phase branch
- phase branch -> root feature branch
- root feature branch -> `master`

## 24. Phase 0 Execution Artifacts

Phase 0 produced the following decision-complete, implementation-ready artifacts. All subsequent phases must treat these as source of truth.

| Artifact | Path | Purpose |
|----------|------|---------|
| Phase 0 Decision Record | `docs/sequencing/PHASE_0_DECISION_RECORD.md` | Locked scope, lifecycle timing, architectural boundaries, governance, lock-date/audit rules, token v1 format, concurrency strategy |
| Branch Workflow | `docs/sequencing/BRANCH_WORKFLOW.md` | Exact branch naming, PR flow, merge order, commit discipline, review expectations, multi-agent ownership boundaries |
| PR Template | `.github/PULL_REQUEST_TEMPLATE/sequence_platform.md` | Required PR structure for every sprint |
| Phase 1 Readiness | `docs/sequencing/PHASE_1_READINESS.md` | Sprint 1.1–1.3 readiness, dependency map, acceptance criteria, risk register, interface contracts |
| Phase 0 QA Checklist | `docs/sequencing/PHASE_0_QA_CHECKLIST.md` | Validation gates for every phase through rollout |
| Production Readiness | `docs/sequencing/PRODUCTION_READINESS.md` | Operational readiness, observability, rollback, deployment sequence, incident response |

## 25. Final Product Summary

This release delivers a production-grade sequence platform for invoices and vouchers with:

- structured formats
- periodic resets
- future sequence changes
- continuity seeding
- open-period resequencing
- lock-date protection
- owner-only control
- complete auditability

This PRD fully replaces the earlier sequencing PRD direction.
