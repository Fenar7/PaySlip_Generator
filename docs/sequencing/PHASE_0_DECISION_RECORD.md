# Phase 0 Decision Record — Slipwise Document Sequencing Platform

**Workstream:** A (Sequencing Core)  
**Phase:** 0 (Foundation & Freeze)  
**Date:** 2026-04-28  
**Status:** Draft for Review  
**Authority:** Product Lead / Engineering Lead sign-off required before Phase 1 kickoff.

---

## 1. Executive Summary

Phase 0 freezes the foundational decisions required to replace the legacy `OrgDefaults`-based counter (`src/lib/docs/numbering.ts`) with a dedicated, token-based sequencing subsystem. This record locks scope to **invoices** and **vouchers** only, defines exactly when official numbers are materialized, separates sequencing from resequencing as distinct operations, mandates owner-only governance, and establishes the concurrency, audit, and lock-date rules that all subsequent implementation sprints must obey.

The goal is not to build the engine in Phase 0; it is to eliminate ambiguity so that Phase 1–3 implementation tickets can be written as pure execution work with zero open architectural questions.

**What Phase 0 freezes:**
- In-scope document types, lifecycle states that trigger numbering, and draft nullability.
- Subsystem boundaries and interface contracts with invoice lifecycle, voucher lifecycle, legacy `OrgDefaults`, and the audit subsystem.
- The governance model (owner-only) and the exact list of owner-restricted operations.
- Lock-date enforcement rules and the minimum audit event schema for every numbering mutation.
- The v1 token grammar, supported periodicity modes, default sequence templates, and continuity-seeding semantics.
- Concurrency strategy at the conceptual level (atomic assignment, transactional resequencing, duplicate prevention).

**What Phase 0 explicitly does not freeze:**
- UI/UX design for sequence configuration or resequencing flows.
- Specific database schema DDL (to be defined in Phase 1).
- API route shapes or GraphQL mutations (to be defined in Phase 1).
- Multi-tenancy isolation implementation details beyond "org-scoped."

---

## 2. Scope Lock

### 2.1 In-Scope

| Document Type | Rationale |
|---------------|-----------|
| **Invoices** | Highest-volume, highest-compliance surface. Numbering is legally material in most jurisdictions. |
| **Vouchers** | Internal financial control document with formal approval workflow; requires audit-friendly sequencing. |
| **Sequence configuration (create, read, update)** | Required to define the rules that produce numbers. |
| **Resequencing (historical repair)** | Required for period-close hygiene and error correction. |
| **Lock-date protection** | Mandatory for compliance; prevents backdated tampering. |
| **Audit logging** | Regulatory and operational requirement; every mutation leaves a trace. |
| **Continuity seeding** | Required for orgs migrating from legacy counters mid-period. |

### 2.2 Out-of-Scope

| Item | Rationale | Re-Evaluation Gate |
|------|-----------|-------------------|
| **Vendor bills** | Distinct lifecycle (not ISSUED-driven), different compliance posture, lower immediate volume. Vendor bills will continue to use legacy `OrgDefaults` counters or manual entry until Phase 4. | Phase 4 scoping session |
| **Credit notes / debit notes** | Tied to invoice lifecycle but require separate prefix logic and negative-correlation rules. Not needed for Phase 0–3. | Phase 4 |
| **Proforma invoices / quotes** | Non-binding documents; no legal requirement for official sequence consumption. | Backlog grooming post-Phase 3 |
| **Purchase orders** | Procurement domain; owned by a different workstream. | Procurement platform integration phase |
| **Bulk import resequencing** | UI convenience feature. Core engine supports bulk operations; import tooling is a Phase 2+ UX enhancement. | Phase 2 |
| **Multi-org sequence templates (marketplace)** | Requires template sharing and versioning not needed for internal MVP. | Post-MVP |

### 2.3 Scope Lock Rule

No feature or document type outside the in-scope list may be added to the sequencing subsystem during Phase 1–3 without a formal scope amendment approved by the Product Lead and recorded in the Decision Changelog (Section 11). This prevents scope creep into vendor bills and adjacent document types before the core engine is hardened.

---

## 3. Lifecycle Timing Decisions

### 3.1 Invoice Official Number Assignment

