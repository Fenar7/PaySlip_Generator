# Phase 0 Delivery Package — Document Sequencing Platform

## Slipwise | Sprint 0.1: Delivery Setup

**Status:** Complete  
**Branch:** `feature/sequence-platform-phase-0-delivery`  
**Initiative:** Document Sequencing Platform (Invoice & Voucher)  
**Source PRD:** `docs/PRD/DOCUMENT_SEQUENCING_PLATFORM_PRD.md`

---

## 1. Executive Summary

**What Phase 0 accomplishes**  
Phase 0 transforms the PRD from a specification into an executable engineering plan. It locks all architectural contracts, defines the exact boundary between legacy `OrgDefaults` numbering and the new `DocumentSequenceScheme` engine, partitions work across 4 parallel workstreams, and produces a branch-first, multi-agent-ready delivery structure.

**Why it matters**  
Invoice and voucher numbering is financial document identity infrastructure. A wrong cutover corrupts compliance, breaks payment links, voids GST/IRN records, and destroys customer trust. Phase 0 eliminates architectural guessing before any schema migration is written.

**What it unlocks**  
- Immediate creation of the `feature/sequence-platform` branch tree  
- Parallel agent execution starting with Sprint 1.1 (schema foundation)  
- A locked migration contract: existing numbers stay immutable, drafts go nullable, new sequences become the single source of truth  
- A known regression surface with explicit test coverage requirements  

---

## 2. Locked Decisions

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| **Source of truth for invoice/voucher numbering** | `DocumentSequenceScheme` table, activated per `(docType, scopeType, scopeId)` | `OrgDefaults` prefix/counter fields remain for backward compat during cutover but become read-only legacy |
| **Timing of official number assignment** | Invoice: `issueInvoice()` only. Voucher: `saveVoucher("approved")` and approval workflow `approveRequest()` only. | Current code assigns at create time; this is the core behavior change |
| **Owner-only governance** | `requireRole("owner")` for all sequence mutations. Server-side enforcement; UI hiding is never sufficient. | Matches existing auth pattern (`src/lib/auth/require-org.ts` role levels) |
| **Legacy vs new engine cutover** | Migration creates one `DocumentSequenceScheme` per org from existing `OrgDefaults` prefix/counter. Historical documents backfilled with `schemeId`. New code paths read from sequence engine; old `OrgDefaults` fields frozen. | Preserves continuity without renumbering |
| **Migration strategy** | Phase 1.3 backfills in this order: (1) create schemes, (2) backfill invoice/voucher `schemeId`, (3) backfill `DocumentIndex`, (4) validation diagnostics | Schema must exist before backfill; backfill must be idempotent |
| **Scope model** | v1 is `org-wide` only. Schema reserves `scopeType` and `scopeId` for future legal-entity scoping, but the repo has no first-class legal-entity model within a single org. Each org gets one active invoice sequence and one active voucher sequence. | `organizationId` is the sole document boundary today. `EntityGroup` groups separate orgs for consolidation, not for scoping documents within one org. Parallel active series within one org requires a `LegalEntity` model that does not exist. |
| **Service layer ownership** | New `src/lib/sequences/` directory owns: format engine, allocation TX, reset logic, import validation, audit emission. Invoice/voucher actions call `assignDocumentNumberTx` at issue/approval time only. | Keeps sequencing domain isolated; prevents duplication across document types |
| **Draft numbering behavior** | Drafts receive `NULL` official number. UI shows placeholder text (`Assigned on issue` / `Assigned on approval`). No temporary or fake numbers. | Prevents number consumption and user confusion |
| **Vault/history behavior** | `DocumentIndex` gains sequence metadata columns. Vault query supports optional `sequenceGroupLabel` grouping. Retired sequences remain visible and searchable. | Read layer stays backward compatible; grouping is additive |

---

## 3. Repo-Grounded Findings

