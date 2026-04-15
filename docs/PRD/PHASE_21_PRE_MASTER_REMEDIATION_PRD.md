# Phase 21 Pre-Master Remediation PRD

**Document type:** Post-audit remediation plan  
**Prepared by:** Senior staff-plus audit review  
**Date:** 2026-04-15  
**Product:** Slipwise One  
**Phase audited:** Phase 21 — SW Intel Advanced Intelligence and AI Operations Layer  

---

## 1. Executive Summary

A full pre-master audit of `feature/phase-21` (HEAD `3db93dc`) was conducted against the Phase 21 PRD acceptance criteria. The audit covered all five sprints (21.1 through 21.5): Intelligence Foundation, Document Intelligence, Predictive AR and Customer Health, Operational Anomaly Detection, and AI Governance.

**Verdict: Not merge-ready until remediation.**

The infrastructure is solid. The build passes, 1121 tests pass, Prisma validates, and there are no Phase 21 lint errors. However, four P1 issues were identified that must be resolved before merging to `master`. All four involve functional incompleteness or logic bugs that would cause incorrect behavior in production.

No P0 (security breach, data corruption, build failure) issues were found. Two P2 issues and three P3 issues are documented as follow-up items.

---

## 2. Audited Branch and Head

| Item | Value |
| --- | --- |
| Branch | `feature/phase-21` |
| HEAD commit | `3db93dc` |
| Audit branch | `feature/phase-21-pre-master-audit` |
| PRD reference | `docs/PRD/PHASE_21_PRD.md` |
| Sprints covered | 21.1, 21.2, 21.3, 21.4, 21.5 |

---

## 3. Audit Methodology

### Context files read
- `graphify-out/GRAPH_REPORT.md`
- `docs/codex/2026-04-15-16-43-IST.md`
- `docs/PRD/PHASE_21_PRD.md`

### Implementation files inspected
- `src/lib/intel/insights.ts`
- `src/lib/intel/extraction.ts`
- `src/lib/intel/customer-health.ts`
- `src/lib/intel/anomalies.ts`
- `src/lib/ai/provider.ts`
- `src/lib/ai/jobs.ts`
- `src/lib/ai/governance.ts`
- `src/app/app/intel/insights/page.tsx`
- `src/app/app/intel/insights/actions.ts`
- `src/app/app/intel/insights/[insightId]/page.tsx`
- `src/app/app/intel/anomalies/actions.ts`
- `src/app/app/intel/document-intelligence/actions.ts`
- `src/app/app/intel/customer-health/actions.ts`
- `src/app/app/intel/ai-usage/actions.ts`
- `src/lib/intel/__tests__/insights.test.ts`
- `src/lib/intel/__tests__/extraction.test.ts`
- `src/lib/intel/__tests__/anomalies.test.ts`
- `src/lib/intel/__tests__/customer-health.test.ts`
- `src/lib/ai/__tests__/evaluation.test.ts`
- `src/lib/ai/__tests__/governance.test.ts`
- `src/lib/ai/__tests__/provider.test.ts`
- `prisma/schema.prisma` (Phase 21 models)
- `src/lib/plans/config.ts`
- Both Phase 21 migration files

### Commands run
| Command | Result |
| --- | --- |
| `npx prisma validate` | ✅ passes |
| `npm run test` | ✅ 1121/1121 pass |
| `npm run build` | ✅ passes |
| `npm run lint` | ⚠️ 1 pre-existing error (Phase 20, unrelated to Phase 21) |

---

## 4. Findings

### Issue count summary

| Priority | Count |
| --- | --- |
| P0 — merge-blocking | 0 |
| P1 — must fix before master | 4 |
| P2 — important follow-up, not blocking | 2 |
| P3 — cleanup/nice-to-have | 3 |

---

### P1-01 — `promoteExtractionToDraft` creates no draft record

**Affected file:** `src/lib/intel/extraction.ts` — `promoteExtractionToDraft()`  
**Affected routes:** `src/app/app/intel/document-intelligence/[reviewId]/page.tsx`

**Description:**

The `promoteExtractionToDraft` function marks the `ExtractionReview` as `PROMOTED` and records the accepted field corrections, but it does not create any downstream draft record in the domain system (invoice, voucher, or vendor bill). The function returns `{ success: true }` with no `draftId`.

