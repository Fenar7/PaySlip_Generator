# Phase 0 QA Checklist — Slipwise Document Sequencing Platform

> **Scope:** Invoices + vouchers only.  
> **Rules:** Invoices get official numbers on ISSUED; vouchers on APPROVED. Drafts get no official number.  
> **Governance:** Owner-only. Locked periods block resequencing. Every mutation is audit logged.

---

## 1. Phase 0 Validation Checklist

Verify that all foundational documents are complete, decisions are locked, and scope ambiguity is eliminated before any engineering work proceeds.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 1.1 | PRD, architecture decision records (ADRs), and API contracts for document sequencing are committed to `docs/sequencing/` and peer-reviewed. | Phase 0 | Review git history and PR approvals for all docs in `docs/sequencing/`. |
| 1.2 | Scope is explicitly limited to invoices and vouchers; no references to quotes, purchase orders, or other document types exist in Phase 0 artifacts. | Phase 0 | Grep `docs/sequencing/` for excluded document types; confirm exclusion in PRD. |
| 1.3 | Numbering trigger rules are locked: invoices on ISSUED, vouchers on APPROVED, drafts receive no official number. | Phase 0 | Trace requirement ID in PRD to decision log; confirm no open comments. |
| 1.4 | Concurrency-safe assignment strategy is documented and reviewed (atomic DB increments, distributed locks, or unique constraints). | Phase 0 | Review ADR for concurrency; verify algorithm proof or load-test plan exists. |
| 1.5 | Transactional resequencing boundary is defined (single DB transaction, saga pattern, or two-phase commit). | Phase 0 | Review ADR; verify transaction boundary diagram is committed. |
| 1.6 | Duplicate protection mechanism is specified (DB unique constraint + application-level validation). | Phase 0 | Review schema design doc and ADR; confirm unique index specifications. |
| 1.7 | Audit logging requirements for every numbering mutation are documented with payload schema and retention policy. | Phase 0 | Review `docs/sequencing/` for audit log schema; verify retention policy is specified. |
| 1.8 | OrgDefaults migration source mapping is complete (field names, data types, default values, edge cases). | Phase 0 | Review migration spec; confirm mapping table exists for all OrgDefaults fields. |
| 1.9 | Decision log has no unresolved TBDs or deferred decisions affecting Phase 0 scope. | Phase 0 | Review decision log file; confirm zero open TBD items tagged `phase-0`. |
| 1.10 | Security review sign-off is recorded for numbering mutation endpoints and resequencing operations. | Phase 0 | Review security review ticket or sign-off document. |

---

## 2. Schema Readiness Checklist

Confirm that the data model supports Phase 0 requirements and future-phase extensibility.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 2.1 | `official_number` column exists on invoice and voucher tables with `VARCHAR`/`NVARCHAR` support for prefix/suffix patterns. | Phase 0 | Review schema migration file or ORM schema; verify column definitions. |
| 2.2 | `sequence_number` integer column exists for strict numeric ordering independent of formatted `official_number`. | Phase 0 | Review schema; confirm integer type with non-null constraint where applicable. |
| 2.3 | `numbering_status` enum or state column exists to distinguish DRAFT (no number) vs ASSIGNED vs RESEQUENCED. | Phase 0 | Review schema; verify enum values cover DRAFT, ASSIGNED, RESEQUENCED. |
| 2.4 | `period_lock_date` and `period_status` (`OPEN`/`CLOSED`/`LOCKED`) columns exist on the fiscal period table. | Phase 0 | Review schema; confirm lock date is `DATE`/`DATETIME` and status enum is defined. |
| 2.5 | `audit_log` table (or append-only stream) exists with columns: `document_id`, `document_type`, `previous_number`, `new_number`, `mutation_reason`, `actor_id`, `timestamp`, `session_id`. | Phase 0 | Review schema; confirm all required columns present and indexed by `document_id` + `timestamp`. |
| 2.6 | `sequence_registry` table exists to track per-organization, per-document-type next-sequence counters with row-level locking support. | Phase 0 | Review schema; verify composite primary key on `(org_id, document_type, fiscal_year)` and locking strategy. |
| 2.7 | OrgDefaults table fields targeted for migration are frozen (no new schema changes) until migration is complete. | Phase 0 | Verify OrgDefaults table has no pending migrations after freeze date. |
| 2.8 | Index strategy is defined for `official_number` lookups, sequence range queries, and period lock date filtering. | Phase 0 | Review indexing ADR; confirm execution plans for critical queries. |

---

## 3. Lifecycle Readiness Checklist