### Numbering
- **File:** `src/lib/docs/numbering.ts` (255 lines)
- **Current behavior:** `nextDocumentNumberTx` reads `OrgDefaults` prefix/counter, then `updateMany` increments. **This is NOT concurrency-safe** — two simultaneous transactions can read the same counter before either writes.
- **Format:** Hardcoded `{PREFIX}-{COUNTER}` with 3-digit zero-padding.
- **Callers:** 11 call sites including invoice create, voucher create, salary slips, quotes, PO, GRN, recurring invoices, AI extraction, vendor bills.

### Invoices
- **File:** `src/app/app/docs/invoices/actions.ts`
- **Current behavior:** `saveInvoice()` calls `nextDocumentNumber(orgId, "invoice")` at line 284 **before the transaction**, assigning a number to every draft.
- **Issue flow:** `issueInvoice(id)` (line 681) transitions `DRAFT → ISSUED` but does NOT assign a new number — the number was already consumed at create time.
- **Schema:** `invoiceNumber String` (NOT NULL). `@@unique([organizationId, invoiceNumber])`.

### Vouchers
- **File:** `src/app/app/docs/vouchers/actions.ts`
- **Current behavior:** `saveVoucher()` calls `nextDocumentNumber(orgId, "voucher")` at line 89 for every draft.
- **Approval flow:** Two paths — direct `saveVoucher("approved")` and workflow `approveRequest()` in `src/app/app/flow/approvals/actions.ts` (line 610). Neither assigns a number at approval; it was already assigned at create.

### Onboarding
- **File:** `src/app/onboarding/onboarding-page-client.tsx`
- **Current steps:** 4 steps (Org Setup → Branding → Financials → Templates). Step 5 is completion.
- **Pattern:** Step state is local React `useState` + `localStorage` for `slipwise_active_org_id`. Adding a step requires updating the step array, progress bar denominator, and adding a server action in `src/app/onboarding/actions.ts`.

### Vault / DocumentIndex
- **File:** `src/lib/docs-vault.ts`
- **Model:** `DocumentIndex` stores `documentNumber` as plain `String`. Unique key: `(orgId, docType, documentId)`.
- **Sync:** Per-type sync helpers (`syncInvoiceToIndex`, `syncVoucherToIndex`) called from document actions. No DB triggers.
- **Query:** Flat paginated list; no server-side grouping. Search covers `documentNumber`, `titleOrSummary`, `counterpartyLabel`.

### Auth / Roles
- **File:** `src/lib/auth/require-org.ts`
- **Role levels:** `owner(100) > co_owner(90) > admin(80) > ...`
- **Pattern:** `requireRole("owner")` throws if insufficient. RBAC exists in `src/lib/auth/rbac/permissions.ts` but owner/admin bypass covers most mutations.

### Schema Constraints That Matter
- `Invoice.invoiceNumber` and `Voucher.voucherNumber` are `NOT NULL` with `@@unique([organizationId, invoiceNumber])` / `voucherNumber`.
- `OrgDefaults` stores all prefixes/counters as `NOT NULL DEFAULT`.
- No existing sequence-related tables.
- Baseline migration is a single 5900-line squash (`20260420210000_baseline_squash`).

---

## 4. Phase 0 Workstream Outputs

### Workstream A: Architecture and Domain Boundaries

**Objective:** Define exact service boundaries and lifecycle transition points.

**Findings:**
- The existing `src/lib/docs/numbering.ts` must be preserved for non-invoice/non-voucher types (salarySlip, quote, vendorBill, PO, GRN) during the entire initiative.
- Invoice and voucher lifecycles are the only two paths that need official-number deferral.
- `issueInvoice()` and `saveVoucher("approved")` / `approveRequest("voucher")` are the three exact insertion points for `assignDocumentNumberTx`.
- 48+ files reference `invoiceNumber` or `voucherNumber`; most are read-only (display, search, compliance). These do not need changes — they will read the now-populated field after issue/approval.

