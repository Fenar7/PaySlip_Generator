# Phase 1 Readiness Package — Document Sequencing Platform

**Workstream:** C (Lifecycle Integration)  
**Release Scope:** Invoices + Vouchers only. Vendor bills explicitly excluded.  
**Legacy Baseline:** `src/lib/docs/numbering.ts` — OrgDefaults-driven `PREFIX-COUNTER` generation.  
**Target State:** Token-based format engine, periodicity-aware counters, nullable official numbers until finalization, sequence-linked document lifecycle.

---

## 1. Phase 1 Scope Boundary

| In Scope | Out of Scope |
|----------|--------------|
| Schema foundation: `Sequence`, `SequenceFormat`, `SequencePeriod` models; nullable `officialNumber` on `Invoice` and `Voucher`; sequence linkage fields (`sequenceId`, `periodId`, `sequenceNumber`). | Vendor bill sequencing entirely — no schema changes, no engine calls, no migration for vendor bills. |
| Token-based format engine with `{PREFIX}`, `{YYYY}`, `{MM}`, `{DD}`, `{COUNTER}`, `{ORG}` tokens and periodicity (`NONE`, `MONTHLY`, `QUARTERLY`, `YEARLY`). | UI configuration panels for sequence management; admin format builder widgets. |
| Lifecycle integration: draft documents receive `null` official numbers; finalize transition triggers sequence consumption and official number assignment. | Real-time collaborative numbering locks; distributed counter sharding beyond row-level DB locking. |
| Migration scaffolding: idempotent legacy OrgDefaults → sequence mapping; backfill of finalized invoice/voucher linkage; health checks; rollback plan. | Cross-org sequence templates; multi-currency sequence isolation; audit trail table for sequence history. |
| Preview algorithm for next-number rendering without counter consumption. | Public API endpoints for external sequence consumption; webhook emissions on sequence rollover. |
| Continuity seed parser to derive initial format strings and counter seeds from legacy `PREFIX-COUNTER` patterns. | Cross-phase features: advanced governance rules, approval workflows, manual number override UI. |

---

## 2. Sprint 1.1 Readiness Checklist — Schema Foundation

### 2.1 Schema Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| 1 | Add `Sequence` model with `id`, `orgId`, `name`, `documentType` (`INVOICE` \| `VOUCHER`), `periodicity`, `isActive`, `createdAt`, `updatedAt`. | One sequence per document type per org; enables future multi-sequence per type. | Pending |
| 2 | Add `SequenceFormat` model with `id`, `sequenceId`, `formatString`, `startCounter`, `isDefault`, `createdAt`. | Supports multiple formats per sequence; default format drives auto-assignment. | Pending |
| 3 | Add `SequencePeriod` model with `id`, `sequenceId`, `startDate`, `endDate`, `currentCounter`, `status` (`OPEN` \| `CLOSED`). | Periodicity requires explicit period buckets to isolate counters. | Pending |
| 4 | Make `Invoice.officialNumber` and `Voucher.officialNumber` nullable (`String?`). | Drafts must not consume official numbers; only finalized documents lock a number. | Pending |
| 5 | Add `Invoice.sequenceId`, `Invoice.periodId`, `Invoice.sequenceNumber` (nullable FKs + integer); same for `Voucher`. | Linkage fields bind finalized documents to their generating sequence context. | Pending |
| 6 | Preserve existing `Invoice.number` and `Voucher.number` columns (legacy display field) for 2 release cycles. | Legacy compatibility: downstream reports relying on `number` continue working. | Pending |
| 7 | Add `@unique([orgId, officialNumber])` only when `officialNumber` is non-null via partial index (or DB-native filtered unique). | Prevents duplicate official numbers per org without blocking null drafts. | Pending |

### 2.2 Model Definitions (Conceptual)

