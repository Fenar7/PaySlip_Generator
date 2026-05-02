# Phase 7 Rollout Readiness — Sequencing Platform

> **Scope:** Invoices + vouchers only.  
> **Status:** All Phase 0–7 sequencing work is code-complete and verified.  
> **This document:** Captures what Sprint 7.3 verified for production readiness.  
> **Related:** `PRODUCTION_READINESS.md` (Phase 0 aspirational checklist)

---

## 1. Final Regression Summary

All sequenced flows verified passing with 222 tests across 23 test files.

| Area | Tests | Coverage |
|------|-------|----------|
| Sequence engine (consume, preview, concurrency) | 19 | P2002 retry, idempotency, tx delegation |
| Sequence engine errors | 5 | Full error taxonomy |
| Sequence health checks | 9 | Criticals, warnings, clean state, voucher path |
| Sequence resequence (preview + apply) | 22 | Preview, apply, concurrency, drift detection |
| Sequence diagnostics | 14 | Gaps, irregularities, lock enforcement |
| Sequence admin (auth, gates) | 24 | Owner-only, cross-org, rate limits |
| Settings actions/UI | 8 | Config, continuity, history |
| Invoice actions | 10 | Issue, cancel, reissue, payments |
| Voucher actions | 10 | Save, update, approval |
| Approvals actions | 12 | Request, list, detail, approve, reject |
| Sequence engine (integration) | 8 | Real DB: preview, consume, format errors |
| Sequence resequence (integration) | 20 | Real DB: apply, multi-period, audit |
| Sequence diagnostics (integration) | 6 | Real DB: gaps, lock enforcement |
| Migration (integration) | 12 | Legacy linkage, backfill health |
| Other engine tests (tokenizer, renderer, etc.) | 43 | Format engine, periodicity, continuity |

**Total:** 222 tests, 23 test files, 0 failures.

---

## 2. Concurrency & Idempotency (Sprint 7.1)

| Invariant | Status | Verification |
|-----------|--------|-------------|
| Period creation is safe under concurrent consume calls | ✅ PASS | P2002 retry in `findOrCreatePeriod`; `@@unique([sequenceId, startDate, endDate])` in schema |
| Invoice issue is idempotent under concurrent calls | ✅ PASS | `invoiceNumber` re-read inside transaction; only first caller consumes |
| Voucher approval is idempotent under concurrent calls | ✅ PASS | `voucherNumber` re-read inside transaction; only first caller consumes |
| Resequence apply is safe under concurrent calls | ✅ PASS | Sequence row locked via `UPDATE updatedAt`; document drift detected and rejected |
| Consume never produces duplicate numbers | ✅ PASS | Atomic `increment: 1` on period counter; unique constraint on period boundaries |
| No in-memory idempotency cache survives rollback | ✅ PASS | Removed in Sprint 7.1 remediation; document-level guards are rollback-safe |
| Rate limiting on sensitive paths | ✅ PASS | Invoice issue: 30/min; Voucher approval: 30/min; Resequence apply: 5/min; Diagnostics: 10/min |

---

## 3. Diagnostics & Support Tooling (Sprint 7.2)

| Capability | Status | Surface |
|------------|--------|---------|
| Sequence health check (6 checks) | ✅ PASS | `runSequenceHealthCheck` → UI "Run Health Check" button |
| Support overview (periods, counters, resequence history) | ✅ PASS | `getSequenceSupportOverview` → UI "Support Overview" button |
| Gap & irregularity diagnostics | ✅ PASS | `diagnoseSequence` → UI "Run Diagnostics" button |
| All diagnostics owner-only | ✅ PASS | `requireOrgOwner` on all three entry points; `isOwner` guard in UI |
| Diagnostics rate-limited | ✅ PASS | `RATE_LIMITS.diagnostics` (10 req/60s) |
| Diagnostics audit-logged | ✅ PASS | `sequence.diagnostics_ran` fire-and-forget audit entry |

---

## 4. Permission Model

