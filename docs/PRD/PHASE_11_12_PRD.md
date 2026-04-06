# Slipwise One — Phase 11 & Phase 12
## Product Requirements Document (PRD)
### Version 1.0 | Razorpay India-First Billing + Global Expansion | Engineering Handover Document

---

## 🇮🇳 Payment Gateway: Razorpay (India-First)

**Decision:** Razorpay is the **primary and only payment gateway** for Phase 11.

| Factor | Razorpay | Stripe | Decision |
|---|---|---|---|
| Approval speed | 1–2 weeks | 1–3 months | ✅ Razorpay |
| UPI support | ✅ Native (0% fee) | ⚠️ Limited | ✅ Razorpay |
| Card fees | 1.96–2.45% | 2.9–3.5% | ✅ Razorpay |
| GST compliance | ✅ Built-in | ❌ Manual | ✅ Razorpay |
| UPI recurring mandate | ✅ NPCI-approved | ❌ Not available | ✅ Razorpay |
| Netbanking support | ✅ All major banks | ❌ | ✅ Razorpay |
| India launch readiness | ✅ Immediate | ❌ 1–3 month wait | ✅ Razorpay |

**Stripe** is planned for Phase 12+ (global expansion only — US, EU, SEA markets).

---

## Document Overview

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 11: Commercial Launch + Razorpay Billing · Phase 12: Global Expansion + API + SSO |
| **Document Purpose** | Full engineering handover — autonomous multi-agent execution ready |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–10 completed |
| **Branch Convention** | `feature/phase-11-billing` · `feature/phase-12-global` |
| **Sprint Model** | 3 sprints (Phase 11) + 3 sprints (Phase 12) |
| **Total Sprints** | 6 sprints across both phases |
| **Engineering Model** | Multi-agent parallel execution recommended |
| **Primary Payment Gateway** | Razorpay (Phase 11 — India) |
| **Secondary Payment Gateway** | Stripe (Phase 12 — Global) |
| **Target Market (Phase 11)** | India (INR pricing, UPI, GST compliance) |
| **Target Market (Phase 12)** | Global (USD/EUR pricing, global card support) |

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State (Post Phase 10)](#2-current-state-post-phase-10)
3. [Phase 11 — Subscription Billing, Commercial Launch & Growth](#3-phase-11--subscription-billing-commercial-launch--growth)
   - 3.1 Sprint 11.1 — Pricing Model & Plan Infrastructure
   - 3.2 Sprint 11.2 — Razorpay Billing Integration
   - 3.3 Sprint 11.3 — Growth, Onboarding & Analytics
   - 3.4 Pricing Tiers Full Specification
   - 3.5 Feature Gating Matrix
   - 3.6 Database Schema Additions
   - 3.7 Architecture Changes
   - 3.8 Acceptance Criteria
4. [Phase 12 — Global Expansion, API Platform & Enterprise](#4-phase-12--global-expansion-api-platform--enterprise)
   - 4.1 Sprint 12.1 — Stripe Global Billing + Multi-Currency
   - 4.2 Sprint 12.2 — Public API Platform
   - 4.3 Sprint 12.3 — Enterprise Features (SSO/SAML, Multi-Org)
   - 4.4 Database Schema Additions
   - 4.5 Architecture Changes
   - 4.6 Acceptance Criteria
5. [Shared Technical Standards](#5-shared-technical-standards)
6. [Route Map](#6-route-map)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Risk Register](#8-risk-register)
9. [QA & Acceptance Gates](#9-qa--acceptance-gates)
10. [Multi-Agent Execution Strategy](#10-multi-agent-execution-strategy)

---

## 1. Product Context & Phase Summary

Slipwise One is a modular SaaS document operations suite:

- **SW Docs** — Invoices (5 templates), Vouchers (5 templates), Salary Slips (5 templates)
- **PDF Studio** — 10 tools: merge, split, delete, organize, resize, fill-sign, protect, header-footer, pdf-to-image, repair
- **SW Pixel** — 5 tools: passport photo, resize, adjust, print-layout, labels
- **SW Pay** — Payment lifecycle, receivables, proof uploads
- **SW Flow** — Recurring billing, scheduled sends, reminders (Trigger.dev)
- **SW Intel** — KPI dashboard, reports, CSV export
- **SW Auth & Access** — 7 roles, 15 modules, proxy grants, full audit logs

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
| 10 | Hardening + Pricing Readiness + AWS Path | ✅ Done |
| **11** | **Commercial Launch + Razorpay Billing + Growth** | 🔲 This Phase |
| **12** | **Global Expansion + Stripe + API Platform + Enterprise** | 🔲 This Phase |

---

## 2. Current State (Post Phase 10)

### What's Built & Hardened

| Module | Status | Phase 10 Additions |
|---|---|---|
| All doc types + templates | ✅ | Rate limiting on export routes |
| PDF Studio (10 tools) | ✅ | Rate limiting on studio routes |
| SW Pixel (5 tools) | ✅ | Rate limiting on pixel routes |
| SW Pay | ✅ | Storage usage tracking for proof uploads |
| SW Flow | ✅ | Job failure recovery, dead-letter queue |
| SW Intel | ✅ | No changes |
| RBAC + Audit | ✅ | Audit log completeness, all proxy actions covered |
| Infrastructure | ✅ | Sentry, StorageAdapter (Supabase/S3), QueueAdapter |

### What's Missing (Phase 11 Addresses)

1. **No subscription model** — product entirely free, no billing
2. **No plan enforcement** — no feature limits enforced
3. **No payment gateway** — Razorpay not yet integrated
4. **No public marketing pages** — no SEO-friendly landing pages
5. **No growth mechanisms** — no referral system, no conversion funnel
6. **No billing UI** — no way to upgrade/downgrade/cancel

---

## 3. Phase 11 — Subscription Billing, Commercial Launch & Growth

### Objective

Launch Slipwise One as a paid product in India. Implement Razorpay subscription billing, enforce plan-based feature limits, convert free utility users to paid workspace subscribers, and activate growth loops.

**Phase 11 delivers:**
1. **Pricing infrastructure** — Plan model, usage metering, limit enforcement in every server action
2. **Razorpay billing** — Full subscription lifecycle: trial → subscribe → upgrade → downgrade → pause → cancel → reactivate
3. **UPI + Card + Netbanking** — All major Indian payment methods supported
4. **Public marketing pages** — Homepage, pricing, SEO landing pages for each module
5. **Growth mechanisms** — Referral system, anonymous usage funnel, team invite improvements
6. **Onboarding optimization** — Checklist, conversion tracking, trial-to-paid flow

---

### 3.1 Sprint 11.1 — Pricing Model & Plan Infrastructure

**Duration:** 1 sprint
**Goal:** Define plans, implement plan model in DB, enforce limits in all critical paths.
**Dependency:** Must complete before Sprints 11.2 and 11.3 (billing and growth depend on plan enforcement).

#### A. Pricing Tiers

**Free Plan — ₹0/month**
- Target: Individual users, freelancers exploring the product
- No credit card required
- Perpetual free tier (not time-limited)

| Feature | Free Limit |
|---|---|
| Org members | 1 (solo only) |
| Invoices per month | 10 |
| Vouchers per month | 20 |
| Salary slips per month | 10 |
| PDF Studio operations | 20/day |
| SW Pixel operations | 30/day |
| Storage | 500 MB |
| Templates available | 3 per doc type (9 total) |
| Email sends | 5/day |
| Recurring invoice rules | ❌ Disabled |
| SW Intel reports | Basic dashboard only |
| CSV export | ❌ Disabled |
| Proxy grants | ❌ Disabled |
| Custom branding | ❌ Disabled |
| "Powered by Slipwise" watermark | ✅ Shown on shared docs |
| Audit log | ❌ No access |
| Job log | ❌ No access |
| API access | ❌ Disabled |
| Priority support | ❌ Community only |

---

**Starter Plan — ₹999/month or ₹9,990/year (save 17%)**
- Target: Small businesses, freelancers needing full features
- 14-day Pro trial when first upgrading

| Feature | Starter Limit |
|---|---|
| Org members | 3 |
| Invoices per month | 100 |
| Vouchers per month | 200 |
| Salary slips per month | 50 |
| PDF Studio operations | 200/day |
| SW Pixel operations | Unlimited |
| Storage | 5 GB |
| Templates available | All 15 templates |
| Email sends | 100/day |
| Recurring invoice rules | ✅ Up to 5 rules |
| Scheduled sends | ✅ |
| SW Intel reports | Full reports + CSV export |
| CSV export | ✅ |
| Proxy grants | ✅ Up to 2 |
| Custom branding | ✅ Logo + colors |
| "Powered by" watermark | ❌ Removed |
| Audit log | ✅ Basic (last 30 days) |
| Job log | ❌ No access |
| API access | ❌ Disabled |
| Priority support | Email (48h SLA) |

---

**Pro Plan — ₹2,999/month or ₹29,990/year (save 17%)**
- Target: Growing teams, accountants, ops-heavy businesses, HR departments

| Feature | Pro Limit |
|---|---|
| Org members | 10 |
| Invoices per month | Unlimited |
| Vouchers per month | Unlimited |
| Salary slips per month | Unlimited |
| PDF Studio operations | Unlimited |
| SW Pixel operations | Unlimited |
| Storage | 50 GB |
| Templates available | All 15 + custom color/branding per template |
| Email sends | 500/day |
| Recurring invoice rules | ✅ Unlimited |
| Scheduled sends | ✅ |
| SW Intel reports | Full + trend analytics + forecasting |
| CSV export | ✅ |
| Proxy grants | ✅ Unlimited |
| Custom branding | ✅ Full white-label |
| "Powered by" watermark | ❌ Removed |
| Audit log | ✅ Full (unlimited history) |
| Job log | ✅ Full access |
| API access | ✅ (Phase 12 — reserved) |
| Priority support | Chat + Email (12h SLA) |

---

**Enterprise Plan — Custom pricing**
- Target: Large organizations, multi-org groups, white-label partners, HR firms managing many companies
- Contact sales for pricing

| Feature | Enterprise |
|---|---|
| Org members | Custom (500+) |
| All document types | Unlimited |
| Storage | Custom (TB+) |
| All Pro features | ✅ |
| SSO / SAML | ✅ (Phase 12) |
| Multi-org management | ✅ (Phase 12) |
| Custom integrations | ✅ |
| Dedicated onboarding | ✅ |
| Custom SLA | 99.9% uptime |
| Dedicated support | Named account manager |
| Custom invoice terms | Net 30/60 |
| Volume discounts | Negotiated |

---

#### B. Plan Infrastructure Code

**`src/lib/plans/` directory:**

```
src/lib/plans/
├── config.ts        — Plan IDs, PlanLimits interface, PLAN_LIMITS constant
├── enforcement.ts   — checkLimit(), requirePlan()
├── usage.ts         — incrementUsage(), getMonthlyUsage(), resetMonthlyUsage()
└── index.ts         — re-exports everything
```

**`src/lib/plans/config.ts`:**
```typescript
export type PlanId = "free" | "starter" | "pro" | "enterprise";
export type BillingInterval = "monthly" | "annual";
export type SubscriptionStatus = 
  | "trialing" 
  | "active" 
  | "past_due" 
  | "paused" 
  | "payment_failed"
  | "cancelled" 
  | "expired";

export interface PlanLimits {
  membersMax: number;                      // -1 = unlimited
  invoicesPerMonth: number;                // -1 = unlimited
  vouchersPerMonth: number;                // -1 = unlimited
  salarySlipsPerMonth: number;             // -1 = unlimited
  pdfStudioOpsPerDay: number;              // -1 = unlimited
  pixelOpsPerDay: number;                  // -1 = unlimited
  storageBytes: bigint;
  templatesPerType: number;                // -1 = all
  emailSendsPerDay: number;                // -1 = unlimited
  recurringInvoiceRules: number;           // 0 = disabled, -1 = unlimited
  scheduledSends: boolean;
  csvExport: boolean;
  proxyGrants: number;                     // 0 = disabled, -1 = unlimited
  customBranding: boolean;
  whiteLabel: boolean;
  poweredByWatermark: boolean;
  intelLevel: "basic" | "full" | "analytics";
  auditLog: "none" | "basic" | "full";
  jobLog: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    membersMax: 1,
    invoicesPerMonth: 10,
    vouchersPerMonth: 20,
    salarySlipsPerMonth: 10,
    pdfStudioOpsPerDay: 20,
    pixelOpsPerDay: 30,
    storageBytes: BigInt(500 * 1024 * 1024), // 500 MB
    templatesPerType: 3,
    emailSendsPerDay: 5,
    recurringInvoiceRules: 0,
    scheduledSends: false,
    csvExport: false,
    proxyGrants: 0,
    customBranding: false,
    whiteLabel: false,
    poweredByWatermark: true,
    intelLevel: "basic",
    auditLog: "none",
    jobLog: false,
    apiAccess: false,
  },
  starter: {
    membersMax: 3,
    invoicesPerMonth: 100,
    vouchersPerMonth: 200,
    salarySlipsPerMonth: 50,
    pdfStudioOpsPerDay: 200,
    pixelOpsPerDay: -1,
    storageBytes: BigInt(5 * 1024 * 1024 * 1024), // 5 GB
    templatesPerType: -1,
    emailSendsPerDay: 100,
    recurringInvoiceRules: 5,
    scheduledSends: true,
    csvExport: true,
    proxyGrants: 2,
    customBranding: true,
    whiteLabel: false,
    poweredByWatermark: false,
    intelLevel: "full",
    auditLog: "basic",
    jobLog: false,
    apiAccess: false,
  },
  pro: {
    membersMax: 10,
    invoicesPerMonth: -1,
    vouchersPerMonth: -1,
    salarySlipsPerMonth: -1,
    pdfStudioOpsPerDay: -1,
    pixelOpsPerDay: -1,
    storageBytes: BigInt(50 * 1024 * 1024 * 1024), // 50 GB
    templatesPerType: -1,
    emailSendsPerDay: 500,
    recurringInvoiceRules: -1,
    scheduledSends: true,
    csvExport: true,
    proxyGrants: -1,
    customBranding: true,
    whiteLabel: true,
    poweredByWatermark: false,
    intelLevel: "analytics",
    auditLog: "full",
    jobLog: true,
    apiAccess: false, // Phase 12
  },
  enterprise: {
    membersMax: -1,
    invoicesPerMonth: -1,
    vouchersPerMonth: -1,
    salarySlipsPerMonth: -1,
    pdfStudioOpsPerDay: -1,
    pixelOpsPerDay: -1,
    storageBytes: BigInt(Number.MAX_SAFE_INTEGER),
    templatesPerType: -1,
    emailSendsPerDay: -1,
    recurringInvoiceRules: -1,
    scheduledSends: true,
    csvExport: true,
    proxyGrants: -1,
    customBranding: true,
    whiteLabel: true,
    poweredByWatermark: false,
    intelLevel: "analytics",
    auditLog: "full",
    jobLog: true,
    apiAccess: true,
  },
};
```

**`src/lib/plans/enforcement.ts`:**
```typescript
export type LimitResource = 
  | "invoice" | "voucher" | "salary_slip" 
  | "pdf_studio" | "pixel" | "email_send"
  | "org_member" | "proxy_grant" | "recurring_rule";

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;           // Human-readable why blocked
  current?: number;          // Current usage count
  limit?: number;            // Plan limit
  upgradeRequired?: PlanId;  // Minimum plan to unblock
  upgradeUrl: string;        // /app/billing/upgrade
}

export async function checkLimit(
  orgId: string,
  resource: LimitResource,
  requestedCount?: number  // defaults to 1
): Promise<LimitCheckResult>

export async function requirePlan(
  orgId: string,
  minimumPlan: PlanId,
  featureName: string
): Promise<void>  // throws PlanUpgradeRequired error if not on required plan
```

**`src/lib/plans/usage.ts`:**
```typescript
export async function incrementUsage(
  orgId: string,
  resource: LimitResource,
  amount?: number  // defaults to 1
): Promise<void>

export async function getMonthlyUsage(
  orgId: string,
  month?: string   // "YYYY-MM", defaults to current month
): Promise<Record<LimitResource, number>>

export async function getDailyUsage(
  orgId: string,
  date?: string    // "YYYY-MM-DD", defaults to today
): Promise<Record<LimitResource, number>>

// Called by Trigger.dev cron on 1st of month:
export async function resetMonthlyUsage(orgId: string): Promise<void>
```

**Trigger.dev jobs for usage:**
- `reset-all-monthly-usage` — runs 1st of every month at 00:00 UTC, resets all org monthly counts
- `send-usage-alerts` — runs daily at 09:00 IST, sends email when any resource hits 80% or 100%

#### C. Feature Gating in Server Actions

**EVERY resource-creating server action must follow this pattern:**

```typescript
// src/app/app/docs/invoices/actions.ts
export async function createInvoice(
  orgId: string, 
  data: InvoiceFormValues
): Promise<ActionResult<Invoice>> {
  // 1. Auth check
  const session = await requireSession();
  await requirePermission(orgId, session.userId, "docs.invoices", "create");

  // 2. Plan limit check (REQUIRED — do not skip)
  const limitCheck = await checkLimit(orgId, "invoice");
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: `Invoice limit reached (${limitCheck.current}/${limitCheck.limit} this month). Upgrade to create more.`,
      upgradeUrl: "/app/billing/upgrade",
    };
  }

  // 3. Create the resource
  const invoice = await db.invoice.create({ data: { orgId, ...mapToDb(data) } });

  // 4. Increment usage (non-blocking — fire and forget)
  incrementUsage(orgId, "invoice").catch(console.error);

  return { success: true, data: invoice };
}
```

**All gated server actions:**
- `createInvoice` — gates on `invoice` monthly limit
- `createVoucher` — gates on `voucher` monthly limit
- `createSalarySlip` — gates on `salary_slip` monthly limit
- `runPdfStudioTool` — gates on `pdf_studio` daily limit
- `runPixelTool` — gates on `pixel` daily limit
- `sendDocumentEmail` — gates on `email_send` daily limit
- `createRecurringRule` — gates on `recurring_rule` count
- `addOrgMember` — gates on `org_member` count
- `createProxyGrant` — gates on `proxy_grant` count
- `exportToCsv` — requires `csvExport: true`
- `createScheduledSend` — requires `scheduledSends: true`

**UI-level gating:**
```typescript
// src/hooks/use-plan.ts
export function usePlan(): {
  plan: PlanId;
  status: SubscriptionStatus;
  limits: PlanLimits;
  usage: Record<LimitResource, number>;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  canUse: (resource: LimitResource) => boolean;
  canUsePlatformFeature: (feature: keyof PlanLimits) => boolean;
  upgradeUrl: string;
}
```

---

### 3.2 Sprint 11.2 — Razorpay Billing Integration

**Duration:** 1 sprint
**Dependency:** Sprint 11.1 must be complete (plan infrastructure, Subscription model in DB)
**Goal:** Full Razorpay subscription lifecycle. Trial, subscribe, upgrade, downgrade, pause, cancel, reactivate.

#### A. Razorpay Account Setup (Pre-Engineering)

**Merchant account requirements:**
1. Create account at razorpay.com
2. Complete KYC: PAN card, GST certificate, cancelled cheque / bank statement
3. Approval timeline: 1–2 weeks
4. After approval: create plans in Razorpay dashboard (4 × 2 = 8 plans)
5. Enable recurring payments (requires Razorpay approval — request during KYC)
6. Enable webhook endpoint

**Razorpay plans to create:**

| Plan Name | Plan ID (set in env) | Amount | Currency | Interval |
|---|---|---|---|---|
| Starter Monthly | `RAZORPAY_STARTER_MONTHLY_PLAN_ID` | ₹99900 (paise) | INR | monthly |
| Starter Annual | `RAZORPAY_STARTER_ANNUAL_PLAN_ID` | ₹999000 (paise) | INR | yearly |
| Pro Monthly | `RAZORPAY_PRO_MONTHLY_PLAN_ID` | ₹299900 (paise) | INR | monthly |
| Pro Annual | `RAZORPAY_PRO_ANNUAL_PLAN_ID` | ₹2999000 (paise) | INR | yearly |

> Note: Razorpay amounts are always in paise (1 INR = 100 paise). ₹999 → 99900 paise.

**Required environment variables:**
```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx       # Public key (safe for client-side)
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx        # Secret key (server-side only, NEVER expose)
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx    # For webhook signature verification

# Plan IDs (from Razorpay dashboard)
RAZORPAY_STARTER_MONTHLY_PLAN_ID=plan_xxxxxxxxxx
RAZORPAY_STARTER_ANNUAL_PLAN_ID=plan_xxxxxxxxxx
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_xxxxxxxxxx
RAZORPAY_PRO_ANNUAL_PLAN_ID=plan_xxxxxxxxxx

# Redirect URLs after subscription authentication
RAZORPAY_SUCCESS_REDIRECT_URL=https://app.slipwise.com/app/billing/success
RAZORPAY_CANCEL_REDIRECT_URL=https://app.slipwise.com/app/billing/cancel
```

#### B. Razorpay SDK Setup

**Install:**
```bash
npm install razorpay
npm install --save-dev @types/razorpay
```

**`src/lib/razorpay.ts`:**
```typescript
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  return Razorpay.validateWebhookSignature(
    body,
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET!
  );
}

// Map internal plan IDs to Razorpay plan IDs
export function getRazorpayPlanId(
  planId: "starter" | "pro",
  interval: "monthly" | "annual"
): string {
  const key = `RAZORPAY_${planId.toUpperCase()}_${interval.toUpperCase()}_PLAN_ID`;
  const planRazorpayId = process.env[key];
  if (!planRazorpayId) throw new Error(`Missing env var: ${key}`);
  return planRazorpayId;
}
```

#### C. Billing API Routes

**Directory structure:**
```
src/app/api/billing/
├── razorpay/
│   ├── create-subscription/route.ts   — POST: creates Razorpay subscription
│   ├── webhook/route.ts               — POST: handles all Razorpay webhook events
│   ├── cancel-subscription/route.ts   — POST: cancels subscription
│   └── customer-details/route.ts      — GET: fetches subscription + payment method info
└── subscription-status/route.ts       — GET: internal status check (no Razorpay call)
```

**`create-subscription/route.ts`:**
```typescript
// POST /api/billing/razorpay/create-subscription
// Body: { planId: "starter" | "pro", interval: "monthly" | "annual", orgId: string }
// Auth: required (session cookie)
// Returns: { shortUrl: string } — Razorpay subscription auth link
// Flow:
//   1. Validate session and orgId ownership
//   2. Get or create Razorpay customer (customer_id stored in Subscription.razorpayCustomerId)
//   3. Create Razorpay subscription with the plan ID
//   4. Save subscriptionId to Subscription table with status = "created"
//   5. Return subscription.short_url for user to authenticate
// After user authenticates:
//   Webhook: subscription.authenticated → update status = "active" or "trialing"

// Example Razorpay subscription creation:
const subscription = await razorpay.subscriptions.create({
  plan_id: razorpayPlanId,
  customer_notify: 1,          // Razorpay sends auth link by email/SMS
  quantity: 1,
  total_count: 0,              // 0 = recurring indefinitely
  addons: [],
  notes: {
    orgId: orgId,
    internalPlanId: planId,
    billingInterval: interval,
  },
});
// subscription.short_url → redirect user here or open in new tab
```

**`webhook/route.ts`:**
```typescript
// POST /api/billing/razorpay/webhook
// Headers: x-razorpay-signature (HMAC-SHA256 of raw body)
// No auth (public endpoint, verified by signature)
// IMPORTANT: Read raw body BEFORE parsing (signature verification requires raw body)

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  
  // 1. Verify signature (reject if invalid — do not process)
  if (!verifyWebhookSignature(rawBody, signature!)) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  
  const event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  
  // 2. Check idempotency (skip if already processed)
  const existing = await db.razorpayEvent.findUnique({ where: { id: event.id } });
  if (existing) return Response.json({ status: "already_processed" }, { status: 200 });
  
  // 3. Log event (store full payload for debugging/audit)
  await db.razorpayEvent.create({
    data: {
      id: event.id,
      type: event.event,
      payload: event as unknown as Prisma.InputJsonValue,
    }
  });
  
  // 4. Process event
  await handleRazorpayEvent(event);
  
  return Response.json({ status: "ok" }, { status: 200 });
}
```

**`handleRazorpayEvent()` — full event handler:**

| Event | Action |
|---|---|
| `subscription.authenticated` | Set `Subscription.status = "active"`, `razorpaySubId`, `currentPeriodStart/End`. Send welcome email. Log AuditLog `billing_event`. PostHog `plan_upgraded`. |
| `subscription.charged` | Payment succeeded. Update `currentPeriodEnd`. Log `AuditLog`. |
| `subscription.halted` | Max payment retries exceeded. Set `status = "payment_failed"`. Send in-app + email alert. |
| `subscription.paused` | Set `status = "paused"`. Notify org owner. |
| `subscription.resumed` | Set `status = "active"`. Notify org owner. |
| `subscription.completed` | Subscription ran for all billing cycles. Set `status = "completed"`. Downgrade to free if not renewed. |
| `subscription.cancelled` | Set `status = "cancelled"`, `cancelledAt`. Downgrade to free. Log AuditLog. PostHog `plan_cancelled`. |
| `invoice.paid` | Payment confirmed. Extend `currentPeriodEnd`. Send receipt email via Resend. |
| `invoice.payment_failed` | Payment failed. Set `status = "past_due"`. Send warning email. Send in-app notification. |
| `invoice.issued` | New invoice generated by Razorpay. Log to SendLog (don't send another email — Razorpay handles it). |
| `payment.authorized` | UPI mandate authorized. Update status, log. |
| `payment.failed` | Individual payment attempt failed. Log. Send in-app alert. |

**`cancel-subscription/route.ts`:**
```typescript
// POST /api/billing/razorpay/cancel-subscription
// Body: { cancelAtPeriodEnd: boolean }
// Auth: required, must be org owner or admin
// If cancelAtPeriodEnd: true → subscription continues until period end, then cancels
// If cancelAtPeriodEnd: false → immediate cancellation (unusual, avoid)

await razorpay.subscriptions.cancel(razorpaySubId, { cancel_at_cycle_end: cancelAtPeriodEnd ? 1 : 0 });
await db.subscription.update({ where: { orgId }, data: { cancelAtPeriodEnd } });
```

#### D. Subscription Upgrade / Downgrade Flow

**Upgrade (e.g., Starter → Pro):**
1. User clicks "Upgrade to Pro"
2. POST `/api/billing/razorpay/create-subscription` with new `planId: "pro"`
3. Cancel old subscription at period end: `razorpay.subscriptions.cancel(oldSubId, { cancel_at_cycle_end: 1 })`
4. New subscription created with Pro plan
5. User authenticates new subscription
6. Old subscription cancels at period end
7. Both subscriptions handled by webhook

**Downgrade (e.g., Pro → Starter):**
- Same flow as upgrade but with Starter plan
- If user has features above Starter limits (e.g., 8 recurring rules vs Starter's 5): show warning
- After downgrade: usage that exceeds new plan limits is preserved (read-only), but new operations blocked
- Email: "Your plan has been downgraded. Some features are now limited."

**Upgrade from Trial:**
1. User on 14-day trial (planId: "pro", status: "trialing")
2. User clicks "Upgrade Now"
3. POST `/api/billing/razorpay/create-subscription` with chosen plan
4. User authenticates
5. Trial ends immediately, subscription starts
6. No charge for trial period

#### E. Trial System

**Trial mechanics:**
- All new orgs get 14-day Pro trial automatically on signup
- No credit card, no UPI mandate required during trial
- Trial tracked via `Subscription.trialEndsAt`
- After trial expiry: auto-downgrade to Free plan

**Trigger.dev job — `check-trial-expiry`:**
```typescript
// Runs daily at 00:00 UTC via Trigger.dev scheduled job
// 1. Find all subscriptions where status = "trialing" AND trialEndsAt < now
// 2. Set status = "expired", planId = "free"
// 3. Send email: "Your trial has ended. Upgrade to keep full access."
// 4. Send in-app notification
// 5. Log to AuditLog
```

**Trial reminder emails (via Resend):**
- 7 days before expiry: "7 days left on your Pro trial"
- 3 days before: "3 days left — don't lose your work"
- 1 day before: "Trial ends tomorrow"
- On expiry: "Your trial has ended. Here's what you'll lose on Free..."

**Trial banner component: `src/components/plan/trial-banner.tsx`**
- Shows in app header (sticky top) when user is on trial
- Content: "🎉 Pro Trial — X days remaining · [Upgrade Now]"
- Countdown updates daily
- Dismissible per session (re-shows on next visit)
- On 3 days remaining: red/urgent styling
- Clicking "Upgrade Now" → `/app/billing/upgrade`

---

### 3.3 Sprint 11.3 — Growth, Onboarding Conversion & Analytics

**Duration:** 1 sprint
**Can run in parallel with Sprint 11.2** (no dependencies between billing and marketing pages)
**Goal:** Build public-facing pages, activate conversion funnel, implement referral system, optimize onboarding.

#### A. Public Marketing Pages

**New route group: `src/app/(marketing)/`**

These pages have NO authentication requirement and must be accessible by crawlers.

```
src/app/(marketing)/
├── layout.tsx                    — Marketing header (logo, nav, login CTA) + footer
├── page.tsx                      — Homepage
├── pricing/page.tsx              — Public pricing page (mirrors /app/billing/upgrade)
├── features/page.tsx             — Full feature list comparison
├── docs/
│   ├── invoice-generator/page.tsx — SEO: "Free Invoice Generator India"
│   ├── voucher-maker/page.tsx     — SEO: "Payment Voucher Maker"
│   └── salary-slip/page.tsx       — SEO: "Salary Slip Generator India"
├── tools/
│   ├── pdf-studio/page.tsx        — PDF Studio landing (merge, split, compress)
│   ├── passport-photo/page.tsx    — Passport Photo Tool landing
│   └── image-resize/page.tsx      — Image Resize Tool landing
├── company/
│   ├── about/page.tsx             — About Slipwise
│   ├── blog/page.tsx              — Blog (static or CMS-based)
│   └── contact/page.tsx           — Contact form
└── legal/
    ├── privacy/page.tsx            — Privacy Policy
    └── terms/page.tsx             — Terms of Service
```

**SEO requirements (all marketing pages):**
```typescript
// Every marketing page must export:
export const metadata: Metadata = {
  title: "...",                      // ~60 chars, keyword-rich
  description: "...",               // ~155 chars
  keywords: [...],
  openGraph: {
    title: "...",
    description: "...",
    type: "website",
    url: "https://slipwise.com/...",
    images: [{ url: "...", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", ... },
  alternates: { canonical: "https://slipwise.com/..." },
};
```

**`src/app/sitemap.ts`** — generate XML sitemap including all marketing pages.

**Homepage sections:**
1. Hero: "The All-in-One Business Document Suite for India" + "Start for Free" + "View Pricing"
2. Product overview: SW Docs / PDF Studio / SW Pixel / SW Pay / SW Flow / SW Intel
3. Template gallery: showcasing invoice and salary slip templates
4. Feature highlight cards
5. Pricing preview (link to full pricing page)
6. Social proof / testimonials
7. FAQ accordion
8. Final CTA: "Start Free — No Credit Card Required"

**Pricing page sections:**
1. Billing toggle: Monthly / Annual (show savings %)
2. Plan cards: Free | Starter | Pro | Enterprise
3. Feature comparison table (full grid, all features)
4. FAQ: "Do I need to give UPI upfront?", "Can I cancel anytime?", "What happens after trial?"
5. Razorpay trust badges (Secure payments, UPI, Visa, Mastercard)

#### B. Anonymous Usage Funnel

**Goal:** Allow visitors to use PDF Studio and SW Pixel tools 3 times without creating an account.

**Implementation:**
- `src/lib/anonymous-usage.ts` — track usage count in cookies (not localStorage — works across tabs and persists better)
- Cookie: `slw_anon_ops` (httpOnly: false, sameSite: lax, maxAge: 7 days)
- After 3 uses: show `AnonymousUpgradeModal`
- `src/components/plan/anonymous-gate.tsx` — modal with "Sign up free" CTA
- On signup: attribute anonymous session to new account, show "Welcome! Your 3 free uses are saved."

**Fallback if cookies blocked:** Silently fail-open (let them use the tool). Convert on intent, not blocking.

**Analytics events:**
- `anonymous_tool_used` — track tool name, use count (1/2/3)
- `anonymous_limit_hit` — track which tool blocked them
- `anonymous_signup_from_gate` — track conversion from anon gate modal

#### C. Referral System

**Mechanics:**
- Every user gets a personal referral code: `slw_[8-char random]` (generated on first access to referral page)
- Referral URL: `https://slipwise.com/?ref=slw_abc12345`
- Cookie set: `slw_ref=slw_abc12345` (30-day TTL, httpOnly)
- On signup: read `slw_ref` cookie, create `Referral` record with `referrerId`
- On referred user's first paid subscription: both get 1 month free (credit applied to next Razorpay invoice)

**Credit mechanics:**
- Credit type: 1 month of their current plan (Starter → ₹999 credit, Pro → ₹2,999 credit)
- Applied as Razorpay plan addon credit on next billing cycle
- Both parties notified by email and in-app notification

**Files:**
```
src/lib/referral.ts                            — generateCode(), trackSignup(), applyCredit()
src/app/app/settings/referrals/
├── page.tsx                                   — Your referral link, share buttons, stats
└── actions.ts                                 — getOrCreateReferralCode(), getReferralStats()
```

**Referral dashboard (`/app/settings/referrals`):**
- Your referral link with copy button
- Share via: WhatsApp, Email, LinkedIn, Twitter
- Stats: Signups from your link, Conversions (paid), Credits earned
- History table: date, user (masked), status, credit applied

**Edge cases:**
- Self-referral: blocked (compare referrerId with current user)
- Multiple signups same device: only first signup counts (cookie-based, 1 credit per unique email)
- Referrer churns before credit applied: credit still applied to referred user
- Both parties must be on paid plans at time of conversion for credit to apply

#### D. Onboarding Funnel

**Goal:** Guide new users from signup to active (first doc created) and track every step.

**Onboarding steps:**
1. ✅ Account created (always done at signup)
2. ⬜ Email verified
3. ⬜ Organization set up (name, logo, colors)
4. ⬜ First document created (any type)
5. ⬜ First document exported (PDF/PNG)
6. ⬜ First team member invited
7. ⬜ First recurring invoice set up (or "skip" option for solo users)

**`src/components/onboarding/onboarding-checklist.tsx`:**
- Appears in app dashboard as a collapsible panel (default: expanded for new orgs)
- Shows progress: "4 of 7 steps complete"
- Each step: icon, text, status (done/todo), CTA link
- Confetti animation when all steps done
- Dismissible after all complete
- Disappears permanently once dismissed
- Shows trial countdown if on trial: "X days left in Pro trial" with upgrade CTA

**`src/lib/onboarding-tracker.ts`:**
```typescript
export type OnboardingStep = 
  | "account_created" | "email_verified" | "org_setup"
  | "first_doc_created" | "first_doc_exported" | "team_member_invited"
  | "recurring_setup";

export async function markOnboardingStep(userId: string, step: OnboardingStep): Promise<void>
export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress>
```

**PostHog events:**
- `onboarding_step_completed` — `{ step, userId, orgId, daysFromSignup }`
- `onboarding_completed` — when all steps done
- `onboarding_abandoned` — user inactive 7 days with steps remaining

#### E. Document Sharing (Growth Loop)

**Goal:** Shared invoices carry Slipwise brand → passive discovery.

**Share mechanics:**
- Any document (invoice, voucher, salary slip) can be shared as a public read-only link
- URL: `/share/[docType]/[shareToken]`
- Token: 32-byte random, stored hashed in DB
- Token expiry: configurable (default: 30 days, extendable)
- Free plan: "Powered by Slipwise One" banner shown at bottom of shared doc
- Paid plans: banner hidden (white-label)

**Shared view features:**
- Read-only render of document in selected template
- "Download PDF" button (does NOT require auth)
- For invoices: "Mark as paid" button (requires sender to share a special pay link)
- View count tracked: `SharedDocument.viewCount` incremented on each load

**Analytics events:**
- `share_link_created`
- `share_link_viewed` — by recipient
- `share_link_downloaded` — PDF download by recipient
- `share_link_expired`

---

### 3.4 Pricing Tiers Full Specification

```
FREE:       ₹0/month    — perpetual
STARTER:    ₹999/month  OR  ₹9,990/year  (save ₹1,998)
PRO:        ₹2,999/month OR ₹29,990/year (save ₹5,998)
ENTERPRISE: Custom pricing (contact sales)
```

**Annual discount: ~17% off**

**Trial: 14 days Pro for ALL new signups (no payment method required)**

**Upgrade/downgrade: anytime, takes effect on next billing cycle**

**Cancellation: anytime, access until period end**

**Refund policy:** 7-day money-back guarantee on first subscription (contact support)

---

### 3.5 Feature Gating Matrix (Full)

| Feature | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Documents** | | | | |
| Invoice creation | 10/mo | 100/mo | Unlimited | Unlimited |
| Voucher creation | 20/mo | 200/mo | Unlimited | Unlimited |
| Salary slip creation | 10/mo | 50/mo | Unlimited | Unlimited |
| **Tools** | | | | |
| PDF Studio operations | 20/day | 200/day | Unlimited | Unlimited |
| SW Pixel operations | 30/day | Unlimited | Unlimited | Unlimited |
| **Templates** | | | | |
| Templates per doc type | 3 | All 5 | All 5 + custom colors | All |
| **Team** | | | | |
| Org members | 1 | 3 | 10 | Unlimited |
| Proxy grants | ❌ | 2 | Unlimited | Unlimited |
| **Storage** | | | | |
| Storage | 500 MB | 5 GB | 50 GB | Custom |
| **Email** | | | | |
| Email sends | 5/day | 100/day | 500/day | Unlimited |
| Recurring invoice rules | ❌ | 5 | Unlimited | Unlimited |
| Scheduled sends | ❌ | ✅ | ✅ | ✅ |
| **Analytics** | | | | |
| SW Intel dashboard | Basic | Full | Full + trends + forecast | Full |
| CSV export | ❌ | ✅ | ✅ | ✅ |
| **Branding** | | | | |
| Custom logo + colors | ❌ | ✅ | ✅ | ✅ |
| White-label | ❌ | ❌ | ✅ | ✅ |
| "Powered by" watermark | Shown | Removed | Removed | Removed |
| **Access** | | | | |
| Audit log | ❌ | Last 30 days | Full history | Full history |
| Job log | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ (Phase 12) | ✅ |
| SSO / SAML | ❌ | ❌ | ❌ | ✅ (Phase 12) |
| **Support** | | | | |
| Support | Community | Email 48h | Chat + Email 12h | Dedicated AM |

---

### 3.6 Phase 11 Database Schema Additions

```prisma
// New models to add to prisma/schema.prisma

model Subscription {
  id                  String              @id @default(cuid())
  orgId               String              @unique
  planId              String              @default("free")
  // "free" | "starter" | "pro" | "enterprise"
  status              String              @default("trialing")
  // "trialing" | "active" | "past_due" | "paused" | "payment_failed" | "cancelled" | "expired" | "completed"
  billingInterval     String?             // "monthly" | "annual"
  razorpayCustomerId  String?             @unique  // cust_xxxxxxxxxx
  razorpaySubId       String?             @unique  // sub_xxxxxxxxxx
  razorpayPlanId      String?                      // plan_xxxxxxxxxx (Razorpay plan ID)
  trialEndsAt         DateTime?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  cancelAtPeriodEnd   Boolean             @default(false)
  cancelledAt         DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  organization        Organization        @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("subscription")
}

model UsageRecord {
  id            String       @id @default(cuid())
  orgId         String
  resource      String
  // "invoice" | "voucher" | "salary_slip" | "pdf_studio" | "pixel" | "email_send"
  periodMonth   String       // "2026-04" — resets monthly
  periodDay     String?      // "2026-04-06" — for daily-limited resources
  count         Int          @default(0)
  updatedAt     DateTime     @updatedAt
  organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, resource, periodMonth])
  @@unique([orgId, resource, periodDay])
  @@index([orgId, periodMonth])
  @@map("usage_record")
}

model RazorpayEvent {
  id            String   @id            // Razorpay event ID — used for idempotency
  type          String                  // e.g. "subscription.authenticated"
  payload       Json                    // Full webhook payload for debugging
  processedAt   DateTime @default(now())

  @@index([type])
  @@index([processedAt])
  @@map("razorpay_event")
}

model Referral {
  id              String    @id @default(cuid())
  referrerId      String                          // Profile.id of referrer
  referredOrgId   String?                         // Set when referred user creates org
  referralCode    String    @unique               // "slw_abc12345"
  status          String    @default("pending")
  // "pending" | "signed_up" | "converted" | "credited"
  creditApplied   Boolean   @default(false)
  referrerCredit  Boolean   @default(false)       // Referrer also credited
  createdAt       DateTime  @default(now())
  convertedAt     DateTime?
  creditedAt      DateTime?
  referrer        Profile   @relation(fields: [referrerId], references: [id], onDelete: Cascade)

  @@index([referrerId])
  @@index([referralCode])
  @@map("referral")
}

model SharedDocument {
  id            String   @id @default(cuid())
  orgId         String
  docType       String                           // "invoice" | "voucher" | "salary_slip"
  docId         String
  shareToken    String   @unique                // 32-byte random, URL-safe
  expiresAt     DateTime?
  viewCount     Int      @default(0)
  downloadCount Int      @default(0)
  createdBy     String                           // Profile.id
  createdAt     DateTime @default(now())
  organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([shareToken])
  @@index([orgId, docType, docId])
  @@map("shared_document")
}

model OnboardingProgress {
  id                    String    @id @default(cuid())
  userId                String    @unique  // Profile.id
  accountCreated        Boolean   @default(true)
  emailVerified         Boolean   @default(false)
  orgSetup              Boolean   @default(false)
  firstDocCreated       Boolean   @default(false)
  firstDocExported      Boolean   @default(false)
  teamMemberInvited     Boolean   @default(false)
  recurringSetup        Boolean   @default(false)
  completedAt           DateTime?
  dismissedAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("onboarding_progress")
}

// Add to Organization model:
// subscription       Subscription?
// usageRecords       UsageRecord[]
// sharedDocuments    SharedDocument[]

// Add to Profile model:
// referrals          Referral[]
// onboardingProgress OnboardingProgress?
```

---

### 3.7 Phase 11 Architecture Changes

#### New Route Groups

```
src/app/
├── (marketing)/                            — NEW: public marketing site
│   ├── layout.tsx                          — marketing header/footer (no auth)
│   ├── page.tsx                            — homepage
│   ├── pricing/page.tsx
│   ├── features/page.tsx
│   ├── docs/
│   │   ├── invoice-generator/page.tsx
│   │   ├── voucher-maker/page.tsx
│   │   └── salary-slip/page.tsx
│   ├── tools/
│   │   ├── pdf-studio/page.tsx
│   │   ├── passport-photo/page.tsx
│   │   └── image-resize/page.tsx
│   └── legal/
│       ├── privacy/page.tsx
│       └── terms/page.tsx
├── share/
│   └── [docType]/[token]/page.tsx          — NEW: public shared document view
└── app/
    ├── billing/                            — NEW: billing management
    │   ├── page.tsx
    │   ├── upgrade/page.tsx
    │   ├── success/page.tsx
    │   ├── cancel/page.tsx
    │   └── actions.ts
    └── settings/
        └── referrals/                      — NEW: referral dashboard
            ├── page.tsx
            └── actions.ts
```

#### New API Routes

```
src/app/api/
├── billing/
│   ├── razorpay/
│   │   ├── create-subscription/route.ts   — POST: start subscription
│   │   ├── webhook/route.ts               — POST: Razorpay events
│   │   ├── cancel-subscription/route.ts   — POST: cancel
│   │   └── customer-details/route.ts      — GET: fetch customer info
│   └── subscription-status/route.ts       — GET: internal status
└── share/
    └── [docType]/[token]/route.ts          — GET: public document data
```

#### New Components & Hooks

```
src/components/
├── plan/
│   ├── upgrade-gate.tsx           — Wraps gated UI, shows upgrade prompt
│   ├── upgrade-prompt.tsx         — Inline upgrade banner
│   ├── trial-banner.tsx           — Sticky header banner during trial
│   ├── usage-indicator.tsx        — "7/10 invoices used"
│   └── anonymous-gate.tsx         — Signup modal after 3 anon uses
├── onboarding/
│   └── onboarding-checklist.tsx   — Step-by-step onboarding panel
└── billing/
    ├── pricing-table.tsx
    ├── plan-card.tsx
    ├── billing-toggle.tsx
    ├── usage-meter.tsx
    └── billing-history.tsx

src/hooks/
└── use-plan.ts                    — usePlan() hook

src/lib/
├── plans/
│   ├── config.ts
│   ├── enforcement.ts
│   └── usage.ts
├── razorpay.ts                    — Razorpay SDK init + helpers
├── referral.ts                    — Referral code generation + tracking
├── anonymous-usage.ts             — Anonymous op tracking via cookies
└── onboarding-tracker.ts          — Onboarding step tracking + PostHog
```

---

### 3.8 Phase 11 Acceptance Criteria

**Sprint 11.1 — Plan Infrastructure:**
- [ ] New org creation creates `Subscription` with `planId: "pro"`, `status: "trialing"`, `trialEndsAt: now + 14 days`
- [ ] `checkLimit("invoice")` returns `{ allowed: false }` for free org after 10 invoices
- [ ] `checkLimit("invoice")` returns `{ allowed: true }` for same org on Starter plan
- [ ] `incrementUsage()` atomically increments `UsageRecord.count`
- [ ] `reset-all-monthly-usage` job runs on 1st of month, resets counts
- [ ] `send-usage-alerts` job sends email at 80% and 100% of monthly limits
- [ ] Usage indicator component shows `7/10 invoices used this month`
- [ ] `createInvoice()` server action blocked for free org at limit (returns error, not throw)
- [ ] UI upgrade gate shows on attempt to create gated feature (recurring invoices on free plan)
- [ ] All 9 gated server actions checked with correct resource type

**Sprint 11.2 — Razorpay Billing:**
- [ ] Clicking "Subscribe to Starter" creates Razorpay subscription and returns `short_url`
- [ ] `subscription.authenticated` webhook sets `Subscription.status = "active"`
- [ ] `invoice.payment_failed` sets `status = "past_due"` and sends alert email
- [ ] `subscription.halted` sends in-app notification to org owner
- [ ] `subscription.cancelled` downgrades org to free plan
- [ ] Webhook with invalid signature returns 400
- [ ] Duplicate webhook event (same `id`) returns 200 but is NOT processed twice
- [ ] Cancellation at period end: `cancelAtPeriodEnd = true`, access until `currentPeriodEnd`
- [ ] Trial expiry job downgrades orgs after `trialEndsAt` passes
- [ ] Trial reminder emails sent at 7 days, 3 days, 1 day before expiry
- [ ] Trial banner shows in app header with correct days remaining
- [ ] Upgrade from trial flow: trial ends, Pro subscription starts, no duplicate charge

**Sprint 11.3 — Growth:**
- [ ] Homepage renders at `/` without auth (no redirect to login)
- [ ] Pricing page renders at `/pricing` without auth
- [ ] All marketing pages have valid `metadata.title` and `metadata.description`
- [ ] `sitemap.ts` includes all marketing pages
- [ ] Anonymous user can use PDF Studio 3 times (cookie tracked)
- [ ] 4th anonymous use shows `AnonymousUpgradeModal`
- [ ] Referral code generated on first visit to `/app/settings/referrals`
- [ ] `/?ref=slw_abc12345` sets `slw_ref` cookie
- [ ] Signup with `slw_ref` cookie creates `Referral` record
- [ ] Self-referral blocked (referrer = referred user)
- [ ] Onboarding checklist shows for new org
- [ ] Onboarding step `first_doc_created` marked when invoice created
- [ ] Document share link: `/share/invoice/[token]` accessible without auth
- [ ] Share token expiry respected (expired token → 404 / "Link expired" page)
- [ ] "Powered by Slipwise" watermark on shared docs for free plan, hidden for paid

---

## 4. Phase 12 — Global Expansion, API Platform & Enterprise

### Objective

Expand Slipwise One from India to global markets (US, EU, SEA). Add a public REST API for developer integrations. Launch enterprise features (SSO, multi-org management). Add Stripe as a second payment gateway for non-INR customers.

**Phase 12 delivers:**
1. **Stripe integration** — second payment gateway for USD/EUR/GBP pricing
2. **Multi-currency pricing** — USD, EUR, GBP, SGD pricing pages
3. **Public REST API** — full CRUD + webhook/event API for developer integrations
4. **API key management** — per-org API keys with scopes and rate limits
5. **SSO / SAML** — Enterprise single sign-on (Okta, Google Workspace, Azure AD)
6. **Multi-org management** — parent org can manage multiple child orgs from one dashboard
7. **Advanced analytics** — API usage analytics, revenue analytics, churn metrics
8. **White-label embedding** — embed Slipwise tools in customer products

---

### 4.1 Sprint 12.1 — Stripe Global Billing + Multi-Currency

**Goal:** Add Stripe as second gateway for USD/EUR/GBP markets.

#### A. Payment Gateway Adapter Pattern

```typescript
// src/lib/billing/gateway.ts
export interface BillingGateway {
  createCustomer(params: CreateCustomerParams): Promise<GatewayCustomer>;
  createSubscription(params: CreateSubscriptionParams): Promise<GatewaySubscription>;
  cancelSubscription(subId: string, cancelAtPeriodEnd: boolean): Promise<void>;
  updateSubscription(subId: string, params: UpdateSubParams): Promise<GatewaySubscription>;
  getSubscription(subId: string): Promise<GatewaySubscription>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  mapWebhookEvent(rawEvent: unknown): NormalizedBillingEvent;
}

// Implementations:
// src/lib/billing/razorpay-gateway.ts — wraps Razorpay SDK
// src/lib/billing/stripe-gateway.ts   — wraps Stripe SDK

// Factory:
export function getGateway(currency: string): BillingGateway {
  return currency === "INR" 
    ? new RazorpayGateway() 
    : new StripeGateway();
}
```

#### B. Multi-Currency Pricing

| Plan | INR (Razorpay) | USD (Stripe) | EUR (Stripe) | GBP (Stripe) |
|---|---|---|---|---|
| Starter monthly | ₹999 | $12 | €11 | £10 |
| Starter annual | ₹9,990 | $120 | €110 | £100 |
| Pro monthly | ₹2,999 | $36 | €33 | £30 |
| Pro annual | ₹29,990 | $360 | €330 | £300 |

**Currency detection:** `Accept-Language` header + browser locale + explicit user choice.
**Currency stored on Subscription:** `currency: String @default("INR")`

#### C. Stripe Setup

**Required Stripe products (create in Stripe dashboard):**
- `prod_starter_monthly`, `prod_starter_annual`, `prod_pro_monthly`, `prod_pro_annual`
- Each with USD, EUR, GBP prices

**Required env vars:**
```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_STARTER_MONTHLY_USD_PRICE_ID=price_xxxxxxxxxx
STRIPE_STARTER_ANNUAL_USD_PRICE_ID=price_xxxxxxxxxx
STRIPE_PRO_MONTHLY_USD_PRICE_ID=price_xxxxxxxxxx
STRIPE_PRO_ANNUAL_USD_PRICE_ID=price_xxxxxxxxxx
# ... repeat for EUR, GBP
```

**Stripe routes:**
```
src/app/api/billing/
├── stripe/
│   ├── create-checkout/route.ts      — POST: Stripe Checkout session
│   ├── create-portal/route.ts        — POST: Stripe Customer Portal
│   ├── webhook/route.ts              — POST: Stripe webhook events
│   └── customer-details/route.ts     — GET: customer + subscription info
```

**Stripe webhook events to handle:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Activate subscription, set `status = "active"` |
| `customer.subscription.updated` | Update plan, status, period |
| `customer.subscription.deleted` | Cancel, downgrade to free |
| `customer.subscription.trial_will_end` | Send trial ending emails |
| `invoice.payment_succeeded` | Extend period, send receipt |
| `invoice.payment_failed` | Set `past_due`, send alert |
| `invoice.upcoming` | Send renewal reminder 7 days before |

**All events:** idempotent via `StripeEvent` table (same pattern as `RazorpayEvent`).

#### D. Global Marketing Pages

```
src/app/(marketing)/
├── pricing/
│   └── page.tsx          — Currency-aware pricing page (show USD/EUR/GBP/INR)
└── [locale]/             — Optional: i18n support (Phase 12+)
```

---

### 4.2 Sprint 12.2 — Public API Platform

**Goal:** Expose Slipwise functionality as a REST API. Developers can create invoices, fetch documents, trigger exports via API key.

#### A. API Key Management

**`src/app/app/settings/api-keys/`** — API key management UI:
- Create key: name, scopes (read:invoices, write:invoices, export:docs, etc.)
- View existing keys (masked — only full key shown once at creation)
- Revoke key
- View per-key usage stats

**Database:**
```prisma
model ApiKey {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  keyHash     String   @unique         // SHA-256 of actual key
  keyPrefix   String                   // First 8 chars for display ("slw_live_ab12cd34...")
  scopes      String[]                 // ["read:invoices", "write:invoices", "export:docs"]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdBy   String                   // Profile.id
  createdAt   DateTime @default(now())
  organization Organization @relation(fields: [orgId], references: [id])

  @@index([orgId])
  @@index([keyHash])
  @@map("api_key")
}
```

#### B. API Routes

**Base URL:** `https://api.slipwise.com/v1/`

All routes:
- Authenticated via `Authorization: Bearer slw_live_xxxx` header
- Rate limited per org per key
- Return JSON
- `application/json` content type

**Endpoints:**

```
GET    /v1/invoices              — List invoices (pagination, filters)
POST   /v1/invoices              — Create invoice
GET    /v1/invoices/:id          — Get invoice
PUT    /v1/invoices/:id          — Update invoice
DELETE /v1/invoices/:id          — Delete invoice
POST   /v1/invoices/:id/export   — Trigger PDF export, returns signed URL

GET    /v1/vouchers              — List vouchers
POST   /v1/vouchers              — Create voucher
GET    /v1/vouchers/:id          — Get voucher

GET    /v1/salary-slips          — List salary slips
POST   /v1/salary-slips          — Create salary slip
GET    /v1/salary-slips/:id      — Get salary slip

POST   /v1/pdf-studio/merge      — Merge PDFs, returns signed URL
POST   /v1/pdf-studio/split      — Split PDF
POST   /v1/pdf-studio/compress   — Compress PDF

GET    /v1/org                   — Get org info
GET    /v1/org/usage             — Get current usage stats
GET    /v1/org/subscription      — Get subscription + plan details

POST   /v1/webhooks              — Register webhook endpoint
GET    /v1/webhooks              — List registered webhooks
DELETE /v1/webhooks/:id          — Remove webhook
```

**API documentation:** Auto-generated from OpenAPI spec at `/api/v1/openapi.json`.
**Developer portal:** `src/app/(marketing)/developers/page.tsx` — API docs, quickstart guide.

#### C. API Webhooks (Outbound)

When customers register a webhook URL, Slipwise sends events when things happen in their org:

| Event | When |
|---|---|
| `invoice.created` | New invoice created |
| `invoice.exported` | Invoice exported to PDF/PNG |
| `invoice.deleted` | Invoice deleted |
| `payment.received` | Payment proof uploaded and accepted |
| `job.failed` | Recurring job failed after 3 retries |
| `member.added` | New team member added |

Delivery: retry 3 times with exponential backoff. Signed with HMAC-SHA256 `X-Slipwise-Signature` header.

---

### 4.3 Sprint 12.3 — Enterprise Features (SSO / SAML + Multi-Org)

**Goal:** Enable enterprise customers to use SSO and manage multiple organizations from one admin dashboard.

#### A. SSO / SAML Integration

**Supported providers:**
- Google Workspace (SAML 2.0)
- Microsoft Azure AD (SAML 2.0 + OIDC)
- Okta (SAML 2.0)
- Generic SAML 2.0

**Implementation:**
- Use `node-saml` library
- SAML metadata URL per org: `/api/auth/saml/[orgId]/metadata`
- ACS URL: `/api/auth/saml/[orgId]/callback`

**Database:**
```prisma
model SSOConfig {
  id              String   @id @default(cuid())
  orgId           String   @unique
  provider        String   // "google" | "azure" | "okta" | "saml"
  entityId        String
  ssoUrl          String
  certificate     String   // X.509 cert
  attributeMap    Json     // { email: "...", name: "...", role: "..." }
  isEnabled       Boolean  @default(false)
  createdAt       DateTime @default(now())
  organization    Organization @relation(fields: [orgId], references: [id])

  @@map("sso_config")
}
```

#### B. Multi-Org Management

**Goal:** A parent org can create and manage multiple child orgs (useful for accounting firms, HR agencies).

**Features:**
- Create/invite child orgs from parent dashboard
- Switch between child orgs without re-login
- Shared billing: parent org pays for all child orgs
- Parent admin can view all child org documents
- Consolidated analytics across all child orgs

**Database:**
```prisma
model OrgRelationship {
  id          String   @id @default(cuid())
  parentOrgId String
  childOrgId  String
  createdAt   DateTime @default(now())
  parentOrg   Organization @relation("ParentOrg", fields: [parentOrgId], references: [id])
  childOrg    Organization @relation("ChildOrg", fields: [childOrgId], references: [id])

  @@unique([parentOrgId, childOrgId])
  @@map("org_relationship")
}
```

---

### 4.4 Phase 12 Database Schema Additions

```prisma
// Add to prisma/schema.prisma:

model StripeEvent {
  id          String   @id  // Stripe event ID — idempotency
  type        String
  payload     Json
  processedAt DateTime @default(now())

  @@index([type])
  @@index([processedAt])
  @@map("stripe_event")
}

model ApiKey {
  id            String       @id @default(cuid())
  orgId         String
  name          String
  keyHash       String       @unique
  keyPrefix     String
  scopes        String[]
  lastUsedAt    DateTime?
  expiresAt     DateTime?
  revokedAt     DateTime?
  createdBy     String
  createdAt     DateTime     @default(now())
  organization  Organization @relation(fields: [orgId], references: [id])

  @@index([orgId])
  @@index([keyHash])
  @@map("api_key")
}

model Webhook {
  id            String       @id @default(cuid())
  orgId         String
  url           String
  events        String[]     // e.g. ["invoice.created", "payment.received"]
  secret        String       // for HMAC signing outbound events
  isActive      Boolean      @default(true)
  lastDeliveredAt DateTime?
  failureCount  Int          @default(0)
  createdAt     DateTime     @default(now())
  organization  Organization @relation(fields: [orgId], references: [id])

  @@index([orgId])
  @@map("webhook")
}

model SSOConfig {
  id            String       @id @default(cuid())
  orgId         String       @unique
  provider      String       // "google" | "azure" | "okta" | "saml"
  entityId      String
  ssoUrl        String
  certificate   String
  attributeMap  Json
  isEnabled     Boolean      @default(false)
  createdAt     DateTime     @default(now())
  organization  Organization @relation(fields: [orgId], references: [id])

  @@map("sso_config")
}

model OrgRelationship {
  id            String       @id @default(cuid())
  parentOrgId   String
  childOrgId    String
  createdAt     DateTime     @default(now())
  parentOrg     Organization @relation("ParentOrg", fields: [parentOrgId], references: [id])
  childOrg      Organization @relation("ChildOrg", fields: [childOrgId], references: [id])

  @@unique([parentOrgId, childOrgId])
  @@map("org_relationship")
}

// Add to Subscription:
// currency        String   @default("INR")
// stripeCustomerId String? @unique
// stripeSubId      String? @unique
// stripeInterval   String?
```

---

### 4.5 Phase 12 Architecture Changes

#### New Routes

```
src/app/
├── api/
│   ├── v1/                             — Public REST API
│   │   ├── invoices/[[...slug]]/route.ts
│   │   ├── vouchers/[[...slug]]/route.ts
│   │   ├── salary-slips/[[...slug]]/route.ts
│   │   ├── pdf-studio/[tool]/route.ts
│   │   ├── org/route.ts
│   │   ├── webhooks/[[...slug]]/route.ts
│   │   └── openapi.json/route.ts
│   ├── billing/
│   │   └── stripe/
│   │       ├── create-checkout/route.ts
│   │       ├── create-portal/route.ts
│   │       └── webhook/route.ts
│   └── auth/
│       └── saml/[orgId]/
│           ├── metadata/route.ts
│           └── callback/route.ts
└── app/
    ├── settings/
    │   ├── api-keys/page.tsx           — API key management
    │   └── sso/page.tsx               — SSO configuration
    └── admin/
        └── orgs/page.tsx              — Multi-org management
```

---

### 4.6 Phase 12 Acceptance Criteria

**Sprint 12.1 — Stripe Billing:**
- [ ] `GET /pricing?currency=usd` shows USD pricing
- [ ] Stripe Checkout session created with correct USD price
- [ ] `checkout.session.completed` activates subscription with `currency: "USD"`
- [ ] `BillingGateway` abstraction: switching `getGateway("USD")` uses Stripe, `getGateway("INR")` uses Razorpay
- [ ] Indian org paying in INR: uses Razorpay. US org paying in USD: uses Stripe

**Sprint 12.2 — API Platform:**
- [ ] `POST /v1/invoices` with valid API key creates invoice and returns 201
- [ ] `POST /v1/invoices` with invalid API key returns 401
- [ ] `POST /v1/invoices` with expired key returns 401
- [ ] API key with `read:invoices` scope cannot `POST` (returns 403)
- [ ] Rate limit on API: 60 req/min per key, 429 with `Retry-After` header
- [ ] OpenAPI spec at `/api/v1/openapi.json` is valid JSON
- [ ] `GET /v1/invoices` respects plan limits (free org can only see 10 invoices)

**Sprint 12.3 — Enterprise:**
- [ ] SSO config saved for org
- [ ] SAML login flow redirects to IdP and back
- [ ] Post-SAML login: session created, user lands in app
- [ ] Parent org can see child org list at `/app/admin/orgs`
- [ ] Switching to child org changes all data context

---

## 5. Shared Technical Standards

### Code Patterns

**ActionResult pattern (defined per-file):**
```typescript
type ActionResult<T> = 
  | { success: true; data: T } 
  | { success: false; error: string; upgradeUrl?: string };
```

**Prisma 7 imports:**
```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
// Nullable JSON: use Prisma.DbNull, cast to Prisma.InputJsonValue
```

**Rate limiting pattern (Phase 10, extend for API):**
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
```

### Error Handling

- All server actions: `ActionResult<T>`
- All API routes: `{ error: string; code?: string; upgradeUrl?: string }`
- Rate limit errors: `{ error: "rate_limited", retryAfterMs: number }`
- Plan limit errors: `{ error: "plan_limit_exceeded", resource: string, current: number, limit: number, upgradeUrl: string }`
- Auth errors: `{ error: "unauthorized" | "forbidden" }` — 401/403

### Type Safety

- Zero `any` types in new code
- Razorpay event payloads: typed with Razorpay SDK types
- Stripe event payloads: typed with Stripe SDK types
- Plan limits: `PlanLimits` interface (not raw strings/numbers)
- API request/response: Zod schemas for all endpoints

### Security

- Razorpay: `RAZORPAY_KEY_SECRET` server-side only — never exposed to client
- Stripe: `STRIPE_SECRET_KEY` server-side only
- API keys: stored as SHA-256 hash — original never stored
- Share tokens: 32-byte random, URL-safe base64 — stored hashed
- Webhook signatures verified on every inbound event
- Billing webhooks: raw body preserved before any JSON parsing

### Testing Requirements

- `checkLimit()`: unit tests for all 5 resources × 4 plans = 20 test cases
- Razorpay webhook handler: integration tests for all 12 events
- Stripe webhook handler: integration tests for all 7 events
- `BillingGateway` adapter: mock tests for both Razorpay and Stripe adapters
- API routes: integration tests for all endpoints with valid/invalid auth
- Rate limit middleware: unit tests for allow/deny/Redis-down scenarios

---

## 6. Route Map

### New Routes — Phase 11

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/` | Page | Public | Marketing homepage |
| `/pricing` | Page | Public | Pricing page |
| `/features` | Page | Public | Feature overview |
| `/docs/invoice-generator` | Page | Public | Invoice generator landing (SEO) |
| `/docs/voucher-maker` | Page | Public | Voucher maker landing (SEO) |
| `/docs/salary-slip` | Page | Public | Salary slip landing (SEO) |
| `/tools/pdf-studio` | Page | Public | PDF Studio landing (SEO) |
| `/tools/passport-photo` | Page | Public | Passport photo landing (SEO) |
| `/legal/privacy` | Page | Public | Privacy policy |
| `/legal/terms` | Page | Public | Terms of service |
| `/share/[docType]/[token]` | Page | Public | Shared document view |
| `/app/billing` | Page | Auth | Billing overview |
| `/app/billing/upgrade` | Page | Auth | Pricing + upgrade flow |
| `/app/billing/success` | Page | Auth | Post-subscription success |
| `/app/billing/cancel` | Page | Auth | Cancellation flow |
| `/app/settings/referrals` | Page | Auth | Referral dashboard |
| `/api/billing/razorpay/create-subscription` | API | Auth | Start Razorpay subscription |
| `/api/billing/razorpay/webhook` | API | Public | Razorpay webhook events |
| `/api/billing/razorpay/cancel-subscription` | API | Auth | Cancel subscription |
| `/api/billing/razorpay/customer-details` | API | Auth | Customer info |
| `/api/billing/subscription-status` | API | Auth | Internal subscription status |
| `/api/share/[docType]/[token]` | API | Public | Public document data |

### New Routes — Phase 12

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/api/v1/*` | API | API Key | Public REST API |
| `/api/billing/stripe/create-checkout` | API | Auth | Stripe checkout |
| `/api/billing/stripe/create-portal` | API | Auth | Stripe customer portal |
| `/api/billing/stripe/webhook` | API | Public | Stripe webhook events |
| `/api/auth/saml/[orgId]/metadata` | API | Public | SAML metadata |
| `/api/auth/saml/[orgId]/callback` | API | Public | SAML callback |
| `/app/settings/api-keys` | Page | Auth | API key management |
| `/app/settings/sso` | Page | Auth (Enterprise) | SSO configuration |
| `/app/admin/orgs` | Page | Auth (Enterprise) | Multi-org management |

---

## 7. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Billing page load | < 1s (data from DB, no gateway API call) |
| `checkLimit()` | < 50ms (Redis-cached plan lookup) |
| Razorpay subscription creation | < 2s |
| Marketing pages LCP | < 2.5s |
| Marketing pages CLS | < 0.1 |
| API endpoint (simple CRUD) | < 200ms p95 |
| API endpoint (export trigger) | < 1s (async, returns job ID) |

### Reliability

| Service | Target |
|---|---|
| Razorpay webhook processing | < 30 seconds per event |
| Rate limit Redis | Fail-open if Redis unavailable (never block) |
| Trial expiry job | Idempotent, runs once per day |
| API key validation | < 10ms (hash lookup only) |

### Scalability

- Usage increment: atomic counter update via `$executeRaw` or Prisma upsert with increment
- Rate limiting: sliding window (not fixed window) to prevent burst-at-boundary
- Webhook delivery: queue-based with Trigger.dev (async, not blocking HTTP response)
- Storage tracking: async, non-blocking

### Security

- No gateway secret keys in client bundle (enforce via `server-only`)
- API keys: store only hash, rate limit by key ID
- Share tokens: 32-byte crypto-random, short expiry (30 days default)
- SAML certificates: stored encrypted in DB
- Multi-org: strict org boundary checks on every query

---

## 8. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Razorpay approval delayed | Low | High | Start KYC early; build plan infrastructure in parallel |
| R2 | UPI mandate auth rate low | Medium | High | Add fallback to card/netbanking in UI; show both options |
| R3 | Trial abuse (new org per email) | Medium | Medium | 1 trial per email + IP + payment method fingerprint |
| R4 | Plan limit bypass via API | Medium | High | Enforce in server actions, not just UI; API routes check limits too |
| R5 | Razorpay webhook retry flooding | Low | Medium | Idempotency table + idempotent handlers |
| R6 | Storage tracking drift | Medium | Low | Nightly reconciliation job |
| R7 | Conversion rate too low | High | High | A/B test pricing page; simplify UPI flow; add money-back guarantee |
| R8 | API key brute force | Low | High | Hash-based lookup; rate limit by IP on auth attempts |
| R9 | SAML misconfiguration locks users out | Low | Critical | Test SSO in sandbox first; keep email fallback |
| R10 | Multi-currency pricing confusion | Medium | Medium | Default to INR for Indian users; explicit currency selector |

---

## 9. QA & Acceptance Gates

### Phase 11 — Billing QA

**Plan Enforcement:**
- [ ] Create 10 invoices on free plan → 11th blocked, error message references upgrade
- [ ] Upgrade to Starter → 11th invoice succeeds
- [ ] 100th invoice on Starter → 101st blocked
- [ ] Pro plan → unlimited invoices (create 200, all succeed)
- [ ] Downgrade Pro → Starter: existing 150 invoices preserved, new ones blocked at 100
- [ ] Try to add 4th org member on Starter plan → blocked with upgrade prompt

**Razorpay Integration:**
- [ ] Full subscription flow (test mode): auth link → UPI mandate → `subscription.authenticated` → `status = "active"`
- [ ] Payment failure: `invoice.payment_failed` → `status = "past_due"` → alert email sent
- [ ] `subscription.halted`: `status = "payment_failed"` → in-app notification to org owner
- [ ] Cancel at period end: access until `currentPeriodEnd`, then auto-downgrade
- [ ] Webhook with invalid signature → 400, no processing
- [ ] Duplicate webhook (same event ID) → 200, idempotent (check DB for single RazorpayEvent record)
- [ ] Trial expiry: `trialEndsAt` passed → org on free plan, trial banner gone

**Trial System:**
- [ ] New org: `Subscription.status = "trialing"`, `trialEndsAt = createdAt + 14 days`
- [ ] Trial banner shows with correct countdown
- [ ] Day 7: reminder email received
- [ ] Day 11: urgent reminder email received
- [ ] Day 14: trial expired email, plan downgraded to free
- [ ] Upgrade during trial: trial ends immediately, subscription active

### Phase 11 — Growth QA

**Public Pages:**
- [ ] `GET /pricing` → 200, no redirect (unauthenticated)
- [ ] `GET /` → 200, marketing homepage (unauthenticated)
- [ ] All pages: `<title>` and `<meta name="description">` present
- [ ] Sitemap: `/sitemap.xml` includes all marketing pages

**Anonymous Funnel:**
- [ ] Use PDF Studio tool → cookie `slw_anon_ops` set with count 1
- [ ] Use 3 times → count 3
- [ ] Use 4th time → `AnonymousUpgradeModal` shown
- [ ] Clear cookies → count resets (expected behavior)

**Referrals:**
- [ ] Visit `/app/settings/referrals` → referral code generated (or existing shown)
- [ ] Visit `/?ref=slw_abc12345` → `slw_ref` cookie set
- [ ] Sign up after that → `Referral.referrerId` correct
- [ ] Self-referral attempt → blocked with error

**Sharing:**
- [ ] Create invoice → "Share" button → share link generated
- [ ] Open share link in incognito → document renders, no login required
- [ ] "Download PDF" from shared view → PDF download (no auth)
- [ ] After `expiresAt` → "This link has expired" page

### Phase 12 — API Platform QA

**API Authentication:**
- [ ] Valid key + correct scope → 200
- [ ] Valid key + wrong scope → 403
- [ ] Revoked key → 401
- [ ] Expired key → 401
- [ ] No key → 401

**Rate Limiting:**
- [ ] 61st request in 1 minute → 429 with `Retry-After` header

**CRUD:**
- [ ] `POST /v1/invoices` → invoice created, `201` returned
- [ ] `GET /v1/invoices/:id` for non-existent ID → 404
- [ ] `GET /v1/invoices/:id` for different org's invoice → 403

---

## 10. Multi-Agent Execution Strategy

### Phase 11 — 4 Agents (parallel after Agent 11-A completes)

**Agent 11-A: Plan Infrastructure (MUST RUN FIRST)**
Files: `src/lib/plans/*`, `prisma/schema.prisma` (+5 models), `src/hooks/use-plan.ts`, `src/components/plan/*`
Dependencies: None
Blocking: Agents 11-B, 11-C, 11-D all depend on Subscription model and `checkLimit()`

**Agent 11-B: Razorpay Billing Integration**
Files: `src/lib/razorpay.ts`, `src/app/api/billing/razorpay/*`, `src/app/app/billing/*`
Dependencies: Agent 11-A (Subscription model in DB)
Can parallel with: 11-C, 11-D

**Agent 11-C: Public Marketing Pages + SEO**
Files: `src/app/(marketing)/*`, `src/app/sitemap.ts`, `src/app/share/*`, `src/app/api/share/*`
Dependencies: Agent 11-A (SharedDocument model in DB)
Can parallel with: 11-B, 11-D

**Agent 11-D: Growth Mechanics + Onboarding**
Files: `src/lib/referral.ts`, `src/lib/anonymous-usage.ts`, `src/lib/onboarding-tracker.ts`, `src/app/app/settings/referrals/*`, `src/components/onboarding/*`, `src/components/billing/*`
Dependencies: Agent 11-A (Referral + OnboardingProgress models in DB)
Can parallel with: 11-B, 11-C

**Execution order:**
```
Phase 11:
  Sprint 11.1: Agent 11-A alone (plan infrastructure)
  ├── Wait for Agent 11-A to complete
  Sprints 11.2 + 11.3: Agents 11-B + 11-C + 11-D in parallel
```

### Phase 12 — 4 Agents

**Agent 12-A: Stripe Global Billing + BillingGateway Abstraction**
Files: `src/lib/billing/*`, `src/lib/stripe.ts`, `src/app/api/billing/stripe/*`, DB schema (StripeEvent, Subscription.currency)

**Agent 12-B: Public REST API Platform**
Files: `src/app/api/v1/*`, `src/lib/api-keys/*`, `src/middleware.ts` (API auth), `src/app/app/settings/api-keys/*`, DB schema (ApiKey, Webhook)

**Agent 12-C: Enterprise SSO + Multi-Org**
Files: `src/app/api/auth/saml/*`, `src/lib/sso.ts`, `src/app/app/settings/sso/*`, `src/app/app/admin/orgs/*`, DB schema (SSOConfig, OrgRelationship)

**Agent 12-D: Developer Portal + API Docs**
Files: `src/app/(marketing)/developers/*`, `src/app/api/v1/openapi.json/route.ts`, OpenAPI spec

**Execution order:**
```
Phase 12:
  Sprint 12.1: Agent 12-A alone (billing abstraction before API adds usage tracking)
  ├── Wait for 12-A to complete (BillingGateway interface needed by API)
  Sprints 12.2 + 12.3: Agents 12-B + 12-C + 12-D in parallel
```

### Agent Context Requirements

Each agent must:
1. Read `prisma/schema.prisma` before making any DB changes
2. Read `src/lib/` directory listing before adding new utilities
3. Use existing `ActionResult<T>` pattern (defined per-file)
4. Enforce `RBAC` via `requirePermission()` on all protected routes
5. Run `npx tsc --noEmit` after each file batch — fix all TS errors
6. Run `npx eslint src/ --max-warnings 0` — fix all lint errors
7. Follow Prisma 7 pattern: `import { PrismaClient } from "@/generated/prisma/client"`

---

## Appendix A — Environment Variables Reference

### Phase 11 New Variables

```bash
# Razorpay (India billing)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_STARTER_MONTHLY_PLAN_ID=plan_xxxxxxxxxxxxxxxx
RAZORPAY_STARTER_ANNUAL_PLAN_ID=plan_xxxxxxxxxxxxxxxx
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_xxxxxxxxxxxxxxxx
RAZORPAY_PRO_ANNUAL_PLAN_ID=plan_xxxxxxxxxxxxxxxx
RAZORPAY_SUCCESS_REDIRECT_URL=https://app.slipwise.com/app/billing/success
RAZORPAY_CANCEL_REDIRECT_URL=https://app.slipwise.com/app/billing/cancel

# Feature flags (optional, for gradual rollout)
FEATURE_BILLING_ENABLED=true
FEATURE_REFERRALS_ENABLED=true
FEATURE_ANONYMOUS_FUNNEL_ENABLED=true
```

### Phase 12 New Variables

```bash
# Stripe (global billing)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_STARTER_MONTHLY_USD_PRICE_ID=price_xxxxxxxxxxxxxxxx
STRIPE_STARTER_ANNUAL_USD_PRICE_ID=price_xxxxxxxxxxxxxxxx
STRIPE_PRO_MONTHLY_USD_PRICE_ID=price_xxxxxxxxxxxxxxxx
STRIPE_PRO_ANNUAL_USD_PRICE_ID=price_xxxxxxxxxxxxxxxx
# Repeat for EUR, GBP

# Public API
API_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # for outbound webhook HMAC
```

---

## Appendix B — Razorpay Quick Reference

**Razorpay Plan Pricing in Paise:**
- ₹999 = 99900 paise
- ₹9,990 = 999000 paise
- ₹2,999 = 299900 paise
- ₹29,990 = 2999000 paise

**Razorpay Subscription States:**
- `created` → subscription created, not yet authenticated
- `authenticated` → UPI mandate/card authorized
- `active` → recurring payments running
- `paused` → user paused
- `halted` → max retries exceeded
- `cancelled` → user cancelled
- `completed` → all billing cycles done
- `expired` → never authenticated within window

**Key API calls:**
```javascript
// Create customer
razorpay.customers.create({ email, contact, name })

// Create subscription
razorpay.subscriptions.create({ plan_id, customer_notify: 1, total_count: 0 })

// Cancel subscription
razorpay.subscriptions.cancel(subscriptionId, { cancel_at_cycle_end: 1 })

// Verify webhook
Razorpay.validateWebhookSignature(body, signature, webhookSecret)
```

**Test credentials (for development):**
- Use `rzp_test_*` key pair (separate from `rzp_live_*`)
- Razorpay provides test UPI IDs and card numbers in dashboard

---

*End of Phase 11 & 12 PRD — Slipwise One*
*Version 1.0 | 2026-04-06 | India-First Billing with Razorpay + Global Expansion with Stripe*