- **Trigger:** Transition to `ISSUED` status.
- **Rule:** When an invoice moves from any pre-issued state (e.g., `DRAFT`, `PENDING`) to `ISSUED`, the sequencing subsystem is invoked **once** to allocate the next official number for that org, sequence, and period.
- **Immutability:** After assignment, the official number is immutable for the lifetime of the document. If the invoice is later voided or corrected, the number is **not** reclaimed; gaps are acceptable and auditable.
- **Pre-ISSUED state:** The invoice may display a temporary internal draft ID (e.g., UUID or human-readable draft label), but this is **not** an official sequence number and must be visually distinguishable in all client surfaces.

### 3.2 Voucher Official Number Assignment

- **Trigger:** Transition to `APPROVED` status.
- **Rule:** When a voucher moves from any pre-approved state (e.g., `DRAFT`, `PENDING_APPROVAL`) to `APPROVED`, the sequencing subsystem is invoked **once** to allocate the next official number.
- **Immutability:** Same as invoices: post-assignment immutability; no reclamation on void/reversal.
- **Pre-approved state:** Draft vouchers display a temporary internal ID only. No official number is consumed.

### 3.3 Draft Nullability

- **Rule:** Documents in `DRAFT` status **must not** consume an official sequence number under any circumstance.
- **Rationale:** Prevents sequence pollution from abandoned drafts, reduces support burden for "reset my counter because I deleted 40 drafts," and aligns with standard accounting practice where only finalized documents enter the official books.
- **Enforcement:** The sequencing subsystem will reject any request to assign a number to a document whose status is `DRAFT`. The caller (invoice/voucher lifecycle service) is responsible for ensuring the status transition and assignment occur in the correct order.

### 3.4 Reassignment Prohibition

- **Rule:** Official numbers cannot be reassigned from one document to another, even within the same org.
- **Corollary:** If an invoice is duplicated (e.g., "copy invoice"), the copy starts in `DRAFT` and receives a **new** number upon issuance. The original number is never transferred.

---

## 4. Architectural Boundaries

The sequencing subsystem is a standalone bounded context. It exposes a narrow, stable interface and does not reach into other domains.

### 4.1 What the Sequencing Subsystem Owns

| Concern | Ownership |
|---------|-----------|
| Sequence definition storage and validation | Sequencing subsystem |
| Token grammar parsing and rendering | Sequencing subsystem |
| Periodicity calculation (continuous, yearly, monthly, financial year) | Sequencing subsystem |
| Counter state per (org, sequence, period) | Sequencing subsystem |
| Atomic next-number allocation | Sequencing subsystem |
| Historical resequencing algorithm | Sequencing subsystem |
| Lock-date evaluation and enforcement | Sequencing subsystem |
| Audit log emission for numbering events | Sequencing subsystem (emits); audit subsystem (stores) |

### 4.2 What the Sequencing Subsystem Does NOT Own

| Concern | Owner | Interface Boundary |
|---------|-------|-------------------|
| Invoice status transitions and business rules | Invoice lifecycle service | Invoice service calls sequencing on `ISSUED` transition; sequencing does not know what an "invoice" is beyond a `documentType` string and `documentId`. |
| Voucher approval workflow and authority matrix | Voucher lifecycle service | Voucher service calls sequencing on `APPROVED` transition; same abstraction as above. |
| `OrgDefaults` legacy storage and reads | Legacy compatibility layer / OrgDefaults service | Sequencing subsystem writes to its own tables only. A compatibility adapter may read from sequencing tables to populate legacy shapes if needed during transition. |
| Audit log persistence and querying | Audit subsystem | Sequencing subsystem emits structured events (see Section 6). Audit subsystem owns the ingestion pipeline, storage schema, and query API. |
| User authentication and authorization | Auth/Identity service | Sequencing subsystem receives an authenticated `principal` object (orgId, userId, roles) and enforces owner-only rules locally. It does not call the auth service. |
| Document content, PDF generation, or email delivery | Document / PDF studio | Sequencing returns a string; the caller decides how to render it. |

### 4.3 Interface Contracts

#### 4.3.1 Assignment Interface (Invoice / Voucher → Sequencing)

**Input:**
- `orgId` (UUID)
- `documentType`: `"invoice"` | `"voucher"`
- `documentId` (UUID)
- `status`: the target status being entered (`ISSUED` or `APPROVED`)
- `assignmentDate` (ISO date): the effective date for period resolution
- `principal`: `{ userId, isOrgOwner }`