**Decisions:**
- New domain root: `src/lib/sequences/` (not `src/lib/docs/sequences/` — sequencing is infrastructure, not a document subfeature).
- Public API surface: `sequence-service.ts` exports the 13 functions listed in PRD §11.
- Internal modules: `format-engine.ts`, `validator.ts`, `allocator.ts`, `reset-engine.ts`, `import-service.ts`.
- Legacy `numbering.ts` gains a deprecation comment but keeps serving other doc types until Phase 8+.

**Exact outputs produced:**
- Service boundary map (this section)
- 3 exact assignment injection points identified
- Decision: `numbering.ts` stays untouched for other doc types

**Unresolved risks:** None. Boundary is clean.

**Dependencies on other workstreams:** None (foundational).

---

### Workstream B: Schema and Migration Strategy

**Objective:** Lock the exact schema changes and migration order.

**Findings:**
- All document number fields are `NOT NULL`. Making them nullable requires an `ALTER TABLE` migration.
- `DocumentIndex` is application-managed (no triggers). Adding columns there is safe but requires backfill.
- `OrgDefaults` has 7 document type prefix/counter pairs. Only `invoicePrefix/Counter` and `voucherPrefix/Counter` are in scope for migration to sequences.

**Decisions:**
- **Migration order:**
  1. Create `DocumentSequenceScheme`, `DocumentSequenceEvent`, `DocumentSequenceImportBatch`, `DocumentSequenceImportedNumber`, `DocumentSequenceResetRun`
  2. Alter `Invoice.invoiceNumber` → `String?`
  3. Alter `Voucher.voucherNumber` → `String?`
  4. Add `documentSequenceSchemeId`, `sequenceScopeType`, `sequenceScopeId`, `sequenceVersion` to `Invoice` and `Voucher`
  5. Add `documentSequenceSchemeId`, `sequenceGroupLabel`, `sequenceVersion`, `sequenceScopeType`, `sequenceScopeId` to `DocumentIndex`
- **Nullability transition:** Existing invoices/vouchers all have numbers, so the migration is safe. Schema-only changes do NOT create NULL drafts; the create flows in `invoices/actions.ts` and `vouchers/actions.ts` still call `nextDocumentNumber` until Sprint 4.1 and 5.1 remove those calls. NULL drafts only appear after lifecycle changes deploy. |
- **Index strategy:** Add `@@index([organizationId, docType, scopeType, scopeId, isActive])` on `DocumentSequenceScheme` for fast active-sequence lookup.
- **Compatibility:** `OrgDefaults` prefix/counter columns are NOT dropped. They are frozen in place.

**Exact outputs produced:**
- Locked migration sequence (5 steps)
- Index and constraint plan
- Nullability risk assessment: low (all existing rows populated)

**Unresolved risks:**
- Sprint 1.1 makes number fields nullable, but the existing create flows still assign numbers via `nextDocumentNumber`. No NULL drafts will appear until Sprint 4.1/5.1 change the lifecycle. The real risk is a concurrent schema drift: if another PR modifies `Invoice`/`Voucher`/`DocumentIndex` while the schema agent is working, migration ordering conflicts may occur. **Mitigation:** Coordinate with other initiatives touching these models; merge schema changes atomically.

**Dependencies:** Workstream A (boundary confirmation), Workstream D (rollback plan).

---

### Workstream C: Branching, Execution Workflow, and Multi-Agent Delivery

**Objective:** Define the exact Git workflow for parallel agent execution.

**Decisions:**
- **Root branch:** `feature/sequence-platform` (cut from `master`)
- **Phase branches:** `feature/sequence-platform-phase-N-<name>`
- **Sprint branches:** `feature/sequence-platform-phase-N-sprint-M-<name>`
- **PR flow:** Sprint branch → Phase branch → Feature branch → `master`

**Exact branch names for upcoming work:**
```
feature/sequence-platform
├── feature/sequence-platform-phase-1-foundation
│   ├── feature/sequence-platform-phase-1-sprint-1-schema
│   ├── feature/sequence-platform-phase-1-sprint-2-format-engine
│   └── feature/sequence-platform-phase-1-sprint-3-migration
├── feature/sequence-platform-phase-2-governance
...
```