Verify the finalization-time numbering plan and lifecycle edge cases.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 3.1 | Invoice state machine explicitly triggers number assignment only on transition to ISSUED; all other transitions are no-ops for numbering. | Phase 0 | Review state machine diagram or code contract; verify transition table. |
| 3.2 | Voucher state machine explicitly triggers number assignment only on transition to APPROVED; all other transitions are no-ops for numbering. | Phase 0 | Review state machine diagram or code contract; verify transition table. |
| 3.3 | Draft creation, update, and delete flows are guaranteed to never invoke the numbering service. | Phase 0 | Review service boundary definitions; trace draft API calls to confirm no numbering invocation. |
| 3.4 | Finalization-time numbering is idempotent: re-issuing or re-approving an already-numbered document must not mutate the official number. | Phase 0 | Review idempotency key or guard-clause design; verify unit test scenarios document. |
| 3.5 | Rollback from ISSUED/APPROVED to draft removes official number only if explicitly allowed by policy (default: retain for audit); policy is documented. | Phase 0 | Review lifecycle policy doc; confirm behavior is specified and signed off. |
| 3.6 | Bulk finalization (batch invoice issue, batch voucher approve) integrates with numbering service within the same transaction boundary. | Phase 0 | Review batch operation design doc; verify transaction scope includes numbering assignment. |

---

## 4. Migration Readiness Checklist

Verify the OrgDefaults migration path is explicit, safe, and reversible.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 4.1 | Source OrgDefaults fields are cataloged with exact field names, current data types, and sample values. | Phase 0 | Review migration spec appendix; confirm field inventory table. |
| 4.2 | Target schema fields are mapped 1:1 from OrgDefaults with transformation rules (prefix extraction, padding logic). | Phase 0 | Review mapping table in migration spec; verify transformation functions are documented. |
| 4.3 | Backfill script is idempotent and can be run multiple times without duplicate data or sequence gaps. | Phase 0 | Review backfill script code; verify UPSERT/merge logic and dry-run mode. |
| 4.4 | Migration ordering is defined: schema changes first, then backfill, then cutover flag, then OrgDefaults deprecation. | Phase 0 | Review runbook; confirm step order with dependencies diagram. |
| 4.5 | Data validation query set exists to compare OrgDefaults source vs. target post-migration (checksum or row-level comparison). | Phase 0 | Review validation scripts; confirm query count matches expected output. |
| 4.6 | Migration performance estimate (row count, duration, lock time) is documented and approved by DBA/SRE. | Phase 0 | Review performance estimate doc; confirm DBA sign-off in ticket. |
| 4.7 | OrgDefaults read fallback is implemented: if target config is missing, read from OrgDefaults until cutover is complete. | Phase 0 | Review feature flag or fallback logic in code; verify toggle exists. |
| 4.8 | Migration dry-run success criteria are defined: zero validation failures, zero sequence collisions, zero null official numbers for issued/approved docs. | Phase 0 | Review dry-run checklist; confirm pass/fail thresholds. |

---

## 5. Resequencing Rules Checklist

Lock-date awareness, open-period rules, and duplicate prevention.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 5.1 | Resequencing endpoint rejects requests when target period status is LOCKED or `period_lock_date` is in the past relative to the resequence date. | Phase 0 | Review API contract; verify guard clause in sequence controller/service. |
| 5.2 | Resequencing endpoint rejects requests for documents in CLOSED periods unless explicit override permission (out of Phase 0 scope) is granted. | Phase 0 | Review permission matrix; confirm CLOSED period resequence is blocked for non-owner roles. |
| 5.3 | Duplicate prevention algorithm is documented: gapless resequence within period uses temp table/swap or deterministic update order with unique constraint. | Phase 0 | Review ADR; verify algorithm handles concurrent resequencing attempts. |
| 5.4 | Open-period rule is explicit: only documents in periods with `period_status = OPEN` and `period_lock_date >= current_date` are eligible for resequencing. | Phase 0 | Review eligibility query in runbook; confirm filter conditions. |
| 5.5 | Resequencing audit logs record old sequence, new sequence, period affected, reason code, and actor ID for every mutated document. | Phase 0 | Review audit log schema; confirm resequence event type exists with required fields. |
| 5.6 | Resequencing validation pre-check runs before mutation and reports: collision count, lock-date violations, and affected document count. | Phase 0 | Review pre-check API or stored procedure; confirm output schema. |
| 5.7 | Future sequence changes (e.g., updating next-sequence counter for future periods) are architecturally separated from historical resequencing commands. | Phase 0 | Review API design doc; confirm separate endpoints or command types for future vs. historical. |

---

## 6. Governance Checklist