**Output:**
- `officialNumber` (string)
- `sequenceId` (UUID)
- `periodKey` (string, e.g., `2025` or `2025-04`)
- `counter` (integer)

**Failure modes:**
- `SEQUENCE_NOT_CONFIGURED`: No active sequence for the document type.
- `PERIOD_LOCKED`: The assignment date falls on or before the org's lock date.
- `GOVERNANCE_DENIED`: Principal is not org owner.
- `CONCURRENCY_COLLISION`: Duplicate prevention triggered (retryable by caller).

#### 4.3.2 Resequencing Interface (Owner → Sequencing)

**Input:**
- `orgId`
- `sequenceId`
- `startDate` / `endDate` (inclusive range for the resequencing window)
- `newSequenceDefinition` (optional; if omitted, re-apply existing definition)
- `principal`: `{ userId, isOrgOwner }`

**Output:**
- `affectedDocumentIds` (ordered array)
- `oldNumbers` (array, same order)
- `newNumbers` (array, same order)

**Preconditions enforced by subsystem:**
- `startDate` must be after the org lock date.
- Principal must be org owner.

### 4.4 Legacy `OrgDefaults` Boundary

- **Decision:** The new sequencing subsystem does **not** write to the legacy `OrgDefaults` counter keys.
- **Transition behavior:** During Phase 1–2, a read-only compatibility adapter may expose sequencing counter state in the legacy `OrgDefaults` shape so that existing code paths in `src/lib/docs/numbering.ts` can function while migration occurs. This adapter is a temporary bridge, not a dependency.
- **Sunset rule:** The compatibility adapter will be removed in Phase 3. All consumers must migrate to the sequencing API by Phase 3 code freeze. The Decision Changelog will track this sunset.

---

## 5. Sequencing vs Resequencing Separation

These are fundamentally different operations with different callers, different safety requirements, and different side effects. They must be implemented as separate code paths and separate API surfaces.

### 5.1 Sequencing (Forward Assignment)

- **Definition:** The act of allocating the next official number to a single document as it crosses its lifecycle threshold (ISSUED for invoices, APPROVED for vouchers).
- **Direction:** Forward in time.
- **Scope:** One document, one number.
- **Trigger:** Automatic, system-driven, on status transition.
- **Mutability:** Creates an immutable fact.
- **Concurrency:** Must be atomic and contention-safe.
- **Permissions:** Implicitly allowed for the system on behalf of the document lifecycle; no explicit owner check at assignment time (org ownership was verified when the document was created/modified). The sequencing subsystem validates that the caller service is authorized, but does not require the invoice issuer to be the org owner.
- **Periodicity impact:** Advances the per-period counter by one.

### 5.2 Resequencing (Historical Repair)

- **Definition:** The act of recomputing and reassigning official numbers for a set of already-finalized documents within a defined date range, typically to correct gaps, adopt a new sequence format, or align with a period reset.
- **Direction:** Backward / retrospective.
- **Scope:** Many documents, many numbers, within a bounded window.
- **Trigger:** Explicit, user-initiated action initiated by an org owner.
- **Mutability:** Mutates historical state; therefore gated by strict safety checks.
- **Concurrency:** Must run inside a serializable or optimistic-locking transaction; must not race with new assignments.
- **Permissions:** **Owner-only.** Never automatic.
- **Periodicity impact:** May change period boundaries and counters; requires continuity seeding if the new sequence starts mid-period.

### 5.3 Why They Must Be Separate

| Dimension | Sequencing | Resequencing |
|-----------|------------|--------------|
| **Caller** | System / lifecycle service | Human org owner |
| **Frequency** | High (every issuance) | Low (period close, error correction) |
| **Risk** | Low (append-only) | High (rewrites history) |
| **Audit** | One event per assignment | One bulk event + per-document delta |
| **Lock-date** | Must be after lock date | Window must be entirely after lock date |
| **UX** | Invisible to user | Explicit confirmation, preview, dry-run |

**Consequence:** The sequencing engine may share internal utilities (token renderer, period resolver), but the assignment service and resequencing service shall be separate modules with separate entry points. This separation prevents high-frequency assignment logic from inheriting the complexity and risk profile of bulk historical mutation.

### 5.4 Future Sequence Changes (The Third Distinct Flow)

Changing the sequence definition for **future** documents (e.g., updating the prefix from `INV` to `INVOICE` starting next month) is **not** resequencing. It is a configuration update with a future effective date.

