# Production Readiness — Slipwise Document Sequencing Platform

> **Scope:** Invoices + vouchers only.  
> **Critical constraints:** Owner-only governance, lock-date protection, transactional resequencing, strong duplicate protection, full audit logging.

---

## 1. Operational Readiness Checklist

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 1.1 | On-call runbook exists for sequencing service outages, including owner contact escalation path. | Phase 7 | Review runbook in on-call wiki; verify last updated date is within 30 days of rollout. |
| 1.2 | Alerting thresholds are configured for sequencing API error rate (> 1% for 5 minutes triggers P2), latency (> 200 ms p95 for 10 minutes triggers P2), and assignment failures (any spike triggers P1). | Phase 7 | Review monitoring config (Datadog / New Relic / Prometheus); confirm alert rules are active. |
| 1.3 | Support team training is completed: L1 can identify numbering incidents, L2 can execute resequence dry-run and feature flag toggles. | Phase 7 | Review training completion certificates or quiz results; verify hands-on lab sign-off. |
| 1.4 | Feature flag kill-switches are tested under incident conditions: invoice numbering, voucher numbering, and resequencing can each be disabled in < 60 seconds. | Phase 7 | Execute timed kill-switch drill; measure and record disable latency. |
| 1.5 | Database connection pool and lock timeout settings are tuned for sequencing workload (row lock wait timeout < 10 s to prevent cascade). | Phase 7 | Review DB parameter group or config; confirm tuning values in production. |
| 1.6 | Sequencing service has dedicated circuit breaker configuration to fail fast if numbering DB is degraded. | Phase 7 | Review circuit breaker config; verify fallback behavior (queue or reject) is documented. |
| 1.7 | Capacity plan is validated: sequencing registry table can handle org count growth for 12 months without partition or shard changes. | Phase 7 | Review capacity model; confirm row count and QPS projections with headroom. |

---

## 2. Observability Requirements

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 2.1 | Metric: `sequencing.assignment.latency_ms` is emitted for every official number assignment with tags for `document_type` and `org_id`. | Phase 7 | Review metrics instrumentation code; verify dashboard query shows data. |
| 2.2 | Metric: `sequencing.assignment.errors_total` is emitted with error type tag (`duplicate`, `lock_timeout`, `constraint_violation`, `unknown`). | Phase 7 | Review error handling code; confirm counter increments for each error path. |
| 2.3 | Metric: `sequencing.resequence.duration_seconds` is emitted for resequencing jobs with tags for `document_type`, `period`, and `document_count`. | Phase 7 | Review resequence service code; verify histogram or summary is emitted. |
| 2.4 | Log: Every official number assignment produces a structured log with `document_id`, `official_number`, `sequence_number`, `trigger_event`, `actor_id`, and `trace_id`. | Phase 7 | Review logging middleware; query log aggregator for sample events. |
| 2.5 | Log: Every resequencing job produces a structured log with `job_id`, `period_id`, `affected_count`, `actor_id`, `start_time`, `end_time`, and `trace_id`. | Phase 7 | Review logging middleware; query log aggregator for sample events. |
| 2.6 | Trace: Distributed traces span from API gateway → numbering service → database → audit log sink with `trace_id` propagation. | Phase 7 | Review trace instrumentation (OpenTelemetry / Zipkin); confirm end-to-end trace visualization. |
| 2.7 | Dashboard: Real-time sequencing health dashboard is deployed showing assignment rate, error rate, resequence queue depth, and audit lag. | Phase 7 | Open dashboard URL; verify all panels render and data is current. |
| 2.8 | SLO: 99.9% of official number assignments succeed within 200 ms; error budget alert is configured. | Phase 7 | Review SLO document and alert config; confirm burn rate alert exists. |

---

## 3. Lock-Date and Resequencing Risk Checklist

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 3.1 | **Risk:** Owner accidentally locks a period too early, blocking legitimate resequencing. **Mitigation:** Lock-date change requires confirmation dialog and 24-hour delayed effect or immediate undo window. | Phase 6 / 7 | Review UI/UX design; confirm confirmation and undo mechanism in staging. |
| 3.2 | **Risk:** Resequencing on a large period times out and leaves partial updates. **Mitigation:** Resequencing is atomic (all-or-nothing) or implements compensating transactions. | Phase 6 | Review transaction design; verify rollback or compensation test results. |
| 3.3 | **Risk:** Concurrent resequencing and assignment cause duplicate numbers. **Mitigation:** Unique constraint on `(org_id, document_type, official_number)` plus application-level distributed lock. | Phase 6 | Review schema and code; execute concurrency stress test. |
| 3.4 | **Risk:** System clock skew causes lock-date comparison errors. **Mitigation:** All lock-date comparisons use database `NOW()` or synchronized time source, not application server time. | Phase 6 | Review SQL queries; confirm use of `CURRENT_TIMESTAMP` or DB time function. |
| 3.5 | **Risk:** Resequencing during month-end close corrupts reporting. **Mitigation:** Resequencing is automatically blocked during scheduled close windows or requires explicit break-glass approval. | Phase 6 / 7 | Review close-window config; verify automatic block in integration tests. |
| 3.6 | **Risk:** Audit log tampering or loss obscures resequencing history. **Mitigation:** Audit log is append-only with DB-level restrictions on UPDATE/DELETE, or streamed to immutable store. | Phase 7 | Review DB grants or stream config; confirm audit table has no UPDATE/DELETE privileges for app user. |
| 3.7 | **Risk:** Owner initiates resequencing without understanding impact. **Mitigation:** Dry-run report must be reviewed and explicitly acknowledged before live resequencing is enabled. | Phase 6 | Review API/UI flow; confirm dry-run acknowledgment gate exists. |