- **Sequence:** Owns the periodicity policy and activation state. Linked to org. Document type enum restricted to `INVOICE`, `VOUCHER`.
- **SequenceFormat:** Owns the `formatString` (max 128 chars) and `startCounter` (default 1). One `isDefault = true` per sequence enforced at application layer.
- **SequencePeriod:** Owns `currentCounter` (incremented atomically). Period boundaries computed from periodicity + document date.
- **Invoice / Voucher:** `officialNumber` nullable. `sequenceNumber` stores the raw integer counter value used in the token render.

### 2.3 Legacy Compatibility Plan

| Aspect | Action | Owner |
|--------|--------|-------|
| Column preservation | Do not drop `number` column. Write dual-write logic in `src/lib/docs/numbering.ts`: legacy path populates `number`; new path populates `officialNumber`. | Workstream A |
| Fallback mode | Feature flag `SEQUENCE_PHASE1 = false` forces legacy `number` generation and ignores `officialNumber`. | Workstream C |
| Report compatibility | Views/queries selecting `number` remain unchanged. After Phase 1, reports migrate to `COALESCE(officialNumber, number)`. | Workstream D |
| Index safety | New partial unique indexes must not conflict with legacy data where `officialNumber` is currently non-null for all rows. Migration must backfill before index creation. | Workstream A |

### 2.4 Exact Files Expected to Change

| File | Change Type | Sprint |
|------|-------------|--------|
| `prisma/schema.prisma` | Add models; modify `Invoice`, `Voucher`; add enums. | 1.1 |
| `prisma/migrations/*/migration.sql` | Generate and review SQL for nullable columns, new tables, partial indexes. | 1.1 |
| `src/features/sequences/types.ts` | TypeScript domain types mirroring Prisma additions. | 1.1 |
| `src/features/sequences/schema.ts` | Zod validation schemas for sequence/format/period inputs. | 1.1 |
| `src/lib/docs/numbering.ts` | Insert dual-write compatibility shim; add feature flag branch. | 1.1 |
| `src/lib/constants/feature-flags.ts` | Define `SEQUENCE_PHASE1` boolean flag. | 1.1 |

---

## 3. Sprint 1.2 Readiness Checklist — Format Engine and Validation

### 3.1 Token Format Decisions

| Token | Description | Validation Rule | Example Render |
|-------|-------------|-----------------|----------------|
| `{PREFIX}` | Static org-defined prefix. | 1–12 uppercase alphanumeric chars; no spaces. | `INV` |
| `{YYYY}` | 4-digit year from document date. | Always valid if date present. | `2026` |
| `{MM}` | 2-digit month from document date. | 01–12. | `04` |
| `{DD}` | 2-digit day from document date. | 01–31. | `28` |
| `{COUNTER}` | Incrementing integer, zero-padded per format config. | `startCounter >= 1`; pad width 1–6. | `00042` |
| `{ORG}` | Org short code slug. | 2–6 uppercase chars. | `ACME` |

- **Format string max length:** 128 characters.
- **Reserved characters:** `{` and `}` are reserved; literal braces escaped as `\{` / `\}` (rare, documented).
- **Counter padding:** Defined per `SequenceFormat.counterPadding` (default 1 = no padding).

### 3.2 Periodicity Rules

| Periodicity | Period Boundary Calculation | Period Auto-Creation |
|-------------|----------------------------|----------------------|
| `NONE` | Single implicit period `1970-01-01` to `2999-12-31`; `currentCounter` lives on `Sequence` directly or a single eternal period row. | N/A — create one eternal period at sequence creation. |
| `MONTHLY` | Start = 1st of document month; End = last day of document month. | Auto-create on first document finalize in uncovered month. |
| `QUARTERLY` | Start = 1st day of quarter; End = last day of quarter. | Auto-create on first document finalize in uncovered quarter. |
| `YEARLY` | Start = Jan 1; End = Dec 31. | Auto-create on first document finalize in uncovered year. |

- **Period close policy:** Periods remain `OPEN` indefinitely in Phase 1. No manual close.
- **Cross-period gap:** Missing periods are created lazily; no retroactive period backfill required.

### 3.3 Preview Algorithm