> **Note:** The PRD originally proposed slash-separated nesting (`feature/sequence-platform/phase-1/...`). Git's ref storage model does not allow both a branch and branches nested under the same prefix to coexist. We use dash-separated phase/sprint suffixes to avoid this limitation while preserving readability.

**Merge order and discipline:**
1. Sprint PRs merge into phase branches via squash or merge commit (team preference: **merge commit** to preserve sprint history).
2. Phase branches merge into `feature/sequence-platform` via merge commit.
3. Final feature branch merges into `master` via PR with full integration test run.
4. **Rebase rule:** Rebase sprint branches onto their phase branch before PR if the phase branch has moved. Never rebase phase branches onto each other.
5. **Conflict avoidance:** Each sprint branch must be cut from the latest phase branch tip. Agents check `git fetch` before starting work.

**PR expectations:**
- Every sprint PR must include:
  - Migration file (if schema changes)
  - Unit tests for new pure functions
  - At least one integration test for the sprint's primary flow
  - `scripts/check-phaseX-health.ts` style diagnostics if migrations are involved
  - Updated `docs/sequencing/` or `docs/PRD/` docs if conventions change

**Exact outputs produced:**
- Branch naming convention
- Merge discipline rules
- PR checklist template

**Unresolved risks:** None.

**Dependencies:** None.

---

### Workstream D: QA, Rollout, and Production Readiness

**Objective:** Define regression surface, test strategy, and operational safeguards.

**Findings:**
- The repo uses **Vitest** for unit tests and **Playwright** for E2E.
- Existing backfill scripts (`scripts/backfill-document-index.ts`, `scripts/backfill-template-revisions.ts`) provide a proven pattern: cursor-based pagination, idempotent upserts, verification counts at the end.
- CI runs lint → unit tests → build → E2E tests on every PR.

**Decisions:**
- **Test categories required:**
  1. Unit: token formatter, validator, preview logic, counter padding, reset calculations, continuity parsing
  2. Integration: onboarding default flow, onboarding custom flow, sequence activation, invoice issue assignment, voucher approval assignment, historical import, vault grouping
  3. Concurrency: simultaneous invoice issue, simultaneous voucher approval, reset retry
  4. Regression: public invoice links, payment links, GST/IRN, e-way bill, dunning, reconciliation, vault sync
- **Migration safety:** Every backfill script must exit non-zero if orphans or collisions remain. A `scripts/check-sequence-migration-health.ts` diagnostic script is required in Sprint 1.3.
- **Observability:** Every sequence mutation logs an audit event via `src/lib/audit.ts`. Every assignment failure must throw (fail closed).

**Exact outputs produced:**
- Test strategy matrix
- Migration diagnostic requirement
- Observability contract (audit + exceptions)

**Unresolved risks:**
- Race condition in current `nextDocumentNumberTx` means existing code already has a latent concurrency bug. The new `assignDocumentNumberTx` must use true atomic increment (e.g., `UPDATE ... SET currentCounter = currentCounter + 1 WHERE id = $1`) or row-level pessimistic locking.

**Dependencies:** Workstream A (to know injection points), Workstream B (to know schema changes).

---

## 5. Branching and PR Workflow

### Branch Tree

```
master
└── feature/sequence-platform                    ← root feature branch
    ├── feature/sequence-platform-phase-1-foundation
    │   ├── feature/sequence-platform-phase-1-sprint-1-schema
    │   ├── feature/sequence-platform-phase-1-sprint-2-format-engine
    │   └── feature/sequence-platform-phase-1-sprint-3-migration
    ├── feature/sequence-platform-phase-2-governance
    │   ├── feature/sequence-platform-phase-2-sprint-1-permissions-audit
    │   ├── feature/sequence-platform-phase-2-sprint-2-settings-ui
    │   └── feature/sequence-platform-phase-2-sprint-3-import-tools
    ...
```