| Operation | Required Role | Enforcement |
|-----------|---------------|-------------|
| View sequence config | Any org member | `assertCallerOwnsOrg` |
| Edit sequence format/periodicity | Owner only | `requireOrgOwner` + `assertOrgMatch` |
| Seed continuity | Owner only | `requireOrgOwner` + `assertOrgMatch` |
| Preview/apply resequence | Owner only | `requireOrgOwner` + `assertOrgMatch` |
| Run diagnostics | Owner only | `requireOrgOwner` + `assertOrgMatch` |
| Run health check | Owner only | `requireOrgOwner` + `assertOrgMatch` |
| View support overview | Owner only | `requireOrgOwner` + `assertOrgMatch` |
| View audit history | Any org member | `assertCallerOwnsOrg` |

All server-enforced; UI guards are additive, not substitutes.

---

## 5. Error Taxonomy

| Error Class | Scenario | Phase |
|-------------|----------|-------|
| `SequenceEngineError` | Base class for all sequence errors | Phase 1 |
| `SequenceNotFoundError` | Referenced sequence does not exist | Phase 1 |
| `SequenceExhaustionError` | Counter exceeds `MAX_SAFE_INTEGER` | Phase 1 |
| `SequenceAdminError` | Admin authorization/permission failure | Phase 2 |
| `SequenceContentionError` | Concurrent operation detected (safe to retry) | Sprint 7.1 |
| `SequencePeriodLockError` | Cannot acquire period lock | Sprint 7.1 |
| `SequenceIdempotencyConflictError` | Idempotency key collision (defined but unused — kept for future) | Sprint 7.1 |

---

## 6. Audit Coverage

All sequence mutations are audited inside transactions (atomic with the mutation):

| Action | When |
|--------|------|
| `sequence.created` | Sequence creation |
| `sequence.edited` | Format change |
| `sequence.periodicity_changed` | Periodicity change |
| `sequence.future_activated` | Future format activation |
| `sequence.continuity_seeded` | Continuity seed |
| `sequence.resequence_previewed` | Resequence preview |
| `sequence.resequence_confirmed` | Resequence apply |
| `sequence.locked_attempt_blocked` | Locked period rejection |
| `sequence.diagnostics_ran` | Diagnostics execution (fire-and-forget) |

---

## 7. Known Limitations (Non-Blocking)

| Limitation | Severity | Notes |
|------------|----------|-------|
| In-process idempotency removed; cross-node retries rely on document-level guards | Low | Document-level guard (invoiceNumber/voucherNumber check in tx) is correct for retry. True cross-node idempotency would need a persistent store. |
| Voucher date filtering uses ISO-8601 lexicographic ordering | Low | Documented in `fetchFinalizedDocuments` comment. Non-ISO dates may produce incomplete diagnostics. |
| Health check uses raw SQL with catch fallback | Low | Graceful degradation. Duplicate detection queries fail gracefully to empty results. |
| Resequence apply locks sequence row (brief exclusive lock) | Low | Acceptable — resequence is owner-only, rate-limited, and low-frequency. |

---

## 8. Rollback Safety

| Concern | Mitigation |
|---------|-----------|
| Schema | No new migrations in Phase 7; all schema changes were in Phase 1 |
| Lifecycle | Legacy `nextDocumentNumberTx` fallback still exists; removing sequence engine would revert to legacy numbering |
| Features | All sequence operations are additive; disabling them returns to pre-sequencing behavior |
| Data | No destructive operations; resequence preserves old numbers in audit log |

---

## 9. Final Verification (Sprint 7.3)

```sh
# All 222 tests passing
npx vitest run src/features/sequences/ \
  src/app/app/settings/sequences/__tests__/ \
  src/app/app/flow/approvals/__tests__/ \
  src/app/app/docs/invoices/__tests__/ \
  src/app/app/docs/vouchers/__tests__/

# Type-check: no new errors in sequencing files
npx tsc --noEmit

# Lint: clean
npx next lint
```