```
renderPreview(formatString, context):
  1. Validate formatString syntax (balanced braces, known tokens).
  2. Lookup SequenceFormat by formatString or formatId.
  3. Determine period from context.documentDate + sequence.periodicity.
  4. Read period.currentCounter (non-locking read).
  5. Render each token: {COUNTER} uses currentCounter + 1 with padding.
  6. Return { preview: string, nextCounter: number, periodId: string }.
```

- Preview must **never** increment counters.
- Preview must return HTTP 200 with `preview` and `nextCounter` fields.
- If period does not exist, preview assumes period will be auto-created and uses `startCounter`.

### 3.4 Continuity Seed Parser

```
parseContinuitySeed(legacyOrgDefaults):
  Input:  { prefix: "INV", counter: 42 }
  Output: { formatString: "{PREFIX}-{COUNTER}",
            startCounter: 43,
            counterPadding: 1,
            periodicity: "NONE" }
```

- Seed parser runs exclusively during Sprint 1.3 migration.
- If legacy pattern contains date-like tokens (e.g., `INV-2026-0042`), parser attempts to infer `{PREFIX}-{YYYY}-{COUNTER}` and `periodicity: YEARLY`.
- All inferred formats require manual review flag `inferred: true` in migration log.

### 3.5 Conceptual Service Signatures

```typescript
// Engine layer
interface SequenceEngine {
  renderPreview(params: {
    sequenceId: string;
    documentDate: Date;
    orgId: string;
  }): Promise<{ preview: string; nextCounter: number; periodId: string }>;

  validateFormat(formatString: string): {
    valid: boolean;
    tokens: Token[];
    errors: string[];
  };

  consumeNextNumber(params: {
    sequenceId: string;
    documentDate: Date;
    orgId: string;
  }): Promise<{ officialNumber: string; sequenceNumber: number; periodId: string }>;
}

// Lifecycle layer (Workstream C integration)
interface DocumentLifecycle {
  assignOfficialNumberOnFinalize(documentId: string, documentType: 'INVOICE' | 'VOUCHER'): Promise<void>;
}
```

### 3.6 Exact Files Expected to Change

| File | Change Type | Sprint |
|------|-------------|--------|
| `src/features/sequences/engine/tokenizer.ts` | Token lexing, validation, reserved-char checks. | 1.2 |
| `src/features/sequences/engine/renderer.ts` | String substitution, zero-padding, context injection. | 1.2 |
| `src/features/sequences/engine/periodicity.ts` | Period boundary math, period lookup/creation. | 1.2 |
| `src/features/sequences/engine/preview.ts` | Non-locking preview orchestration. | 1.2 |
| `src/features/sequences/engine/continuity.ts` | Legacy pattern → format string inference. | 1.2 |
| `src/features/sequences/services/sequence-engine.ts` | Combines tokenizer + renderer + periodicity + DB transaction. | 1.2 |
| `src/lib/docs/numbering.ts` | Add branch: if `SEQUENCE_PHASE1` enabled, delegate to `sequence-engine.ts`. | 1.2 |
| `src/features/invoices/services/invoice-lifecycle.ts` | Hook `assignOfficialNumberOnFinalize` into finalize transition. | 1.2 |
| `src/features/vouchers/services/voucher-lifecycle.ts` | Hook `assignOfficialNumberOnFinalize` into finalize transition. | 1.2 |

---

## 4. Sprint 1.3 Readiness Checklist — Migration Scaffolding

### 4.1 Migration Script Design

| Step | Action | Idempotency Rule |
|------|--------|------------------|
| 1 | Read all `OrgDefaults` rows where `documentType IN ('INVOICE', 'VOUCHER')`. | Skip if `Sequence` already exists for `(orgId, documentType)`. |
| 2 | Parse legacy pattern via continuity seed parser. | Log `inferred: true` if heuristic used. |
| 3 | Create `Sequence` + default `SequenceFormat` + initial `SequencePeriod` (if periodicity != `NONE`). | Use `upsert` or existence check to prevent duplicates. |
| 4 | Seed `SequencePeriod.currentCounter` to `startCounter` (not legacy counter value; legacy counter represents last used, so start = legacy + 1). | If period exists and counter > startCounter, abort and log conflict. |