### Operational Rules

| Rule | Detail |
|------|--------|
| **Cut branch from** | Phase branches cut from `feature/sequence-platform`. Sprint branches cut from their phase branch. |
| **Rebase vs merge** | Rebase sprint branches onto phase branch tip before opening PR. Merge phase branches into feature branch. Merge feature branch into `master`. |
| **PR size** | Target ~400 lines changed per sprint PR for readability. Schema + migration sprints may exceed this; use judgment and add review time rather than artificial splitting. |
| **Required in every sprint PR** | 1) Code changes 2) Migration (if schema touched) 3) Unit tests 4) At least one integration test 5) Diagnostic script (if migration) 6) Passing CI |
| **Review discipline** | One approving review required. Owner agent cannot self-merge without second agent sign-off. |
| **Conflict avoidance** | Agents must declare their write scopes in the PR description. No two agents may edit the same file in the same sprint without explicit coordination. |
| **Lock file** | `package-lock.json` changes must be isolated to a single agent per phase to avoid merge hell. |

---

## 6. Multi-Agent Implementation Plan

### Agent Roles

| Agent | Ownership | Write Scope | Parallelizable? |
|-------|-----------|-------------|-----------------|
| **Schema Agent** | Prisma schema, migrations, baseline SQL | `prisma/schema.prisma`, `prisma/migrations/`, `scripts/check-*-health.ts` | Yes, but must finish before Backfill Agent |
| **Engine Agent** | Sequence service, format engine, validator, allocator | `src/lib/sequences/**`, `src/lib/sequences/__tests__/**` | Yes, independent of UI |
| **Lifecycle Agent** | Invoice/voucher action modifications, approval workflow | `src/app/app/docs/invoices/actions.ts`, `src/app/app/docs/vouchers/actions.ts`, `src/app/app/flow/approvals/actions.ts` | No — must wait for Engine Agent's `assignDocumentNumberTx` interface |
| **UI Agent** | Onboarding step, settings pages, vault grouping | `src/app/onboarding/**`, `src/app/app/settings/sequences/**`, `src/app/app/docs/vault/**` | Yes, against mocked service interfaces until Engine Agent lands |
| **Backfill Agent** | Migration scripts, diagnostics, data integrity | `scripts/backfill-sequence-*.ts`, `scripts/check-sequence-migration-health.ts` | No — must wait for Schema Agent |

### Critical Path

```
Schema Agent (Sprint 1.1)
    │
    ├──→ Engine Agent (Sprint 1.2) ──→ Lifecycle Agent (Sprint 4.1/4.2, 5.1/5.2)
    │
    └──→ Backfill Agent (Sprint 1.3)
```

UI Agent can run in parallel with Engine Agent using stubbed service interfaces.

### Handoff Protocol

1. **Interface-first:** Engine Agent defines `sequence-service.ts` exports before implementing internals. Lifecycle and UI agents code against the interface.
2. **Type contracts:** All inter-agent contracts are TypeScript types in `src/lib/sequences/types.ts`.
3. **No duplication:** Shared utilities (date formatting, scope resolution) live in `src/lib/sequences/utils.ts`. Agents do not copy-paste logic.
4. **Token efficiency:** Each agent receives only the files in its write scope + the interface contract. They do not re-explore the entire repo.

---

## 7. Phase 1 Readiness Breakdown

### Sprint 1.1: Schema Foundation

