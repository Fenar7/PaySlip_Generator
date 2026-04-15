# Phase 21 Release Checklist — Slipwise One SW Intel

**Phase:** 21 — SW Intel Advanced Intelligence and AI Operations Layer  
**Baseline:** `feature/phase-21` (stacks 21.1 → 21.2 → 21.3 → 21.4 → 21.5)  
**Target:** `master` (after all sprint PRs are merged and this checklist passes)

---

## 1. Branch and PR Readiness

- [ ] PR #104 (Sprint 21.1 — Intelligence Foundation) merged into `feature/phase-21`
- [ ] PR #105 (Sprint 21.2 — Document Intelligence Workbench) merged into `feature/phase-21`
- [ ] PR #106 (Sprint 21.3 — Customer Health Intelligence) merged into `feature/phase-21`
- [ ] Sprint 21.4 PR (Anomaly Detection) merged into `feature/phase-21`
- [ ] Sprint 21.5 PR (AI Governance) merged into `feature/phase-21`
- [ ] `feature/phase-21` is up to date with `master` (no conflicts)
- [ ] Final PR from `feature/phase-21` → `master` is created and reviewed

---

## 2. Schema and Migrations

- [ ] `npx prisma validate` passes on final `feature/phase-21` HEAD
- [ ] All Phase 21 migrations present and in order:
  - `20260416000100_phase21_intelligence_foundation/` — IntelInsight, InsightEvent, AiJob, AiJobEvent, ExtractionReview, ExtractionField, CustomerHealthSnapshot
  - `20260416000200_phase21_anomaly_detection_and_governance/` — AnomalyRule, AnomalyDetectionRun, AiUsageRecord
- [ ] Migrations are idempotent (use `IF NOT EXISTS` and `DO $$ BEGIN...EXCEPTION` guards)
- [ ] Migration applied to staging database successfully
- [ ] No breaking column renames or destructive changes

---

## 3. Environment Variables (Required Before Release)

### Required (will break the app if missing)
```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Required for AI features (app degrades gracefully without these)
```
OPENAI_API_KEY        — AI provider calls. Without this, all AI features return graceful "no provider" errors.
OPENAI_MODEL          — Optional. Defaults to "gpt-4o-mini" if not set.
```

### Operational controls
```
AI_DISABLED           — Set to "true" to globally disable all AI provider calls without breaking core flows.
CRON_SECRET           — Required for authenticated cron routes (anomaly detection scheduled runs).
```

**Pre-release action:** Run `npx tsx scripts/check-phase21-health.ts` to surface any missing required vars.

---

## 4. AI Features Verification

- [ ] `isAiGloballyDisabled()` returns `false` in production (or `true` if intentionally disabling AI at launch)
- [ ] `checkProviderHealth()` returns healthy (or health check is acknowledged as degraded-mode launch)
- [ ] `canUseAiFeature()` correctly enforces plan gates in staging
- [ ] AI usage records appear in `ai_usage_record` table after test calls
- [ ] Monthly usage limits enforced correctly for Pro plan (200 runs/month)
- [ ] Enterprise plan has unlimited (`Infinity`) AI runs

---

## 5. Anomaly Detection Verification

- [ ] Anomaly Detection page accessible at `/app/intel/anomalies` on Pro+ plans
- [ ] "Run Detection Now" button triggers `runAnomalyDetection()` and creates an `AnomalyDetectionRun`
- [ ] Detection run records are created with correct `orgId` scoping
- [ ] Duplicate anomalies are deduplicated (upsert behavior via `dedupeKey`)
- [ ] Anomalies expire correctly based on `expiresAt`
- [ ] Anomaly detail page shows evidence, lifecycle events, and action buttons
- [ ] Free/Starter plan users see upgrade prompt, not anomaly data

---

## 6. Document Intelligence Verification

- [ ] Document Intelligence page accessible at `/app/intel/document-intelligence` on Pro+ plans
- [ ] File upload creates an `ExtractionReview` record
- [ ] Review workbench shows field-level confidence and validation status
- [ ] Corrected values stored separately from original AI output
- [ ] Promotion creates only draft records (not live invoices/vouchers)
- [ ] Rejected extractions do not create any business records

---

## 7. Customer Health Verification

- [ ] Customer Health page accessible at `/app/intel/customer-health`
- [ ] Snapshots created with `calculatedAt` and `validUntil` timestamps
- [ ] 24-hour snapshot cache respects `validUntil`
- [ ] Risk bands display correctly: `healthy`, `at_risk`, `high_risk`, `critical`
- [ ] Collection queue at `/app/intel/collections` is scoped to org
- [ ] Insufficient data case shows safe empty state (no black-box score)

---

## 8. Security Review

- [ ] All server actions call `requireOrgContext()` or `requireRole()` before DB access
- [ ] All DB queries include `orgId` filter (no cross-tenant data access)
- [ ] Partner users cannot see other clients' anomalies or insights
- [ ] AI output is never trusted to mutate financial, compliance, billing, or identity state directly
- [ ] Uploaded documents are treated as data, not instructions (system prompts block injection)
- [ ] `safeParseAiJson()` handles malformed output gracefully (returns null, never throws)
- [ ] PII minimization applied before including customer data in prompts
- [ ] No raw prompt payloads exposed in API responses
- [ ] Prompt injection evaluation fixtures pass (from `evaluation.test.ts`)

---

## 9. Verification Commands

Run all of these before merging `feature/phase-21` → `master`:

```bash
# Schema
npx prisma validate
npx prisma generate