### 4.2 Backfill Strategy

| Document State | Action | Rationale |
|----------------|--------|-----------|
| Finalized (status = `FINALIZED`) | Link to inferred period; generate `officialNumber` using engine at backfill time; set `sequenceNumber`; preserve `number` legacy field. | Finalized docs must have immutable official numbers. |
| Draft (status = `DRAFT`) | Do **not** link; leave `officialNumber = null`, `sequenceId = null`. | Drafts receive numbers only at finalize; pre-linking creates orphan risk. |
| Cancelled / Void | Link if previously finalized; skip if never finalized. | Consistency with finalized subset. |

- **Batch size:** 500 documents per transaction to avoid long locks.
- **Ordering:** Backfill by `createdAt ASC` within each org to respect chronological counter order.
- **Conflict resolution:** If generated officialNumber collides with existing legacy `number` (rare), log collision and use manual override flag.

### 4.3 Health Check Design

| Check | Query Target | Failure Threshold | Action on Failure |
|-------|-------------|-------------------|-------------------|
| Unlinked finalized docs | `COUNT(*) FROM Invoice WHERE status='FINALIZED' AND sequenceId IS NULL` | > 0 | Alert; re-run backfill script for document type. |
| Sequences without default format | `COUNT(*) FROM Sequence WHERE NOT EXISTS (SELECT 1 FROM SequenceFormat WHERE sequenceId = Sequence.id AND isDefault = true)` | > 0 | Alert; create default format from legacy fallback. |
| Duplicate official numbers per org | `SELECT orgId, officialNumber, COUNT(*) FROM Invoice WHERE officialNumber IS NOT NULL GROUP BY orgId, officialNumber HAVING COUNT(*) > 1` | > 0 rows | P1 incident; halt rollout; run deduplication script. |
| Counter gaps (heuristic) | Compare `MAX(sequenceNumber)` per period against `currentCounter` — gap > 1 warrants investigation. | > 10 gaps per org | Log warning; do not block rollout (gaps may be legitimate deletions). |
| Legacy numbering still active | `COUNT(*) FROM Invoice WHERE updatedAt > migration_start AND number IS NOT NULL AND officialNumber IS NULL AND status = 'FINALIZED'` | > 0 | Indicates feature flag misconfiguration or bypass. |

### 4.4 Rollback Plan

| Layer | Rollback Action | Recovery Time Objective |
|-------|-----------------|------------------------|
| Database | Down-migration drops new tables; restores `officialNumber` non-null default by copying from `number`. | < 15 minutes with DBA assist. |
| Application | Set `SEQUENCE_PHASE1 = false` in feature flag store; restart app servers. | < 5 minutes. |
| Data | If official numbers were assigned, keep them in `officialNumber` column; legacy path resumes populating `number`. No data loss. | N/A — additive column strategy prevents loss. |

### 4.5 Exact Files Expected to Change

| File | Change Type | Sprint |
|------|-------------|--------|
| `scripts/migrate-sequences.ts` | Idempotent OrgDefaults → Sequence migration. | 1.3 |
| `scripts/backfill-document-sequences.ts` | Link finalized invoices/vouchers; assign official numbers. | 1.3 |
| `scripts/check-sequence-health.ts` | Run all health checks; output JSON report. | 1.3 |
| `src/features/sequences/migrations/legacy-mapper.ts` | Map OrgDefaults schema to Sequence models. | 1.3 |
| `src/features/sequences/migrations/continuity-seed.ts` | Re-use engine continuity parser for migration-time inference. | 1.3 |
| `prisma/migrations/*/migration.sql` | Final verified migration after dry-run. | 1.3 |

---

## 5. Cross-Sprint Dependency Map