| Attribute | Detail |
|-----------|--------|
| **Goal** | Create sequence models, add metadata to Invoice/Voucher/DocumentIndex, make numbers nullable, add indexes |
| **Exact outputs** | 1) New Prisma models (`DocumentSequenceScheme`, `DocumentSequenceEvent`, `DocumentSequenceImportBatch`, `DocumentSequenceImportedNumber`, `DocumentSequenceResetRun`) 2) `Invoice.invoiceNumber` → nullable 3) `Voucher.voucherNumber` → nullable 4) Sequence metadata fields on `Invoice`, `Voucher`, `DocumentIndex` 5) Migration SQL 6) `prisma generate` passes |
| **Files/modules** | `prisma/schema.prisma`, `prisma/migrations/2026xxxxxx_add_document_sequences/` |
| **Dependencies** | Phase 0 completion (this package) |
| **Acceptance criteria** | `db:migrate` applies cleanly on fresh DB. `db:deploy` applies cleanly on staging. TypeScript compilation passes. |
| **Major risks** | Making `invoiceNumber`/`voucherNumber` nullable breaks downstream code that assumes non-null. **Mitigation:** Audit all `invoiceNumber!` / `voucherNumber!` assertions and type narrowing. |
| **Recommended agent split** | Single Schema Agent. Schema changes must be atomic. |

### Sprint 1.2: Format Engine and Validation

| Attribute | Detail |
|-----------|--------|
| **Goal** | Implement token formatter, parser, validator, preview logic, and continuity seed input validation |
| **Exact outputs** | 1) `src/lib/sequences/format-engine.ts` — token-based formatter 2) `src/lib/sequences/validator.ts` — format validation 3) `src/lib/sequences/preview.ts` — next-number preview 4) `src/lib/sequences/continuity.ts` — parse latest-used number into seed 5) Unit tests for all four modules |
| **Files/modules** | `src/lib/sequences/format-engine.ts`, `validator.ts`, `preview.ts`, `continuity.ts`, `types.ts`, `__tests__/*.test.ts` |
| **Dependencies** | Sprint 1.1 schema (to know field types) |
| **Acceptance criteria** | All supported token combinations produce correct strings. Invalid formats (missing counter, unknown tokens) are rejected. Preview matches actual allocation. |
| **Major risks** | Financial-year token logic depends on org's fiscal year start. **Mitigation:** Accept `fiscalYearStartMonth` as a parameter; default to April (India). |
| **Recommended agent split** | Single Engine Agent. Pure logic; no DB writes. |

### Sprint 1.3: Migration Scaffolding

| Attribute | Detail |
|-----------|--------|
| **Goal** | Migrate org defaults into initial sequence schemes, backfill document links, backfill DocumentIndex, generate diagnostics |
| **Exact outputs** | 1) `scripts/migrate-org-defaults-to-sequences.ts` — creates schemes from `OrgDefaults` 2) `scripts/backfill-invoice-sequence-links.ts` — links invoices to schemes 3) `scripts/backfill-voucher-sequence-links.ts` — links vouchers to schemes 4) `scripts/backfill-document-index-sequence-meta.ts` — adds sequence metadata to index 5) `scripts/check-sequence-migration-health.ts` — counts orphans, collisions, missing links |
| **Files/modules** | `scripts/*`, `src/lib/sequences/migration-helpers.ts` |
| **Dependencies** | Sprint 1.1 (schema), Sprint 1.2 (format engine for validation) |
| **Acceptance criteria** | Every existing org has one active invoice scheme and one active voucher scheme. Every existing invoice/voucher has `documentSequenceSchemeId` populated. `DocumentIndex` has sequence metadata. Health script reports zero anomalies. |
| **Major risks** | Orgs with custom prefixes that don't match the new validator (e.g., special characters). **Mitigation:** Migration script logs warnings and creates schemes with `status: "active"` regardless; validation is for new schemes only. |
| **Recommended agent split** | Single Backfill Agent. Data migration must be consistent. |

---

## 8. QA / Rollout Readiness Checklist

### Schema Migration Safety
- [ ] Migration creates new tables before altering existing ones
- [ ] `invoiceNumber` and `voucherNumber` nullability change is backward-compatible for reads (Prisma allows `String?` reads in existing code)
- [ ] `OrgDefaults` columns are NOT dropped
- [ ] Migration runs successfully against production-like dataset in staging
- [ ] Health check script exits 0 with zero anomalies before proceeding

