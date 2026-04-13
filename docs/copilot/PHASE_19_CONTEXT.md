# Slipwise One — Phase 19 Engineering Context

> **Last updated:** 2026-04-14  
> **Author:** Antigravity (engineering session)  
> **Phase:** 19 — SW Docs Control Plane + Unified Document Vault + Template Governance

---

## 1. Project State

### Completed Phases
| Phase | Theme | Status |
|---|---|---|
| 1–16 | Core platform, auth, docs, pay, intel, books | ✅ Complete |
| 17 | Workflow Engine + Flow | ✅ Complete |
| 18 | SW Intel Operational Analytics + Hardening | ✅ Complete + Stabilized |
| **19** | SW Docs Control Plane + Vault + Template Governance | 🔄 In progress |

### Current Branch Layout
```
main
└── feature/phase-19            ← parent branch for all Phase 19 work
    ├── feature/phase-19.1      ← Sprint 19.1 (MERGED into parent via PR #89)
    └── feature/phase-19.2      ← Sprint 19.2 (MERGED into parent via PR #90)
```

### Open PRs
| PR | Branch | Title | Target | Status |
|---|---|---|---|---|
| #89 | `feature/phase-19.1` | feat(phase-19.1): Unified SW Docs Foundation + DocumentIndex Vault | `feature/phase-19` | Open — awaiting review |
| #90 | `feature/phase-19.2` | feat(phase-19.2): Normalized Document Lifecycle Timeline + DocumentEvent | `feature/phase-19` | Open — awaiting review |

---

## 2. Sprint 19.1 — Unified SW Docs Foundation

### Goal
Close the SW Docs operational gap by delivering a true `/app/docs` control surface and a unified `/app/docs/vault` listing all four document types in a normalized, searchable, filterable layer.

### Deliverables

#### Schema
- **`DocumentIndex`** model added to `prisma/schema.prisma`
  - Read-optimised projection/listing layer for all 4 doc types
  - Fields: `orgId`, `docType`, `documentId`, `documentNumber`, `titleOrSummary`, `counterpartyLabel`, `status`, `primaryDate`, `amount`, `currency`, `archivedAt`, `createdAt`, `updatedAt`
  - Unique constraint: `(orgId, docType, documentId)` — enables idempotent upserts
  - Indexes: `orgId+docType`, `orgId+status`, `orgId+archivedAt`, `orgId+primaryDate`
- **Migration:** `prisma/migrations/20260414000001_phase19_sprint1_document_index/migration.sql`

#### Vault Query Library
- **File:** `src/lib/docs-vault.ts`
- `upsertDocumentIndex()` — idempotent sync primitive (used by all 4 sync helpers)
- `syncInvoiceToIndex()`, `syncVoucherToIndex()`, `syncSalarySlipToIndex()`, `syncQuoteToIndex()`
- `queryVault()` — org-scoped query with type/status/archived filters, full-text search, sort, paginate
- `getDocsSummary()` — per-type counts + recent docs feed for the home page

#### Sync Hooks (fire-and-forget `void`)
All 4 existing document action files wired so that the vault index stays current:

| File | Actions wired |
|---|---|
| `src/app/app/docs/invoices/actions.ts` | saveInvoice, updateInvoice, archiveInvoice |
| `src/app/app/docs/vouchers/actions.ts` | saveVoucher, updateVoucher, archiveVoucher |
| `src/app/app/docs/salary-slips/actions.ts` | saveSalarySlip, updateSalarySlip, archiveSalarySlip |
| `src/app/app/docs/quotes/actions.ts` | createQuote, updateQuote, sendQuote, convertQuote, duplicateQuote + new `archiveQuote` |

> **Note:** quotes were elevated to first-class docs. The previously missing `archiveQuote` action was added.

#### UI Pages
- **`src/app/app/docs/page.tsx`** — SW Docs suite home
  - Per-type document counts from `DocumentIndex`
  - Recently updated document feed
  - Quick-action tiles: Vault, Templates, PDF Studio
  - Create shortcuts for all 4 document types

- **`src/app/app/docs/vault/page.tsx`** — Unified Document Vault
  - Type-filter chips (all / invoice / voucher / salary slip / quote)
  - Archived toggle (active / all / archived only)
  - GET-form text search (document number, counterparty, title)
  - Sort controls (updated / created / date / amount)
  - Paginated table with link-to-detail rows
  - Empty state with CTA

- **`src/app/app/docs/vault/actions.ts`** — thin server action wrappers over the vault lib

#### Backfill Script
- **`scripts/backfill-document-index.ts`**
- Idempotent, safe to re-run
- Processes all 4 document types in parallel, 100 records per page
- Run once after migration to seed the vault from existing data

### Tests
- **`src/lib/__tests__/docs-vault.test.ts`** — 26 unit tests
  - upsertDocumentIndex field mapping + defaults
  - queryVault org-scoping, archived filters, search, pagination
  - All 4 sync helpers
  - Quote first-class treatment