| Dependency | Provider | Consumer | Hard or Soft | Blocking Reason |
|------------|----------|----------|--------------|-----------------|
| Prisma schema with `Sequence`, `SequencePeriod`, `SequenceFormat` tables | Sprint 1.1 | Sprint 1.2 | **Hard** | Engine queries require tables and relations to exist. |
| Nullable `officialNumber` on `Invoice` / `Voucher` | Sprint 1.1 | Sprint 1.2 | **Hard** | Draft finalize logic assumes nullable column to distinguish unassigned state. |
| Sequence linkage fields (`sequenceId`, `periodId`, `sequenceNumber`) | Sprint 1.1 | Sprint 1.2 | **Hard** | `consumeNextNumber` must write linkage fields during finalize. |
| Feature flag `SEQUENCE_PHASE1` wired into `src/lib/docs/numbering.ts` | Sprint 1.1 | Sprint 1.2 | Soft | Sprint 1.2 can develop behind flag, but flag wiring should exist first. |
| Token-based format engine (`renderPreview`, `consumeNextNumber`) | Sprint 1.2 | Sprint 1.3 | **Hard** | Backfill script calls engine to generate official numbers for finalized docs. |
| Continuity seed parser | Sprint 1.2 | Sprint 1.3 | **Hard** | Migration script uses parser to derive format strings from legacy OrgDefaults. |
| Periodicity and period auto-creation logic | Sprint 1.2 | Sprint 1.3 | **Hard** | Backfill must infer/create correct periods based on document dates. |
| Zod schemas / domain types | Sprint 1.1 | Sprint 1.2 | Soft | Sprint 1.2 can define local types temporarily, but convergence required before merge. |

---

## 6. Implementation Order Within Each Sprint

### Sprint 1.1 Recommended File Order

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `prisma/schema.prisma` | All downstream code depends on the data model. |
| 2 | `src/features/sequences/types.ts` | Type contracts unblock parallel engine work. |
| 3 | `src/features/sequences/schema.ts` | Validation contracts prevent invalid test data. |
| 4 | `src/lib/constants/feature-flags.ts` | Flag must exist before conditional logic is added. |
| 5 | `src/lib/docs/numbering.ts` | Add dual-write shim last, after types and flag are available. |
| 6 | `prisma/migrations/*/migration.sql` | Generate only after schema is reviewed; run in staging first. |

### Sprint 1.2 Recommended File Order

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `src/features/sequences/engine/tokenizer.ts` | Foundation for all format operations. |
| 2 | `src/features/sequences/engine/renderer.ts` | Depends on tokenizer output; pure function, easily testable. |
| 3 | `src/features/sequences/engine/periodicity.ts` | Period math is independent of rendering; can parallelize with 1–2. |
| 4 | `src/features/sequences/engine/preview.ts` | Orchestrates renderer + periodicity without DB writes. |
| 5 | `src/features/sequences/engine/continuity.ts` | Independent utility; can parallelize with 1–4. |
| 6 | `src/features/sequences/services/sequence-engine.ts` | Integrates engine modules with atomic DB transactions. |
| 7 | `src/lib/docs/numbering.ts` | Wire legacy entrypoint to new engine behind feature flag. |
| 8 | `src/features/invoices/services/invoice-lifecycle.ts` | Finalize hook depends on engine service. |
| 9 | `src/features/vouchers/services/voucher-lifecycle.ts` | Finalize hook depends on engine service. |

### Sprint 1.3 Recommended File Order

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `src/features/sequences/migrations/continuity-seed.ts` | Re-use engine parser; define migration-specific seed logic. |
| 2 | `src/features/sequences/migrations/legacy-mapper.ts` | Maps OrgDefaults to sequence model shape; depends on seed parser. |
| 3 | `scripts/migrate-sequences.ts` | Create sequences first; backfill cannot run without sequence rows. |
| 4 | `scripts/backfill-document-sequences.ts` | Consumes sequences; assigns official numbers via engine. |
| 5 | `scripts/check-sequence-health.ts` | Validates output of steps 3–4. |
| 6 | `prisma/migrations/*/migration.sql` | Final migration applied after scripts are verified in staging. |

---