- **Rule:** Future sequence changes affect only documents whose `assignmentDate` is on or after the effective date.
- **Rule:** Future sequence changes do **not** alter numbers already assigned.
- **Rule:** Future sequence changes are **owner-only**.
- **Separation:** The UI and API will present "Change future sequence" and "Resequence historical documents" as two different actions. Combining them into a single flow is prohibited because it conflates harmless forward configuration with dangerous historical rewriting.

---

## 6. Lock-Date and Audit Model

### 6.1 Lock-Date Enforcement Rules

Every org has a `lockDate` (inclusive). The lock date represents the cutoff through which books are considered closed and immutable.

**Rule L1 — Assignment Blocking:**  
The sequencing subsystem must reject any assignment request whose `assignmentDate` is less than or equal to the org's `lockDate`. Return `PERIOD_LOCKED`.

**Rule L2 — Resequencing Window Blocking:**  
The sequencing subsystem must reject any resequencing request whose window (`startDate` through `endDate`) overlaps with or precedes the `lockDate`. In other words, `startDate` must be strictly greater than `lockDate`. Return `PERIOD_LOCKED`.

**Rule L3 — Lock-Date Mutation Blocking:**  
Changing an org's `lockDate` to an earlier date (extending the locked period) must be an **owner-only** operation and must itself emit an audit event.

**Rule L4 — No Automatic Lock-Date Advancement:**  
The sequencing subsystem does not automatically advance lock dates. Lock-date management is outside the sequencing boundary (see Section 4.2). Sequencing only consumes the current value.

**Rule L5 — Granularity:**  
Lock dates are evaluated at **day** granularity (YYYY-MM-DD). Time-of-day is ignored.

### 6.2 Audit Event Requirements

Every numbering mutation must generate an immutable audit event. The audit subsystem owns storage; the sequencing subsystem owns event schema and emission.

#### 6.2.1 Assignment Event

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | `"SEQUENCE_ASSIGNED"` |
| `timestamp` | ISO datetime | When the assignment occurred |
| `orgId` | UUID | Org scope |
| `sequenceId` | UUID | Sequence definition used |
| `documentType` | string | `"invoice"` / `"voucher"` |
| `documentId` | UUID | The document that received the number |
| `officialNumber` | string | The rendered number |
| `periodKey` | string | The resolved period |
| `counter` | integer | The raw counter value for that period |
| `principal` | object | `{ userId }` of the actor who triggered the status transition |

#### 6.2.2 Resequencing Event

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | `"SEQUENCE_RESEQUENCED"` |
| `timestamp` | ISO datetime | When the resequencing completed |
| `orgId` | UUID | Org scope |
| `sequenceId` | UUID | Sequence definition applied |
| `startDate` | date | Window start |
| `endDate` | date | Window end |
| `affectedCount` | integer | Number of documents changed |
| `principal` | object | `{ userId }` of the owner who initiated |
| `snapshotBefore` | JSON | Ordered array of `{ documentId, oldNumber }` |
| `snapshotAfter` | JSON | Ordered array of `{ documentId, newNumber }` |

#### 6.2.3 Sequence Configuration Change Event

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | `"SEQUENCE_CONFIG_CHANGED"` |
| `timestamp` | ISO datetime | When the change was committed |
| `orgId` | UUID | Org scope |
| `sequenceId` | UUID | Modified sequence |
| `changedFields` | string[] | Keys that changed (e.g., `["prefix", "periodicity"]` ) |
| `previousValue` | JSON | Full previous definition |
| `newValue` | JSON | Full new definition |
| `effectiveDate` | date | When the new definition takes effect |
| `principal` | object | `{ userId }` of the owner |

**Rule A1 — No Silent Mutations:**  
If an operation changes a number or a sequence definition, an audit event must be emitted. There are no exceptions for "internal" or "system" operations.

**Rule A2 — Eventual Consistency Acceptable:**  
Audit event emission may be asynchronous (e.g., message queue), but the ordering of events for a given `(orgId, sequenceId)` must be preserved.

---

## 7. Governance Model

### 7.1 Owner-Only Mandatory

The org owner is the only human role permitted to perform high-risk sequencing operations. This is non-negotiable; there is no "sequencing admin" or "accountant" override.

### 7.2 Owner-Only Operations (Explicit List)

The following actions require `principal.isOrgOwner === true`:

| # | Operation | Rationale |
|---|-----------|-----------|
| 1 | Create a new sequence definition | Establishes the numbering contract for the org; misuse can invalidate compliance. |
| 2 | Update an existing sequence definition | Changes future numbering behavior; could confuse auditors if unrestricted. |
| 3 | Delete / deactivate a sequence definition | Prevents accidental loss of configuration. Soft-delete only. |
| 4 | Perform historical resequencing | Rewrites finalized document numbers; highest risk operation. |
| 5 | Set or change continuity seed value | Manually adjusts counter state; opens door to gaps or duplicates if misused. |
| 6 | Change the org `lockDate` | Not a sequencing operation per se, but impacts sequencing; sequencing subsystem validates owner status if it exposes this proxy. |

### 7.3 Non-Owner Operations (Automatically Permitted)

| Operation | Caller | Rationale |
|-----------|--------|-----------|
| Forward number assignment (on ISSUED/APPROVED) | System / lifecycle service | Happens as a side effect of normal document workflow; owner status was already checked at document creation/modification time. |
| Read sequence definitions | Any authenticated org member | Required for UI display and validation messages. |
| Read own document's official number | Any authenticated org member | The number is on their document. |

### 7.4 Enforcement Point

Governance checks live at the **API/service boundary** of the sequencing subsystem, not in the database. The subsystem receives a `principal` object and evaluates `isOrgOwner` before executing gated operations. It does not query the auth service on every call; the caller (e.g., GraphQL resolver) is responsible for hydrating `isOrgOwner` correctly.

---

## 8. Migration Compatibility Decision

### 8.1 Legacy Behavior Preservation

The existing code in `src/lib/docs/numbering.ts` uses `OrgDefaults` to store a simple prefix and integer counter. During Phase 1–2, this code will continue to exist alongside the new subsystem.

**Decision M1 — Read-Only Legacy Bridge:**  
A compatibility adapter will be built that reads from the new sequencing tables and presents the data in the legacy `OrgDefaults` shape. Legacy code paths can continue to read without modification. Legacy code paths **must not** write new counters.

**Decision M2 — No Dual-Write:**  
The new sequencing subsystem will not write to `OrgDefaults` keys. `OrgDefaults` counters for invoices and vouchers will be frozen at migration time and will become read-only.

**Decision M3 — Migration Trigger:**  
When an org is migrated to the new sequencing subsystem:
1. A sequence definition is created for each supported document type (invoice, voucher).
2. The current `OrgDefaults` counter value is imported as the **continuity seed** for the current period.
3. The legacy counter is marked `migrated: true` in `OrgDefaults` (or equivalent flag) to prevent accidental writes.
4. All new assignments flow through the sequencing subsystem.

**Decision M4 — Sunset Deadline:**  
The compatibility adapter and all legacy `OrgDefaults` reads for invoices/vouchers will be removed in Phase 3. By that point, all consumers must call the sequencing API directly. This is tracked in the Decision Changelog.

---

## 9. Token Format v1 Decision

### 9.1 Supported Tokens

The v1 token grammar defines what can appear inside a sequence template. A template is a slash-separated string of literal segments and tokens.

| Token | Syntax | Description | Example Output |
|-------|--------|-------------|----------------|
| **Literal** | Any text not in `{ }` | Fixed string | `INV`, `VCH`, `-` |
| **Year** | `{YYYY}` | 4-digit year of assignment date | `2025` |
| **Month** | `{MM}` | 2-digit month of assignment date | `04` |
| **Day** | `{DD}` | 2-digit day of assignment date | `28` |
| **Counter** | `{NNNNN}` | Zero-padded counter, minimum 5 digits | `00001`, `12345` |
| **Financial Year** | `{FY}` | Org-defined financial year label (e.g., FY 2025-26) | `2025-26` |

### 9.2 Token Combinations and Constraints

- **One counter per template:** A template must contain exactly one `{NNNNN}` token. Zero or more than one is invalid.
- **Year is mandatory for periodic reset modes:** If periodicity is `yearly`, `monthly`, or `financial_year`, the template must contain `{YYYY}` or `{FY}` (as appropriate) so that period boundaries are reflected in the rendered number.
- **Slashes as segment delimiters:** The `/` character is permitted as a literal segment separator (e.g., `INV/{YYYY}/{NNNNN}`). It is not a token.
- **Case sensitivity:** Tokens are uppercase only. `{yyyy}` is invalid.
- **Padding:** `{NNNNN}` pads to the length of the token declaration. `{NN}` is valid and pads to 2 digits. Minimum supported padding is 2 (`{NN}`); maximum is 9 (`{NNNNNNNNN}`).