Owner-only permissions, explicit authorization rules, and zero gaps.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 6.1 | Owner-only permission is enforced at the API gateway or middleware layer for all sequencing mutations (assign, resequence, lock-date change). | Phase 0 | Review authz middleware code or spec; confirm role check for `owner`. |
| 6.2 | Non-owner roles (admin, accountant, viewer) receive `403 Forbidden` on all sequencing mutation endpoints; no fallback to implicit permissions. | Phase 0 | Review RBAC matrix; verify integration tests assert 403 for non-owner roles. |
| 6.3 | Owner delegation or temporary elevation is explicitly out of scope for Phase 0; no delegation fields exist in schema. | Phase 0 | Review schema and API spec; confirm absence of delegation-related fields. |
| 6.4 | Period lock/unlock actions are owner-only and audited separately from document numbering audits. | Phase 0 | Review period governance API spec; confirm separate audit event type. |
| 6.5 | Sequence configuration changes (prefix, suffix, start number) require owner approval and are versioned with effective-date tracking. | Phase 0 | Review config change ADR; confirm versioning table or immutable config records. |
| 6.6 | No gaps in permission model: every sequencing operation has a single, explicit owner-guarded authorization rule. | Phase 0 | Review operation-to-permission mapping table; confirm 100% coverage. |

---

## 7. Pre-Phase-1 Gate (Go / No-Go Criteria)

Foundation engineering may begin only when all criteria are met.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 7.1 | All Phase 0 validation checklist items (1.1–1.10) are marked PASS with evidence links. | Phase 1 Entry | Review Phase 0 sign-off sheet; verify all items green with ticket references. |
| 7.2 | Schema migrations for Phase 0 are applied to staging and pass integration tests. | Phase 1 Entry | Check CI pipeline results for staging migration job. |
| 7.3 | OrgDefaults migration dry-run completed in staging with zero failures. | Phase 1 Entry | Review dry-run report artifact from staging environment. |
| 7.4 | Sequencing service unit tests cover concurrency (race conditions), idempotency, and duplicate rejection. | Phase 1 Entry | Review test coverage report; confirm >90% branch coverage on numbering service. |
| 7.5 | Performance baseline is established: p95 latency for number assignment < 100 ms under 100 concurrent requests. | Phase 1 Entry | Review load-test report; confirm latency SLA is met. |
| 7.6 | Security review for Phase 0 scope is signed off by InfoSec. | Phase 1 Entry | Review security sign-off ticket or document. |
| 7.7 | Rollback plan from Phase 0 migration is documented, tested in staging, and reviewed by SRE. | Phase 1 Entry | Review rollback runbook; confirm staging execution log exists. |
| 7.8 | No critical or high-severity bugs are open against the sequencing service in the issue tracker. | Phase 1 Entry | Query issue tracker for open bugs with `sequencing` label; confirm zero critical/high. |

---

## 8. Pre-Phase-4 Gate (Invoice Lifecycle Cutover)

Invoice numbering may be wired to the sequencing platform.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 8.1 | Invoice ISSUED transition is wired to numbering service in a feature branch with passing end-to-end tests. | Phase 4 Entry | Review feature branch CI; confirm e2e test suite passes. |
| 8.2 | Invoice numbering is toggled via feature flag (`invoice-numbering-enabled`) that can be disabled instantly without deployment. | Phase 4 Entry | Review feature flag config; verify kill-switch latency < 30 s. |
| 8.3 | Backward compatibility verified: invoices issued before cutover retain legacy numbers; new invoices use sequencing platform. | Phase 4 Entry | Review migration test case; confirm dual-numbering test passes. |
| 8.4 | Invoice official number is rendered correctly in PDF, email, and API responses post-cutover. | Phase 4 Entry | Execute smoke tests for invoice PDF generation and API serialization. |
| 8.5 | Invoice draft flows are verified to never trigger numbering service under load. | Phase 4 Entry | Review integration test results; confirm draft API load test shows zero numbering calls. |
| 8.6 | Invoice resequencing eligibility query is tested against production-like data volume. | Phase 4 Entry | Review query execution plan and load test results for invoice resequence eligibility. |
| 8.7 | Rollback plan for invoice cutover is rehearsed: disabling flag restores legacy numbering path within 5 minutes. | Phase 4 Entry | Review rollback rehearsal log; confirm RTO is documented and tested. |

---

## 9. Pre-Phase-5 Gate (Voucher Lifecycle Cutover)