## 7. Acceptance Criteria Per Sprint

### Sprint 1.1 — Schema Foundation

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| 1.1.1 | `prisma migrate dev` generates zero errors; migration applies cleanly to a staging DB snapshot. | Run migration against anonymized production clone. |
| 1.1.2 | `Invoice` and `Voucher` tables accept `NULL` in `officialNumber` without violating existing unique constraints. | Insert draft records with `officialNumber = NULL` in integration test. |
| 1.1.3 | `Sequence`, `SequenceFormat`, `SequencePeriod` tables are queryable via Prisma client; relations resolve correctly. | Prisma query unit test: create org → sequence → format → period chain. |
| 1.1.4 | Legacy `number` column remains populated when `SEQUENCE_PHASE1 = false`; existing reports return identical results before/after deploy. | Diff report output on 1000 legacy records. |
| 1.1.5 | Zod schema rejects `formatString` exceeding 128 characters and unknown tokens. | Unit test with 5 invalid format strings. |

### Sprint 1.2 — Format Engine and Validation

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| 1.2.1 | `validateFormat("{PREFIX}-{YYYY}-{MM}-{COUNTER}")` returns `valid = true` with 4 recognized tokens. | Unit test. |
| 1.2.2 | `validateFormat("{INVALID}")` returns `valid = false` with explicit error `"Unknown token: INVALID"`. | Unit test. |
| 1.2.3 | `renderPreview` returns `"INV-2026-04-00042"` given format `{PREFIX}-{YYYY}-{MM}-{COUNTER}`, padding 5, context date 2026-04-28, and current counter 41. | Unit test. |
| 1.2.4 | `consumeNextNumber` atomically increments `SequencePeriod.currentCounter`; concurrent calls within 50ms produce unique `sequenceNumber` values. | Integration test with 10 parallel finalize operations. |
| 1.2.5 | Draft invoice creation leaves `officialNumber = null`, `sequenceId = null`; finalize transition populates both within same transaction. | Integration test: create draft → assert null → finalize → assert non-null. |
| 1.2.6 | Period auto-creation occurs when first invoice of a new month is finalized under `MONTHLY` periodicity. | Integration test: finalize invoice in uncovered month → assert new `SequencePeriod` row. |
| 1.2.7 | `parseContinuitySeed({ prefix: "REC", counter: 99 })` returns `startCounter: 100`, `formatString: "{PREFIX}-{COUNTER}"`, `periodicity: "NONE"`. | Unit test. |

### Sprint 1.3 — Migration Scaffolding

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| 1.3.1 | `migrate-sequences.ts` run twice against same database produces identical end state (idempotent). | Run script twice; assert row counts unchanged on second run. |
| 1.3.2 | Backfill script links 100% of finalized invoices and vouchers to a `Sequence` and `SequencePeriod`; `officialNumber` is non-null for all finalized docs. | Health check script assertion on post-migration DB. |
| 1.3.3 | Backfill script leaves all draft documents unlinked (`sequenceId IS NULL`). | Count query assertion: `COUNT(*) = 0` for drafts with non-null `sequenceId`. |
| 1.3.4 | Health check script exits code `0` with empty `failures` array when run after successful migration and backfill. | CI pipeline step. |
| 1.3.5 | Health check script exits code `1` with at least one `DUPLICATE_OFFICIAL_NUMBER` failure when duplicate is manually injected. | Negative integration test. |
| 1.3.6 | Rolldown migration restores DB to pre-Phase-1 state: new tables dropped, `officialNumber` nullable remains but functionality returns to legacy `number`. | Run down migration; verify legacy numbering produces correct `number` values. |

---

## 8. Risk Register for Early Implementation

