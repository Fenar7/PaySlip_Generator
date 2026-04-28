# Production-Grade Invoice and Voucher Sequencing Platform PRD

## 1. Document Summary

- Product: Slipwise
- Module: Invoice and voucher sequencing, numbering governance, onboarding setup, historical continuity
- Status: Draft PRD for engineering execution
- Audience: Product, engineering, QA, DevOps, support, implementation agents
- Scope: Production-grade implementation for invoices and vouchers only

This PRD defines a full sequencing platform for invoice and voucher numbers. It replaces the current simple `PREFIX-COUNTER` logic with a versioned, owner-governed, scope-aware numbering system that supports onboarding setup, advanced formats, legal-entity-specific active series, reset rules, historical imports, immutable history, and vault grouping by old and current sequence generations.

This is not a surface-level enhancement. It is financial document identity infrastructure and must be treated as such across schema, lifecycle, audit, permissions, migration, and operational support.

## 2. Background and Problem Statement

Slipwise currently uses a minimal numbering system for invoices and vouchers. The current implementation is effectively:

- `INV-001`
- `VCH-001`

with counters stored in org defaults and incremented globally per organization.

This is insufficient for real businesses because many organizations:

- already use custom invoice and voucher numbering in existing systems
- need continuity when migrating into Slipwise
- operate across multiple legal entities
- follow financial-year or monthly reset rules
- need separate active series for different scopes
- cannot alter numbers on already-issued documents
- need full audit trails for sequence changes

Examples of real formats businesses may use:

- `INV-001`
- `INV-2026-001`
- `FY26-27/INV/00021`
- `LE01/INV/APR/2026/0008`
- `VCH-REC-2026-00041`

The product problem is not only formatting. It is continuity, control, history, compliance, and operational correctness.

## 3. Goal

Build a production-grade sequencing platform for invoices and vouchers that:

- supports real-world numbering standards
- preserves legacy continuity
- assigns official numbers only at finalization time
- keeps historical numbers immutable forever
- allows safe future sequence changes
- supports advanced scoping and reset logic
- is strictly controlled by org owners
- is operationally safe under concurrency and retries

## 4. Success Criteria

The feature is successful when:

- a new organization can choose default or custom numbering during onboarding
- an existing organization can migrate without breaking continuity
- draft invoices do not consume official invoice numbers
- draft vouchers do not consume official voucher numbers
- invoices receive official numbers only when issued
- vouchers receive official numbers only when approved
- historical numbers never change after issuance/approval
- owners can activate a new sequence later without affecting historical documents
- old and new document groups remain visible in the vault
- imported historical numbers prevent reuse collisions
- legal-entity-scoped parallel series can run without overlap
- reset rules work predictably and are auditable
- non-owner users cannot mutate numbering configuration

## 5. Non-Goals

This release does not include:

- extending the new engine to salary slips, quotes, vendor bills, purchase orders, or GRN
- branch/location scope inside a single org unless modeled through legal entity
- arbitrary regex-style custom grammars
- renumbering already-issued historical documents
- loose admin editing by non-owner roles

## 6. Current State in Repo

The current repo behavior relevant to this PRD:

- numbering is generated from `src/lib/docs/numbering.ts`
- invoice and voucher numbers are currently generated from `OrgDefaults` prefix and counter fields
- current numbering is effectively `PREFIX-###`
- invoice numbers are assigned at create time
- voucher numbers are assigned at create time
- invoice and voucher uniqueness is currently enforced by org-level unique constraints
- invoice lifecycle already has a later `issueInvoice(id)` path
- onboarding exists as a multi-step client flow in `src/app/onboarding/onboarding-page-client.tsx`
- unified vault listing is powered by `DocumentIndex` through `src/lib/docs-vault.ts`
- repo already has multi-entity constructs that can support legal-entity-scoped parallel series

This feature replaces invoice/voucher numbering as a dedicated subsystem while leaving other document types on the old engine for now.

## 7. Users and Roles

### Primary configuration user

- organization owner

