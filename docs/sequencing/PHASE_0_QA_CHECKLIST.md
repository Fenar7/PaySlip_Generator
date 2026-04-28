# Phase 0 QA Checklist — Slipwise Document Sequencing Platform

> **Scope:** Invoices + vouchers only.  
> **Rules:** Invoices get official numbers on ISSUED; vouchers on APPROVED. Drafts get no official number.  
> **Governance:** Owner-only. Locked periods block resequencing. Every mutation is audit logged.  
> **Phase 0 nature:** This is a documentation and decision-freeze phase. No product code, schema migrations, or runtime changes are present.

---

## 1. Phase 0 Validation Checklist

Verify that all foundational documents are complete, decisions are locked, and scope ambiguity is eliminated before any engineering work proceeds.

| Check | Criterion | Verification Method |
|-------|-----------|---------------------|
| 1.1 | PRD, architecture decision records, and execution artifacts are committed to `docs/sequencing/` and cross-referenced. | Review git history for all docs in `docs/sequencing/`; confirm cross-reference table exists in PRD. |
| 1.2 | Scope is explicitly limited to invoices and vouchers; no references to quotes, purchase orders, vendor bills, or other document types exist in Phase 0 artifacts. | Grep `docs/sequencing/` for excluded document types; confirm exclusion in PRD scope section. |
| 1.3 | Numbering trigger rules are locked: invoices on ISSUED, vouchers on APPROVED, drafts receive no official number. | Trace requirement in PRD to decision log; confirm no open comments or TBDs. |
| 1.4 | Concurrency-safe assignment strategy is documented at the conceptual level (atomic DB increments, row-level locking, or unique constraints). | Review Decision Record §10; verify approach is specified without unresolved alternatives. |
| 1.5 | Transactional resequencing boundary is defined conceptually (single DB transaction with rollback). | Review Decision Record §6; confirm transaction boundary is specified. |
| 1.6 | Duplicate protection mechanism is specified (DB unique constraint + application-level validation). | Review Decision Record §10; confirm strategy is documented. |
| 1.7 | Audit logging requirements for every numbering mutation are documented with payload schema. | Review Decision Record §6; confirm audit event types and required fields are listed. |
| 1.8 | OrgDefaults migration approach is defined at a conceptual level (read-only legacy bridge, additive-only schema changes). | Review Decision Record §8; confirm no destructive changes to legacy counters in Phase 1. |
| 1.9 | Decision log has no unresolved TBDs or deferred decisions affecting Phase 0–1 scope. | Review Decision Record §11; confirm zero open TBD items tagged `phase-0` or `phase-1`. |
| 1.10 | Branch workflow is frozen and matches actual branch naming used in the initiative. | Review `BRANCH_WORKFLOW.md`; confirm all examples use `M-K` hyphenated sprint notation. |

---

## 2. Repo-Grounded Architecture Alignment

Confirm the docs match actual repository state. Phase 1 readiness must not assume fields or states that do not exist.

| Check | Criterion | Verification Method |
|-------|-----------|---------------------|
| 2.1 | Phase 1 readiness doc references actual repo field names (`invoiceNumber`, `voucherNumber`) not fictional fields (`officialNumber`, `number`). | Review `PHASE_1_READINESS.md` §2; confirm field names match `prisma/schema.prisma`. |
| 2.2 | Phase 1 readiness doc uses actual invoice statuses (`ISSUED`) and voucher statuses (`approved`), not fictional states (`FINALIZED`). | Review `PHASE_1_READINESS.md` §2 and §4; confirm status values match `src/app/app/docs/invoices/actions.ts` and `src/app/app/docs/vouchers/actions.ts`. |
| 2.3 | Phase 1 readiness doc clearly marks every new schema addition as "NEW — to be added" and does not describe them as pre-existing. | Review `PHASE_1_READINESS.md` §2.1; confirm explicit NEW labels on `Sequence`, `SequenceFormat`, `SequencePeriod`, `sequenceId`, `sequencePeriodId`, `sequenceNumber`. |
| 2.4 | Phase 1 scope boundary explicitly excludes lifecycle integration (finalize hooks, draft nullability). Those are assigned to Phase 4–5 per PRD. | Review `PHASE_1_READINESS.md` §1; confirm lifecycle cutover is listed as Out of Scope. |
| 2.5 | Current numbering source (`src/lib/docs/numbering.ts`) is correctly identified as the legacy baseline. | Review `PHASE_1_READINESS.md` header; confirm legacy baseline reference. |
| 2.6 | No schema changes to existing `invoiceNumber` / `voucherNumber` columns are planned in Phase 1 (they remain non-nullable). | Review `PHASE_1_READINESS.md` §2.1; confirm no nullability changes to existing columns. |