| Risk ID | Description | Probability | Impact | Mitigation Strategy | Watchout |
|---------|-------------|-------------|--------|---------------------|----------|
| R1 | **Legacy counter mismatch:** Legacy `OrgDefaults.counter` does not reflect actual highest used number due to deletions or manual edits, causing collision or gap on migration. | Medium | High | Seed parser sets `startCounter = legacyCounter + 1`; health check validates `MAX(sequenceNumber)` against `currentCounter`. Flag mismatches for manual review. | Do not blindly trust legacy counter; sample 10 orgs before migration. |
| R2 | **Null officialNumber breaks downstream reports:** Existing BI tools or exports assume `officialNumber` (or legacy `number`) is always present. | Medium | High | Preserve legacy `number` column; keep dual-write active. Update reports to `COALESCE(officialNumber, number)` in Phase 1.5. | Monitor error logs for 48 hours post-deploy. |
| R3 | **Counter gap under concurrency:** Two finalize operations read same counter before either writes, causing duplicate sequence numbers. | Low | Critical | Use database row-level `SELECT ... FOR UPDATE` on `SequencePeriod` inside transaction. Validate with load test. | Never read counter outside transaction during consumption. |
| R4 | **Period boundary race:** Document dated 2026-03-31 finalizes at 23:59:59 UTC while another dated 2026-04-01 finalizes simultaneously; period auto-creation may duplicate. | Low | Medium | Upsert period with unique index on `(sequenceId, startDate, endDate)`; retry on unique violation. | Include `startDate` + `endDate` in unique constraint, not just month number. |
| R5 | **Migration performance on large orgs:** Org with >500k finalized invoices causes backfill script to timeout or lock table. | Medium | High | Batch size 500; process org-by-org; run during low-traffic window; use `READ COMMITTED` isolation to reduce lock hold time. | Test backfill against 1M-row clone before production. |
| R6 | **Feature flag leakage:** Developers forget to gate new code; draft UI or API starts consuming numbers prematurely. | Medium | Medium | Centralize all engine calls in `src/lib/docs/numbering.ts`; code review checklist mandates flag check. | Lint rule: direct imports of `sequence-engine.ts` outside lifecycle/services trigger warning. |
| R7 | **Inferred format correctness:** Heuristic continuity parser misidentifies date tokens, producing `INV-2026-0042` → `{PREFIX}-{YYYY}-{COUNTER}` when org intended `{PREFIX}-{COUNTER}` with coincidental year in prefix. | Low | Medium | Mark inferred formats with `reviewRequired: true`; admin dashboard lists inferred formats for confirmation (read-only in Phase 1, manual SQL fix). | Log every inferred format; do not auto-apply periodicity inference without 3-sample validation. |

---

## 9. Interface Contracts (Conceptual)

### Schema Layer → Engine Layer

The Prisma / repository layer must expose the following shapes to the engine:

```typescript
interface SequenceConfig {
  sequenceId: string;
  orgId: string;
  documentType: 'INVOICE' | 'VOUCHER';
  periodicity: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  defaultFormat: {
    formatString: string;
    startCounter: number;
    counterPadding: number;
  };
}

interface PeriodContext {
  periodId: string;
  sequenceId: string;
  startDate: Date;
  endDate: Date;
  currentCounter: number; // last consumed counter
}
```

- Schema layer guarantees that `defaultFormat` is non-null when `SequenceConfig` is fetched.
- Schema layer guarantees atomic increment of `PeriodContext.currentCounter` via Prisma transaction or raw `UPDATE ... RETURNING`.

### Engine Layer → Lifecycle Layer

The engine layer must expose the following operations to document lifecycle services:

```typescript
interface SequenceEngineApi {
  /**
   * Generate the next official number and consume the counter atomically.
   * Must be called inside the finalize transaction.
   */
  consume(params: {
    sequenceId: string;
    documentDate: Date;
    orgId: string;
    tx: PrismaTransaction; // injected transaction client
  }): Promise<{
    officialNumber: string;
    sequenceNumber: number;
    periodId: string;
  }>;

  /**
   * Preview the next number without side effects.
   */
  preview(params: {
    sequenceId: string;
    documentDate: Date;
    orgId: string;
  }): Promise<{
    preview: string;
    nextCounter: number;
    periodId: string | null;
  }>;
}
```