### Verification Results
| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ exit 0 |
| Prisma schema validate | ✅ valid |
| Prisma client regenerate | ✅ done |
| Vault unit tests (26) | ✅ all pass |
| Invoice action tests (3) | ✅ all pass |
| e-Way Bill tests (8) | ✅ all pass |
| IRN tests (10) | ✅ all pass |
| Template marketplace tests (10) | ✅ all pass |
| **Total** | **31/31 pass** |

---

## 3. Sprint 19.2 — Lifecycle, Timeline, and State Normalization

### Goal
Normalize lifecycle and event history across all 4 SW Docs document types using an append-only `DocumentEvent` model, and surface consistent timeline UI on all document detail pages.

### Deliverables

#### Schema
- **`DocumentEvent`** model added to `prisma/schema.prisma`
  - Append-only, org-scoped normalized lifecycle/event history
  - Fields: `id`, `orgId`, `docType`, `documentId`, `eventType`, `actorId`, `actorLabel`, `eventAt`, `metadata`
  - Indexes: `(orgId, docType, documentId, eventAt)`, `(orgId, eventType, eventAt)`, `(orgId, docType, eventAt)`
  - Org cascade-delete aligned with all other org-scoped models
- **Migration:** `prisma/migrations/20260414000002_phase19_sprint2_document_events/migration.sql`
- Organization model updated with `documentIndexes[]` and `documentEvents[]` relations

#### Document Events Library
- **File:** `src/lib/document-events.ts`

| Export | Purpose |
|---|---|
| `createDocEvent()` | Core append-only event write |
| `emitInvoiceEvent()` | Invoice-scoped convenience emitter |
| `emitVoucherEvent()` | Voucher-scoped convenience emitter |
| `emitSalarySlipEvent()` | SalarySlip-scoped convenience emitter |
| `emitQuoteEvent()` | Quote-scoped convenience emitter |
| `getDocumentTimeline()` | Org-scoped timeline fetch (ordered ASC by eventAt) |
| `getDocumentTimelineForPage()` | Session-aware wrapper for server components |

**EventType union:**
```
created | updated | duplicated | archived | restored |
issued | approved | released | paid | partially_paid |
overdue | disputed | cancelled | reissued | sent | viewed |
quote_accepted | quote_declined | quote_converted
```

#### Lifecycle Event Hooks (fire-and-forget `void`)

| File | Events wired |
|---|---|
| `invoices/actions.ts` | created/issued, updated, archived, duplicated (both sides), cancelled, reissued (both sides) |
| `vouchers/actions.ts` | created/approved, updated, archived, duplicated (both sides) |
| `salary-slips/actions.ts` | created/released, updated, released, paid, archived, duplicated (both sides) |
| `quotes/actions.ts` | created, updated, sent, **quote_converted** (first-class), duplicated (both sides) |

> **Quote lifecycle is first-class.** `quote_accepted`, `quote_declined`, and `quote_converted` are all typed EventTypes, ready to be wired from the portal acceptance flow.

#### Shared UI Component
- **`src/components/docs/document-timeline.tsx`** — `DocumentTimeline` client component
  - Renders `DocEventRow[]` newest-first
  - Event icons, labels, and colors for all 20 event types
  - Actor label display, metadata hint rendering
  - Empty state handling

#### Detail Page Integration

| Page | Timeline |
|---|---|
| `invoices/[id]/page.tsx` | ✅ Already had `InvoiceTimeline` (preserved) |
| `vouchers/[id]/page.tsx` | ✅ Added `DocumentTimeline` (parallel fetch) |
| `salary-slips/[id]/page.tsx` | ✅ Added `DocumentTimeline` (parallel fetch) |
| `quotes/[id]/page.tsx` | ✅ Added `DocumentTimeline` (parallel fetch, first-class quote events) |

#### Test Fixes
- `invoices/__tests__/actions.test.ts` — added `vi.mock("@/lib/document-events")` so fire-and-forget emits don't fail when `documentEvent` is absent from the db mock

### Tests
- **`src/lib/__tests__/document-events.test.ts`** — 17 unit tests
  - `createDocEvent` field mapping + null defaults
  - All 4 per-type emitters
  - `getDocumentTimeline` scoping, results, default limit
  - `getDocumentTimelineForPage` session derivation
  - Cross-org safety checks

### Verification Results
| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ exit 0 |
| Prisma schema validate | ✅ valid |
| Prisma client regenerate | ✅ done |
| Document events unit tests (17) | ✅ all pass |
| Invoice action tests (3) | ✅ all pass |
| e-Way Bill tests (8) | ✅ all pass |
| IRN tests (10) | ✅ all pass |
| Template marketplace tests (10) | ✅ all pass |
| **Total** | **48/48 pass** |

---

## 4. Architecture Decisions

### DocumentIndex — read projection, not source of truth
`DocumentIndex` is treated strictly as a denormalized read layer. The canonical source of truth for each document type remains its own Prisma model (`Invoice`, `Voucher`, `SalarySlip`, `Quote`). The vault never writes back to source models.

