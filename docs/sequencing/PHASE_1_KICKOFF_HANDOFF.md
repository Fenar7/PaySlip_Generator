# Phase 1 Kickoff Handoff — Document Sequencing Platform

**From:** Phase 0 (Sprint 0.1 — Delivery Setup)  
**To:** Phase 1 (Sprints 1.1–1.3 — Domain Foundation)  
**Date:** 2026-04-28  
**Status:** Ready for kickoff pending PR review and merge

---

## 1. What Phase 0 Delivered

Phase 0 did not write product code. It produced the decision and workflow foundation required for clean implementation execution.

### Decisions frozen
- **Scope:** invoices + vouchers only; vendor bills excluded
- **Lifecycle:** invoice numbers on `ISSUED`, voucher numbers on `approved`, drafts remain `null`
- **Governance:** owner-only mutation and resequencing
- **Resequencing:** open periods only; locked periods blocked
- **Format v1:** structured tokens (`{YYYY}`, `{MM}`, `{NNNNN}`, `{FY}`) with periodicity
- **Audit:** every numbering mutation logged with old/new values, actor, timestamp, batch id
- **Migration:** legacy `OrgDefaults` counters become read-only compatibility layer

### Artifacts produced
| Artifact | Path | Purpose |
|----------|------|---------|
| PRD | `docs/PRD/DOCUMENT_SEQUENCING_PLATFORM_PRD.md` | Product specification |
| Decision Record | `docs/sequencing/PHASE_0_DECISION_RECORD.md` | Architecture and policy freeze |
| Branch Workflow | `docs/sequencing/BRANCH_WORKFLOW.md` | Git workflow for all phases |
| PR Template | `.github/PULL_REQUEST_TEMPLATE/sequence_platform.md` | Standardized PR structure |
| Phase 0 Package | `docs/sequencing/PHASE_0_DELIVERY_PACKAGE.md` | Delivery companion to PRD |
| Phase 1 Readiness | `docs/sequencing/PHASE_1_READINESS.md` | Sprint-by-sprint execution plan |
| QA Checklist | `docs/sequencing/PHASE_0_QA_CHECKLIST.md` | Gates for every phase |
| Production Readiness | `docs/sequencing/PRODUCTION_READINESS.md` | Operational and rollout planning |

### Branches created
- `feature/sequence-platform` — root feature branch (from `master`)
- `feature/sequence-platform-phase-0-delivery` — Phase 0 branch
- `feature/sequence-platform-phase-0-sprint-0-1-delivery-setup` — Sprint 0.1 branch (merged into phase branch)

---

## 2. Phase 1 Execution Order

Phase 1 has three sprints. They must execute in order.

### Sprint 1.1 — Schema Foundation
**Goal:** Add sequence domain models and prepare document nullability.

Start here:
1. Read `docs/sequencing/PHASE_1_READINESS.md` §2
2. Read `docs/sequencing/PHASE_0_DECISION_RECORD.md` §7 (Data Model Requirements) and §10 (Concurrency)
3. Create branch: `feature/sequence-platform-phase-1-sprint-1-1-schema-foundation`
4. Implement schema changes in `prisma/schema.prisma`
5. Generate and review migration SQL
6. Add TypeScript domain types and Zod schemas

**Acceptance criteria:**
- `Sequence`, `SequencePeriod`, `SequenceAuditEvent` models exist
- `Invoice.officialNumber` and `Voucher.officialNumber` are nullable
- Linkage fields (`sequenceId`, `periodId`) exist on both document models
- Legacy `number` columns are preserved unchanged
- Migration is reversible

### Sprint 1.2 — Format Engine and Validation
**Goal:** Build the token renderer, periodicity validator, and preview logic.

Start here:
1. Read `docs/sequencing/PHASE_1_READINESS.md` §3
2. Read `docs/sequencing/PHASE_0_DECISION_RECORD.md` §9 (Token Format v1)
3. Create branch: `feature/sequence-platform-phase-1-sprint-1-2-format-engine`
4. Build `src/lib/sequences/token-engine.ts`
5. Build `src/lib/sequences/periodicity.ts`
6. Build `src/lib/sequences/preview.ts`
7. Build `src/lib/sequences/continuity-seed.ts`

**Acceptance criteria:**
- Token engine renders all v1 tokens correctly
- Periodicity validation rejects mismatched format/period combinations
- Preview returns next number without consuming counter
- Continuity seed parser derives next counter from latest-used input
- All engine functions have unit tests

