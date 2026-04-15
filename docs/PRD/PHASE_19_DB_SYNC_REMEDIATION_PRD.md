# Phase 19 DB Sync Remediation PRD
## Slipwise One — Database, Migration, and Schema Alignment for Phase 19

**Version:** 1.0  
**Date:** 2026-04-14  
**Prepared for:** Slipwise One Software Engineering Team  
**Prepared by:** Codex Engineering Assistant  
**Scope:** Database sync, migration readiness, schema alignment, and post-migration verification only

---

## 1. Executive Summary

This PRD exists because the current **Phase 19 codebase** and the currently reachable database are not aligned.

The code on:

- `feature/phase-19`

contains Phase 17, Phase 18, Phase 19, and recent Phase 19 remediation schema changes.

However, Prisma migration status confirms that the currently targeted database is **behind** the branch and has not applied a substantial part of the migration chain.

This is a **release blocker**.

Phase 19 cannot be considered environment-ready, test-ready, or release-ready until the database state is brought into sync with the current branch.

This document is not a feature PRD. It is a focused engineering remediation handoff to ensure:

- the target database is the correct one
- all required migrations are applied in the intended environment
- schema state matches the current code
- post-migration data integrity is verified
- Phase 19 backfills and release gates can be completed safely

---

## 2. Confirmed Audit Facts

The following facts were directly confirmed during audit on `feature/phase-19`.

### Current engineering baseline

- active branch used for this audit: `feature/phase-19`
- `prisma/schema.prisma` is valid
- Prisma config is present in `prisma.config.ts`
- migrations are configured under `prisma/migrations`

### Migration inventory includes current branch changes

Confirmed recent migrations include:

- `20260413000001_phase17_sprint1_flow_foundation`
- `20260413000002_phase17_sprint2_sla_escalation_scheduling`
- `20260413000003_phase17_sprint3_workflow_builder_observability`
- `20260413000004_phase18_sprint1_config_foundation`
- `20260413000005_phase18_sprint2_notification_delivery`
- `20260413000006_phase18_sprint3_portal_collaboration`
- `20260414000001_phase19_sprint1_document_index`
- `20260414000002_phase19_sprint2_document_events`
- `20260414113000_phase19_post_audit_remediation`

### Prisma validation result

Confirmed:

- `prisma validate` passes

### Prisma migration status result

Confirmed:

- Prisma sees **9 unapplied migrations**

These unapplied migrations are:

1. `20260413000001_phase17_sprint1_flow_foundation`
2. `20260413000002_phase17_sprint2_sla_escalation_scheduling`
3. `20260413000003_phase17_sprint3_workflow_builder_observability`
4. `20260413000004_phase18_sprint1_config_foundation`
5. `20260413000005_phase18_sprint2_notification_delivery`
6. `20260413000006_phase18_sprint3_portal_collaboration`
7. `20260414000001_phase19_sprint1_document_index`
8. `20260414000002_phase19_sprint2_document_events`
9. `20260414113000_phase19_post_audit_remediation`

### Release-readiness implication

`docs/production/RELEASE_READINESS_CHECKLIST.md` already requires:

- migrations applied
- Phase 19 backfills run
- Phase 19 backfill verification captured

That gate currently fails.

### Prisma tooling implication

The old Prisma diff style using:

- `--from-url`

is no longer valid in the current CLI.

Current remediation work must use the modern Prisma CLI contract, including:

- `--from-config-datasource`
- `--to-schema`
- or equivalent current syntax

### Connectivity implication

An attempted follow-up schema diff hit:

- `P1001: Can't reach database server at 127.0.0.1:55322`

This means the remediation must explicitly verify:

- whether the intended database is running
- whether the correct env target is configured
- whether the DB mismatch is due to connectivity, environment targeting, or real schema lag

---

## 3. Problem Statement

The current code and the current database state cannot be assumed to match.

At minimum, the database is behind the current branch by nine migrations.

That creates risk across all Phase 19 functionality, especially:

- `DocumentIndex`
- `DocumentEvent`
- marketplace revision remediation fields
- moderation and installed-template behavior that depend on recent schema updates

Without DB sync:

- code may reference missing tables or columns
- tests may pass against mocks while runtime fails against the real database
- backfills may not run or may run against partially migrated state
- release-readiness claims become invalid

This remediation must therefore answer two questions definitively:

1. Is the target database the correct intended environment for `feature/phase-19`?
2. Once the correct database is targeted, is it fully migrated and verified against the branch?