### Backward Compatibility
- [ ] Non-invoice/voucher doc types (salarySlip, quote, vendorBill, PO, GRN) still use `numbering.ts` without changes
- [ ] Public invoice links resolve via `PublicInvoiceToken`, not invoice number
- [ ] API v1 responses still include `invoiceNumber` / `voucherNumber` (now populated at issue/approval)
- [ ] DocumentIndex sync helpers handle nullable numbers gracefully

### Nullability Transition Risks
- [ ] All `invoice.invoiceNumber` and `voucher.voucherNumber` accesses audited for non-null assumptions
- [ ] TypeScript `strictNullChecks` passes after changes
- [ ] Vault search works when `documentNumber` is null (excluded from search or indexed as placeholder)

### Concurrency Risks
- [ ] `assignDocumentNumberTx` uses atomic counter increment (`UPDATE ... SET currentCounter = currentCounter + 1`) or `SELECT FOR UPDATE` row lock
- [ ] Simultaneous `issueInvoice` calls do not produce duplicate numbers
- [ ] Simultaneous `approveRequest("voucher")` calls do not produce duplicate numbers

### Imported-History Collision Risks
- [ ] `DocumentSequenceImportedNumber` has `@@unique([organizationId, docType, scopeType, scopeId, externalNumber])`
- [ ] Import batch validation rejects duplicates within the file
- [ ] Import validation rejects numbers that would collide with existing live documents

### Downstream Dependency Risks
- [ ] GST/IRN generation still receives invoice number (now guaranteed present at issue time)
- [ ] E-way bill generation still receives invoice number
- [ ] Payment links use invoice number in description (present at issue time)
- [ ] Dunning sequences reference invoice by ID, not number
- [ ] Reconciliation engine reads invoice number for display only
- [ ] Accounting posting (`postInvoiceIssueTx`, `postVoucherTx`) does not depend on number for ledger entries

### Observability Requirements
- [ ] Every sequence mutation emits `logAudit()` event
- [ ] Every failed number assignment throws and logs error
- [ ] Health check endpoint (`/api/health`) unaffected

### Auditability Requirements
- [ ] `DocumentSequenceEvent` captures: actor, old config, new config, timestamp, reason
- [ ] Import batches capture: uploadedBy, fileName, status, summary
- [ ] Reset runs capture: previousCounter, newCounter, periodKey, executedAt

### Rollback Boundaries
- [ ] Rollback after Sprint 1.1 (schema) only: safe. Revert migration + delete new tables. Existing invoices/vouchers still have numbers; old `numbering.ts` paths are untouched.
- [ ] Rollback after Sprint 1.3 (migration backfill): requires orphan cleanup. New tables contain production data. Revert without forward-migration leaves invoices/vouchers without sequence metadata, which breaks vault grouping but does not break core flows.
- [ ] Rollback after Sprint 2.x (governance/settings): data-destructive if settings UI wrote sequence configs that would be lost. Prefer forward-fix.
- [ ] Rollback after Sprint 4.1/5.1 (lifecycle changes): **not safe**. Draft documents with `NULL` numbers cannot be handled by old code. Only forward-fix is viable. |

### Staged Rollout Safeguards
- [ ] Feature flag `SEQUENCE_PLATFORM_ENABLED` gates new code paths (recommended: use existing feature flag system or env var)
- [ ] Phase 1–3 deploy to staging for 1 week before production
- [ ] Phase 4–5 (lifecycle changes) deploy to a single org canary before full rollout
- [ ] Health metrics dashboard tracks: orphan documents, sequence collisions, failed assignments

---

## 9. Draft PR Package for Phase 0

### Draft PR Description

**Title:** `feat(sequence-platform): Phase 0 — Delivery setup and execution readiness`

**Summary:**  
This PR contains the complete Phase 0 delivery package for the Document Sequencing Platform initiative. No code changes are included — this is pure planning, decision locking, and work partitioning.