This means the core PRD promise of Document Intelligence — that approved extractions can be promoted into reviewable draft business records — does not work. Users who complete the full review and approval workflow receive no actionable output.

**PRD requirement (Sprint 21.2 Acceptance Criteria):**

> A user can upload a document, run extraction, review fields, correct fields, and create a draft.
> Promotion into business records must: create drafts only, write an audit log linking the AI job to the created draft, show what fields came from AI versus user edits.

**Why this matters:**

Document Intelligence is positioned as a workflow integration layer, not just a field-extraction viewer. Without draft creation, the workbench is a dead end. The extraction review state machine reaches PROMOTED, but nothing useful is created downstream.

**Required fix behavior:**

Implement draft creation for each supported `targetType`:

- `invoice` — call `db.invoice.create()` with `status: "DRAFT"`, populate fields from accepted extraction fields, link `aiJobId` in the draft record or via an audit event
- `voucher` — call `db.voucher.create()` with `status: "DRAFT"`, same field mapping
- `vendor_bill` — call `db.vendorBill.create()` with `status: "DRAFT"` if this model exists

The function must:
1. Create only drafts — never create records with a final, sent, approved, or paid status
2. Return the `draftId` of the created record
3. Write an audit log entry linking `reviewId`, `aiJobId`, `targetType`, and `draftId`
4. Validate org scope before creating any record
5. Handle the case where `targetType` is null or unsupported gracefully

If a full field mapping for all target types is not feasible in the remediation window, the function must at minimum create a draft for `invoice` type (the primary PRD use case) and return `{ success: false, error: "Unsupported target type" }` for others rather than returning `{ success: true }` falsely.

**Acceptance criteria:**