### Secondary operational users

- admins
- finance managers
- invoice operators
- voucher operators
- support and implementation teams
- auditors

### Permission rule

Only org role `owner` can:

- configure sequences during onboarding
- create sequence drafts
- edit draft sequences
- activate a sequence
- retire a sequence
- change reset policies
- import historical numbers
- reseed counters
- alter active/future numbering behavior

All other roles:

- can use invoices and vouchers operationally
- can view issued numbers
- cannot mutate sequence configuration

## 8. Core Product Principles

- issued financial document numbers are immutable
- drafts must not consume official numbering
- sequence changes only affect future documents
- historical continuity is a first-class requirement
- the system must fail closed rather than silently generate an incorrect number
- sequence allocation must be transactional and concurrency-safe
- the owner must be able to preview and understand future numbering before activation
- historical sequences must remain visible and searchable

## 9. Functional Requirements

### 9.1 Document families

This release applies to:

- invoices
- vouchers

Invoice and voucher numbering families are independent, even if visible patterns overlap.

### 9.2 Official numbering assignment timing

#### Invoices

- drafts must not consume official invoice numbers
- the invoice number is assigned only when the invoice transitions to `ISSUED`
- once assigned, the number is permanent

#### Vouchers

- drafts must not consume official voucher numbers
- the voucher number is assigned only when the voucher transitions to `approved`
- once assigned, the number is permanent

### 9.3 Sequence format model

The system must support structured token-based formats.

Supported token types in v1:

- static literal
- running counter
- 4-digit year
- 2-digit year
- numeric month
- short month text
- day
- financial year label
- legal entity code
- separators such as `-`, `/`, `_`

Examples:

- `INV-001`
- `INV-2026-001`
- `FY26-27/INV/00021`
- `LE01/VCH/APR/2026/0008`

Rules:

- exactly one running counter token is required
- formats must be validated before activation
- formats must be previewable before save
- counter width/padding must be configurable
- static tokens may be configured in the desired display form
- v1 must not use an arbitrary regex engine

### 9.4 Sequence scope model

Parallel active series must be supported when separated by scope.

Supported scopes in v1:

- org-wide
- legal-entity-specific

This means:

- one org can have multiple active invoice sequences if each belongs to a different legal entity scope
- one org can have multiple active voucher sequences if each belongs to a different legal entity scope
- for a given `docType + scope`, only one sequence may be active at a time

### 9.5 Reset policies

Supported reset policies in v1:

- never reset
- monthly
- quarterly
- calendar year
- financial year

Reset rules:

- resets must be deterministic
- resets must be idempotent
- resets must be audit logged
- resets must not cause collisions
- reset previews must be visible before activation

### 9.6 Versioning and future sequence changes

If an owner changes the numbering structure later:

- the old sequence becomes retired or historical
- the new sequence becomes active
- historical documents keep their old numbers
- new documents use the new sequence
- both groups remain visible in the vault

### 9.7 Legacy continuity

The product must support organizations that already have historical numbering outside Slipwise.

Supported continuity flows:

- seed from latest-used number
- bulk import historical numbers
- bulk import plus live counter seeding

Example:

- sequence format: `HYUYTR-00`
- latest issued invoice: `HYUYTR-20`
- next generated number: `HYUYTR-21`

Imported history must:

- be stored for duplicate prevention
- be validated against sequence format
- be scoped correctly to doc type and legal entity, where applicable

### 9.8 Onboarding support

A new onboarding step must be added: `Document Numbering`

Owner choices:

- use Slipwise defaults
- configure custom numbering now

#### Default path

Create:

- default invoice sequence `INV-001`
- default voucher sequence `VCH-001`

#### Custom path

For invoices and vouchers separately, the owner can:

- choose format
- choose org-wide or legal-entity scope
- provide latest already-used number or start fresh
- preview next generated number
- validate and save

The onboarding UX must explain:

- historical numbers never change
- owners can change future sequences later
- defaults are suitable for new businesses
- custom setup is intended for businesses migrating from other systems