---

## 4. Migration Rollback Plan

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 4.1 | Rollback trigger criteria are defined: migration validation failure rate > 0.1%, sequence collision detected, or p99 latency > 5× baseline. | Phase 0 / 1 | Review rollback runbook; confirm trigger thresholds are documented. |
| 4.2 | Pre-migration snapshot of OrgDefaults table is taken and retained for 30 days minimum. | Phase 1 | Verify backup job configuration; confirm retention policy in backup tool. |
| 4.3 | Target schema changes are backward compatible: new columns are nullable or have sensible defaults; no existing queries break if migration is rolled back. | Phase 1 | Review schema migration file; confirm backward compatibility checklist. |
| 4.4 | Feature flag `orgdefaults-migration-cutover` can be reverted to `false` instantly, restoring reads from legacy OrgDefaults. | Phase 1 | Test flag toggle in staging; measure restoration time. |
| 4.5 | Backfill script has reverse script or cleanup procedure to remove backfilled data without affecting original OrgDefaults. | Phase 1 | Review reverse script code; execute in staging and verify cleanup. |
| 4.6 | Rollback communication plan is documented: who decides, who executes, who notifies customers, and estimated recovery time. | Phase 1 | Review incident comms plan; confirm RACI matrix for migration rollback. |
| 4.7 | Database transaction log (WAL / binlog) retention covers the full migration window plus 24 hours for point-in-time recovery. | Phase 1 | Verify DB log retention setting; confirm coverage period. |

---

## 5. Production Deployment Sequence

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 5.1 | **Step 1:** Deploy schema migrations (non-breaking) to production during low-traffic window. | Phase 1 | Review deployment calendar; confirm maintenance window is scheduled. |
| 5.2 | **Step 2:** Run migration dry-run in production (read-only validation) and verify zero failures. | Phase 1 | Execute dry-run; review output artifact. |
| 5.3 | **Step 3:** Execute OrgDefaults backfill with monitoring; verify row counts match expectations. | Phase 1 | Execute backfill; compare row count report to source inventory. |
| 5.4 | **Step 4:** Enable `invoice-numbering-enabled` feature flag for 10% of orgs (canary). | Phase 4 | Review feature flag targeting config; confirm canary segment definition. |
| 5.5 | **Step 5:** Monitor canary for 24 hours: zero assignment errors, zero latency regressions, zero support tickets. | Phase 4 | Review monitoring dashboard and support ticket queue; confirm clean 24 h window. |
| 5.6 | **Step 6:** Ramp invoice numbering to 100% of orgs. | Phase 4 | Review flag ramp log; confirm 100% enablement timestamp. |
| 5.7 | **Step 7:** Hold for 7-day stability period before voucher cutover. | Phase 4 / 5 | Review calendar; confirm stability gate checklist is signed off. |
| 5.8 | **Step 8:** Enable `voucher-numbering-enabled` feature flag for 10% canary, monitor 24 h. | Phase 5 | Review flag targeting config; confirm canary segment and monitoring. |
| 5.9 | **Step 9:** Ramp voucher numbering to 100% of orgs. | Phase 5 | Review flag ramp log; confirm 100% enablement timestamp. |
| 5.10 | **Step 10:** Enable `resequencing-enabled` feature flag for owner role only; monitor audit log throughput. | Phase 6 | Review flag config; confirm role-based targeting and audit log metrics. |
| 5.11 | **Step 11:** Final validation, deprecate OrgDefaults reads, publish rollout complete. | Phase 7 | Review final validation report; confirm deprecation flag is enabled. |

---