---

## 3. Workflow Correctness

Verify branch/PR workflow is consistent and executable.

| Check | Criterion | Verification Method |
|-------|-----------|---------------------|
| 3.1 | Branch naming convention is consistent: all sprint branches use hyphenated `M-K` format (`phase-1-sprint-1-2`), not dotted (`phase-1-sprint-1.2`). | Review `BRANCH_WORKFLOW.md` §1; grep for any remaining dotted examples. |
| 3.2 | Merge order is clear: sprint → phase → root feature → master. | Review `BRANCH_WORKFLOW.md` §3; confirm merge chain diagram and rules. |
| 3.3 | PR template exists and is referenced in branch workflow. | Confirm `.github/PULL_REQUEST_TEMPLATE/sequence_platform.md` exists and is referenced. |
| 3.4 | Phase 0 workflow reflects reality: Sprint 0.1 already merged into Phase 0 branch; only Phase 0 → root feature PR remains. | Review `PHASE_1_KICKOFF_HANDOFF.md` §1 and §6; confirm no stale merge instructions. |
| 3.5 | Multi-agent ownership boundaries are defined and do not overlap ambiguously. | Review `BRANCH_WORKFLOW.md` §6; confirm workstream A–D ownership is disjoint. |

---

## 4. Dependency and Handoff Clarity

Verify Phase 1 can start without guessing.

| Check | Criterion | Verification Method |
|-------|-----------|---------------------|
| 4.1 | Cross-sprint dependency map exists and correctly marks hard vs soft dependencies. | Review `PHASE_1_READINESS.md` §5; confirm no missing hard dependencies. |
| 4.2 | Interface contracts between schema → engine → lifecycle are documented conceptually. | Review `PHASE_1_READINESS.md` §9; confirm contract shapes are defined. |
| 4.3 | Phase 1 acceptance criteria are testable and specific (not vague "works correctly" language). | Review `PHASE_1_READINESS.md` §7; confirm each criterion has a concrete test approach. |
| 4.4 | Risk register identifies watchouts specific to early implementation (schema migration, legacy counter trust, concurrency). | Review `PHASE_1_READINESS.md` §8; confirm risks are actionable, not generic. |
| 4.5 | Handoff criteria to Phase 2 are explicit and verifiable. | Review `PHASE_1_READINESS.md` §11; confirm each criterion has a verification method. |

---

## 5. Absence of Contradictions

Verify no doc contradicts another doc or the PRD.

| Check | Criterion | Verification Method |
|-------|-----------|---------------------|
| 5.1 | PRD scope (invoices + vouchers only, vendor bills out) is reflected identically in all subordinate docs. | Cross-check PRD §3, Decision Record §2, Phase 1 Readiness §1. |
| 5.2 | Lifecycle timing (invoice ISSUED, voucher approved, drafts null) is consistent across PRD, Decision Record, and Phase 1 Readiness. | Cross-check PRD §8, Decision Record §3, Phase 1 Readiness §1. |
| 5.3 | Governance model (owner-only) is consistent across PRD, Decision Record, and Branch Workflow. | Cross-check PRD §5, Decision Record §7, Branch Workflow §5. |
| 5.4 | Token format v1 decisions are consistent across PRD, Decision Record, and Phase 1 Readiness. | Cross-check PRD §9, Decision Record §9, Phase 1 Readiness §3.1. |
| 5.5 | No doc claims a schema field exists that is not in `prisma/schema.prisma`. | Spot-check Phase 1 Readiness and Decision Record against actual schema. |