### 9.3 Default Sequence Templates

| Document Type | Default Template | Periodicity |
|---------------|------------------|-------------|
| Invoice | `INV/{YYYY}/{NNNNN}` | Yearly |
| Voucher | `VCH/{YYYY}/{NNNNN}` | Yearly |

Orgs may customize templates within the v1 grammar. Customization is owner-only.

### 9.4 Deferred Tokens (Post-v1)

The following tokens are **explicitly deferred** to a later phase to avoid parser complexity in Phase 1:

| Token | Example | Deferral Rationale |
|-------|---------|-------------------|
| `{ORG}` | Org short code | Requires org-level short code validation and uniqueness guarantee not yet built. |
| `{BRANCH}` | Branch / location code | Requires branch hierarchy in sequencing context; out of scope. |
| `{RANDOM}` | Random alphanumeric | Violates auditability and predictability principles. Not supported unless legally required. |
| `{UUID}` | UUID suffix | Same as above. Deferred indefinitely pending compliance review. |

### 9.5 Validation Rules

- Templates must compile to a regular expression that can be used for reverse matching (parsing an existing number into its components).
- A template change with a future effective date must not invalidate numbers already assigned under the old template.
- The subsystem must store the template version or hash with each assignment event to support future template migrations.

---

## 10. Concurrency and Safety Decisions

### 10.1 Atomic Assignment

- **Decision:** The next-number allocation for a given `(orgId, sequenceId, periodKey)` must be atomic with respect to all other assignments for that same tuple.
- **Mechanism (conceptual):** Use a database-level atomic increment (e.g., `UPDATE ... SET counter = counter + 1 RETURNING counter`) or an equivalent optimistic-locking retry loop. The exact SQL/ORM implementation is a Phase 1 detail; the requirement is atomicity.
- **Guarantee:** Two concurrent invoice issuances for the same org and sequence must never receive the same number.

### 10.2 Transactional Resequencing

- **Decision:** Resequencing must run inside a database transaction that locks the affected counter state and document numbers for the duration of the operation.
- **Isolation:** At minimum, the transaction must prevent new assignments for the same `(orgId, sequenceId)` from interleaving during resequencing. This can be achieved through:
  - A sequence-level advisory lock, or
  - Raising the transaction isolation level to `SERIALIZABLE` for the resequencing transaction.
- **Rollback:** If resequencing fails midway, the transaction must roll back. Partial resequencing is unacceptable.
- **Preview mode:** Resequencing must support a dry-run / preview mode that computes the new numbers without committing them. Preview must use the same locking strategy to ensure the preview remains valid if the user subsequently commits.

### 10.3 Duplicate Prevention Strategy

- **Strategy:** Unique constraint on `(orgId, sequenceId, periodKey, officialNumber)` at the database level. This is the safety net of last resort.
- **Collision handling:** If the atomic increment races with an unanticipated write path and a collision occurs, the assignment operation must fail with `CONCURRENCY_COLLISION`. The caller (lifecycle service) may retry once. Persistent collisions indicate a bug, not a retry loop.
- **Resequencing deduplication:** During resequencing, if the algorithm generates a number that already exists outside the resequencing window (edge case: overlapping periods), it must halt and surface the conflict rather than skip or overwrite.

### 10.4 Counter State Durability

- Counter state is durable storage, not cache. Loss of counter state is a data-loss event.
- Backups of counter state tables must be treated with the same importance as document tables.

---

## 11. Decision Changelog

