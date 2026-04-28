# Phase 1 Readiness Package — Document Sequencing Platform

**Workstream:** C (Lifecycle Integration)  
**Release Scope:** Invoices + Vouchers only. Vendor bills explicitly excluded.  
**Legacy Baseline:** `src/lib/docs/numbering.ts` — OrgDefaults-driven `PREFIX-COUNTER` generation. Numbers are consumed at **create-time** (too early).  
**Target State:** Token-based format engine, periodicity-aware counters, sequence-linked documents. Lifecycle cutover (issue-time / approval-time numbering) happens in **Phase 4 and Phase 5**, not Phase 1.

---

## 1. Phase 1 Scope Boundary

Phase 1 builds the domain foundation. It does NOT change when invoice/voucher numbers are assigned. That cutover happens later.

| In Scope | Out of Scope |
|----------|--------------|
| Schema foundation: NEW `Sequence`, `SequenceFormat`, `SequencePeriod` models; NEW `sequenceId`, `sequencePeriodId`, `sequenceNumber` fields on existing `Invoice` and `Voucher` tables. | Vendor bill sequencing entirely — no schema changes, no engine calls, no migration for vendor bills. |
| Token-based format engine with `{PREFIX}`, `{YYYY}`, `{MM}`, `{DD}`, `{NNNNN}`, `{FY}` tokens and periodicity (`NONE`, `MONTHLY`, `YEARLY`, `FINANCIAL_YEAR`). | UI configuration panels for sequence management; admin format builder widgets. |
| Migration scaffolding: idempotent legacy OrgDefaults → Sequence mapping; backfill of `sequenceId` / `sequencePeriodId` / `sequenceNumber` on existing finalized invoices and vouchers. | Lifecycle integration: draft nullability, issue-time numbering, approval-time numbering. That is Phase 4–5. |
| Preview algorithm for next-number rendering without counter consumption. | Real-time collaborative numbering locks; distributed counter sharding beyond row-level DB locking. |
| Continuity seed parser to derive initial format strings and counter seeds from legacy `PREFIX-COUNTER` patterns. | Cross-org sequence templates; multi-currency sequence isolation; audit trail table for sequence history. |
| Health checks and rollback plan for migration scripts. | Public API endpoints for external sequence consumption; webhook emissions on sequence rollover. |

**Repo-grounded note:** The existing `Invoice.invoiceNumber` and `Voucher.voucherNumber` fields remain non-nullable and continue to be populated at create-time by `src/lib/docs/numbering.ts` throughout Phase 1. Phase 1 only adds NEW linkage fields. The plan to make numbers nullable and assign them at finalization is documented in the PRD for Phase 4 (invoices) and Phase 5 (vouchers).

---

## 2. Sprint 1.1 Readiness Checklist — Schema Foundation

### 2.1 Schema Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| 1 | Add NEW `Sequence` model with `id`, `organizationId`, `name`, `documentType` (`INVOICE` \| `VOUCHER`), `periodicity`, `isActive`, `createdAt`, `updatedAt`. | One sequence per document type per org; enables future multi-sequence per type. | Pending |
| 2 | Add NEW `SequenceFormat` model with `id`, `sequenceId`, `formatString`, `startCounter`, `isDefault`, `createdAt`. | Supports multiple formats per sequence; default format drives auto-assignment. | Pending |
| 3 | Add NEW `SequencePeriod` model with `id`, `sequenceId`, `startDate`, `endDate`, `currentCounter`, `status` (`OPEN` \| `CLOSED`). | Periodicity requires explicit period buckets to isolate counters. | Pending |
| 4 | Add NEW nullable `sequenceId` (String, FK to Sequence) on `Invoice` and `Voucher`. | Links finalized documents to their generating sequence. | Pending |
| 5 | Add NEW nullable `sequencePeriodId` (String, FK to SequencePeriod) on `Invoice` and `Voucher`. | Links finalized documents to their generating period. | Pending |
| 6 | Add NEW nullable `sequenceNumber` (Int) on `Invoice` and `Voucher`. | Stores the raw integer counter value used in the token render. | Pending |
| 7 | Preserve existing `Invoice.invoiceNumber` and `Voucher.voucherNumber` columns unchanged. | Legacy compatibility: downstream code continues working; lifecycle cutover is Phase 4–5. | Pending |
| 8 | Add `@unique([organizationId, documentType, sequenceNumber, sequencePeriodId])` or equivalent partial index to prevent duplicate sequence numbers within a period. | Prevents duplicate sequence numbers per org/period without blocking null drafts. | Pending |

