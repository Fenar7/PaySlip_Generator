# Phase 20 Release Checklist

**Sprint 20.5 — Hardening, Backfills, and Release Readiness**
**Prepared:** Sprint 20.5 hardening pass
**Branch baseline:** `feature/phase-20` (Sprints 20.1, 20.2, 20.3 merged)
**Sprint 20.4 status:** Open PR — NOT merged. See [Sprint 20.4 Dependency](#sprint-204-dependency) below.

---

## Phase 20 Sprints Summary

| Sprint | Description | Status |
|--------|-------------|--------|
| 20.1 | Marketplace Payout Operations | ✅ Merged to `feature/phase-20` |
| 20.2 | GST Filing Operations Workspace | ✅ Merged to `feature/phase-20` |
| 20.3 | Enterprise SSO Runtime | ✅ Merged to `feature/phase-20` |
| 20.4 | Partner Operating System | ⏳ Open PR — not yet merged |
| 20.5 | Hardening, Backfills, Release Readiness | ✅ This sprint |

---

## Migration Checklist

Run `scripts/check-db-migrations.sh` before deploying to any environment.

| Migration | Description | Status |
|-----------|-------------|--------|
| `20260415000001_phase20_sprint1_payout_ops` | MarketplaceRevenue, PayoutBeneficiary, PayoutRun, PayoutItems, PayoutAttempts, PayoutEvents | ✅ Applied |
| `20260415000002_phase20_sprint2_gst_filings` | GstFilingRun, GstFilingValidationIssue, GstFilingSubmission, GstFilingReconciliation | ✅ Applied |
| `20260415000003_phase20_sprint3_enterprise_sso_runtime` | SsoMetadataStatus enum, SsoAuthnRequestMode enum, SsoConfig columns, SsoBreakGlassCode | ✅ Applied |
| `20260415000005_phase20_sprint5_payment_run_rejection` | `PaymentRunStatus.REJECTED` enum value, `rejectedAt`/`rejectedByUserId`/`rejectionReason` columns on `payment_run` | ✅ Sprint 20.5 |

**Note:** Migration `20260415000004_phase20_sprint4_partner_os` exists only on `feature/phase-20-sprint-20-4` and is NOT part of this release unless Sprint 20.4 is merged first.

### Migration Safety Notes
- Sprint 20.5 migration uses `ALTER TYPE ... ADD VALUE IF NOT EXISTS` — safe to re-run on Postgres.
- `ADD COLUMN IF NOT EXISTS` guards ensure idempotency.
- All Phase 20 migrations are forward-only. No rollback SQL is provided; rollback requires a point-in-time restore.

---

## Backfill Checks

Run after migration, before declaring release-ready:

```bash
# 1. Dry-run payout eligibility backfill (shows what would be changed)
DRY_RUN=true npx tsx scripts/backfill-phase20-payout-eligibility.ts

# 2. If dry-run output is acceptable, apply
npx tsx scripts/backfill-phase20-payout-eligibility.ts

# 3. Run Phase 20 operational health check
npx tsx scripts/check-phase20-health.ts
```

### Backfill Script Registry

| Script | Purpose | Idempotent |
|--------|---------|-----------|
| `scripts/backfill-phase20-payout-eligibility.ts` | Mark `pending` revenue records as `eligible` after cooling period | ✅ Yes |
| `scripts/check-phase20-health.ts` | Read-only health check for payout, GST, SSO, and payment-run state | ✅ Read-only |

**Critical:** Backfill scripts must be run with `DATABASE_URL` pointing to the correct target environment. Do not run production backfills against staging data or vice versa.

---

## Environment Variable Checklist

### Required — Core Platform
| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ Required | Postgres connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Required | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Required | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | Supabase service role (server-side) |
| `NEXTAUTH_SECRET` / `APP_SECRET` | ✅ Required | Session security |

### Required — Phase 20 Marketplace Payouts (Sprint 20.1)
| Variable | Required | Notes |
|----------|----------|-------|
| `MARKETPLACE_FINANCE_USER_IDS` | ✅ Required | Comma-separated Supabase user UUIDs for finance operators |
| `MARKETPLACE_MODERATOR_USER_IDS` | ✅ Required | Comma-separated Supabase user UUIDs for marketplace moderators |
| `MARKETPLACE_PAYOUT_PROVIDER` | Optional | Defaults to `manual`. Set to provider name when integrating a payment provider. |
| `MARKETPLACE_PAYOUT_SETTLEMENT_HOLD_DAYS` | Optional | Defaults to `7`. Number of days to hold marketplace revenue before marking eligible. |

> ⚠️ **Security note:** `MARKETPLACE_FINANCE_USER_IDS` and `MARKETPLACE_MODERATOR_USER_IDS` are comma-separated allowlists of Supabase user UUIDs. These must be set to actual platform operator user IDs. An empty value means no one can access finance/moderation operations.

### Required — Phase 20 GST Filing (Sprint 20.2)
| Variable | Required | Notes |
|----------|----------|-------|
| `GST_FILING_PROVIDER` | Optional | Defaults to `manual`. Only `manual` is supported in this phase. |

### Required — Phase 20 Enterprise SSO (Sprint 20.3)
| Variable | Required | Notes |
|----------|----------|-------|
| `FEATURE_SSO_ENABLED` | Optional | Defaults to `true`. Set to `false` to disable SSO feature globally. |
| `SSO_SESSION_SECRET` | ✅ Required if SSO is enabled | Secret for SSO session cookie signing. Must be a strong random string (≥32 chars). |
| `NEXT_PUBLIC_APP_URL` | ✅ Required | Used for SAML ACS URL construction. Must be the canonical production URL. |

### Optional — Infrastructure
| Variable | Required | Notes |
|----------|----------|-------|
| `UPSTASH_REDIS_REST_URL` | Optional | If set, Upstash Redis is used for rate limiting and caching. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Required if `UPSTASH_REDIS_REST_URL` is set. |
| `CRON_SECRET` | Required for cron routes | Secures `/api/cron/*` endpoints. |

---

## Authorization Verification

Before releasing, verify the following authorization boundaries are intact:

### Marketplace Payout Finance
- ✅ `requireMarketplaceFinance()` — gates all financial mutations (approve, execute, manual-resolve)
- ✅ `requireMarketplaceFinanceOrModerator()` — gates read/listing operations
- ✅ `MARKETPLACE_FINANCE_USER_IDS` env var must be set and contain at least one user
- 🔍 **Verify:** Send an authenticated request as a non-finance user to `/app/admin/marketplace/payouts`. Expect 403.

### Publisher Payout Visibility
- ✅ `requireMarketplacePublisherAdmin()` — gates publisher payout dashboard and beneficiary setup
- ✅ Publisher can only see their own org's payout data (`publisherOrgId = context.orgId`)
- 🔍 **Verify:** A publisher cannot access another publisher's payout summary.

### GST Filing Operations
- ✅ `requireGstReadAccess()` — requires org context + `gstrExport` plan feature
- ✅ `requireGstWriteAccess()` — requires org admin role + `gstrExport` plan feature
- 🔍 **Verify:** A non-admin member cannot trigger GST validation or submission.

### SSO Configuration
- ✅ `getOrgContext()` + `hasRole(context.role, "admin")` — gates all SSO config mutations
- ✅ `orgId !== context.orgId` check — prevents cross-org SSO config access
- ✅ SAML assertion replay detected via `ssoAssertionReplay` DB lookup before auth link generation
- 🔍 **Verify:** A non-admin user cannot modify SSO config. A replayed SAML assertion is rejected.

### Books — Payment Run Rejection (Sprint 20.5)
- ✅ `rejectPaymentRun` — only `PENDING_APPROVAL` runs can be rejected; actor is recorded
- ✅ `resubmitPaymentRun` — only `REJECTED` runs can be resubmitted; clears rejection state
- 🔍 **Verify:** Attempting to reject an `APPROVED` run throws `"Only pending approval runs can be rejected"`.

---

## Smoke Test Matrix

Run these manually in staging after deploying and running migrations:

| Area | Test | Expected |
|------|------|----------|
| Marketplace payouts | Finance user views payout dashboard | Loads, no 403 |
| Marketplace payouts | Non-finance user accesses `/admin/marketplace/payouts` | 403 |
| Marketplace payouts | Create and approve a payout run | Status moves to APPROVED |
| Publisher payouts | Publisher views their payout summary | Loads, shows own data only |
| Publisher payouts | Publisher saves beneficiary bank details | Saved, status PENDING |
| GST filing | Org admin creates a filing run | Run created in DRAFT |
| GST filing | Validate a filing run | Status moves to READY or BLOCKED |
| GST filing | Submit a READY run | Status moves to SUBMISSION_PENDING |
| GST filing | Attempt to submit an already-active run | Error: duplicate submission guard |
| SSO config | Org admin saves SSO config | Saved, metadata status PENDING |
| SSO config | Non-admin user attempts SSO config save | 403 |
| SSO login | Complete SAML login flow | User authenticated and session created |
| SSO login | Replay same SAML assertion | Error: replay detected |
| SSO enforcement | Member accesses org with SSO enforced, no session | Redirected to SSO login |
| SSO enforcement | Owner with break-glass session bypasses enforcement | Access granted |
| Payment run rejection | Reject a PENDING_APPROVAL run | Status → REJECTED, reason recorded |
| Payment run rejection | Resubmit a REJECTED run | Status → DRAFT, rejection cleared |
| Payment run rejection | Attempt to reject an APPROVED run | Error: invalid state |

---

## Idempotency and Concurrency Summary

| Operation | Guard | Verified |
|-----------|-------|---------|
| Marketplace payout run execution | Item-level idempotency key (`buildAttemptIdempotencyKey`) prevents duplicate payments | ✅ |
| Marketplace payout manual resolution | Resolution idempotency key scoped by item + kind | ✅ |
| GST filing submission | Active submission check prevents concurrent submissions | ✅ |
| GST filing stale validation | `ensureCurrentValidation` hash check blocks submissions on stale data | ✅ |
| SAML assertion replay | `ssoAssertionReplay` DB table with unique assertionId | ✅ |
| Backfill scripts | Status-based skip guard (only processes `pending` records) | ✅ |
| Payment run rejection | State guard ensures only `PENDING_APPROVAL` can be rejected | ✅ (Sprint 20.5) |

---

## Observability and Support Readiness

### Log Events to Monitor Post-Deploy

| System | Log Signal | Action |
|--------|-----------|--------|
| Marketplace payouts | Payout item `FAILED` with no `manualResolutionKind` | Finance team manually reviews |
| Marketplace payouts | Payout run stuck in `PROCESSING` | Investigate provider status, use manual resolution |
| GST filing | Filing run stuck in `VALIDATING` or `SUBMITTING` | Check filing provider, retry validation |
| GST filing | Submission error | Check GST portal credentials and invoice data integrity |
| SSO | `SAML assertion replay detected` | Security alert — investigate replay source |
| SSO | `SSO request state has expired` | User took too long to complete login — retry |
| SSO | `isActive: true` + `metadataStatus: FAILED` | Trigger metadata refresh in SSO settings |
| Payment run | `REJECTED` status | Normal — awaiting resubmission by requestor |

### Runbook: Stuck Payout Run
1. Check `marketplacePayoutRun` table for runs in `PROCESSING` status
2. Review associated `marketplacePayoutItem` records — identify failed items
3. For each failed item, use `resolveMarketplacePayoutItemManually` with `kind: 'failed'` or `kind: 'paid'`
4. Once all items are resolved, the run may be manually reconciled

### Runbook: Stuck GST Filing Run
1. Check `gstFilingRun` for runs in `VALIDATING` or `SUBMITTING`
2. If stuck in VALIDATING: re-run validation. Check `gstFilingValidationIssue` for blocking errors
3. If stuck in SUBMITTING: check `gstFilingSubmission` for the active attempt
4. Use `recordGstFilingSubmissionResult` to record the outcome (submitted or failed)

### Runbook: SSO Login Failures
1. Check `ssoConfig` for `lastFailureAt` and `lastFailureReason`
2. Verify IdP certificates are current — `idpCertificates` must not be null
3. If `metadataStatus = FAILED`: refresh metadata in SSO settings UI
4. If `ssoEnforced = true` and `isActive = false`: admin must re-enable SSO or disable enforcement
5. For locked-out owners: use break-glass code from SSO settings

---

## Known Release Blockers

### ⚠️ Sprint 20.4 Dependency (Pending PR)

**Status:** Sprint 20.4 (Partner Operating System) is an open PR and has NOT been merged to `feature/phase-20`.

**Impact:** The following capabilities are not available in this release:
- Partner lifecycle management (applied/under_review/approved/suspended/revoked)
- Platform admin partner governance surfaces
- Managed client assignment and revocation
- Partner activity attribution and audit
- Partner dashboard and reporting

**Action required:** Sprint 20.4 PR must be reviewed, approved, and merged before Phase 20 includes Partner OS capabilities. A separate Sprint 20.5 hardening pass over Sprint 20.4 schema/logic will be needed post-merge.

### ⚠️ Baseline Test Blockers (Resolved in Sprint 20.5)

| Blocker | Status |
|---------|--------|
| `rejectPaymentRun` / `resubmitPaymentRun` not exported from `vendor-bills.ts` | ✅ Fixed in Sprint 20.5 |
| `PaymentRunStatus.REJECTED` enum value missing from schema | ✅ Fixed in Sprint 20.5 |
| `rejectedAt` / `rejectedByUserId` / `rejectionReason` columns missing from `payment_run` | ✅ Fixed in Sprint 20.5 |

### 🔎 Potential Remaining Risks

1. **`ioredis` optional dependency** — The codebase uses an optional Redis client via Upstash. If `UPSTASH_REDIS_REST_URL` is not set, the Redis client is disabled. Verify behavior under load without Redis.

2. **SSO metadata refresh** — Metadata refresh is not automated by a cron in this phase. IdP certificate rotation requires manual metadata re-fetch via SSO settings UI.

3. **GST filing provider** — Only `manual` provider is supported. Any future GSTIN portal integration requires a new provider adapter.

4. **Marketplace payout provider** — Only manual payout is implemented. Payment provider integration (e.g., Razorpay X, Cashfree Payouts) requires the `MARKETPLACE_PAYOUT_PROVIDER` env var and a provider adapter.

5. **Sprint 20.4 schema isolation** — Phase 20.5 does not include Partner OS schema. If Sprint 20.4 is merged after 20.5, a follow-up hardening pass is required for partner governance.

---

## Rollback Expectations

Phase 20 does not include automated rollback SQL. In the event of a critical post-deploy failure:

1. **Application rollback**: Re-deploy the previous application build (Sprints 20.1–20.3 baseline or pre-Phase-20).
2. **Schema rollback**: Requires a point-in-time restore of the database to a pre-migration snapshot.
3. **Data rollback**: Payout, GST filing, and SSO records created post-migration are append-only; they cannot be safely removed without data loss.

> **Recommendation:** Take a full database snapshot immediately before running Phase 20 migrations in production.

---

## Verification Commands

Run all of these before declaring Phase 20 release-ready:

```bash
# Schema validation
npx prisma validate

# Unit tests (must pass with 0 failures)
npm run test

# Lint (must exit 0)
npm run lint

# Production build (must complete with no errors)
npm run build

# Operational health check (requires DATABASE_URL)
npx tsx scripts/check-phase20-health.ts

# Payout eligibility backfill (dry run first)
DRY_RUN=true npx tsx scripts/backfill-phase20-payout-eligibility.ts
```

---

## Phase 20 Release-Ready Assessment

| Gate | Status |
|------|--------|
| Migrations valid and idempotent | ✅ |
| Unit tests passing (post-Sprint-20.5 blocker fix) | ✅ |
| Lint passing | ✅ |
| Build passing | ✅ |
| Authorization boundaries reviewed | ✅ |
| Idempotency guards verified | ✅ |
| Backfill scripts available | ✅ |
| Health check script available | ✅ |
| Release checklist documented | ✅ |
| Sprint 20.4 (Partner OS) merged | ❌ Pending PR |
| E2E tests passing | ⚠️ Not verified — known startup issue with `.next` cleanup |

**Overall: Phase 20 (Sprints 20.1–20.3, 20.5) is conditionally release-ready. Sprint 20.4 must be merged and validated before Partner OS capabilities are available in production.**
