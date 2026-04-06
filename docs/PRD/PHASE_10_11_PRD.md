# Slipwise One — Phase 10 & Phase 11
## Product Requirements Document (PRD)
### Version 1.0 | Engineering Handover Document

---

## Document Overview

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 10: Hardening + Pricing Readiness + AWS Path · Phase 11: Subscription Billing, Commercial Launch & Growth |
| **Document Purpose** | Full engineering handover — autonomous multi-agent execution ready |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–9 completed |
| **Branch Convention** | `feature/phase-10-hardening` · `feature/phase-11-billing` |
| **Sprint Model** | 2 sprints (Phase 10) + 3 sprints (Phase 11) |
| **Total Sprints** | 5 sprints across both phases |
| **Engineering Model** | Multi-agent parallel execution recommended |

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State (Post Phase 9)](#2-current-state-post-phase-9)
3. [Phase 10 — Hardening, Pricing Readiness, AWS Path](#3-phase-10--hardening-pricing-readiness-aws-path)
   - 3.1 Sprint 10.1 — Production Hardening & Commercial Readiness
   - 3.2 Sprint 10.2 — Deployment Maturity & AWS Migration Path
   - 3.3 Architecture Changes
   - 3.4 Database Schema Additions
   - 3.5 Acceptance Criteria
4. [Phase 11 — Subscription Billing, Commercial Launch & Growth](#4-phase-11--subscription-billing-commercial-launch--growth)
   - 4.1 Objective
   - 4.2 Sprint 11.1 — Pricing Model & Plan Infrastructure
   - 4.3 Sprint 11.2 — Billing Integration (Stripe)
   - 4.4 Sprint 11.3 — Growth, Onboarding Conversion & Analytics
   - 4.5 Pricing Tiers (Full Specification)
   - 4.6 Feature Gating Matrix
   - 4.7 Database Schema Additions
   - 4.8 Architecture Changes
   - 4.9 Acceptance Criteria
5. [Shared Technical Standards](#5-shared-technical-standards)
6. [Route Map](#6-route-map)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Risk Register](#8-risk-register)
9. [QA & Acceptance Gates](#9-qa--acceptance-gates)
10. [Multi-Agent Execution Strategy](#10-multi-agent-execution-strategy)

---

## 1. Product Context & Phase Summary

Slipwise One is a modular SaaS document operations suite comprising:
- **SW Docs** — Invoices, Vouchers, Salary Slips, PDF Studio
- **SW Pay** — Payment lifecycle, receivables, proof uploads
- **SW Flow** — Orchestration, recurring billing, reminders
- **SW Intel** — Dashboard, reports, analytics
- **SW Auth & Access** — Roles, permissions, proxy, audit
- **SW Pixel** — Passport photo, image prep utilities

### Delivery Roadmap Status

| Phase | Name | Status |
|---|---|---|
| 0 | Stabilization + Suite Re-architecture | ✅ Done |
| 1 | SW Auth Foundation | ✅ Done |
| 2 | Docs Persistence | ✅ Done |
| 3 | Docs UX + Templates | ✅ Done |
| 4 | SW Pay Lifecycle | ✅ Done |
| 5 | SW Flow Orchestration | ✅ Done |
| 6 | SW Intel Dashboard & Reports | ✅ Done |
| 7 | Roles, Permissions, Proxy & Audit | ✅ Done |
| 8 | PDF Studio Expansion | ✅ Done |
| 9 | SW Pixel Launch | ✅ Done |
| **10** | **Hardening + Pricing Readiness + AWS Path** | 🔲 This Phase |
| **11** | **Subscription Billing + Commercial Launch + Growth** | 🔲 This Phase |

### What These Phases Deliver

**Phase 10** is the enterprise readiness and infrastructure maturity phase. It closes technical debt, hardens all critical flows, adds rate limiting, storage tracking, audit completeness, error recovery, and prepares a documented AWS migration path. No new user-facing features — this is pure stabilization and operational excellence.

**Phase 11** is the commercial launch phase. It introduces the subscription billing model (Stripe), enforces plan-based feature gating, implements the pricing tier UI, adds usage tracking, builds the conversion funnel from free utility users to paid workspace subscribers, and launches growth mechanisms (referrals, public landing pages, invite flows).

---

## 2. Current State (Post Phase 9)

### What's Built

| Module | Status | Notes |
|---|---|---|
| Invoice creation + templates | ✅ | 5 templates, inline editing, PDF/PNG export |
| Voucher creation + templates | ✅ | 5 templates, inline editing |
| Salary Slip creation + templates | ✅ | 5 templates, inline editing |
| PDF Studio (10 tools) | ✅ | merge, split, delete, organize, resize, fill-sign, protect, header-footer, pdf-to-image, repair |
| SW Pixel (5 tools) | ✅ | passport, resize, adjust, print-layout, labels |
| SW Pay | ✅ | Payment states, proof uploads, receivables dashboard |
| SW Flow | ✅ | Recurring billing, scheduled sends, reminders, Trigger.dev |
| SW Intel | ✅ | KPI dashboard, reports, CSV export |
| Roles + Permissions | ✅ | 7 roles, 15 modules, proxy grants, audit logs |
| Org creation | ✅ | Profile upsert fixed |
| Template inline editing | ✅ | All 15 templates editable in Document Canvas |

### Known Technical Debt

1. **No rate limiting** on any API route — vulnerable to abuse
2. **No storage usage tracking** — can't enforce per-org limits
3. **No plan/subscription model** — product is entirely free with no enforcement
4. **Recurring job failure recovery** — no dead-letter queue or retry dashboard
5. **Send log gaps** — some send attempts not fully logged
6. **No performance monitoring** beyond basic Vercel analytics
7. **Vercel deployment only** — no AWS path formalized
8. **No backup/DR strategy** — Supabase default only
9. **Audit log gaps** — not all proxy-sensitive actions covered
10. **No onboarding funnel metrics** — can't track signup→activation

---

## 3. Phase 10 — Hardening, Pricing Readiness, AWS Path

### 3.1 Objective

Make Slipwise One enterprise-ready, commercially viable to price, and safely scalable. No new user features. Focus: performance, reliability, observability, and deployment maturity.

---

### Sprint 10.1 — Production Hardening & Commercial Readiness

**Duration:** 1 sprint  
**Goal:** Every critical flow is stable, monitored, and rate-limited. The product can be safely offered to paying customers.

#### A. Rate Limiting

**Implementation:** Use Upstash Redis + `@upstash/ratelimit` library.

**Rate limit tiers:**

| Endpoint Category | Free Tier | Pro Tier | Enterprise |
|---|---|---|---|
| PDF export (PDF/PNG) | 10/hour per org | 100/hour per org | unlimited |
| PDF Studio tools | 20/hour per org | 200/hour per org | unlimited |
| SW Pixel tools | 30/hour per org | unlimited | unlimited |
| Doc creates | 50/day per org | unlimited | unlimited |
| Email sends | 20/day per org | 200/day per org | custom |
| API (general) | 200/min per IP | 500/min per IP | 1000/min |

**Implementation details:**
- Middleware: `src/middleware.ts` — intercept `/api/export/*`, `/api/pdf-studio/*`, `/api/pixel/*` routes
- Rate limit key: `${orgId}:${endpoint}` for org-scoped limits, `${ip}:${endpoint}` for IP limits
- Response on limit hit: `429 Too Many Requests` with `Retry-After` header and JSON body `{ error: "rate_limited", retryAfterMs: N }`
- Rate limit state stored in Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` env vars)
- Graceful degradation: if Redis unavailable, allow request (fail open, log warning)

**Files to create/modify:**
- `src/middleware.ts` — rate limit middleware
- `src/lib/rate-limit.ts` — rate limiter factory using Upstash
- `src/lib/constants/rate-limits.ts` — rate limit config by plan tier

#### B. Storage Usage Tracking

**Goal:** Track per-org storage consumption so that plan limits can be enforced in Phase 11.

**What to track:**
- PDF export file sizes (estimated from response buffer)
- Uploaded proof/attachment files (actual S3 object size)
- Logo uploads
- SW Pixel output images

**Implementation:**
- Add `StorageUsage` model to Prisma schema (see Section 3.4)
- `src/lib/storage-tracker.ts` — increment/decrement org storage usage
- Hook into: proof upload, logo upload, PDF export, Pixel export
- Background job (Trigger.dev): nightly `recalculate-org-storage` job that reconciles S3 vs DB
- API: `GET /api/org/[orgId]/storage-usage` — returns current usage by category

**Storage limits by plan (defined now, enforced in Phase 11):**

| Plan | Total Storage | Per-export limit |
|---|---|---|
| Free | 500 MB | 10 MB |
| Starter | 5 GB | 25 MB |
| Pro | 50 GB | 100 MB |
| Enterprise | Custom | Custom |

#### C. Recurring Job Failure Recovery

**Goal:** All background jobs have retry logic, dead-letter handling, and admin visibility.

**Trigger.dev jobs to harden:**
1. `scheduled-send` — invoice/voucher scheduled email sends
2. `recurring-invoice` — auto-generate recurring invoice
3. `reminder-send` — payment reminders
4. `nightly-report` — report snapshot generation

**Per job, implement:**
- Max retries: 3 (exponential backoff: 1min → 5min → 30min)
- On final failure: write `JobLog` entry with `status: "failed"`, `errorMessage`, `payload` snapshot
- Trigger.dev webhook on failure → `POST /api/webhooks/job-failed` → stores in `JobLog`
- Admin UI: `src/app/app/settings/jobs/page.tsx` — job history table with status, retry button, error detail
- Alert: if >3 jobs fail in 1 hour, create `Notification` for org owner with `type: "job_failure_alert"`

**Files to create/modify:**
- `src/lib/jobs/` — job definitions with retry config
- `src/app/app/settings/jobs/page.tsx` — job log UI
- `src/app/api/webhooks/job-failed/route.ts` — failure webhook handler

#### D. Send Log Completeness

**Goal:** Every outbound communication attempt is fully logged.

**Send log events to capture:**
- Invoice email sent
- Invoice reminder sent
- Recurring invoice generated + sent
- Scheduled send fired
- Payment proof received notification
- Ticket response email
- Invite email
- Password reset / OTP email

**Implementation:**
- Extend `AuditLog` or create dedicated `SendLog` model (see 3.4)
- `src/lib/send-logger.ts` — `logSend(orgId, type, recipientEmail, status, metadata)`
- Hook into all Resend/email send points
- Admin UI: `src/app/app/settings/send-log/page.tsx` — filterable send log table

#### E. Audit Log Completeness

**Goal:** All proxy-sensitive, security, and billing-relevant actions are in audit trail.

**Gaps to fill:**
- Proxy grant create/revoke/use
- Role change
- Invitation sent/accepted/revoked
- Member removed
- Org settings change (branding, email domain)
- Document delete (currently missing)
- Document status change (issue, cancel, reissue)
- Export event (who exported what, when)
- Login / logout / failed login

**Implementation:**
- Audit hook utility: `src/lib/audit.ts` — `createAuditLog(params)` (already exists, extend it)
- Add audit calls to all server actions listed above
- Audit viewer: `src/app/app/settings/audit/page.tsx` — already built in Phase 7, verify completeness

#### F. Performance Checks

**Goal:** No page or API route exceeds acceptable latency thresholds.

**Targets:**
- Dashboard load (SW Intel): < 1.5s (p95)
- Invoice list page: < 800ms (p95)
- PDF export: < 8s (p95)
- PDF Studio tool: < 5s (p95, client-side) / < 15s (p95, server-side)
- API routes: < 500ms (p95) for CRUD, < 200ms for reads

**Implementation:**
- Add `ServerTiming` headers to all API routes
- Add PostHog custom events for export latency: `export_completed` with `{ duration_ms, format, template }`
- Run Vercel Analytics speed insights review
- Database: add missing indexes (see 3.4)
- N+1 query audit: review all `findMany` calls in server actions for missing `include` optimization

**Files to create/modify:**
- `src/lib/server-timing.ts` — timing utility
- Review and optimize: `src/app/app/docs/invoices/actions.ts`, `src/app/app/intel/actions.ts`

#### G. Sentry Integration (Error Monitoring)

**Goal:** All runtime errors captured and alerted.

**Implementation:**
- Install `@sentry/nextjs`
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Configure `SENTRY_DSN` env var
- Wrap all server actions with Sentry try/catch reporting
- Set Sentry user context from auth session (`userId`, `orgId`)
- Alert rules: notify Slack/email on new error, >10 errors/hour on same issue

**Files to create:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts` (Next.js instrumentation hook)

---

### Sprint 10.2 — Deployment Maturity & AWS Migration Path

**Duration:** 1 sprint  
**Goal:** Document and validate the path from Vercel to AWS. Make the app migration-safe.

#### A. AWS Migration Architecture Document

**Deliverable:** `docs/architecture/AWS_MIGRATION_PLAN.md`

**Contents:**
1. Current architecture diagram (Vercel + Supabase + Upstash + Trigger.dev + Resend)
2. Target AWS architecture diagram
3. Service mapping:

| Current | AWS Target |
|---|---|
| Vercel (Next.js) | ECS Fargate + ALB |
| Supabase PostgreSQL | RDS PostgreSQL (Multi-AZ) |
| Supabase Auth | Retain Supabase Auth OR migrate to Cognito |
| Supabase Storage | S3 (already abstracted) |
| Upstash Redis | ElastiCache Redis |
| Trigger.dev | Retain OR Amazon SQS + Lambda workers |
| Resend | Retain OR Amazon SES |
| Vercel Analytics | CloudWatch + PostHog |

4. Migration phases (zero-downtime strategy)
5. Data migration checklist
6. Rollback plan
7. Cost estimate comparison

#### B. Storage Abstraction Validation

**Goal:** Ensure all file operations go through a storage abstraction layer (not hardcoded Supabase Storage URLs).

**Implementation:**
- `src/lib/storage/index.ts` — `StorageAdapter` interface:
  ```typescript
  interface StorageAdapter {
    upload(key: string, buffer: Buffer, contentType: string): Promise<string>; // returns public URL
    delete(key: string): Promise<void>;
    getSignedUrl(key: string, expiresIn: number): Promise<string>;
    exists(key: string): Promise<boolean>;
  }
  ```
- `src/lib/storage/supabase-adapter.ts` — Supabase Storage implementation
- `src/lib/storage/s3-adapter.ts` — AWS S3 implementation (S3Client from `@aws-sdk/client-s3`)
- `src/lib/storage/factory.ts` — returns adapter based on `STORAGE_PROVIDER` env var (`"supabase"` | `"s3"`)
- Migrate all direct Supabase storage calls to use the adapter

**Env vars to add:**
```
STORAGE_PROVIDER=supabase  # or "s3"
AWS_S3_BUCKET=
AWS_S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

#### C. Queue Abstraction Validation

**Goal:** Background jobs can be switched from Trigger.dev to SQS workers without app code changes.

**Implementation:**
- `src/lib/queue/index.ts` — `QueueAdapter` interface:
  ```typescript
  interface QueueAdapter {
    enqueue(jobName: string, payload: Record<string, unknown>, options?: { delay?: number }): Promise<string>;
  }
  ```
- `src/lib/queue/trigger-adapter.ts` — Trigger.dev implementation
- `src/lib/queue/sqs-adapter.ts` — AWS SQS implementation (stub for future)
- All job enqueuing goes through `getQueue().enqueue(...)` not direct Trigger.dev SDK calls

#### D. Database Backup & DR Plan

**Deliverable:** `docs/architecture/BACKUP_DR_PLAN.md`

**Contents:**
- Supabase: daily automatic backups, point-in-time recovery window
- Backup verification process (weekly restore test)
- RTO target: < 4 hours
- RPO target: < 1 hour
- Runbook for common failure scenarios (DB unavailable, export service down, auth down)
- On-call alert routing

#### E. Technical Debt Closure

**Items:**
1. Remove all `// TODO` and `// FIXME` comments that have tracked debt
2. Audit all `any` type casts in server actions — fix or document
3. Unused feature flags or dead code paths from Phase 0-3 migrations
4. Prisma schema: ensure all FKs have `onDelete` policies set
5. Environment variable audit: document all required env vars in `.env.example`
6. Dependency audit: `npm audit` — fix critical/high vulnerabilities
7. Remove deprecated `InvoiceDocumentEditor`, `VoucherDocumentEditor`, `SalarySlipDocumentEditor` files (now unused after Phase 10 inline editing)

**Files to create:**
- `.env.example` — comprehensive with all required vars documented
- `docs/architecture/ENV_VARS.md` — full env var reference

---

### 3.3 Phase 10 Architecture Changes

#### Middleware Layer

```
src/middleware.ts
├── Auth check (existing)
├── Rate limiting (NEW — Sprint 10.1)
└── Request logging for audit (NEW — Sprint 10.1)
```

#### New Lib Modules

```
src/lib/
├── rate-limit.ts          (NEW)
├── storage-tracker.ts     (NEW)
├── send-logger.ts         (NEW)
├── server-timing.ts       (NEW)
├── storage/
│   ├── index.ts           (NEW)
│   ├── supabase-adapter.ts (NEW)
│   ├── s3-adapter.ts      (NEW)
│   └── factory.ts         (NEW)
└── queue/
    ├── index.ts           (NEW)
    ├── trigger-adapter.ts (NEW)
    └── sqs-adapter.ts     (NEW stub)
```

---

### 3.4 Phase 10 Database Schema Additions

```prisma
model StorageUsage {
  id              String   @id @default(cuid())
  orgId           String
  category        String   // "export", "proof", "logo", "pixel", "attachment"
  totalBytes      BigInt   @default(0)
  fileCount       Int      @default(0)
  lastUpdatedAt   DateTime @updatedAt
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, category])
  @@index([orgId])
  @@map("storage_usage")
}

model SendLog {
  id            String   @id @default(cuid())
  orgId         String
  type          String   // "invoice_send", "reminder", "recurring", "invite", "proof_notification", etc.
  recipientEmail String
  status        String   // "sent", "failed", "bounced", "opened"
  subject       String?
  metadata      Json?    // { invoiceId, templateId, jobId, etc. }
  sentAt        DateTime @default(now())
  organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, type])
  @@index([orgId, sentAt])
  @@map("send_log")
}

// Add to existing JobLog model:
// - errorMessage  String?
// - payload       Json?
// - retryCount    Int     @default(0)
// - nextRetryAt   DateTime?

// Performance indexes to add:
// Invoice: @@index([organizationId, createdAt])
// Voucher: @@index([organizationId, createdAt])
// SalarySlip: @@index([organizationId, createdAt])
// AuditLog: @@index([orgId, actorId, createdAt])
```

---

### 3.5 Phase 10 Acceptance Criteria

**Sprint 10.1:**
- [ ] All `/api/export/*` routes return 429 when rate limit exceeded, with correct `Retry-After` header
- [ ] Storage usage increments on every proof upload and PDF export
- [ ] 3 failed job retries result in a `JobLog` entry and org owner notification
- [ ] Job history page shows last 100 jobs with status and error detail
- [ ] Every outbound email creates a `SendLog` entry
- [ ] All proxy actions, document deletes, and role changes appear in audit log
- [ ] Sentry captures and reports runtime errors in production
- [ ] No page load exceeds performance targets (p95)

**Sprint 10.2:**
- [ ] `docs/architecture/AWS_MIGRATION_PLAN.md` complete with service mapping and migration phases
- [ ] All storage operations go through `StorageAdapter` interface — zero direct Supabase Storage SDK calls outside adapter
- [ ] `StorageAdapter` can switch from Supabase to S3 via env var with no code change
- [ ] `.env.example` documents every required environment variable
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] All `any` type casts in server actions documented or fixed

---

## 4. Phase 11 — Subscription Billing, Commercial Launch & Growth

### 4.1 Objective

Launch Slipwise One as a paid product. Implement Stripe subscription billing, enforce plan-based feature limits, convert free utility users to paid workspace subscribers, and activate growth loops.

**Phase 11 delivers:**
1. **Pricing infrastructure** — Plan model, usage metering, limit enforcement
2. **Stripe billing** — Subscription creation, webhook handling, invoice management, seat billing
3. **Growth mechanisms** — Landing pages, SEO-optimized utility pages, referral system, invite flows
4. **Onboarding optimization** — Conversion funnel from free → paid, trial management, upgrade prompts
5. **Customer portal** — Stripe billing portal integration, subscription management UI

---

### 4.2 Sprint 11.1 — Pricing Model & Plan Infrastructure

**Duration:** 1 sprint  
**Goal:** Define plans, implement plan model in DB, enforce limits in all critical paths.

#### A. Plan Definitions

**Free Plan**
- Target: Individual users, freelancers exploring the product
- Price: ₹0/month

| Feature | Limit |
|---|---|
| Org members | 1 (solo only) |
| Invoices per month | 10 |
| Vouchers per month | 20 |
| Salary slips per month | 10 |
| PDF Studio operations | 20/day |
| SW Pixel operations | 30/day |
| Storage | 500 MB |
| Templates | 3 per doc type |
| Email sends | 5/day |
| Recurring invoices | ❌ Disabled |
| SW Intel reports | Basic dashboard only |
| CSV export | ❌ Disabled |
| Proxy grants | ❌ Disabled |
| Custom branding | ❌ Disabled |
| Priority support | ❌ |

**Starter Plan — ₹999/month (or ₹9,990/year)**
- Target: Small businesses, freelancers needing full features

| Feature | Limit |
|---|---|
| Org members | 3 |
| Invoices per month | 100 |
| Vouchers per month | 200 |
| Salary slips per month | 50 |
| PDF Studio operations | 200/day |
| SW Pixel operations | Unlimited |
| Storage | 5 GB |
| Templates | All templates |
| Email sends | 100/day |
| Recurring invoices | ✅ Up to 5 rules |
| SW Intel reports | Full reports + CSV |
| Proxy grants | ✅ Up to 2 |
| Custom branding | ✅ |
| Priority support | Email |

**Pro Plan — ₹2,999/month (or ₹29,990/year)**
- Target: Growing teams, accountants, ops-heavy businesses

| Feature | Limit |
|---|---|
| Org members | 10 |
| Invoices per month | Unlimited |
| Vouchers per month | Unlimited |
| Salary slips per month | Unlimited |
| PDF Studio operations | Unlimited |
| SW Pixel operations | Unlimited |
| Storage | 50 GB |
| Templates | All + custom color |
| Email sends | 500/day |
| Recurring invoices | ✅ Unlimited |
| SW Intel reports | Full + trend analytics |
| Proxy grants | ✅ Unlimited |
| Custom branding | ✅ + white-label |
| Priority support | Chat + Email |
| API access | ✅ (Phase 12) |

**Enterprise Plan — Custom pricing**
- Target: Large orgs, multi-org groups, white-label partners

| Feature | Limit |
|---|---|
| Org members | Custom |
| All document types | Unlimited |
| Storage | Custom |
| SLA | 99.9% uptime |
| Dedicated support | ✅ |
| Custom integrations | ✅ |
| SSO / SAML | ✅ (Phase 12) |
| Multi-org management | ✅ (Phase 12) |

#### B. Plan Infrastructure

**Prisma schema additions (see Section 4.7)**

**`src/lib/plans/`** — plan configuration module:

```typescript
// src/lib/plans/config.ts
export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface PlanLimits {
  membersMax: number;
  invoicesPerMonth: number | null; // null = unlimited
  vouchersPerMonth: number | null;
  salarySlipsPerMonth: number | null;
  pdfStudioOpsPerDay: number | null;
  pixelOpsPerDay: number | null;
  storageBytes: bigint;
  templatesPerType: number | null;
  emailSendsPerDay: number | null;
  recurringInvoices: number | null; // 0 = disabled, null = unlimited
  csvExport: boolean;
  proxyGrants: number | null;
  customBranding: boolean;
  intelReports: "basic" | "full" | "analytics";
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = { ... };
```

**`src/lib/plans/enforcement.ts`** — limit checking:

```typescript
// Check if org can perform action given their plan + current usage
export async function checkLimit(
  orgId: string,
  resource: "invoice" | "voucher" | "salary_slip" | "pdf_studio" | "pixel" | "email_send",
  count?: number
): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: PlanId }>
```

**`src/lib/plans/usage.ts`** — usage tracking:

```typescript
export async function incrementUsage(orgId: string, resource: string, amount?: number): Promise<void>
export async function getMonthlyUsage(orgId: string): Promise<UsageSummary>
export async function resetMonthlyUsage(orgId: string): Promise<void>  // called by cron
```

**Usage metering Trigger.dev jobs:**
- `reset-monthly-usage` — runs on 1st of every month, resets `UsageRecord.monthlyCount`
- `send-usage-alerts` — runs daily, alerts orgs at 80% and 100% of limits

#### C. Feature Gating Implementation

Every gated action must check plan limits BEFORE executing:

**Server action pattern:**
```typescript
export async function createInvoice(data: InvoiceFormValues): Promise<ActionResult<Invoice>> {
  const session = await getSession();
  const orgId = session.orgId;

  // 1. Check plan limit
  const limitCheck = await checkLimit(orgId, "invoice");
  if (!limitCheck.allowed) {
    return { success: false, error: `Monthly invoice limit reached. ${limitCheck.reason}` };
  }

  // 2. Create invoice
  const invoice = await db.invoice.create({ ... });

  // 3. Increment usage
  await incrementUsage(orgId, "invoice");

  return { success: true, data: invoice };
}
```

**UI-level gating pattern:**
- `src/components/plan/upgrade-gate.tsx` — wrapper component that shows upgrade prompt if feature disabled
- `src/hooks/use-plan.ts` — `usePlan()` hook returns `{ plan, limits, usage, canUse(feature) }`
- `src/components/plan/usage-indicator.tsx` — shows "7/10 invoices used this month"

---

### 4.3 Sprint 11.2 — Stripe Billing Integration

**Duration:** 1 sprint  
**Goal:** Full Stripe subscription lifecycle. Trial, subscribe, upgrade, downgrade, cancel, reactivate.

#### A. Stripe Setup

**Stripe products to create:**
- `product/starter-monthly` → price ₹999/month
- `product/starter-annual` → price ₹9,990/year
- `product/pro-monthly` → price ₹2,999/month
- `product/pro-annual` → price ₹29,990/year

**Env vars:**
```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_MONTHLY_PRICE_ID=
STRIPE_STARTER_ANNUAL_PRICE_ID=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
```

#### B. Stripe Integration Routes

**`src/app/api/billing/`** directory:

```
src/app/api/billing/
├── create-checkout/route.ts      — POST, creates Stripe Checkout session
├── create-portal/route.ts        — POST, creates Stripe Customer Portal session
├── webhook/route.ts              — POST, handles all Stripe webhooks
└── usage-report/route.ts         — POST, reports metered usage (future)
```

**Checkout session creation (`create-checkout/route.ts`):**
```typescript
// POST /api/billing/create-checkout
// Body: { priceId: string, orgId: string }
// Returns: { url: string } — redirect to Stripe Checkout
// After payment: redirect to /app/billing/success?session_id=...
```

**Webhook handler (`webhook/route.ts`):**
Events to handle:
- `checkout.session.completed` → activate subscription, update `Subscription.status = "active"`
- `customer.subscription.updated` → update plan, status, current period
- `customer.subscription.deleted` → downgrade to free, set `status = "cancelled"`
- `invoice.payment_succeeded` → log payment, extend subscription
- `invoice.payment_failed` → mark `status = "past_due"`, send alert email
- `invoice.upcoming` → send renewal reminder email (7 days before)
- `customer.subscription.trial_will_end` → send trial ending email

**All webhook events must be:**
1. Signature-verified (`stripe.webhooks.constructEvent`)
2. Idempotent (check if already processed by `stripeEventId`)
3. Logged to `AuditLog` with type `"billing_event"`

#### C. Billing UI

**`src/app/app/billing/`** — billing management pages:

```
src/app/app/billing/
├── page.tsx              — Billing overview (current plan, usage, next billing date)
├── upgrade/page.tsx      — Pricing table + upgrade flow
├── success/page.tsx      — Post-checkout success page
├── cancel/page.tsx       — Cancellation confirmation flow
└── actions.ts            — Server actions for billing operations
```

**Pricing page (`upgrade/page.tsx`) components:**
- `PricingTable` — plan cards with feature comparison grid
- `PlanCard` — individual plan with price, feature list, CTA button
- `BillingToggle` — monthly / annual toggle (shows savings %)
- `CurrentPlanBadge` — highlights current plan
- `UpgradeButton` — calls `/api/billing/create-checkout`
- `ManageSubscriptionButton` — calls `/api/billing/create-portal`

**Billing overview (`page.tsx`) components:**
- `CurrentPlanCard` — shows plan name, price, renewal date
- `UsageMeter` — shows usage vs limit for each resource
- `StorageUsageBar` — visual storage consumption
- `BillingHistory` — past invoices table (from Stripe)
- `PaymentMethodCard` — card on file (masked)

**Upgrade prompts (inline in product):**
- `src/components/plan/upgrade-prompt.tsx` — compact inline prompt with "Upgrade" CTA
- Appears when:
  - User hits monthly doc limit: "You've used 10/10 invoices this month."
  - User tries to access gated feature (recurring invoices, proxy, CSV export)
  - Storage usage > 80%: "You're using 430/500 MB"

#### D. Trial System

**Trial details:**
- All new orgs get 14-day Pro trial automatically on signup
- No credit card required for trial
- Trial tracked via `Subscription.trialEndsAt`
- Trial reminder emails: 7 days remaining, 3 days remaining, trial ended
- After trial: auto-downgrade to Free if no card on file

**Implementation:**
- On org creation (`createOrg` action): create `Subscription` record with `planId: "pro"`, `status: "trialing"`, `trialEndsAt: now + 14 days`
- Trigger.dev job: `check-trial-expiry` — runs daily, downgrades expired trials
- Trial banner: `src/components/plan/trial-banner.tsx` — shows in app header when on trial

---

### 4.4 Sprint 11.3 — Growth, Onboarding Conversion & Analytics

**Duration:** 1 sprint  
**Goal:** Activate conversion funnel. Turn utility visitors into registered users and paying subscribers.

#### A. Public Marketing Pages

**New routes (outside auth):**

```
src/app/(marketing)/
├── page.tsx                    — Homepage / landing page
├── pricing/page.tsx            — Public pricing page
├── features/page.tsx           — Feature overview
├── pdf-studio/page.tsx         — PDF Studio landing (SEO)
├── invoice-generator/page.tsx  — Invoice Generator landing (SEO)
├── salary-slip/page.tsx        — Salary Slip Generator landing (SEO)
├── passport-photo/page.tsx     — Passport Photo landing (SEO)
└── layout.tsx                  — Marketing layout (header/footer)
```

**SEO requirements per marketing page:**
- `metadata.title`, `metadata.description` configured
- Open Graph tags
- Canonical URL
- Structured data (JSON-LD): `SoftwareApplication` schema
- Sitemap entry in `src/app/sitemap.ts`

**PDF Studio public page (`pdf-studio/page.tsx`):**
- Hero section with tool grid
- Tool cards: merge, split, compress, protect, etc.
- "Try free — no signup required" CTA for 3 uses
- "Sign up for unlimited" conversion CTA
- Feature comparison table (free vs paid)
- Testimonials / social proof section

**Invoice Generator public page:**
- Hero with live template preview (static screenshot)
- "Create free invoice" CTA → `/app/docs/invoices/new` (requires signup)
- Template gallery preview
- Feature list

#### B. Anonymous Usage → Registration Funnel

**Goal:** Allow 3 free PDF Studio / SW Pixel operations without signup, then gate and prompt signup.

**Implementation:**
- `src/lib/anonymous-usage.ts` — track anonymous ops in localStorage + cookie
- `src/components/plan/anonymous-gate.tsx` — after 3 uses, shows signup modal
- On signup: attribute anonymous usage to new account, show "Welcome — your 3 free uses are saved"
- Analytics event: `anonymous_limit_hit` — track conversion rate

#### C. Referral System

**Goal:** Existing users can refer new signups. Both parties get benefit.

**Referral mechanics:**
- User gets unique referral code: `ref_[userId]`
- Referral URL: `https://app.slipwise.com/?ref=abc123`
- On referred user signup: create `Referral` record
- On referred user's first payment: both users get 1 month free (credit applied to next invoice)

**Implementation:**
- `src/lib/referral.ts` — referral tracking and credit application
- `src/app/app/settings/referrals/page.tsx` — referral dashboard (link, stats, credits earned)
- Referral tracking cookie: `slipwise_ref` (30-day TTL)

**Files to create:**
- `src/app/app/settings/referrals/page.tsx`
- `src/app/app/settings/referrals/actions.ts`

#### D. Onboarding Funnel Optimization

**Goal:** Track every step of signup → org creation → first doc → invite team → upgrade.

**Funnel steps:**
1. Signup (email + password or Google)
2. Email verification
3. Org creation (name, logo, colors)
4. Branding profile setup
5. First document created
6. First document exported
7. Team member invited
8. Trial upgrade (or organic upgrade)

**Implementation:**
- `src/lib/onboarding-tracker.ts` — `trackOnboardingStep(userId, step)` → PostHog event
- `OnboardingChecklist` component: `src/components/onboarding/onboarding-checklist.tsx`
  - Shows in dashboard until all steps complete
  - Steps: "Upload logo ✓", "Create first invoice ✓", "Invite a team member", "Set up recurring invoice"
  - Each step links to the relevant page
- Analytics: PostHog funnel report on `onboarding_step_completed` events

#### E. In-App Growth Mechanics

**Document sharing:**
- `src/app/app/docs/invoices/[id]/share/page.tsx` — shareable read-only invoice view
- Tokenized URL: `/share/invoice/[shareToken]` — no auth required for recipient
- "Powered by Slipwise One" watermark on free plan (removes on paid)
- Share analytics: `viewed`, `downloaded` events tracked

**Team invite flow improvement:**
- Better invite email template (branded, with feature highlights)
- In-app invite modal with preview of what invitee will see
- Bulk invite via CSV: `src/app/app/settings/members/invite/page.tsx`

---

### 4.5 Phase 11 Pricing Tiers — Full Specification

```
FREE:       ₹0/month
STARTER:    ₹999/month  OR  ₹9,990/year  (save ₹1,998)
PRO:        ₹2,999/month OR ₹29,990/year (save ₹5,998)
ENTERPRISE: Custom
```

**Annual discount: 17% off**

**Trial: 14 days Pro for all new signups (no card required)**

---

### 4.6 Feature Gating Matrix

| Feature | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Invoice creation | 10/mo | 100/mo | Unlimited | Unlimited |
| Voucher creation | 20/mo | 200/mo | Unlimited | Unlimited |
| Salary slip creation | 10/mo | 50/mo | Unlimited | Unlimited |
| PDF Studio ops | 20/day | 200/day | Unlimited | Unlimited |
| SW Pixel ops | 30/day | Unlimited | Unlimited | Unlimited |
| Storage | 500 MB | 5 GB | 50 GB | Custom |
| Org members | 1 | 3 | 10 | Custom |
| Templates | 3/type | All | All + custom | All |
| Email sends | 5/day | 100/day | 500/day | Custom |
| Recurring invoices | ❌ | 5 rules | Unlimited | Unlimited |
| Scheduled sends | ❌ | ✅ | ✅ | ✅ |
| SW Intel (basic) | ✅ | ✅ | ✅ | ✅ |
| SW Intel (full reports) | ❌ | ✅ | ✅ | ✅ |
| SW Intel (trend analytics) | ❌ | ❌ | ✅ | ✅ |
| CSV export | ❌ | ✅ | ✅ | ✅ |
| Proxy grants | ❌ | 2 | Unlimited | Unlimited |
| Custom branding | ❌ | ✅ | ✅ + white-label | ✅ |
| "Powered by" removal | ❌ | ✅ | ✅ | ✅ |
| Audit log viewer | ❌ | Basic | Full | Full |
| Job log viewer | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ | ✅ |
| SSO / SAML | ❌ | ❌ | ❌ | ✅ |
| Priority support | ❌ | Email | Chat+Email | Dedicated |

---

### 4.7 Phase 11 Database Schema Additions

```prisma
model Subscription {
  id                String    @id @default(cuid())
  orgId             String    @unique
  planId            String    @default("free")  // "free" | "starter" | "pro" | "enterprise"
  status            String    @default("active") // "active" | "trialing" | "past_due" | "cancelled" | "paused"
  stripeCustomerId  String?   @unique
  stripeSubId       String?   @unique
  stripePriceId     String?
  billingInterval   String?   // "monthly" | "annual"
  trialEndsAt       DateTime?
  currentPeriodStart DateTime?
  currentPeriodEnd  DateTime?
  cancelAtPeriodEnd Boolean   @default(false)
  cancelledAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  organization      Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("subscription")
}

model UsageRecord {
  id              String   @id @default(cuid())
  orgId           String
  resource        String   // "invoice" | "voucher" | "salary_slip" | "pdf_studio" | "pixel" | "email_send"
  periodMonth     String   // "2026-04" (YYYY-MM)
  count           Int      @default(0)
  lastUpdatedAt   DateTime @updatedAt
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, resource, periodMonth])
  @@index([orgId, periodMonth])
  @@map("usage_record")
}

model StripeEvent {
  id              String   @id  // Stripe event ID (for idempotency)
  type            String
  processedAt     DateTime @default(now())
  payload         Json

  @@map("stripe_event")
}

model Referral {
  id              String   @id @default(cuid())
  referrerId      String   // Profile.id
  referredOrgId   String?  // set when referred user creates org
  referralCode    String   @unique
  status          String   @default("pending") // "pending" | "signed_up" | "converted" | "credited"
  creditApplied   Boolean  @default(false)
  createdAt       DateTime @default(now())
  convertedAt     DateTime?
  referrer        Profile  @relation(fields: [referrerId], references: [id], onDelete: Cascade)

  @@index([referrerId])
  @@index([referralCode])
  @@map("referral")
}

// Add to Organization:
// subscription Subscription?
// usageRecords UsageRecord[]
// referrals    Referral[]    (via referred orgs)
```

---

### 4.8 Phase 11 Architecture Changes

#### New Route Groups

```
src/app/
├── (marketing)/                    — NEW: public marketing pages
│   ├── layout.tsx                  — marketing header/footer
│   ├── page.tsx                    — homepage
│   ├── pricing/page.tsx
│   ├── features/page.tsx
│   ├── pdf-studio/page.tsx
│   ├── invoice-generator/page.tsx
│   └── passport-photo/page.tsx
├── share/
│   └── invoice/[token]/page.tsx    — NEW: public shareable invoice view
└── app/
    └── billing/                    — NEW: billing management
        ├── page.tsx
        ├── upgrade/page.tsx
        ├── success/page.tsx
        └── cancel/page.tsx
```

#### New API Routes

```
src/app/api/
├── billing/
│   ├── create-checkout/route.ts   — NEW
│   ├── create-portal/route.ts     — NEW
│   └── webhook/route.ts           — NEW
└── share/
    └── invoice/[token]/route.ts   — NEW: public doc metadata
```

#### New Components

```
src/components/
├── plan/
│   ├── upgrade-gate.tsx           — NEW
│   ├── upgrade-prompt.tsx         — NEW
│   ├── trial-banner.tsx           — NEW
│   ├── usage-indicator.tsx        — NEW
│   └── anonymous-gate.tsx         — NEW
├── onboarding/
│   └── onboarding-checklist.tsx   — NEW
└── billing/
    ├── pricing-table.tsx           — NEW
    ├── plan-card.tsx               — NEW
    ├── billing-toggle.tsx          — NEW
    ├── usage-meter.tsx             — NEW
    └── billing-history.tsx         — NEW
```

---

### 4.9 Phase 11 Acceptance Criteria

**Sprint 11.1 (Plan Infrastructure):**
- [ ] `Subscription` record created for every new org (with 14-day Pro trial)
- [ ] `checkLimit()` returns `{ allowed: false }` when org exceeds free plan invoice limit (10/month)
- [ ] `incrementUsage()` increments `UsageRecord` on every doc creation
- [ ] Monthly usage resets on 1st of month via Trigger.dev job
- [ ] Usage indicator shows correct count in workspace header
- [ ] Upgrade gate blocks recurring invoice creation on free plan with upgrade prompt

**Sprint 11.2 (Stripe Billing):**
- [ ] Clicking "Upgrade to Starter" redirects to Stripe Checkout
- [ ] Successful payment updates `Subscription.status = "active"`, `planId = "starter"`
- [ ] Failed payment sets `Subscription.status = "past_due"` and sends alert email
- [ ] Subscription cancellation at period end works: `cancelAtPeriodEnd = true`, downgrade after period
- [ ] Stripe Customer Portal accessible from billing page
- [ ] All Stripe webhook events are idempotent (duplicate event = no duplicate processing)
- [ ] `checkout.session.completed` tested end-to-end in Stripe test mode

**Sprint 11.3 (Growth):**
- [ ] Public pricing page renders at `/pricing` without auth
- [ ] PDF Studio landing page renders at `/pdf-studio` without auth
- [ ] Anonymous user can use PDF Studio 3 times, then sees signup prompt
- [ ] Referral code generates correctly for each user
- [ ] Referred signup creates `Referral` record with correct `referrerId`
- [ ] Onboarding checklist shows in dashboard for new orgs
- [ ] Shareable invoice link works without authentication

---

## 5. Shared Technical Standards

### Error Handling
- All server actions return `{ success: true; data: T } | { success: false; error: string }`
- All API routes return consistent error format: `{ error: string; code?: string }`
- Rate limit errors include `{ error: "rate_limited", retryAfterMs: number }`
- Billing errors include `{ error: "plan_limit_exceeded", resource: string, upgradeUrl: string }`

### Type Safety
- Zero `any` types in new code
- All Stripe event payloads typed with `stripe` SDK types
- Plan limits typed with `PlanLimits` interface (not raw strings)

### Testing Requirements
- `checkLimit()` must have unit tests for all 5 resources × 4 plans = 20 test cases
- Stripe webhook handler must have integration tests for all 6 critical events
- Rate limit middleware must have unit tests for allow/deny/Redis-down scenarios
- StorageAdapter: unit tests for both Supabase and S3 implementations

### Security
- Stripe webhook signature verified on every request (no bypass path)
- Billing API routes authenticated (no public checkout creation without valid session)
- Referral codes generated with `nanoid` (not sequential IDs)
- Share tokens for public invoice views: 32-byte random token, stored hashed in DB

---

## 6. Route Map

### New Routes — Phase 10

| Route | Type | Purpose |
|---|---|---|
| `/app/settings/jobs` | Page | Job log viewer |
| `/app/settings/send-log` | Page | Send log viewer |
| `/api/org/[orgId]/storage-usage` | API | Storage usage query |
| `/api/webhooks/job-failed` | API (webhook) | Trigger.dev failure webhook |

### New Routes — Phase 11

| Route | Type | Purpose |
|---|---|---|
| `/app/billing` | Page | Billing overview |
| `/app/billing/upgrade` | Page | Pricing + upgrade |
| `/app/billing/success` | Page | Post-checkout success |
| `/app/billing/cancel` | Page | Cancellation confirmation |
| `/app/settings/referrals` | Page | Referral dashboard |
| `/share/invoice/[token]` | Page (public) | Shareable invoice view |
| `/` | Page (public) | Marketing homepage |
| `/pricing` | Page (public) | Public pricing page |
| `/features` | Page (public) | Feature overview |
| `/pdf-studio` | Page (public) | PDF Studio landing |
| `/invoice-generator` | Page (public) | Invoice generator landing |
| `/passport-photo` | Page (public) | Passport photo landing |
| `/api/billing/create-checkout` | API | Stripe checkout init |
| `/api/billing/create-portal` | API | Stripe portal init |
| `/api/billing/webhook` | API | Stripe webhooks |
| `/api/share/invoice/[token]` | API | Public invoice data |

---

## 7. Non-Functional Requirements

### Performance
- Billing page load: < 1s (all data from DB, no Stripe API calls on page load except lazy)
- Limit check (`checkLimit()`): < 50ms (Redis-cached plan lookup)
- Stripe checkout redirect: < 300ms (just creates session URL)
- Marketing pages: Core Web Vitals green (LCP < 2.5s, CLS < 0.1, FID < 100ms)

### Reliability
- Stripe webhooks: must be processed within 30 seconds (Stripe retry window)
- Rate limit Redis: fail open if Redis unavailable (never block a request due to Redis down)
- Trial expiry job: must run exactly once per day (idempotent)

### Scalability
- Storage tracking: async, non-blocking (doesn't slow down exports)
- Usage increment: atomic counter update (no race condition on concurrent requests)
- Rate limiting: sliding window algorithm (not fixed window) to prevent burst-at-boundary abuse

### Security
- All Stripe calls use server-side only (no Stripe secret key in client)
- Share tokens expire after 30 days (configurable)
- Rate limit keys include org ID to prevent cross-org enumeration
- Billing webhooks: raw body preserved for signature verification (don't parse JSON before verifying)

### Observability
- Every Stripe event logged to `StripeEvent` table with full payload
- Every rate limit hit logged to structured log with `{ orgId, endpoint, limit, current }`
- Every plan upgrade/downgrade creates `AuditLog` entry
- PostHog events for: `plan_upgraded`, `plan_cancelled`, `trial_started`, `trial_expired`, `limit_reached`, `checkout_started`, `checkout_completed`

---

## 8. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Stripe webhook delivery failure | Medium | High | Idempotent handlers + Stripe retry (3 days) |
| R2 | False positive rate limiting blocking paid users | Low | High | Plan-aware rate limits, Redis fail-open |
| R3 | Trial abuse (create new org every 14 days) | Medium | Medium | 1 trial per email + device fingerprint check |
| R4 | Storage tracking drift (DB vs S3 mismatch) | Medium | Low | Nightly reconciliation job |
| R5 | Pricing page conversion too low | High | High | A/B test pricing copy, simplify CTAs |
| R6 | Indian payment gateway restrictions on Stripe | Medium | High | Test Stripe India + fallback to Razorpay stub |
| R7 | AWS migration causing data loss | Low | Critical | Full DB backup before any migration step |
| R8 | Anonymous usage gaming (clearing localStorage) | High | Low | Accept it — 3 free uses is marketing cost |
| R9 | Feature gate bypass via API | Medium | High | Enforce limits in server actions, not just UI |

---

## 9. QA & Acceptance Gates

### Phase 10 QA Checklist

**Rate Limiting:**
- [ ] Free org: 11th invoice in same hour returns 429
- [ ] Paid org: same scenario — no 429
- [ ] Rate limit header `X-RateLimit-Remaining` present on all rate-limited routes
- [ ] `Retry-After` header present on 429 response
- [ ] Redis unavailable → request allowed (fail open verified)

**Storage Tracking:**
- [ ] Upload proof → `StorageUsage` for `"proof"` category increments
- [ ] PDF export → `StorageUsage` for `"export"` category increments
- [ ] Nightly job runs → no duplicate increment

**Job Recovery:**
- [ ] Trigger a job failure → see retry attempt in Trigger.dev dashboard
- [ ] After 3 failures → `JobLog` entry with `status: "failed"`
- [ ] Org owner receives in-app notification after job failure

**Sentry:**
- [ ] Intentional 500 error → appears in Sentry within 60 seconds
- [ ] User context (orgId) attached to error

### Phase 11 QA Checklist

**Plan Enforcement:**
- [ ] Create 10 invoices → 11th blocked with correct error message
- [ ] Upgrade to Starter → 11th invoice succeeds
- [ ] Downgrade → new limit enforced, existing docs preserved

**Stripe Billing:**
- [ ] Full checkout flow in Stripe test mode: card → success → plan active
- [ ] Test failed payment: `4000 0000 0000 0341` → `past_due` status
- [ ] Webhook signature tampering → 400 response, event not processed
- [ ] Duplicate webhook event → 200 response, no duplicate processing
- [ ] Cancel subscription → `cancelAtPeriodEnd: true` set
- [ ] After period end → auto-downgrade to Free

**Growth:**
- [ ] Visit `/pricing` without auth → page loads, no redirect to login
- [ ] Use PDF Studio 3 times anonymously → 4th use shows signup modal
- [ ] Generate referral code → share link → new user signs up → `Referral` record created
- [ ] Onboarding checklist shows for new org, disappears when all steps done

---

## 10. Multi-Agent Execution Strategy

This PRD is designed for autonomous multi-agent execution. Recommended parallel agent split:

### Phase 10 — Recommended Agent Split (3 agents)

**Agent 10-A: Rate Limiting + Storage Tracking**
Files: `src/middleware.ts`, `src/lib/rate-limit.ts`, `src/lib/storage-tracker.ts`, `src/lib/constants/rate-limits.ts`

**Agent 10-B: Job Recovery + Send Log + Audit Completeness**
Files: `src/lib/jobs/*`, `src/lib/send-logger.ts`, `src/app/app/settings/jobs/`, `src/app/app/settings/send-log/`, `src/app/api/webhooks/job-failed/route.ts`

**Agent 10-C: Storage Abstraction + AWS Migration + Technical Debt**
Files: `src/lib/storage/*`, `src/lib/queue/*`, `docs/architecture/AWS_MIGRATION_PLAN.md`, `.env.example`, Sentry config files

### Phase 11 — Recommended Agent Split (4 agents)

**Agent 11-A: Plan Infrastructure + Feature Gating**
Files: `src/lib/plans/*`, Prisma schema (`Subscription`, `UsageRecord`), `src/hooks/use-plan.ts`, `src/components/plan/*`

**Agent 11-B: Stripe Billing Integration**
Files: `src/app/api/billing/*`, `src/app/app/billing/*`, `src/lib/stripe.ts`, Prisma schema (`StripeEvent`)

**Agent 11-C: Public Marketing Pages + SEO**
Files: `src/app/(marketing)/*`, `src/app/sitemap.ts`, `src/app/share/*`, `src/app/api/share/*`

**Agent 11-D: Growth Mechanics + Onboarding Optimization**
Files: `src/lib/referral.ts`, `src/lib/anonymous-usage.ts`, `src/lib/onboarding-tracker.ts`, `src/app/app/settings/referrals/*`, `src/components/onboarding/*`, `src/components/billing/*`

### Execution Order

```
Phase 10:
  ├── Sprint 10.1: Agents 10-A + 10-B (parallel)
  └── Sprint 10.2: Agent 10-C (after 10-A, 10-B complete)

Phase 11 (after Phase 10 complete):
  ├── Sprint 11.1: Agent 11-A (plan infrastructure FIRST — others depend on it)
  └── Sprints 11.2 + 11.3: Agents 11-B + 11-C + 11-D (parallel, after 11-A complete)
```

### Agent Context Requirements

Each agent executing this PRD should:
1. Read the current Prisma schema (`prisma/schema.prisma`) before making DB changes
2. Read existing patterns in `src/lib/` before adding new utilities
3. Run `npx tsc --noEmit` and `npx eslint src/` after each file set — fix all errors before proceeding
4. Use `@/generated/prisma/client` for PrismaClient import (not `@/generated/prisma`)
5. Prisma nullable JSON fields: use `Prisma.DbNull` (not `null`) and cast to `Prisma.InputJsonValue`
6. All server actions follow `ActionResult<T>` pattern: `{ success: true; data: T } | { success: false; error: string }`
7. Do not create test `.md` files — only create files that are part of the implementation

---

*End of PRD — Phase 10 & Phase 11 | Slipwise One | Version 1.0*