- `promoteExtractionToDraft` with `targetType: "invoice"` creates a draft invoice in the database
- The returned `draftId` is a real, queryable record id
- An audit event is written linking the AI job to the created draft
- The created draft has status `DRAFT`, never any finalized status
- Org scope is enforced (draft created with the caller's `orgId`)
- Malformed or null `targetType` returns an error, not silent success

---

### P1-02 — Customer health `disputedCount` always returns zero

**Affected file:** `src/lib/intel/customer-health.ts` — `computeCustomerHealth()`  
**Line:** 69 (invoice query filter), line 180 (disputed count calculation)

**Description:**

The invoice query at line 69 fetches invoices with these statuses:

```
["PAID", "PARTIALLY_PAID", "OVERDUE", "ISSUED", "VIEWED", "DUE", "CANCELLED", "ARRANGEMENT_MADE"]
```

The status `DISPUTED` is not in this list. The Prisma schema confirms `DISPUTED` is a valid `Invoice` status enum value. Because DISPUTED invoices are never fetched, the calculation at line 180:

```ts
const disputedCount = invoices.filter((i) => i.status === "DISPUTED").length;
```

always returns `0`. Every customer's dispute factor will show as positive (no disputes detected), regardless of their actual dispute history.

**Why this matters:**

The PRD explicitly lists "disputed/ticketed invoice count" as a customer health factor (Sprint 21.3). A customer with five disputed invoices looks as healthy as one with zero disputed invoices. This corrupts the score and makes the health system unreliable for the receivables use case, particularly for the collections priority queue where high-dispute customers should be surfaced prominently.

**Required fix behavior:**

Add `"DISPUTED"` to the invoice status filter array at line 69. The filter should include every invoice status that contributes to scoring — including DISPUTED. The fix is a one-line change.

**Acceptance criteria:**

- A customer with DISPUTED invoices has those invoices counted in `disputedCount`
- `disputedCount > 0` reduces the health score by the configured penalty
- A test covers the case where a customer has DISPUTED invoices and verifies the factor is non-zero
- The fix does not change other factor calculations

---

### P1-03 — Partner-managed-client anomaly scoping is absent

**Affected file:** `src/lib/intel/anomalies.ts` — `listAnomalyInsights()`, `runAnomalyDetection()`  
**Affected route:** `src/app/app/intel/anomalies/actions.ts`

**Description:**

`listAnomalyInsights(orgId)` returns all anomaly insights scoped to the given `orgId`. There is no concept of partner-managed-client visibility: a partner org that manages multiple client orgs should only see anomaly insights for client orgs where they hold active authorized access. Similarly, `runAnomalyDetection(orgId)` runs rules for a single org, but the actions layer does not verify that a partner calling this action has authorization for the target org.

**PRD requirement (Sprint 21.4 Acceptance Criteria):**

> Partner users only see anomalies for authorized managed client scopes.

**Why this matters:**

Without this check, a partner admin could potentially call anomaly list or run actions for any org ID, leaking sensitive operational intelligence (overdue spikes, GST filing failures, payout delays, access rejections) across org boundaries. This is a data isolation failure in a multi-tenant system that supports Partner OS.

**Required fix behavior:**

In the anomaly actions:
1. When the current org is a partner org, scope anomaly reads and detection runs to client orgs where the partner holds an active `PartnerClientAccess` record
2. When listing anomaly insights for a client org as a partner, validate that the calling org has an active access grant for that target org before returning results
3. If the calling org is a direct org (not a partner), the current behavior (org-scoped only) is correct

The fix should be implemented in the actions layer (`src/app/app/intel/anomalies/actions.ts`) rather than the library functions, consistent with the established pattern in the Partner OS module.

**Acceptance criteria:**

- A partner org cannot retrieve anomaly insights for a client org without an active `PartnerClientAccess` record
- A direct org user cannot access another org's anomaly insights
- A test covers the cross-org access rejection case
- Authorized partner access to a client org's anomalies works correctly

---

### P1-04 — Significant PRD anomaly category coverage gaps

**Affected file:** `src/lib/intel/anomalies.ts`

**Description:**

The PRD specifies 8 anomaly categories with approximately 28 distinct detection rules. The implementation covers 10 rules across 6 categories. The following PRD-required categories and specific rules are absent:

**Missing: Flow and notification anomalies (entire category)**

The PRD requires:
- SLA breaches rising
- Dead-letter queue growth
- Retry loop concentration
- Failed notification delivery spike

None of these rules are implemented. The SW Flow and notification delivery systems exist in the product (workflow runs, SLA metadata, notification deliveries) and the PRD explicitly calls this out as a required anomaly category.

**Missing: Several Books rules**

The PRD requires:
- Vendor bill approval bottleneck (bills stuck in pending)
- Payment run failure concentration
- Close task blocker aging

Only the unreconciled transaction spike rule is implemented for Books.

**Missing: Several GST operation rules**

The PRD requires:
- Validation issue spike
- Stale filing data after invoice changes
- Repeated submission/reconciliation failures

Only the "filing run blocked" rule is implemented for GST.

**Missing: Several integration rules**

The PRD requires:
- OAuth token refresh failures
- Sync drift detection
- Repeated provider errors

Only webhook delivery failures are implemented for integrations.

**Why this matters:**

The PRD states the anomaly detection system should detect problems "before they become support, compliance, or financial incidents." Missing the entire Flow/notification category means operational workflow failures will not surface as insights. Missing Books and GST rules means financial close blockers and compliance risks go undetected. The PRD acceptance criterion states "critical anomalies can be generated from deterministic test fixtures" — this criterion is only partially met.

**Required fix behavior:**

Implement the missing rules using the same deterministic DB-check pattern as existing rules:
1. At minimum, add at least one rule per missing category to complete category coverage
2. Prioritize: Flow SLA breach rule, Books vendor bill bottleneck rule, GST validation issue spike rule, Integration OAuth refresh failure rule
3. Each new rule must follow the same deduplication, evidence, expiry, and upsert pattern as existing rules
4. Each new rule must have a corresponding test in `anomalies.test.ts`

**Acceptance criteria:**

- At least one rule exists for each of the 8 PRD-required anomaly categories
- All new rules are deterministic (no AI-only detection)
- All new rules use dedupeKey and expiresAt
- All new rules have test coverage
- The master runner's `ALL_RULES` array includes all new rules

---

## 5. P2 Findings

### P2-01 — `/app/intel/insights/settings` route not implemented

**Affected area:** `src/app/app/intel/insights/`

**Description:**

The PRD (Sprint 21.1 Required UX Surfaces) specifies a settings route:

> `/app/intel/insights/settings`

This route does not exist. The PRD describes it as the surface for admin/ops AI health visibility and insight preference configuration.

**Why this matters:**

Missing a PRD-required route means the Sprint 21.1 UX acceptance criteria are incomplete. This is not merge-blocking because the core insights workspace is real and functional, but the settings surface is a documented deliverable.

**Required fix:** Create a basic `/app/intel/insights/settings` page that surfaces AI feature toggle status (enabled/disabled), plan limits, and a link to the AI usage dashboard. Can be implemented as a minimal admin-only page.

---

### P2-02 — `expireStaleInsights` has a duplicate status value

**Affected file:** `src/lib/intel/insights.ts` — `expireStaleInsights()`  
**Line:** ~302

**Description:**

The status filter contains "ACTIVE" twice:

```ts
status: { in: ["ACTIVE", "ACKNOWLEDGED", "ACTIVE"] },
```

The duplicate has no functional impact today (Prisma deduplicates the `IN` clause) but it is a logic defect that signals incomplete implementation. If a future status is added (e.g., `IN_PROGRESS`) and a developer adds it by modifying this array, the presence of the duplicate suggests the original developer had a copy-paste error.

**Required fix:** Remove the duplicate. The correct array is `["ACTIVE", "ACKNOWLEDGED"]`.

---

## 6. P3 Findings

### P3-01 — `getCustomerHealthSnapshot` loses customer name in cached path

**Affected file:** `src/lib/intel/customer-health.ts`

When returning a valid cached snapshot, the function returns `customerName: ""`. The UI receives an empty customer name for cached health results, requiring callers to resolve the name separately. Fix: join the `Customer` table in the snapshot query to return the name, or pass the customer name as an input to the function.

### P3-02 — `runAnomalyDetection` `insightsUpdated` counter is always zero

**Affected file:** `src/lib/intel/anomalies.ts`

The `insightsUpdated` variable in `runAnomalyDetection` is declared and passed to `AnomalyDetectionRun` but is never incremented. The `upsertInsight` function handles create vs update internally, but the run summary does not distinguish between new and refreshed insights. This makes the run history misleading. Fix: add a return value to `upsertInsight` indicating whether it was a create or update.

### P3-03 — Pre-existing lint error from Phase 20

**Affected file:** `src/app/app/settings/partners/page.tsx:76`

A pre-existing error from Phase 20 (`setState synchronously within an effect`) continues to exist. This is not a Phase 21 issue but is a lint error on the `master`-bound branch. Should be resolved before or alongside the Phase 21 remediation merge.

---

## 7. Security Requirements

The following security requirements from the Phase 21 PRD audit were verified:

| Requirement | Status |
| --- | --- |
| All insight reads/writes are org-scoped via `requireOrgContext` | ✅ compliant |
| AI cannot silently mutate financial/compliance state | ✅ compliant — promotion requires human approval |
| Prompt injection defenses in all system prompts | ✅ compliant — all 5 prompts include injection defense |
| Model output validated before persistence | ✅ compliant — `safeParseAiJson` + field validation |
| AI disable switch works | ✅ compliant — `AI_DISABLED=true` gates all AI calls |
| Missing provider credentials degrade safely | ✅ compliant — `no_credentials` error code returned |
| Usage metering records every AI call | ✅ compliant |
| Plan gates enforced server-side | ✅ compliant |
| PII minimization helper exists | ✅ compliant |
| Partner/managed-client anomaly scoping | ❌ **P1-03 — NOT compliant** |
| File upload validation exists | ✅ partial — content length limiting exists, MIME validation not verified in scope |

---

## 8. Migration and Backfill Requirements

The following verification was performed:

- `npx prisma validate` passes with no errors
- Both Phase 21 migrations are present and applied:
  - `20260416000100_phase21_intelligence_foundation`
  - `20260416000200_phase21_anomaly_detection_and_governance`
- No destructive column drops or renames
- All new tables include `orgId` for tenant scoping
- No migration drift detected

**No new migrations are required for remediation.** The P1 fixes are all application-layer changes in existing tables. If `promoteExtractionToDraft` is wired up to create draft records, it uses existing `Invoice`, `Voucher`, or `VendorBill` tables — no schema changes required.

---

## 9. Test Plan for Remediation

Each P1 fix requires specific test coverage before the remediation PR can be considered complete.

### Tests for P1-01 (draft promotion)

- `promoteExtractionToDraft` with `targetType: "invoice"` and approved fields creates a draft invoice
- The created invoice has `status: "DRAFT"` and `organizationId` matching the caller's org
- The created invoice is not sent, finalized, or approved
- An audit event is created linking `reviewId` and `draftId`
- Calling with `targetType: null` or unsupported type returns `{ success: false }`
- Calling on a non-APPROVED review returns `{ success: false }`

### Tests for P1-02 (disputed count)

- `computeCustomerHealth` with a customer who has two DISPUTED invoices returns `disputedCount > 0` in factors
- The health score is lower than a customer with identical history but no DISPUTED invoices
- `disputedCount === 0` for a customer with only PAID and OVERDUE invoices (no false positives)

### Tests for P1-03 (partner anomaly scoping)

- A partner org without an active `PartnerClientAccess` record for a target org receives an authorization error when calling `listAnomalyInsightsAction` for that org
- A partner org with an active access grant can successfully list anomaly insights for the client org
- A direct org user cannot access another direct org's anomaly insights

### Tests for P1-04 (missing anomaly categories)

- Each new anomaly rule fires when test data meets the threshold
- Each new anomaly rule does not fire when test data is below the threshold
- Each new rule uses a dedupeKey and does not create duplicate insights on repeated detection runs
- The master runner runs all new rules and records them in `AnomalyDetectionRun.rulesEvaluated`

---

## 10. Release Readiness Requirements

The following must be true before the remediation PR can be merged into `feature/phase-21` and `feature/phase-21` can merge to `master`:

1. All P1 fixes implemented and verified
2. All P1 tests written and passing
3. P2-01 (`/app/intel/insights/settings`) implemented
4. P2-02 (`expireStaleInsights` duplicate) corrected
5. P3-03 (pre-existing lint error in partners/page.tsx) resolved
6. `npm run lint` exits with 0 errors (not just warnings)
7. `npm run test` passes (all 1121+ tests pass)
8. `npm run build` passes
9. `npx prisma validate` passes
10. No new migrations required (confirm during implementation)
11. `docs/PHASE_21_RELEASE_CHECKLIST.md` updated to reflect remediation completion

---

## 11. Affected Files and Modules

| File | Issue(s) |
| --- | --- |
| `src/lib/intel/customer-health.ts` | P1-02, P3-01 |
| `src/lib/intel/extraction.ts` | P1-01 |
| `src/lib/intel/anomalies.ts` | P1-03 partial, P1-04, P3-02 |
| `src/app/app/intel/anomalies/actions.ts` | P1-03 |
| `src/lib/intel/insights.ts` | P2-02 |
| `src/app/app/intel/insights/` | P2-01 (missing settings route) |
| `src/app/app/settings/partners/page.tsx` | P3-03 (pre-existing) |

---

## 12. Remediation Branch and PR Workflow

1. All remediation work must be done on a sub-branch of `feature/phase-21`:  
   `feature/phase-21-remediation`

2. Commit strategy:
   - One commit per P1 fix with a focused commit message
   - Example: `fix(intel): wire draft creation in promoteExtractionToDraft`
   - Example: `fix(intel): include DISPUTED invoices in customer health score`
   - Example: `fix(intel): enforce partner scoping on anomaly reads`
   - Example: `feat(intel): add Flow, Books, GST, integration anomaly rules`

3. Open PR from `feature/phase-21-remediation` into `feature/phase-21`

4. PR must not target `master`

5. After PR is reviewed and merged into `feature/phase-21`, run full verification again before promoting to `master`

---

## 13. Final Acceptance Criteria Before Master Merge

Phase 21 may merge to `master` when:

- [ ] P1-01 `promoteExtractionToDraft` creates real draft records and all specified tests pass
- [ ] P1-02 `computeCustomerHealth` includes DISPUTED invoices in scoring and all specified tests pass
- [ ] P1-03 Partner-scoped anomaly access control is implemented and all specified tests pass
- [ ] P1-04 All 8 PRD anomaly categories have at least one implemented rule with tests
- [ ] P2-01 `/app/intel/insights/settings` route exists with at minimum a plan/status display page
- [ ] P2-02 `expireStaleInsights` duplicate status value corrected
- [ ] P3-03 Pre-existing partners/page.tsx lint error resolved
- [ ] `npm run lint` exits with 0 errors
- [ ] `npm run test` passes with all tests green
- [ ] `npm run build` passes
- [ ] `npx prisma validate` passes
- [ ] A final audit sign-off is recorded in `docs/PHASE_21_RELEASE_CHECKLIST.md`