### 9.9 Post-onboarding settings surface

Provide a dedicated settings area for sequence management.

Owner capabilities:

- view active invoice sequences
- view active voucher sequences
- view retired and historical sequences
- preview next numbers
- create sequence drafts
- clone existing sequences into new drafts
- edit drafts
- activate drafts
- retire sequences
- import historical numbers
- reseed counters
- inspect reset policy and history

### 9.10 Vault history grouping

Invoice Vault and Voucher Vault must support grouping and filtering by sequence history.

Requirements:

- active sequence groups visible
- retired sequence groups visible
- documents remain searchable by exact number across all history
- grouping behaves like folders in the UI
- physical folder storage is not required

## 10. Data Model Requirements

### 10.1 New models

#### DocumentSequenceScheme

Stores one sequence definition/version.

Required fields:

- `id`
- `organizationId`
- `docType`
- `scopeType`
- `scopeId`
- `name`
- `version`
- `status`
- `isActive`
- `formatSpec`
- `numberPadding`
- `startsFrom`
- `currentCounter`
- `lastIssuedNumber`
- `resetPolicy`
- `effectiveFrom`
- `retiredAt`
- `createdByUserId`
- `updatedByUserId`
- timestamps

#### DocumentSequenceEvent

Immutable event log for sequence lifecycle and admin actions.

Required fields:

- `id`
- `schemeId`
- `organizationId`
- `eventType`
- `actorId`
- `metadata`
- `createdAt`

#### DocumentSequenceImportBatch

Tracks an import job for legacy numbering continuity.

Required fields:

- `id`
- `organizationId`
- `docType`
- `scopeType`
- `scopeId`
- `uploadedByUserId`
- `fileName`
- `importStatus`
- `summary`
- `createdAt`
- `completedAt`

#### DocumentSequenceImportedNumber

Stores imported historical numbers for duplicate prevention and continuity checks.

Required fields:

- `id`
- `importBatchId`
- `organizationId`
- `docType`
- `scopeType`
- `scopeId`
- `externalNumber`
- `issueDate`
- `metadata`
- `createdAt`

#### DocumentSequenceResetRun

Tracks reset executions.

Required fields:

- `id`
- `schemeId`
- `organizationId`
- `periodKey`
- `executedAt`
- `previousCounter`
- `newCounter`
- `status`
- `metadata`

### 10.2 Existing model changes

#### Invoice

- make `invoiceNumber` nullable until issue
- add `documentSequenceSchemeId`
- add `sequenceScopeType`
- add `sequenceScopeId`
- add `sequenceVersion`

#### Voucher

- make `voucherNumber` nullable until approval
- add `documentSequenceSchemeId`
- add `sequenceScopeType`
- add `sequenceScopeId`
- add `sequenceVersion`

#### DocumentIndex

Add metadata to support vault grouping and search context:

- `documentSequenceSchemeId`
- `sequenceGroupLabel`
- `sequenceVersion`
- `sequenceScopeType`
- `sequenceScopeId`

### 10.3 Legacy compatibility

Keep current `OrgDefaults` prefix/counter fields during the migration period for compatibility only. They must no longer be authoritative for invoice/voucher numbering after cutover.

## 11. Service Layer Requirements

Create a dedicated sequence service responsible for sequence lifecycle, validation, allocation, resets, imports, and history.

Required interfaces:

- `getActiveSequence`
- `previewNextSequenceNumber`
- `validateSequenceFormat`
- `createSequenceScheme`
- `cloneSequenceScheme`
- `activateSequenceScheme`
- `retireSequenceScheme`
- `seedSequenceFromLatestUsedNumber`
- `importHistoricalNumbers`
- `assignDocumentNumberTx`
- `executeResetIfDueTx`
- `listSequenceHistory`
- `listSequenceEvents`

Service guarantees:

- allocation must be transactional
- allocation must be concurrency-safe
- reset execution must be idempotent
- collision checks must include local and imported history
- owner-only mutations must be enforced server-side