**Contents:**
1. Locked architectural decisions (source of truth, timing of assignment, owner governance, migration strategy)
2. Repo-grounded findings from codebase audit (numbering, lifecycle, schema, auth, vault)
3. 4 workstream outputs with clear ownership boundaries
4. Branch naming convention and merge discipline
5. Multi-agent execution model for Phases 1–7
6. Phase 1 sprint breakdown (1.1 schema, 1.2 format engine, 1.3 migration scaffolding)
7. Production-grade QA/rollout checklist
8. Draft PR template for subsequent phases

**Decisions locked:**
- `DocumentSequenceScheme` becomes source of truth for invoice/voucher numbering
- Official numbers assigned only at `issueInvoice()` and voucher approval
- `OrgDefaults` prefix/counter frozen but not dropped
- Drafts receive `NULL` official numbers with UI placeholders
- Owner-only mutation enforcement via `requireRole("owner")`
- Migration creates schemes from existing defaults, backfills all historical documents

**Checklist:**
- [x] PRD reviewed and contradictions resolved
- [x] Codebase audited for current behavior
- [x] Branch strategy defined
- [x] Test strategy defined
- [x] Rollout checklist defined
- [ ] Phase 1 branches created (follow-up)

### Engineering Handoff Summary

**For the engineering lead:**  
Phase 0 is complete. All architectural contracts are locked. The repo has been audited. You now have:

- A known regression surface (48+ files read `invoiceNumber`/`voucherNumber`, but only 3 write paths need changing)
- A safe migration path (nullable transition, no column drops, idempotent backfills)
- A branch tree ready to cut from `master`
- A multi-agent plan with non-overlapping write scopes

**Immediate next actions:**
1. Ensure `master` is green and CI passes
2. Cut `feature/sequence-platform` from `master`
3. Cut `feature/sequence-platform-phase-1-foundation` from root
4. Assign Schema Agent to Sprint 1.1 branch

### Kickoff Note for Phase 1 Team

**Team starting Phase 1:**

You are building the foundation of financial document identity infrastructure. Every decision here affects compliance, audit, and customer trust.

**Your north stars:**
1. **Immutability:** Historical numbers never change. If you are writing code that could renumber an issued invoice, stop.
2. **Fail closed:** If sequence assignment fails, the issue/approval action must fail. No silent fallback to old numbering.
3. **Owner-only:** Every mutation checks `requireRole("owner")`. No exceptions.
4. **Concurrency:** The old `nextDocumentNumberTx` has a read-then-write race condition. Your new `assignDocumentNumberTx` must be truly atomic.

**Sprint 1.1 starts now.** Schema Agent has the first branch. Engine Agent prepares stubs. Lifecycle and UI agents review the interface contract in `src/lib/sequences/types.ts` when ready.

---

## 10. Final Recommendation

### Is Phase 1 ready to begin immediately?
**Yes.** All contracts are locked. The repo is audited. The branch tree is defined.

### What must be verified before Phase 1 branch creation?
1. **CI passes on `master`.** Ensure the baseline is green before branching.
2. **Staging DB is cloneable.** Sprint 1.3 requires a production-like dataset for migration rehearsal.
3. **No open conflicting PRs.** Ensure no other initiative is modifying `Invoice`, `Voucher`, `DocumentIndex`, or `OrgDefaults` simultaneously.

### Exact recommended next command/action for the engineering team

```bash
# 1. Ensure master is clean and CI is green
git checkout master
git pull origin master

# 2. Create the root feature branch
git checkout -b feature/sequence-platform
git push -u origin feature/sequence-platform

# 3. Create Phase 1 foundation branch
git checkout -b feature/sequence-platform-phase-1-foundation
git push -u origin feature/sequence-platform-phase-1-foundation

# 4. Create Sprint 1.1 branch and hand to Schema Agent
git checkout -b feature/sequence-platform-phase-1-sprint-1-schema
git push -u origin feature/sequence-platform-phase-1-sprint-1-schema

# 5. Schema Agent begins implementation
```

**Phase 0 is complete. Begin Phase 1.**