## 6. Post-Deployment Validation

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 6.1 | Smoke test: Create invoice draft → verify no official number; issue invoice → verify official number is assigned and non-empty. | Phase 4 | Execute automated smoke test post-deployment; review assertion results. |
| 6.2 | Smoke test: Create voucher draft → verify no official number; approve voucher → verify official number is assigned and non-empty. | Phase 5 | Execute automated smoke test post-deployment; review assertion results. |
| 6.3 | Smoke test: Query invoice PDF and API response → verify official number matches database record. | Phase 4 | Execute automated smoke test; compare PDF text extraction and API payload to DB. |
| 6.4 | Smoke test: Query voucher PDF and API response → verify official number matches database record. | Phase 5 | Execute automated smoke test; compare PDF text extraction and API payload to DB. |
| 6.5 | Smoke test: Attempt resequencing in locked period → verify 422/403 response and zero DB mutations. | Phase 6 | Execute automated smoke test; query DB to confirm no sequence changes. |
| 6.6 | Smoke test: Execute resequencing dry-run → verify response contains accurate impact report and zero DB mutations. | Phase 6 | Execute automated smoke test; compare dry-run report to actual eligible document count. |
| 6.7 | Smoke test: Verify audit log contains entries for all numbering assignments and resequencing attempts within 60 seconds of operation. | Phase 6 / 7 | Query audit log stream; confirm event timestamps are within 60 s of operation time. |
| 6.8 | Regression test: Existing invoices and vouchers issued/approved before cutover still render correctly and are queryable by legacy number. | Phase 4 / 5 | Execute regression test suite; confirm legacy document lookup passes. |

---

## 7. Incident Response Guide

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 7.1 | **Symptom:** Duplicate official numbers detected. **Action:** Immediately disable numbering feature flag for affected document type; run data integrity script to identify scope; notify affected org owners. | Phase 7 | Review incident response playbook; verify exact command/script names and contact method. |
| 7.2 | **Symptom:** Number assignment latency spikes. **Action:** Check DB lock waits and connection pool saturation; scale read replicas if applicable; if root cause is resequencing lock contention, pause resequencing jobs. | Phase 7 | Review runbook; confirm DB metrics query and pause job command are documented. |
| 7.3 | **Symptom:** Missing official numbers for issued invoices or approved vouchers. **Action:** Query audit log for assignment failures; identify documents in failed state; manually assign numbers via break-glass script with full audit trail. | Phase 7 | Review runbook; confirm break-glass script exists, requires owner approval, and logs to audit. |
| 7.4 | **Symptom:** Audit log gaps or delays. **Action:** Check audit log sink health (queue depth, consumer lag); if sink is down, enable local spooling on app servers until recovery. | Phase 7 | Review runbook; confirm queue depth query and spool enablement procedure. |
| 7.5 | **Symptom:** Resequencing job hangs or partial completion. **Action:** Identify running transaction via DB `pg_stat_activity` equivalent; determine safe kill criteria; if killed, run compensation/repair script. | Phase 7 | Review runbook; confirm DB query and kill criteria are documented; test repair script in staging. |
| 7.6 | Escalation path: L1 → L2 → On-call engineer → Sequencing platform DRI within defined SLAs (L1: 15 min, L2: 30 min, DRI: 1 hour). | Phase 7 | Review escalation policy; confirm contact roster and SLA timers in PagerDuty/Opsgenie. |
| 7.7 | Post-incident requirement: Every Sev-1/Sev-2 numbering incident triggers a blameless postmortem within 48 hours and a sequencing platform action item. | Phase 7 | Review incident process doc; confirm postmortem template and sequencing tag exist. |

---

## 8. Data Integrity Verification

| Check | Criterion | Owner Phase | Verification Method |
|-------|-----------|-------------|---------------------|
| 8.1 | Verify uniqueness: `SELECT org_id, document_type, official_number, COUNT(*) FROM ... GROUP BY ... HAVING COUNT(*) > 1` returns zero rows for issued invoices and approved vouchers. | Phase 7 | Execute SQL verification script in production; capture output artifact. |
| 8.2 | Verify completeness: Zero issued invoices or approved vouchers have `NULL` or empty `official_number`. | Phase 7 | Execute SQL: `SELECT COUNT(*) FROM ... WHERE status IN ('ISSUED','APPROVED') AND (official_number IS NULL OR official_number = '')`; expect 0. |
| 8.3 | Verify gaplessness (per period): For each org and period, `sequence_number` values form a contiguous integer sequence starting from configured start number. | Phase 7 | Execute gap-detection SQL or script; review report for any gaps. |
| 8.4 | Verify lock-date compliance: No documents with `sequence_number` mutations exist where mutation timestamp < `period_lock_date` for locked periods. | Phase 7 | Execute SQL joining audit log to period table; confirm zero violations. |
| 8.5 | Verify audit trail completeness: Every `official_number` assignment or change has a corresponding audit log entry with matching `document_id`, `previous_number`, `new_number`, and `timestamp`. | Phase 7 | Execute left-join query between document table and audit log; confirm zero orphaned assignments. |
| 8.6 | Verify OrgDefaults migration accuracy: For every org, target config values match source OrgDefaults values within defined tolerance (next sequence number delta = 0). | Phase 7 | Execute comparison script; review diff report for anomalies. |
| 8.7 | Verify backward compatibility: Legacy document lookups by old number format still succeed via API and UI search. | Phase 7 | Execute legacy lookup smoke tests; confirm search returns correct documents. |
| 8.8 | Integrity verification is automated and scheduled to run daily for the first 30 days post-rollout, then weekly. | Phase 7 | Review cron job or scheduled task config; confirm schedule and alert on failure. |