**Important:** Do NOT make `invoiceNumber` or `voucherNumber` nullable in Phase 1. They are still populated at create-time by the legacy numbering path. The shift to finalization-time assignment is a Phase 4–5 concern.

### 2.2 Model Definitions (Conceptual)

- **Sequence:** Owns the periodicity policy and activation state. Linked to org. Document type enum restricted to `INVOICE`, `VOUCHER`.
- **SequenceFormat:** Owns the `formatString` (max 128 chars) and `startCounter` (default 1). One `isDefault = true` per sequence enforced at application layer.
- **SequencePeriod:** Owns `currentCounter` (incremented atomically). Period boundaries computed from periodicity + document date.
- **Invoice / Voucher:** NEW `sequenceId`, `sequencePeriodId`, `sequenceNumber` are nullable. Existing `invoiceNumber` / `voucherNumber` remain populated by legacy `src/lib/docs/numbering.ts`.

### 2.3 Legacy Compatibility Plan

| Aspect | Action | Owner |
|--------|--------|-------|
| Column preservation | Do not drop or alter `invoiceNumber` / `voucherNumber`. Legacy `src/lib/docs/numbering.ts` continues populating them at create-time unchanged. | Workstream A |
| Dual-readiness | Feature flag `SEQUENCE_PHASE1 = false` means: new sequence tables exist but invoice/voucher creation still uses legacy numbering; new linkage fields remain null. | Workstream C |
| Report compatibility | All existing views/queries selecting `invoiceNumber` / `voucherNumber` remain unchanged. No `COALESCE` needed yet. | Workstream D |
| Index safety | New partial unique indexes must not conflict with legacy data where `sequenceNumber` is null. Migration must backfill before index creation. | Workstream A |

### 2.4 Exact Files Expected to Change

| File | Change Type | Sprint |
|------|-------------|--------|
| `prisma/schema.prisma` | Add NEW models; add NEW nullable fields to `Invoice`, `Voucher`; add enums. | 1.1 |
| `prisma/migrations/*/migration.sql` | Generate and review SQL for new tables, new nullable columns, partial indexes. | 1.1 |
| `src/features/sequences/types.ts` | TypeScript domain types mirroring Prisma additions. | 1.1 |
| `src/features/sequences/schema.ts` | Zod validation schemas for sequence/format/period inputs. | 1.1 |
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
| `{NNNNN}` | Incrementing integer, zero-padded per format config. | `startCounter >= 1`; pad width 1–6. | `00042` |
| `{FY}` | Financial year label (e.g., FY25-26). | Derived from org fiscal year config. | `FY25-26` |

- **Format string max length:** 128 characters.
- **Exactly one running number token required:** `{NNNNN}` (or variant with different pad width).
- **Counter padding:** Defined per `SequenceFormat.counterPadding` (default 5).

### 3.2 Periodicity Rules

| Periodicity | Period Boundary Calculation | Period Auto-Creation |
|-------------|----------------------------|----------------------|
| `NONE` | Single implicit period `1970-01-01` to `2999-12-31`; `currentCounter` lives on `Sequence` directly or a single eternal period row. | N/A — create one eternal period at sequence creation. |
| `MONTHLY` | Start = 1st of document month; End = last day of document month. | Auto-create on first document finalize in uncovered month. |
| `YEARLY` | Start = Jan 1; End = Dec 31. | Auto-create on first document finalize in uncovered year. |
| `FINANCIAL_YEAR` | Start = org fiscal year start; End = org fiscal year end. | Auto-create on first document finalize in uncovered fiscal year. |

- **Period close policy:** Periods remain `OPEN` indefinitely in Phase 1. No manual close.
- **Cross-period gap:** Missing periods are created lazily; no retroactive period backfill required.

### 3.3 Preview Algorithm

```
renderPreview(formatString, context):
  1. Validate formatString syntax (balanced braces, known tokens, exactly one running number).
  2. Lookup SequenceFormat by formatString or formatId.
  3. Determine period from context.documentDate + sequence.periodicity.
  4. Read period.currentCounter (non-locking read).
  5. Render each token: {NNNNN} uses currentCounter + 1 with padding.
  6. Return { preview: string, nextCounter: number, periodId: string }.
```