### Sprint 1.3 — Migration Scaffolding
**Goal:** Create migration scripts, backfill logic, and health checks.

Start here:
1. Read `docs/sequencing/PHASE_1_READINESS.md` §4
2. Read `docs/sequencing/PHASE_0_DECISION_RECORD.md` §8 (Migration Compatibility)
3. Create branch: `feature/sequence-platform-phase-1-sprint-1-3-migration-scaffolding`
4. Build idempotent migration script: `scripts/migrate-legacy-sequences.ts`
5. Build backfill logic for finalized invoices and vouchers
6. Build health check: `scripts/check-sequence-health.ts`
7. Write rollback instructions

**Acceptance criteria:**
- Migration creates one invoice sequence and one voucher sequence per org
- Migration preserves current continuity (next number continues correctly)
- Backfill links finalized documents to their sequence period
- Health check reports duplicates, gaps, and missing sequence state
- Rollback plan is documented and tested on a staging copy

---

## 3. Workstream Ownership for Phase 1

| Workstream | Lead Focus in Phase 1 | Primary Files |
|------------|----------------------|---------------|
| A — Schema and Migration | Sprint 1.1 schema, Sprint 1.3 migration | `prisma/schema.prisma`, `prisma/migrations/`, `scripts/migrate-legacy-sequences.ts`, `scripts/check-sequence-health.ts` |
| B — Core Sequence Engine | Sprint 1.2 format engine | `src/lib/sequences/token-engine.ts`, `src/lib/sequences/periodicity.ts`, `src/lib/sequences/preview.ts`, `src/lib/sequences/continuity-seed.ts` |
| C — Lifecycle Integration | Sprint 1.1 nullability impact analysis, Sprint 1.3 backfill review | `src/lib/docs/numbering.ts`, invoice/voucher creation and finalize flows |
| D — Governance and UI | Sprint 1.1 audit model review, Sprint 1.2 validation rule review | `src/lib/sequences/audit.ts` (conceptual), settings/onboarding planning |

Cross-workstream changes require approval from both workstream leads.

---

## 4. Risks to Watch in Phase 1

| Risk | Impact | Mitigation |
|------|--------|------------|
| Nullable official numbers break downstream reports | High | Preserve `number` column; add `COALESCE` fallback; test all report queries |
| Partial unique index on `officialNumber` conflicts with legacy data | High | Backfill before index creation; use filtered unique index |
| Token engine regex/parser complexity | Medium | Start with strict v1 grammar; reject unsupported tokens explicitly |
| Migration script runs too long on large orgs | Medium | Batch backfill; add progress logging; test on production-size clone |
| Period auto-creation logic race conditions | Medium | Use database-level locking or atomic upsert for period creation |

---

## 5. Definition of Phase 1 Complete

Phase 1 is complete when ALL of the following are true:

- [ ] Sprint 1.1 PR is merged into `feature/sequence-platform-phase-1-foundation`
- [ ] Sprint 1.2 PR is merged into `feature/sequence-platform-phase-1-foundation`
- [ ] Sprint 1.3 PR is merged into `feature/sequence-platform-phase-1-foundation`
- [ ] Schema supports future sequence definitions (periodicity, format tokens)
- [ ] Plan preserves finalization-time numbering (no early assignment)
- [ ] Migration path from `OrgDefaults` is explicit and tested
- [ ] Resequencing rules are lock-date-aware in schema design
- [ ] Owner-only permissions are explicit in schema/model design
- [ ] No document scope ambiguity remains (only invoices + vouchers)
- [ ] `feature/sequence-platform-phase-1-foundation` PR is ready for review into `feature/sequence-platform`

---

## 6. Immediate Next Action

1. Review the Phase 0 PRs (Sprint 0.1 → Phase 0 → root feature branch)
2. Approve and merge `feature/sequence-platform-phase-0-sprint-0-1-delivery-setup` into `feature/sequence-platform-phase-0-delivery`
3. Approve and merge `feature/sequence-platform-phase-0-delivery` into `feature/sequence-platform`
4. Create `feature/sequence-platform-phase-1-foundation` from `feature/sequence-platform`
5. Begin Sprint 1.1: `feature/sequence-platform-phase-1-sprint-1-1-schema-foundation`