| # | Decision | Status | Sprint | Rationale / Notes |
|---|----------|--------|--------|-------------------|
| 1 | Scope locked to invoices + vouchers only; vendor bills out of scope | **Locked** | Phase 0 | Compliance and volume priority. Vendor bills lack ISSUED lifecycle. |
| 2 | Invoice numbers assigned at `ISSUED` status | **Locked** | Phase 0 | Standard accounting practice; draft nullability requirement. |
| 3 | Voucher numbers assigned at `APPROVED` status | **Locked** | Phase 0 | Aligns with voucher lifecycle; mirrors invoice timing logic. |
| 4 | Drafts do not consume official numbers | **Locked** | Phase 0 | Prevents counter pollution and support overhead. |
| 5 | Official numbers are immutable post-assignment | **Locked** | Phase 0 | Audit trail integrity; no reclamation on void. |
| 6 | Resequencing supported only for open (unlocked) periods | **Locked** | Phase 0 | Protects closed books from retroactive mutation. |
| 7 | Locked periods block both assignment and resequencing | **Locked** | Phase 0 | Consistent enforcement of book closure. |
| 8 | Owner-only governance for all config and resequencing | **Locked** | Phase 0 | Non-negotiable risk reduction. |
| 9 | Future sequence changes and historical resequencing are separate flows | **Locked** | Phase 0 | Prevents accidental historical rewriting during routine updates. |
| 10 | Legacy `OrgDefaults` counters remain for migration compatibility only | **Locked** | Phase 0 | Enables phased rollout without big-bang migration. |
| 11 | Compatibility adapter is read-only; no dual-write | **Locked** | Phase 0 | Prevents split-brain between legacy and new counters. |
| 12 | Legacy adapter sunset in Phase 3 | **Locked** | Phase 3 | Hard deadline for consumer migration. |
| 13 | New subsystem owns counter state, token rendering, period logic | **Locked** | Phase 0 | Clear bounded context. |
| 14 | Invoice/voucher lifecycle services own status transitions; sequencing is callee | **Locked** | Phase 0 | Inversion of control prevents circular dependencies. |
| 15 | Audit subsystem owns storage; sequencing owns event schema & emission | **Locked** | Phase 0 | Clean separation of concerns. |
| 16 | v1 token grammar: `{YYYY}`, `{MM}`, `{DD}`, `{NN...N}`, `{FY}` | **Locked** | Phase 0 | Sufficient for MVP; avoids parser complexity. |
| 17 | Default templates: `INV/{YYYY}/{NNNNN}`, `VCH/{YYYY}/{NNNNN}` | **Locked** | Phase 0 | Yearly periodicity aligns with common compliance needs. |
| 18 | Periodicity modes: continuous, yearly, monthly, financial year | **Locked** | Phase 0 | Covers majority of use cases. |
| 19 | Continuity seeding supported for mid-period migration | **Locked** | Phase 0 | Required for realistic OrgDefaults migration. |
| 20 | Lock-date evaluated at day granularity | **Locked** | Phase 0 | Aligns with accounting period closure. |
| 21 | Every numbering mutation emits an audit event | **Locked** | Phase 0 | Regulatory requirement. |
| 22 | Atomic assignment via DB-level counter increment | **Locked** | Phase 1 | Conceptual requirement; implementation detail in Sprint 1. |
| 23 | Transactional resequencing with advisory lock or serializable isolation | **Locked** | Phase 2 | Conceptual requirement; implementation detail in Sprint 4. |
| 24 | Unique DB constraint on `(orgId, sequenceId, periodKey, officialNumber)` | **Locked** | Phase 1 | Safety net of last resort. |
| 25 | Resequencing preview/dry-run required before commit | **Locked** | Phase 2 | UX safety; prevents irreversible mistakes. |
| 26 | Org/branch/branch code tokens deferred | **Deferred** | Post-Phase 3 | Requires org data model extensions not yet built. |
| 27 | Random/UUID tokens deferred indefinitely | **Deferred** | Backlog | Conflicts with auditability principles. |
| 28 | Multi-org template marketplace deferred | **Deferred** | Post-MVP | Not required for internal use. |
| 29 | Bulk import resequencing UI deferred | **Deferred** | Phase 2+ | Engine supports bulk; UI is convenience layer. |
| 30 | Vendor bills sequencing | **Deferred** | Phase 4 | Distinct lifecycle and compliance model. |

---

## Appendix A: Glossary

- **Sequence:** A configuration object that defines how official numbers are generated for a document type within an org.
- **Periodicity:** The rule that determines when the counter resets (continuous, yearly, monthly, financial year).
- **Period Key:** The string that identifies a specific period instance (e.g., `2025`, `2025-04`).
- **Token:** A placeholder in a sequence template that is replaced at assignment time (e.g., `{YYYY}`).
- **Continuity Seeding:** The act of initializing a new sequence counter to a value other than zero, typically to preserve continuity during migration.
- **Lock Date:** The inclusive cutoff date through which an org's books are considered closed.
- **Resequencing:** The retrospective recomputation and reassignment of official numbers for finalized documents.

---

*End of Phase 0 Decision Record*