# Targeted tests
npx vitest run src/lib/ai/__tests__/provider.test.ts
npx vitest run src/lib/ai/__tests__/evaluation.test.ts
npx vitest run src/lib/ai/__tests__/governance.test.ts
npx vitest run src/lib/intel/__tests__/insights.test.ts
npx vitest run src/lib/intel/__tests__/extraction.test.ts
npx vitest run src/lib/intel/__tests__/customer-health.test.ts
npx vitest run src/lib/intel/__tests__/anomalies.test.ts

# Full suite
npm run lint
npm run test
npm run build

# Health check (requires DATABASE_URL)
npx tsx scripts/check-phase21-health.ts
```

---

## 10. Operational Notes

### AI Disable Switch
Set `AI_DISABLED=true` to globally suppress all AI provider calls. Core non-AI workflows (invoicing, payments, GST, books, payroll) continue unaffected.

### Data Retention
- `AiJob` and `AiJobEvent` records: retained for audit purposes. Review retention policy per compliance requirements.
- `AiUsageRecord`: retained for billing audit. Configurable cleanup job can purge records older than retention threshold.
- `ExtractionReview` rejected output: can be purged after 90 days (no business record created).
- `CustomerHealthSnapshot`: retain per customer record retention policy.

### Rollback Plan
Phase 21 uses additive-only schema changes. Rollback procedure:
1. Revert application code to pre-Phase-21 state.
2. Phase 21 tables remain but are ignored by application.
3. No destructive schema changes were made to existing tables.
4. No existing data was mutated by Phase 21 migrations.

### Backfill Notes
- Existing `OcrJob` records from pre-Phase-21 are not automatically linked to `ExtractionReview`. Manual backfill is not required — new reviews use the Phase 21 workflow.
- `CustomerHealthSnapshot` records are created on-demand and on a 24-hour refresh cycle. No backfill needed.

---

## 11. Sign-Off

| Check | Owner | Status |
|-------|-------|--------|
| All sprint PRs merged | Engineering Lead | ☐ |
| Migrations applied to staging | DevOps | ☐ |
| AI provider health verified | Engineering | ☐ |
| Security review complete | Security/Engineering | ☐ |
| Full test suite passing | QA/Engineering | ☐ |
| Release checklist reviewed | Product | ☐ |
| `feature/phase-21` → `master` PR approved | Engineering Lead | ☐ |