- Lifecycle layer **must** pass the same `tx` transaction client into `consume` to ensure finalize and number assignment are atomic.
- Lifecycle layer **must not** call `consume` for drafts; only finalize transition invokes it.
- Engine layer **must** throw `SequenceExhaustionError` if counter exceeds safe integer bounds (not expected in Phase 1, but contract requires explicit error type).

---

## 10. Testing Strategy for Phase 1

### Unit Tests

| Target | Scope | Coverage Goal |
|--------|-------|---------------|
| `tokenizer.ts` | Token parsing, unknown token rejection, brace balancing, escape handling. | 100% branch coverage. |
| `renderer.ts` | Substitution logic, zero-padding, mixed literal + token strings, date formatting edge cases (leap year, month 12). | 100% branch coverage. |
| `periodicity.ts` | Boundary calculation for MONTHLY / QUARTERLY / YEARLY / NONE; leap-year quarter boundaries. | All periodicity variants. |
| `continuity.ts` | Legacy pattern inference for flat prefix, prefix+date, prefix+counter+suffix. | 100% branch coverage. |

### Integration Tests

| Target | Setup | Assertion |
|--------|-------|-----------|
| Draft → Finalize flow | Create org, sequence, format; create draft invoice; call finalize service. | `officialNumber` matches regex from format; `sequenceNumber` incremented; `periodId` set. |
| Concurrent finalization | 10 parallel finalize calls for same org/sequence. | All `officialNumber` values unique; no duplicate `sequenceNumber` within same period. |
| Period auto-creation | Finalize invoice with document date in month lacking a period. | New `SequencePeriod` row created; `currentCounter = startCounter` after first finalize. |
| Feature flag fallback | Set `SEQUENCE_PHASE1 = false`; create and finalize invoice. | `officialNumber` remains null; legacy `number` populated as before Phase 1. |

### Migration Tests

| Target | Setup | Assertion |
|--------|-------|-----------|
| Idempotency | Run `migrate-sequences.ts` twice on clone with 50 orgs. | Second run creates zero new rows; returns success. |
| Backfill completeness | Clone with 10k finalized invoices, 2k drafts. | After backfill: 10k linked finalized, 2k unlinked drafts. |
| Health check accuracy | Inject 5 duplicate official numbers manually. | Health check reports exactly 5 `DUPLICATE_OFFICIAL_NUMBER` failures. |

### Test Data Requirements

- Anonymized production clone ≥ 100k documents for migration performance validation.
- Synthetic org with `MONTHLY` periodicity and 24 historical periods to validate period boundary logic.

---

## 11. Handoff Criteria to Phase 2

Phase 1 is considered complete when **all** of the following are true:

| # | Criterion | Verification Method |
|---|-----------|---------------------|
| 1 | All Sprint 1.1, 1.2, and 1.3 acceptance criteria pass in staging and production environments. | CI test reports + manual QA sign-off. |
| 2 | Health check script reports zero unlinked finalized invoices and zero unlinked finalized vouchers across all production orgs. | Run `check-sequence-health.ts` in production; attach JSON output to handoff doc. |
| 3 | Zero P1/P2 incidents related to numbering, counter duplication, or official number assignment for 7 consecutive days post-deploy. | Incident tracker query. |
| 4 | Feature flag `SEQUENCE_PHASE1` has been enabled for 100% of orgs for at least 72 hours without rollback. | Feature flag dashboard screenshot. |
| 5 | Performance benchmark: `consumeNextNumber` p99 latency < 100ms under 50 concurrent finalize operations. | K6 or Artillery load test report attached. |
| 6 | Rollback procedure (feature flag + down-migration) has been tested successfully in staging within 7 days of handoff. | Staging rollback runbook executed and signed off by SRE. |
| 7 | Engineering documentation updated: `src/features/sequences/README.md` exists describing engine architecture, token reference, and migration runbook. | Doc review by tech lead. |
| 8 | Database migration history is linear; no manual SQL edits applied outside Prisma migrations. | `prisma migrate status` clean output. |

---

**End of Phase 1 Readiness Package**