## 12. Invoice Lifecycle Requirements

### Current problem

Invoices currently get a number too early, including drafts and duplicates.

### Target behavior

- draft invoice can exist without an official invoice number
- duplicate draft invoice must not consume a number
- invoice number is assigned only when `issueInvoice(id)` succeeds
- reissued invoices receive new official numbers
- cancelled invoices keep the original issued number
- issued invoice numbers are never reused

### Dependent flows that must remain correct

- public invoice links
- payment links
- GST / IRN
- e-way bill
- dunning
- reconciliation
- workflow events
- audit logging
- search and vault index sync

## 13. Voucher Lifecycle Requirements

### Current problem

Vouchers currently get a number too early.

### Target behavior

- draft vouchers can exist without official numbers
- duplicate draft vouchers must not consume a number
- official number is assigned only on approval
- approved voucher numbers remain permanent
- archived or edited approved vouchers keep their original numbers
- used voucher numbers are never reused

## 14. Onboarding Requirements

### New onboarding step

Add a new onboarding step called `Document Numbering`.

### Step behavior

Owner must choose:

- default numbering
- custom numbering now

### Default behavior

Create:

- invoice sequence `INV-001`
- voucher sequence `VCH-001`

### Custom behavior

For invoices and vouchers independently:

- define sequence format
- define scope type
- optionally define legal-entity-specific configuration
- provide latest already-used number or start-from seed
- preview the next generated number
- validate before activation

### Step UX requirements

- explain why numbering matters
- explain historical continuity
- explain that only owner can change this later
- provide validation errors inline
- support interrupted onboarding recovery

## 15. Post-Onboarding Management Requirements

The owner settings area must support:

- viewing active and retired sequences
- next-number previews
- creating and editing draft sequences
- cloning existing sequences
- activation and retirement
- import historical continuity
- reseeding counters
- viewing reset schedules and reset history
- viewing audit trail for numbering changes

## 16. Migration Requirements

Migration must safely bring all existing orgs into the new sequence engine.

### Migration actions

- create initial invoice scheme from existing invoice prefix and counter
- create initial voucher scheme from existing voucher prefix and counter
- backfill all existing invoices with a linked sequence scheme
- backfill all existing vouchers with a linked sequence scheme
- backfill sequence metadata into `DocumentIndex`
- preserve current continuity without changing historical numbers

### Migration constraints

- no issued invoice number may change
- no approved voucher number may change
- duplicate detection must fail safely
- migration diagnostics must be produced for anomalies
- migration must support orgs with no current documents

## 17. Permissions and Security

### Only owner can

- configure numbering during onboarding
- create or edit sequence drafts
- activate or retire sequences
- change reset logic
- import historical numbers
- reseed counters

### Everyone else cannot

- override numbering configuration
- activate future sequences
- change current sequence behavior
- manually force an official number

### Security rules

- permission checks must be server-side
- UI hiding is not sufficient
- every mutation must be audit logged

## 18. Audit and Compliance

All important sequence events must be audit logged.

Examples:

- sequence created
- sequence edited
- sequence activated
- sequence retired
- import started
- import completed
- import failed
- reseed performed
- reset executed
- onboarding default selected
- onboarding custom sequence configured

Audit metadata must capture:

- organization
- actor
- document type
- scope
- old configuration
- new configuration
- timestamps
- reason or context where applicable

## 19. UX Requirements

### Onboarding UX

- fast default path
- guided custom path
- preview before save
- recovery after interruption

### Settings UX

- active sequence cards
- retired sequence history list
- preview panel
- import tools
- warnings on irreversible history behavior

### Draft document UX

If no official number exists yet:

- show placeholder like `Assigned on issue`
- or `Assigned on approval`

Do not show fake final numbers on drafts.

### Vault UX

- group by active and retired sequences
- exact search still works globally
- preserve simple list usage for daily work

## 20. Edge Cases

The implementation must explicitly handle:

- owner starts custom onboarding sequence setup but exits midway
- imported file contains duplicates
- imported file contains malformed numbers
- imported file numbers do not match selected format
- two invoices are issued concurrently
- two vouchers are approved concurrently
- reset boundary executes twice because of retry
- active sequence missing at issue/approval time
- legal entity scope is ambiguous or missing
- owner changes sequence months later
- historical documents exist but were imported from external systems
- migration finds null or inconsistent values
- downstream systems assume invoice/voucher number always exists

## 21. Non-Functional Requirements

- transactional number assignment
- concurrency safety
- retry-safe issue and approval paths
- idempotent reset execution
- full auditability
- migration safety
- operational diagnostics
- backward-compatible rollout period

## 22. Reporting and Operational Visibility

Support/admin visibility should be available for:

- active sequences by org
- retired sequences by org
- next preview values
- pending or failed resets
- import success/failure summaries
- orphaned documents missing sequence metadata
- collisions and validation failures
- reseed actions

## 23. Acceptance Criteria

The feature is acceptable only when:

- onboarding supports default and custom numbering setup
- invoice numbers are assigned only on issue
- voucher numbers are assigned only on approval
- historical numbers remain unchanged forever
- future sequence changes do not affect past documents
- vault grouping shows active and retired sequence history
- imported historical numbers prevent reuse
- legal-entity-scoped parallel active sequences work safely
- reset rules function correctly and idempotently
- non-owner mutation attempts are blocked
- all sequence changes are audit logged

## 24. Delivery Plan

Implementation must follow a branch-first, phase-based workflow suitable for multiple parallel coding agents.

### Branch strategy

- root feature branch: `feature/sequence-platform`
- each phase gets a child phase branch under this initiative
- each sprint gets a child sprint branch under its phase
- sprint PRs merge into phase branches
- phase branches merge into `feature/sequence-platform`
- final approved feature branch merges into `master`

### Branch naming convention

Examples:

- `feature/sequence-platform`
- `feature/sequence-platform/phase-1-foundation`
- `feature/sequence-platform/phase-1-sprint-1-schema-foundation`
- `feature/sequence-platform/phase-1-sprint-2-format-engine`

## 25. Phase Breakdown

### Phase 0: Planning and Execution Readiness

#### Objective

Prepare engineering execution structure, finalize contracts, and partition work for multiple agents.

#### Sprint 0.1: Delivery setup

- finalize schema scope
- finalize service contracts
- finalize migration approach
- finalize branch naming rules
- finalize test and rollout checklist

### Phase 1: Sequence Domain Foundation

#### Objective

Create the schema, sequence engine, validation system, and compatibility foundation.

#### Sprint 1.1: Schema foundation

- add sequence models
- add sequence metadata to invoice, voucher, and document index
- make invoice/voucher numbers nullable before finalization
- add indexes and constraints

#### Sprint 1.2: Format engine and validation

- implement token formatter
- implement parser and validator
- implement preview logic
- validate continuity seed input

#### Sprint 1.3: Migration scaffolding

- migrate org defaults into initial sequence schemes
- backfill invoice and voucher links
- backfill document index metadata
- generate diagnostics for migration anomalies

### Phase 2: Governance and Admin Management

#### Objective

Ship owner-only control surfaces and audit trails.

#### Sprint 2.1: Permission and audit enforcement

- enforce owner-only mutation rules
- add sequence audit events
- block non-owner server actions

#### Sprint 2.2: Sequence settings UI

- active sequence management
- retired sequence history
- preview panels
- create/clone/edit draft flows
- activate/retire actions

#### Sprint 2.3: Historical import tools

- import batch flow
- validation summary
- import collision reporting
- seed-from-latest support

### Phase 3: Onboarding Integration

#### Objective

Make sequencing a required onboarding decision.

#### Sprint 3.1: Onboarding step

- add `Document Numbering` step
- default vs custom selection
- persist step state

#### Sprint 3.2: Custom configuration flow

- configure invoice and voucher independently
- configure scope type
- configure continuity input
- preview and validate before save