- Preview must **never** increment counters.
- Preview must return the next generated number as a string.
- If period does not exist, preview assumes period will be auto-created and uses `startCounter`.

### 3.4 Continuity Seed Parser

```
parseContinuitySeed(legacyOrgDefaults):
  Input:  { invoicePrefix: "INV", invoiceCounter: 42 }
  Output: { formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 43,
            counterPadding: 5,
            periodicity: "YEARLY" }
```

- Seed parser runs exclusively during Sprint 1.3 migration.
- Default format for invoices: `INV/{YYYY}/{NNNNN}`
- Default format for vouchers: `VCH/{YYYY}/{NNNNN}`
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
  }): Promise<{ formattedNumber: string; sequenceNumber: number; periodId: string }>;
}
```

**Note:** `consumeNextNumber` is built in Phase 1 but NOT wired into invoice/voucher lifecycle yet. That wiring happens in Phase 4 (invoices) and Phase 5 (vouchers).

### 3.6 Exact Files Expected to Change

| File | Change Type | Sprint |
|------|-------------|--------|
| `src/features/sequences/engine/tokenizer.ts` | Token lexing, validation, reserved-char checks. | 1.2 |
| `src/features/sequences/engine/renderer.ts` | String substitution, zero-padding, context injection. | 1.2 |
| `src/features/sequences/engine/periodicity.ts` | Period boundary math, period lookup/creation. | 1.2 |
| `src/features/sequences/engine/preview.ts` | Non-locking preview orchestration. | 1.2 |
| `src/features/sequences/engine/continuity.ts` | Legacy pattern → format string inference. | 1.2 |
| `src/features/sequences/services/sequence-engine.ts` | Combines tokenizer + renderer + periodicity + DB transaction. | 1.2 |

**Out of scope for Sprint 1.2:** `src/lib/docs/numbering.ts` changes, invoice/voucher lifecycle hooks, finalize-time assignment. Those are Phase 4–5.

---

## 4. Sprint 1.3 Readiness Checklist — Migration Scaffolding

### 4.1 Migration Script Design

| Step | Action | Idempotency Rule |
|------|--------|------------------|
| 1 | Read all `OrgDefaults` rows where `invoicePrefix` / `voucherPrefix` exist. | Skip if `Sequence` already exists for `(organizationId, documentType)`. |
| 2 | Parse legacy pattern via continuity seed parser. | Log `inferred: true` if heuristic used. |
| 3 | Create `Sequence` + default `SequenceFormat` + initial `SequencePeriod` (if periodicity != `NONE`). | Use `upsert` or existence check to prevent duplicates. |
| 4 | Seed `SequencePeriod.currentCounter` to `startCounter` (legacy counter represents last used, so start = legacy + 1). | If period exists and counter > startCounter, abort and log conflict. |

### 4.2 Backfill Strategy

Backfill means populating the NEW `sequenceId`, `sequencePeriodId`, `sequenceNumber` fields on existing `Invoice` and `Voucher` rows.

| Document State | Action | Rationale |
|----------------|--------|-----------|
| `status = ISSUED` (invoices) or `status = approved` (vouchers) | Link to inferred period; generate `sequenceNumber` using engine at backfill time; preserve existing `invoiceNumber` / `voucherNumber`. | Finalized docs must have sequence linkage for future resequencing and audit. |
| `status = DRAFT` (invoices) or `status = draft` (vouchers) | Do **not** link; leave `sequenceId = null`, `sequencePeriodId = null`, `sequenceNumber = null`. | Drafts receive numbers only at finalize; pre-linking creates orphan risk. |
| Cancelled / Void | Link if previously ISSUED/approved; skip if never finalized. | Consistency with finalized subset. |

- **Batch size:** 500 documents per transaction to avoid long locks.
- **Ordering:** Backfill by `createdAt ASC` within each org to respect chronological counter order.
- **Conflict resolution:** If generated `sequenceNumber` collides with existing data (rare), log collision and use manual override flag.

### 4.3 Health Check Design

| Check | Query Target | Failure Threshold | Action on Failure |
|-------|-------------|-------------------|-------------------|
| Unlinked finalized docs | `COUNT(*) FROM Invoice WHERE status='ISSUED' AND sequenceId IS NULL` | > 0 | Alert; re-run backfill script for document type. |
| Sequences without default format | `COUNT(*) FROM Sequence WHERE NOT EXISTS (SELECT 1 FROM SequenceFormat WHERE sequenceId = Sequence.id AND isDefault = true)` | > 0 | Alert; create default format from legacy fallback. |
| Duplicate sequence numbers per org/period | `SELECT organizationId, sequencePeriodId, sequenceNumber, COUNT(*) FROM Invoice WHERE sequenceNumber IS NOT NULL GROUP BY organizationId, sequencePeriodId, sequenceNumber HAVING COUNT(*) > 1` | > 0 rows | P1 incident; halt rollout; run deduplication script. |
| Counter gaps (heuristic) | Compare `MAX(sequenceNumber)` per period against `currentCounter` — gap > 1 warrants investigation. | > 10 gaps per org | Log warning; do not block rollout (gaps may be legitimate deletions). |
| Legacy numbering still active | `COUNT(*) FROM Invoice WHERE updatedAt > migration_start AND sequenceId IS NULL AND status = 'ISSUED'` | > 0 | Indicates feature flag misconfiguration or bypass. |

### 4.4 Rollback Plan

| Layer | Rollback Action | Recovery Time Objective |
|-------|-----------------|------------------------|
| Database | Down-migration drops new tables and columns (`sequenceId`, `sequencePeriodId`, `sequenceNumber`). Existing `invoiceNumber` / `voucherNumber` remain untouched. | < 15 minutes with DBA assist. |
| Application | Set `SEQUENCE_PHASE1 = false` in feature flag store; restart app servers. | < 5 minutes. |
| Data | New linkage fields are nullable; dropping them is safe. Existing `invoiceNumber` / `voucherNumber` are untouched. No data loss. | N/A — additive-only strategy prevents loss. |

### 4.5 Exact Files Expected to Change

| File | Change Type | Sprint |
|------|-------------|--------|
| `scripts/migrate-sequences.ts` | Idempotent OrgDefaults → Sequence migration. | 1.3 |
| `scripts/backfill-document-sequences.ts` | Link finalized invoices/vouchers; assign sequence numbers. | 1.3 |
| `scripts/check-sequence-health.ts` | Run all health checks; output JSON report. | 1.3 |
| `src/features/sequences/migrations/legacy-mapper.ts` | Map OrgDefaults schema to Sequence models. | 1.3 |
| `src/features/sequences/migrations/continuity-seed.ts` | Re-use engine continuity parser for migration-time inference. | 1.3 |
| `prisma/migrations/*/migration.sql` | Final verified migration after dry-run. | 1.3 |

---

## 5. Cross-Sprint Dependency Map

| Dependency | Provider | Consumer | Hard or Soft | Blocking Reason |
|------------|----------|----------|--------------|-----------------|
| Prisma schema with `Sequence`, `SequencePeriod`, `SequenceFormat` tables | Sprint 1.1 | Sprint 1.2 | **Hard** | Engine queries require tables and relations to exist. |
| New linkage fields (`sequenceId`, `sequencePeriodId`, `sequenceNumber`) on `Invoice` / `Voucher` | Sprint 1.1 | Sprint 1.3 | **Hard** | Backfill script must write into these columns. |
| Feature flag `SEQUENCE_PHASE1` | Sprint 1.1 | Sprint 1.3 | Soft | Sprint 1.3 can develop behind flag, but flag wiring should exist first. |
| Token-based format engine (`renderPreview`, `consumeNextNumber`) | Sprint 1.2 | Sprint 1.3 | **Hard** | Backfill script calls engine to generate sequence numbers for finalized docs. |
| Continuity seed parser | Sprint 1.2 | Sprint 1.3 | **Hard** | Migration script uses parser to derive format strings from legacy OrgDefaults. |
| Periodicity and period auto-creation logic | Sprint 1.2 | Sprint 1.3 | **Hard** | Backfill must infer/create correct periods based on document dates. |
| Zod schemas / domain types | Sprint 1.1 | Sprint 1.2 | Soft | Sprint 1.2 can define local types temporarily, but convergence required before merge. |

**Not a dependency in Phase 1:** Invoice/voucher lifecycle hooks. The engine is built in isolation. Lifecycle integration (when to call `consumeNextNumber`) is Phase 4–5 work.

---

## 6. Implementation Order Within Each Sprint

### Sprint 1.1 Recommended File Order

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `prisma/schema.prisma` | All downstream code depends on the data model. |
| 2 | `src/features/sequences/types.ts` | Type contracts unblock parallel engine work. |
| 3 | `src/features/sequences/schema.ts` | Validation contracts prevent invalid test data. |
| 4 | `src/lib/constants/feature-flags.ts` | Flag must exist before conditional logic is added. |
| 5 | `prisma/migrations/*/migration.sql` | Generate only after schema is reviewed; run in staging first. |

### Sprint 1.2 Recommended File Order

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `src/features/sequences/engine/tokenizer.ts` | Foundation for all format operations. |
| 2 | `src/features/sequences/engine/renderer.ts` | Depends on tokenizer output; pure function, easily testable. |
| 3 | `src/features/sequences/engine/periodicity.ts` | Period math is independent of rendering; can parallelize with 1–2. |
| 4 | `src/features/sequences/engine/preview.ts` | Orchestrates renderer + periodicity without DB writes. |
| 5 | `src/features/sequences/engine/continuity.ts` | Independent utility; can parallelize with 1–4. |
| 6 | `src/features/sequences/services/sequence-engine.ts` | Integrates engine modules with atomic DB transactions. |

### Sprint 1.3 Recommended File Order

| Order | File | Rationale |
|-------|------|-----------|
| 1 | `src/features/sequences/migrations/continuity-seed.ts` | Re-use engine parser; define migration-specific seed logic. |
| 2 | `src/features/sequences/migrations/legacy-mapper.ts` | Maps OrgDefaults to sequence model shape; depends on seed parser. |
| 3 | `scripts/migrate-sequences.ts` | Create sequences first; backfill cannot run without sequence rows. |
| 4 | `scripts/backfill-document-sequences.ts` | Consumes sequences; assigns sequence numbers via engine. |
| 5 | `scripts/check-sequence-health.ts` | Validates output of steps 3–4. |
| 6 | `prisma/migrations/*/migration.sql` | Final migration applied after scripts are verified in staging. |

---

## 7. Acceptance Criteria Per Sprint

### Sprint 1.1 — Schema Foundation

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| 1.1.1 | `prisma migrate dev` generates zero errors; migration applies cleanly to a staging DB snapshot. | Run migration against anonymized production clone. |
| 1.1.2 | `Sequence`, `SequenceFormat`, `SequencePeriod` tables are queryable via Prisma client; relations resolve correctly. | Prisma query unit test: create org → sequence → format → period chain. |
| 1.1.3 | `Invoice` and `Voucher` tables accept null in NEW `sequenceId`, `sequencePeriodId`, `sequenceNumber` without violating existing unique constraints. | Insert records with linkage fields = null in integration test. |
| 1.1.4 | Existing `invoiceNumber` / `voucherNumber` remain populated when `SEQUENCE_PHASE1 = false`; existing reports return identical results before/after deploy. | Diff report output on 1000 legacy records. |
| 1.1.5 | Zod schema rejects `formatString` exceeding 128 characters and unknown tokens. | Unit test with 5 invalid format strings. |

### Sprint 1.2 — Format Engine and Validation

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| 1.2.1 | `validateFormat("INV/{YYYY}/{NNNNN}")` returns `valid = true` with 3 recognized tokens. | Unit test. |
| 1.2.2 | `validateFormat("{INVALID}")` returns `valid = false` with explicit error `"Unknown token: INVALID"`. | Unit test. |
| 1.2.3 | `renderPreview` returns `"INV/2026/00042"` given format `INV/{YYYY}/{NNNNN}`, padding 5, context date 2026-04-28, and current counter 41. | Unit test. |
| 1.2.4 | `consumeNextNumber` atomically increments `SequencePeriod.currentCounter`; concurrent calls within 50ms produce unique `sequenceNumber` values. | Integration test with 10 parallel calls. |
| 1.2.5 | Period auto-creation occurs when first consumption of a new month happens under `MONTHLY` periodicity. | Integration test: consume in uncovered month → assert new `SequencePeriod` row. |
| 1.2.6 | `parseContinuitySeed({ prefix: "REC", counter: 99 })` returns `startCounter: 100`, `formatString: "REC/{YYYY}/{NNNNN}"`, `periodicity: "YEARLY"`. | Unit test. |

### Sprint 1.3 — Migration Scaffolding

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| 1.3.1 | `migrate-sequences.ts` run twice against same database produces identical end state (idempotent). | Run script twice; assert row counts unchanged on second run. |
| 1.3.2 | Backfill script links 100% of ISSUED invoices and approved vouchers to a `Sequence` and `SequencePeriod`; `sequenceNumber` is non-null for all finalized docs. | Health check script assertion on post-migration DB. |
| 1.3.3 | Backfill script leaves all draft documents unlinked (`sequenceId IS NULL`). | Count query assertion: `COUNT(*) = 0` for drafts with non-null `sequenceId`. |
| 1.3.4 | Health check script exits code `0` with empty `failures` array when run after successful migration and backfill. | CI pipeline step. |
| 1.3.5 | Health check script exits code `1` with at least one `DUPLICATE_SEQUENCE_NUMBER` failure when duplicate is manually injected. | Negative integration test. |
| 1.3.6 | Rolldown migration restores DB to pre-Phase-1 state: new tables and columns dropped; `invoiceNumber` / `voucherNumber` untouched. | Run down migration; verify legacy numbering produces correct values. |

---

## 8. Risk Register for Early Implementation

| Risk ID | Description | Probability | Impact | Mitigation Strategy | Watchout |
|---------|-------------|-------------|--------|---------------------|----------|
| R1 | **Legacy counter mismatch:** Legacy `OrgDefaults.counter` does not reflect actual highest used number due to deletions or manual edits, causing collision or gap on migration. | Medium | High | Seed parser sets `startCounter = legacyCounter + 1`; health check validates `MAX(sequenceNumber)` against `currentCounter`. Flag mismatches for manual review. | Do not blindly trust legacy counter; sample 10 orgs before migration. |
| R2 | **Null linkage fields break downstream reports:** Existing BI tools or exports may reference new columns before they are populated. | Low | Medium | New columns are nullable and additive; no existing query references them. Reports migrate to use them explicitly in Phase 4+. | Monitor error logs for 48 hours post-deploy. |
| R3 | **Counter gap under concurrency:** Two consumption calls read same counter before either writes, causing duplicate sequence numbers. | Low | Critical | Use database row-level `SELECT ... FOR UPDATE` on `SequencePeriod` inside transaction. Validate with load test. | Never read counter outside transaction during consumption. |
| R4 | **Period boundary race:** Document dated 2026-03-31 consumed at 23:59:59 UTC while another dated 2026-04-01 consumed simultaneously; period auto-creation may duplicate. | Low | Medium | Upsert period with unique index on `(sequenceId, startDate, endDate)`; retry on unique violation. | Include `startDate` + `endDate` in unique constraint, not just month number. |
| R5 | **Migration performance on large orgs:** Org with >500k finalized invoices causes backfill script to timeout or lock table. | Medium | High | Batch size 500; process org-by-org; run during low-traffic window; use `READ COMMITTED` isolation to reduce lock hold time. | Test backfill against 1M-row clone before production. |
| R6 | **Feature flag leakage:** Developers forget to gate new code; draft UI or API starts consuming numbers prematurely. | Medium | Medium | Centralize all engine calls in `src/features/sequences/services/sequence-engine.ts`; code review checklist mandates flag check. | Lint rule: direct imports of engine outside services trigger warning. |
| R7 | **Inferred format correctness:** Heuristic continuity parser misidentifies date tokens, producing `INV-2026-0042` → `INV/{YYYY}/{NNNNN}` when org intended `INV/{NNNNN}` with coincidental year in prefix. | Low | Medium | Mark inferred formats with `reviewRequired: true`; admin dashboard lists inferred formats for confirmation (read-only in Phase 1, manual SQL fix). | Log every inferred format; do not auto-apply periodicity inference without 3-sample validation. |

---

## 9. Interface Contracts (Conceptual)

### Schema Layer → Engine Layer

The Prisma / repository layer must expose the following shapes to the engine:

```typescript
interface SequenceConfig {
  sequenceId: string;
  orgId: string;
  documentType: 'INVOICE' | 'VOUCHER';
  periodicity: 'NONE' | 'MONTHLY' | 'YEARLY' | 'FINANCIAL_YEAR';
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

### Engine Layer → Lifecycle Layer (Future Phase 4–5)

The engine layer must expose the following operations. These are built in Phase 1 but consumed in Phase 4–5:

```typescript
interface SequenceEngineApi {
  /**
   * Generate the next sequence number and consume the counter atomically.
   * Must be called inside the finalize transaction.
   */
  consume(params: {
    sequenceId: string;
    documentDate: Date;
    orgId: string;
    tx: PrismaTransaction; // injected transaction client
  }): Promise<{
    formattedNumber: string;
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
- Engine layer **must** throw `SequenceExhaustionError` if counter exceeds safe integer bounds.

**Phase 1 boundary:** No invoice or voucher lifecycle code calls these methods yet. They are built and unit-tested in isolation.

---

## 10. Testing Strategy for Phase 1

### Unit Tests

| Target | Scope | Coverage Goal |
|--------|-------|---------------|
| `tokenizer.ts` | Token parsing, unknown token rejection, brace balancing. | 100% branch coverage. |
| `renderer.ts` | Substitution logic, zero-padding, mixed literal + token strings, date formatting edge cases (leap year, month 12). | 100% branch coverage. |
| `periodicity.ts` | Boundary calculation for MONTHLY / YEARLY / FINANCIAL_YEAR / NONE; leap-year boundaries. | All periodicity variants. |
| `continuity.ts` | Legacy pattern inference for flat prefix, prefix+date, prefix+counter+suffix. | 100% branch coverage. |

### Integration Tests

| Target | Setup | Assertion |
|--------|-------|-----------|
| Consume flow | Create org, sequence, format; call consume directly (no lifecycle). | `formattedNumber` matches regex from format; `sequenceNumber` incremented; `periodId` set. |
| Concurrent consumption | 10 parallel consume calls for same org/sequence. | All `sequenceNumber` values unique; no duplicate within same period. |
| Period auto-creation | Consume with document date in month lacking a period. | New `SequencePeriod` row created; `currentCounter = startCounter` after first consume. |

### Migration Tests

| Target | Setup | Assertion |
|--------|-------|-----------|
| Idempotency | Run `migrate-sequences.ts` twice on clone with 50 orgs. | Second run creates zero new rows; returns success. |
| Backfill completeness | Clone with 10k finalized invoices, 2k drafts. | After backfill: 10k linked finalized, 2k unlinked drafts. |
| Health check accuracy | Inject 5 duplicate sequence numbers manually. | Health check reports exactly 5 `DUPLICATE_SEQUENCE_NUMBER` failures. |

### Test Data Requirements

- Anonymized production clone ≥ 100k documents for migration performance validation.
- Synthetic org with `MONTHLY` periodicity and 24 historical periods to validate period boundary logic.

---

## 11. Handoff Criteria to Phase 2

Phase 1 is considered complete when **all** of the following are true:

| # | Criterion | Verification Method |
|---|-----------|---------------------|
| 1 | All Sprint 1.1, 1.2, and 1.3 acceptance criteria pass in staging. | CI test reports + manual QA sign-off. |
| 2 | Health check script reports zero unlinked ISSUED invoices and zero unlinked approved vouchers across all staging orgs. | Run `check-sequence-health.ts` in staging; attach JSON output to handoff doc. |
| 3 | Zero P1/P2 incidents related to sequence table creation or migration for 7 consecutive days post-deploy. | Incident tracker query. |
| 4 | Feature flag `SEQUENCE_PHASE1` has been present in codebase for at least 72 hours without rollback. | Feature flag dashboard screenshot. |
| 5 | Performance benchmark: `consumeNextNumber` p99 latency < 100ms under 50 concurrent calls. | K6 or Artillery load test report attached. |
| 6 | Rollback procedure (feature flag + down-migration) has been tested successfully in staging within 7 days of handoff. | Staging rollback runbook executed and signed off. |
| 7 | Engineering documentation updated: `src/features/sequences/README.md` exists describing engine architecture, token reference, and migration runbook. | Doc review by tech lead. |
| 8 | Database migration history is linear; no manual SQL edits applied outside Prisma migrations. | `prisma migrate status` clean output. |

---

**End of Phase 1 Readiness Package**