Voucher numbering may be wired to the sequencing platform.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 9.1 | Voucher APPROVED transition is wired to numbering service in a feature branch with passing end-to-end tests. | Phase 5 Entry | Review feature branch CI; confirm e2e test suite passes. |
| 9.2 | Voucher numbering is toggled via feature flag (`voucher-numbering-enabled`) independent of the invoice flag. | Phase 5 Entry | Review feature flag config; confirm independent toggle exists. |
| 9.3 | Backward compatibility verified: vouchers approved before cutover retain legacy numbers; new vouchers use sequencing platform. | Phase 5 Entry | Review migration test case; confirm dual-numbering test passes. |
| 9.4 | Voucher official number is rendered correctly in PDF, email, and API responses post-cutover. | Phase 5 Entry | Execute smoke tests for voucher PDF generation and API serialization. |
| 9.5 | Voucher draft and pending-approval flows are verified to never trigger numbering service under load. | Phase 5 Entry | Review integration test results; confirm draft/pending API load test shows zero numbering calls. |
| 9.6 | Voucher resequencing eligibility query is tested against production-like data volume. | Phase 5 Entry | Review query execution plan and load test results for voucher resequence eligibility. |
| 9.7 | Rollback plan for voucher cutover is rehearsed: disabling flag restores legacy numbering path within 5 minutes. | Phase 5 Entry | Review rollback rehearsal log; confirm RTO is documented and tested. |
| 9.8 | Invoice numbering has been live in production for a minimum of 7 days with zero Sev-1/Sev-2 incidents before voucher cutover. | Phase 5 Entry | Review incident tracker; confirm 7-day stability window. |

---

## 10. Pre-Phase-6 Gate (Resequencing)

Resequencing may be enabled for owner users.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 10.1 | Resequencing API is implemented behind feature flag (`resequencing-enabled`) with owner-only RBAC. | Phase 6 Entry | Review API implementation and authz tests; confirm flag exists. |
| 10.2 | Lock-date enforcement is validated in staging with synthetic locked periods; resequencing returns 422 or equivalent. | Phase 6 Entry | Execute synthetic lock-date tests; verify error responses. |
| 10.3 | Open-period resequencing is load-tested: 1,000 invoices in a single period resequenced in < 30 seconds. | Phase 6 Entry | Review load-test report; confirm throughput and latency SLA. |
| 10.4 | Duplicate protection stress test passes: 10 concurrent resequencing attempts on the same period produce exactly one successful outcome and 9 deterministic rejections. | Phase 6 Entry | Review concurrency stress test results; verify no duplicate official numbers. |
| 10.5 | Resequencing audit log ingestion is verified: all mutations appear in audit stream within 1 second of commit. | Phase 6 Entry | Review audit log latency test; confirm lag metric < 1 s. |
| 10.6 | Resequencing dry-run mode returns accurate impact report without mutating data. | Phase 6 Entry | Review dry-run API response schema; execute dry-run and verify zero DB mutations. |
| 10.7 | Invoice and voucher resequencing UIs (or API consumers) are user-acceptance tested by at least two organization owners. | Phase 6 Entry | Review UAT sign-off sheets; confirm owner feedback is addressed. |
| 10.8 | Historical data integrity check passes: post-resequencing, all issued invoices and approved vouchers have unique, gapless official numbers within their periods. | Phase 6 Entry | Run data integrity verification script; confirm zero duplicates and zero gaps. |

---

## 11. Pre-Phase-7 Gate (Rollout)

General availability and OrgDefaults deprecation may proceed.

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 11.1 | All previous gates (Phase-4, Phase-5, Phase-6) are passed with production evidence. | Phase 7 Entry | Review cumulative sign-off document; verify all gate checklists are complete. |
| 11.2 | OrgDefaults migration is 100% complete in production; zero reads from legacy OrgDefaults for numbering config. | Phase 7 Entry | Query production logs/metrics; confirm zero `OrgDefaults` read events for numbering keys. |
| 11.3 | Feature flags for invoice numbering, voucher numbering, and resequencing are all enabled in production with monitoring. | Phase 7 Entry | Review feature flag dashboard; confirm all three flags are active. |
| 11.4 | Production runbook is published to on-call wiki and acknowledged by L1/L2 support. | Phase 7 Entry | Review wiki page access logs; confirm support team acknowledgment signatures. |
| 11.5 | Customer communication is sent: announcement of new sequencing behavior, lock-date policy, and owner-only resequencing. | Phase 7 Entry | Review comms draft and delivery receipts; confirm sent to all active org owners. |
| 11.6 | Monitoring dashboards for sequencing metrics (assignment latency, resequence duration, error rate, audit lag) are live and reviewed by SRE. | Phase 7 Entry | Review dashboard URLs; confirm SRE sign-off on alert thresholds. |
| 11.7 | OrgDefaults deprecation plan is scheduled: timeline for read-only mode and eventual table retirement is published. | Phase 7 Entry | Review deprecation RFC; confirm timeline is published and approved. |
| 11.8 | Final data integrity verification is executed in production and signed off by Data Engineering. | Phase 7 Entry | Review integrity report artifact; confirm Data Engineering sign-off. |