---

## 4. Objectives

### O1 — Establish the correct database target

Confirm the actual intended DB environment for Phase 19 verification and deployment.

### O2 — Bring the database up to the current branch migration level

Apply all unapplied migrations safely in the correct environment.

### O3 — Verify schema-to-code alignment

Ensure the live database matches the current Prisma schema and migration chain.

### O4 — Validate post-migration Phase 19 data integrity

Run required Phase 19 backfills and verify expected zero-defect conditions.

### O5 — Restore release readiness for database-dependent verification

Update evidence and execution flow so Phase 19 verification can proceed on a correctly migrated environment.

---

## 5. Non-Goals

This remediation does **not** include:

1. general Phase 19 product feature changes
2. template governance logic refactors unrelated to DB/schema sync
3. UI cleanup
4. broad environment/platform redesign
5. unrelated production hardening outside migration/schema/backfill readiness

This PRD is intentionally limited to DB synchronization and schema readiness.

---

## 6. Remediation Workstreams

### Workstream A — Environment and Target Database Verification

#### Objective

Confirm the correct database target for `feature/phase-19` work and eliminate ambiguity between local, staging, and production-like environments.

#### Required work

- verify `DATABASE_URL` and `DIRECT_URL` usage in the intended execution environment
- confirm whether `127.0.0.1:55322` is the expected Phase 19 database target
- determine whether the observed lag comes from:
  - local DB not running
  - wrong environment target
  - real schema lag in the intended target DB

#### Required outcome

Engineering must end this workstream with a documented answer to:

- which database is the authoritative verification target for `feature/phase-19`
- whether it is reachable
- whether it is the same DB used by app/runtime verification

#### Acceptance criteria

1. The intended DB target is explicitly identified.
2. Connectivity to that DB is confirmed.
3. The migration status is re-run against the correct target.
4. No Phase 19 migration work proceeds against an accidental or ambiguous DB target.

---

### Workstream B — Migration Chain Application

#### Objective

Apply the full missing migration chain required by the current branch.

#### Required work

- apply the nine unapplied migrations in the correct environment using the correct Prisma workflow for that environment
- use development-safe or deploy-safe Prisma commands as appropriate to the target environment
- avoid stale guidance that references deprecated Prisma diff or migrate syntax

#### Required outcome

The target database must have all migrations through:

- `20260414113000_phase19_post_audit_remediation`

successfully applied.

#### Acceptance criteria

1. `prisma migrate status` reports no unapplied migrations in the target environment.
2. Migration history is complete and ordered.
3. No manual one-off SQL drift is introduced outside the migration chain unless explicitly documented and approved.

---

### Workstream C — Schema Drift and Runtime Contract Verification

#### Objective

Ensure the live database structurally matches the current code expectations.

#### Required work

- run modern Prisma diff checks using current supported CLI syntax
- compare live datasource state against current schema after migrations are applied
- verify that recent Phase 19 structures exist and are queryable

#### Required structures to validate

At minimum:

- `DocumentIndex`
- `DocumentEvent`
- Phase 19 marketplace revision/remediation schema additions
- any new columns and relations introduced by `20260414113000_phase19_post_audit_remediation`

#### Required outcome

Engineering must produce evidence that:

- the live DB matches the current Prisma schema
- no missing tables or columns remain for Phase 19 runtime paths

#### Acceptance criteria

1. Modern Prisma diff completes successfully against the correct target DB.
2. No unexpected schema drift remains after migration.
3. Runtime-critical Phase 19 tables/columns exist.

---

### Workstream D — Post-Migration Backfill and Data Integrity Verification

#### Objective

Make sure Phase 19 schema changes are accompanied by complete and verified data normalization.

#### Required work

Run and verify the Phase 19 backfills referenced by current release docs:

- `scripts/backfill-document-index.ts`
- `scripts/backfill-template-revisions.ts`

Then capture verification results for:

- completed purchases with `revisionId IS NULL`
- templates without revisions
- duplicate published revisions

Where relevant, also verify:

- vault rows exist for existing document records
- document event structures are usable after schema application

#### Required outcome

Backfills must be:

- executable
- compatible with the migrated schema
- demonstrably successful

#### Acceptance criteria

1. Both Phase 19 backfills complete successfully in the intended environment.
2. Verification queries show zero unexpected null revision bindings for completed purchases.
3. Templates without revisions are reduced to zero where required by policy.
4. Duplicate published revisions are reduced to zero.
5. Document vault backfill results are consistent with existing document counts.