#### Sprint 3.3: Recovery and fallback

- interrupted onboarding recovery
- safe fallback to defaults if required
- prevent half-configured active state

### Phase 4: Invoice Lifecycle Migration

#### Objective

Move invoice numbering from create-time to issue-time.

#### Sprint 4.1: Draft-safe invoice behavior

- remove official numbering from draft creation
- update duplicate behavior
- update UI placeholders

#### Sprint 4.2: Issue-time assignment

- assign official number on issue
- keep workflow and accounting correctness
- ensure concurrency safety

#### Sprint 4.3: Reissue and dependent flows

- reissue gets fresh number
- cancelled invoices retain original number
- verify payment links, GST, IRN, e-way bill, dunning, reconciliation, and search remain correct

### Phase 5: Voucher Lifecycle Migration

#### Objective

Move voucher numbering from create-time to approval-time.

#### Sprint 5.1: Draft-safe voucher behavior

- remove official numbering from draft creation
- update duplicate flow
- update UI placeholders

#### Sprint 5.2: Approval-time assignment

- assign official number on approval
- preserve accounting and workflow correctness
- ensure concurrency safety

#### Sprint 5.3: Voucher edge handling

- approved voucher permanence
- archive/update behavior
- import continuity collision protection

### Phase 6: Advanced Production Features

#### Objective

Ship advanced-first enterprise sequencing requirements.

#### Sprint 6.1: Reset policies

- monthly reset
- quarterly reset
- calendar-year reset
- financial-year reset
- preview and reset history

#### Sprint 6.2: Legal-entity scoped parallel series

- multiple active scoped series
- scope resolution rules
- validation for missing or ambiguous scope

#### Sprint 6.3: Vault history grouping

- historical sequence grouping in invoice and voucher vaults
- exact search across active and retired groups
- unified metadata model for vault index

### Phase 7: Hardening and Production Readiness

#### Objective

Make the system safe and supportable in live production.

#### Sprint 7.1: Concurrency and idempotency

- race-condition hardening
- retry-safe issue/approve flows
- idempotent reset execution

#### Sprint 7.2: Diagnostics and support tooling

- import diagnostics
- migration diagnostics
- orphan detection
- reset failure reporting

#### Sprint 7.3: Final verification and rollout

- seeded-environment migration checks
- full regression pass
- rollout checklist
- support handover and operational SOPs

## 26. Test Strategy

### Unit tests

- token formatting
- token validation
- preview logic
- counter padding
- continuity parsing
- reset calculations

### Integration tests

- onboarding default flow
- onboarding custom flow
- sequence activation
- invoice issue-time assignment
- voucher approval-time assignment
- historical import
- vault grouping

### Concurrency tests

- simultaneous invoice issue
- simultaneous voucher approval
- reset retry and boundary execution

### Regression tests

- public invoice flows
- payment links
- GST / IRN / e-way bill
- reconciliation
- vault sync
- workflow emissions

## 27. Risks and Mitigations

### Risk: existing code assumes invoice/voucher number always exists

Mitigation:

- phase lifecycle migration carefully
- introduce explicit draft placeholder states
- regression test all downstream number consumers

### Risk: imported historical data is malformed or conflicting

Mitigation:

- strong pre-activation validation
- dry-run summaries
- owner confirmation before activation

### Risk: reset boundary duplication

Mitigation:

- idempotent reset-run records
- transactional reset logic

### Risk: scoped series ambiguity

Mitigation:

- explicit scope resolution rules
- fail closed if scope is missing or ambiguous

## 28. Final Decision Summary

- production-grade implementation, not a lightweight MVP
- onboarding must include numbering setup
- default and custom onboarding paths must both exist
- only org owner can mutate sequence configuration
- invoice numbers assigned on issue only
- voucher numbers assigned on approval only
- historical numbers immutable forever
- future sequence changes apply only to future documents
- legal-entity scoped parallel series supported in v1
- periodic reset policies supported in v1
- imported historical continuity supported in v1
- vault grouping by sequence history supported in v1