---

## 6. Pre-Phase-1 Gate (Go / No-Go Criteria)

Foundation engineering may begin only when all criteria are met. These are **documentation and decision gates**, not implementation gates.

| Check | Criterion | Verification Method |
|-------|-----------|---------------------|
| 6.1 | All Phase 0 validation checklist items (1.1–1.10) are marked PASS. | Review this checklist; confirm all items green. |
| 6.2 | Repo-grounded alignment checklist items (2.1–2.6) are marked PASS. | Review this checklist; confirm all items green. |
| 6.3 | Workflow correctness checklist items (3.1–3.5) are marked PASS. | Review this checklist; confirm all items green. |
| 6.4 | Dependency and handoff clarity checklist items (4.1–4.5) are marked PASS. | Review this checklist; confirm all items green. |
| 6.5 | Absence of contradictions checklist items (5.1–5.5) are marked PASS. | Review this checklist; confirm all items green. |
| 6.6 | PR #200 is approved and merged into `feature/sequence-platform`. | GitHub PR status. |
| 6.7 | `feature/sequence-platform-phase-1-foundation` branch is created from `feature/sequence-platform`. | Git branch list. |

---

## 7. Future Phase Entry Gates (NOT Required Before Phase 1)

The following gates are documented here for traceability but are **not** prerequisites for starting Phase 1. They will be validated in their respective phases.

### 7.1 Pre-Phase-4 Gate (Invoice Lifecycle Cutover)

Invoice numbering may be wired to the sequencing platform.

| Check | Criterion |
|-------|-----------|
| 7.1.1 | Invoice ISSUED transition is wired to numbering service in a feature branch with passing end-to-end tests. |
| 7.1.2 | Invoice numbering is toggled via feature flag that can be disabled instantly without deployment. |
| 7.1.3 | Backward compatibility verified: invoices issued before cutover retain legacy numbers; new invoices use sequencing platform. |
| 7.1.4 | Invoice draft flows are verified to never trigger numbering service under load. |
| 7.1.5 | Rollback plan for invoice cutover is rehearsed: disabling flag restores legacy numbering path within 5 minutes. |

### 7.2 Pre-Phase-5 Gate (Voucher Lifecycle Cutover)

Voucher numbering may be wired to the sequencing platform.

| Check | Criterion |
|-------|-----------|
| 7.2.1 | Voucher APPROVED transition is wired to numbering service in a feature branch with passing end-to-end tests. |
| 7.2.2 | Voucher numbering is toggled via feature flag independent of the invoice flag. |
| 7.2.3 | Backward compatibility verified: vouchers approved before cutover retain legacy numbers. |
| 7.2.4 | Invoice numbering has been live in production for a minimum of 7 days with zero Sev-1/Sev-2 incidents before voucher cutover. |

### 7.3 Pre-Phase-6 Gate (Resequencing)

Resequencing may be enabled for owner users.

| Check | Criterion |
|-------|-----------|
| 7.3.1 | Resequencing API is implemented behind feature flag with owner-only RBAC. |
| 7.3.2 | Lock-date enforcement is validated in staging with synthetic locked periods. |
| 7.3.3 | Open-period resequencing is load-tested: 1,000 invoices in a single period resequenced in < 30 seconds. |
| 7.3.4 | Duplicate protection stress test passes: 10 concurrent resequencing attempts on the same period produce exactly one successful outcome. |
| 7.3.5 | Resequencing dry-run mode returns accurate impact report without mutating data. |

### 7.4 Pre-Phase-7 Gate (Rollout)

General availability and OrgDefaults deprecation may proceed.

| Check | Criterion |
|-------|-----------|
| 7.4.1 | All previous gates are passed with production evidence. |
| 7.4.2 | OrgDefaults migration is 100% complete in production; zero reads from legacy OrgDefaults for numbering config. |
| 7.4.3 | Production runbook is published to on-call wiki and acknowledged by L1/L2 support. |
| 7.4.4 | Monitoring dashboards for sequencing metrics are live and reviewed by SRE. |
| 7.4.5 | Final data integrity verification is executed in production and signed off. |