### DocumentEvent — append-only, no updates/deletes
Events are immutable once written. This ensures the timeline is always a reliable audit trail. If a correction is needed, a new correcting event is appended (e.g., `restored` after `archived`).

### Fire-and-forget sync pattern
Both `syncXToIndex()` and `emitXEvent()` are called as `void` inside server actions. This keeps user-facing response latency unaffected by vault/timeline writes. If a sync fails, it does not roll back the main operation — the vault/timeline is eventually consistent, not strongly consistent.

### Quote first-class treatment
Quotes previously had weaker lifecycle support than the other three document types. Phase 19 elevates quotes:
- `archiveQuote` action added (was missing)
- All quote lifecycle events normalized in `DocumentEvent`
- `quote_converted` is a first-class typed EventType
- `quote_accepted` and `quote_declined` are typed and ready for wiring from the portal flow

### Invoice detail page — dual timeline
The invoice detail page already had `InvoiceTimeline` backed by `InvoiceStateEvent`. This was preserved. The new `DocumentEvent` layer adds normalized events in parallel. A future sprint can unify these into a single view if desired.

---

## 5. Files Changed — Full List

### Sprint 19.1
```
prisma/schema.prisma                                          (modified)
prisma/migrations/20260414000001_phase19_sprint1_document_index/migration.sql  (new)
src/lib/docs-vault.ts                                         (new)
src/lib/__tests__/docs-vault.test.ts                          (new)
src/app/app/docs/page.tsx                                     (new)
src/app/app/docs/vault/page.tsx                               (new)
src/app/app/docs/vault/actions.ts                             (new)
src/app/app/docs/invoices/actions.ts                          (modified)
src/app/app/docs/vouchers/actions.ts                          (modified)
src/app/app/docs/salary-slips/actions.ts                      (modified)
src/app/app/docs/quotes/actions.ts                            (modified)
scripts/backfill-document-index.ts                            (new)
docs/PRD/PHASE_19_PRD.md                                      (new)
```

### Sprint 19.2
```
prisma/schema.prisma                                          (modified)
prisma/migrations/20260414000002_phase19_sprint2_document_events/migration.sql  (new)
src/lib/document-events.ts                                    (new)
src/lib/__tests__/document-events.test.ts                     (new)
src/components/docs/document-timeline.tsx                     (new)
src/app/app/docs/invoices/actions.ts                          (modified)
src/app/app/docs/invoices/__tests__/actions.test.ts           (modified)
src/app/app/docs/vouchers/actions.ts                          (modified)
src/app/app/docs/vouchers/[id]/page.tsx                       (modified)
src/app/app/docs/salary-slips/actions.ts                      (modified)
src/app/app/docs/salary-slips/[id]/page.tsx                   (modified)
src/app/app/docs/quotes/actions.ts                            (modified)
src/app/app/docs/quotes/[id]/page.tsx                         (modified)
```

---

## 6. What Comes Next — Sprint 19.3

**Theme:** Attachments, Sharing, and Document Operations

Per `docs/PRD/PHASE_19_PRD.md`, Sprint 19.3 must deliver:

1. **Attachment normalization** — align attachment UX and access patterns across invoices, vouchers, salary slips, and quotes (quote attachments as first-class)
2. **Document sharing** — standardized share/export flows across all 4 types
3. **Quote portal acceptance flow** — wire `quote_accepted` and `quote_declined` events from the public portal into `DocumentEvent`

**Branch strategy for 19.3:**
```bash
git checkout feature/phase-19
git checkout -b feature/phase-19.3
```
Target PR: `feature/phase-19.3` → `feature/phase-19`

---

## 7. Key Engineering Rules (carry forward)

- Always call `requireOrgContext()` for all vault/event reads and writes
- Never write back to `Invoice`/`Voucher`/`SalarySlip`/`Quote` from the vault layer
- All sync/emit calls must be `void` (fire-and-forget) — never `await` in action success paths
- Preserve existing action result shapes: `{ success: true, data }` / `{ success: false, error }`
- New document lifecycle events must use the `EventType` union in `document-events.ts`
- Quote lifecycle events are first-class — do not treat quotes as secondary to invoices
- Org-scoping is mandatory on every `DocumentIndex` and `DocumentEvent` query

---

## 8. Credentials & Tooling

- **GitHub token:** stored in macOS keychain (`security find-internet-password -s github.com -w`)
- **PR creation:** use `python3` + `urllib.request` to POST to GitHub API (gh CLI not installed, no brew)
- **Node:** via nvm — prefix commands with `export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"`
- **Tests:** `node_modules/.bin/vitest run <path>`
- **Typecheck:** `node_modules/.bin/tsc --noEmit`
- **Prisma validate:** `node_modules/.bin/prisma validate`
- **Prisma generate:** `node_modules/.bin/prisma generate`