---

### Workstream E — Release-Readiness Restoration

#### Objective

Re-open the release gate only after DB/schema sync has been fully verified.

#### Required work

- update release evidence for Phase 19 DB readiness
- tie migration completion to release checklist sign-off
- ensure future verification runs happen against the correctly migrated environment

#### Required outcome

The DB-related sections of the release-readiness flow become evidence-backed instead of assumed.

#### Acceptance criteria

1. Release checklist DB requirements are satisfied.
2. Migration status, backfill status, and verification outputs are captured.
3. Phase 19 is not marked release-ready without this evidence.

---

## 7. Required Commands and Tooling Guidance

This PRD must be implemented using **current** Prisma CLI semantics.

### Required command guidance

The implementer must use modern Prisma command forms and must not rely on deprecated guidance such as:

- `prisma migrate diff --from-url ...`

Modern equivalents should use current supported inputs, such as:

- `--from-config-datasource`
- `--to-schema`
- other current supported flags as appropriate

### Required migration workflow discipline

The implementer must choose the correct command family based on environment:

- development workflow for dev environments
- deploy-safe workflow for production-like environments

The PRD does not mandate one exact command for all environments because that depends on where the correct authoritative DB is identified.

What is mandatory is:

- use the correct workflow for the chosen environment
- document exactly which target DB was updated

---

## 8. Public Interfaces and Contracts Affected

This remediation is primarily infrastructural, but it changes operational contracts.

### Operational contracts affected

- Prisma migration completeness becomes a hard prerequisite for Phase 19 verification
- backfill scripts become required post-migration steps, not optional cleanup
- release-readiness now depends on recorded DB verification evidence

### No user-facing product contract changes intended

This PRD should avoid introducing new UX or product-surface scope unless required to unblock DB/schema correctness.

---

## 9. Test and Verification Plan

The remediation is not complete unless the following checks are performed and recorded.

### A. Schema and migration checks

1. `prisma validate` passes
2. `prisma migrate status` reports no unapplied migrations on the target DB
3. Prisma schema diff using current CLI syntax reports no unexpected drift

### B. Runtime compatibility checks

1. App can start against the migrated target DB
2. No runtime failures occur due to missing Phase 19 tables or columns
3. Core Phase 19 DB-backed surfaces can execute their basic reads

### C. Backfill checks

1. `scripts/backfill-document-index.ts` runs successfully
2. `scripts/backfill-template-revisions.ts` runs successfully
3. Verification queries for null revision bindings, missing revisions, and duplicate published revisions pass

### D. App-level verification

1. `npm run test`
2. `npm run lint`
3. `npm run build`

### E. Release-readiness evidence

1. DB target identified
2. DB reachable
3. migrations applied
4. backfills applied
5. verification evidence captured

---

## 10. Risks

### Risk 1 — Wrong DB target gets migrated

If the team applies migrations to the wrong database, the real intended environment remains out of sync and confidence becomes false.

### Risk 2 — Connectivity issue is mistaken for schema correctness

If DB reachability is not resolved first, the team may misclassify the problem as drift or migration failure.

### Risk 3 — Phase 19 code is verified against mocks but not real schema

If app verification proceeds without DB sync, runtime failures may surface only later in QA or deployment.

### Risk 4 — Backfills run against partially migrated state

This can produce corrupted or incomplete data normalization results.

---

## 11. Delivery Sequence

The engineering team should execute this remediation in this order:

1. identify the correct authoritative DB target for `feature/phase-19`
2. confirm connectivity to that DB
3. re-run migration status against that target
4. apply all missing migrations using the correct Prisma workflow
5. run modern schema diff verification
6. run Phase 19 backfills
7. run verification queries
8. run app-level build/test verification
9. update release-readiness evidence

This order is mandatory because backfill or app verification before schema sync is unsafe.

---

## 12. Final Release Gate

Phase 19 remains **DB-blocked** until all of the following are true:

1. the intended target database is explicitly identified
2. the intended target database is reachable
3. all migrations through `20260414113000_phase19_post_audit_remediation` are applied
4. no unexpected schema drift remains
5. Phase 19 backfills complete successfully
6. post-backfill verification passes
7. app-level verification passes against the migrated environment

Only after that can the team claim the database is in sync with the latest Phase 19 code.

