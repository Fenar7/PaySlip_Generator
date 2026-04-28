# Document Sequencing Platform
## Phase 0 Delivery Package

## 1. Purpose

This package is the execution-ready companion to `docs/PRD/DOCUMENT_SEQUENCING_PLATFORM_PRD.md`.

Phase 0 does not implement product code. It freezes the decisions needed to restart the sequencing initiative cleanly after the PRD rework.

## 2. Locked Decisions

### Product scope

- release covers `invoices + vouchers only`
- vendor bills are out of scope for this release

### Lifecycle behavior

- invoice official number assigned on `ISSUED`
- voucher official number assigned on `approved`
- drafts do not consume official numbers

### Sequence governance

- only `owner` can mutate sequence settings
- only `owner` can run resequencing

### Historical renumbering policy

- open-period resequencing is allowed
- locked-period resequencing is blocked
- old and new numbers must both remain visible in audit history

### Technical direction

- structured token-based sequence engine
- dedicated sequencing subsystem
- legacy `OrgDefaults` counters remain migration compatibility only

## 3. Repo-Grounded Findings

Current repo behavior:

- `src/lib/docs/numbering.ts` is the current numbering source
- invoice and voucher numbers come from `OrgDefaults`
- invoice and voucher numbering are assigned at create-time
- invoices and vouchers are finalized later in separate lifecycle steps
- current implementation cannot support periodicity, resequencing, or locked-period controls safely

## 4. Workstream Split

Phase 1 onward should be split into these workstreams:

### Workstream A: Schema and migration

Owns:

- sequence models
- document linkage fields
- migration/backfill scripts
- legacy compatibility plan

### Workstream B: Core sequence engine

Owns:

- token format engine
- periodicity rules
- next-number preview
- continuity seed parsing
- resequence preview generation

### Workstream C: Lifecycle integration

Owns:

- invoice issue-time numbering
- voucher approval-time numbering
- nullability migration across downstream code

### Workstream D: Governance and UI

Owns:

- onboarding
- owner settings
- resequencing UX
- audit/history views
- gap and irregularity visibility

## 5. Phase Plan Summary

### Phase 1

- domain foundation
- validation engine
- migration scaffolding

### Phase 2

- owner governance
- settings
- continuity management

### Phase 3

- onboarding integration

### Phase 4

- invoice lifecycle cutover

### Phase 5

- voucher lifecycle cutover

### Phase 6

- resequencing
- open-period controls
- gap detection

### Phase 7

- hardening
- rollout
- operational readiness

## 6. Phase 1 Readiness

Phase 1 should start only after these decisions are treated as fixed:

- no vendor-bill scope in this release
- no legal-entity scope in this release
- resequencing exists, but only for open/unlocked periods
- official numbers remain finalization-time assignments

### Sprint 1.1 outputs

- sequence domain schema
- nullable official invoice/voucher number preparation
- document linkage fields

### Sprint 1.2 outputs

- format engine
- periodicity validation
- continuity parser
- preview logic

### Sprint 1.3 outputs

- migration scaffolding
- health checks
- backfill strategy

## 7. Branch Workflow

Root:

- `feature/sequence-platform`

Phase branches:

- `feature/sequence-platform-phase-N-name`

Sprint branches:

- `feature/sequence-platform-phase-N-sprint-M-name`

Merge sequence:

- sprint PR into phase branch
- phase PR into root feature branch
- root feature PR into `master`

Each sprint PR must include:

- implementation summary
- test evidence
- migration notes if applicable
- known risks

## 8. Validation and QA Checklist

Before Phase 1 approval:

- schema supports future sequence definitions
- plan preserves finalization-time numbering
- migration path from `OrgDefaults` is explicit
- resequencing rules are lock-date-aware
- open-period resequencing rules are explicit
- owner-only permissions are explicit
- no document scope ambiguity remains

Before later implementation phases:

- duplicate prevention is tested
- date/period mismatch validation is tested
- lock-date blocking is tested
- issue-time and approval-time assignment are tested
- resequence preview and apply are both tested

## 9. Phase 0 Artifact Index

The following artifacts were produced during Sprint 0.1 and are frozen for Phase 1 kickoff:

| Artifact | Path | Owner |
|----------|------|-------|
| PRD (redrafted) | `docs/PRD/DOCUMENT_SEQUENCING_PLATFORM_PRD.md` | Product Lead |
| Decision Record | `docs/sequencing/PHASE_0_DECISION_RECORD.md` | Workstream A |
| Branch Workflow | `docs/sequencing/BRANCH_WORKFLOW.md` | Workstream B |
| PR Template | `.github/PULL_REQUEST_TEMPLATE/sequence_platform.md` | Workstream B |
| Phase 1 Readiness | `docs/sequencing/PHASE_1_READINESS.md` | Workstream C |
| QA Checklist | `docs/sequencing/PHASE_0_QA_CHECKLIST.md` | Workstream D |
| Production Readiness | `docs/sequencing/PRODUCTION_READINESS.md` | Workstream D |

## 10. Restart Handoff Note

This initiative is being restarted from a redrafted PRD.

What changed from the earlier direction:

- historical numbers are no longer globally immutable
- controlled open-period resequencing is now part of the product
- periodicity and format behavior are modeled more explicitly after accounting-system expectations
- vendor bills remain out of scope despite being useful reference material

What did not change:

- branch workflow
- review discipline
- owner-only governance
- finalization-time numbering for invoices and vouchers
