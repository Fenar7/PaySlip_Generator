# Slipwise One — Phase 12 & Phase 13
## Product Requirements Document (PRD)
### Version 1.0 | Global Expansion + API Platform + AWS Migration + AI
### Engineering Handover Document

---

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 12: Global Expansion + API + Enterprise · Phase 13: AWS + AI + Integrations |
| **Document Version** | 1.0 |
| **Date** | 2026-04-06 |
| **Document Purpose** | Full engineering handover — autonomous multi-agent execution ready |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–11 completed and merged to master |
| **Branch Convention** | `feature/phase-12-global` · `feature/phase-13-aws-ai` |
| **Sprint Model** | 3 sprints (Phase 12) + 3 sprints (Phase 13) |
| **Total Sprints** | 6 sprints |
| **Engineering Model** | Multi-agent parallel execution recommended |
| **Primary Billing** | Razorpay (India, already live from Phase 11) |
| **Phase 12 Billing** | Stripe (global — USD/EUR/GBP) |
| **Phase 13 Infra** | AWS ECS + RDS + S3 + CloudFront |
| **Parent Company** | Zenxvio |

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State Post Phase 11](#2-current-state-post-phase-11)
3. [Phase 12 — Global Expansion, API Platform & Enterprise](#3-phase-12--global-expansion-api-platform--enterprise)
   - 3.1 Sprint 12.1 — BillingGateway Adapter + Stripe Global Billing
   - 3.2 Sprint 12.2 — Public REST API Platform
   - 3.3 Sprint 12.3 — Enterprise Features (SSO, Multi-Org, White-Label)
   - 3.4 Database Schema Additions
   - 3.5 Route Map
   - 3.6 Edge Cases & Acceptance Criteria
   - 3.7 Test Cases
4. [Phase 13 — AWS Migration, AI Platform & Third-Party Integrations](#4-phase-13--aws-migration-ai-platform--third-party-integrations)
   - 4.1 Sprint 13.1 — AWS Infrastructure Migration
   - 4.2 Sprint 13.2 — AI-Powered Features
   - 4.3 Sprint 13.3 — Third-Party Integrations + Mobile PWA
   - 4.4 Database Schema Additions
   - 4.5 Infrastructure Architecture
   - 4.6 Edge Cases & Acceptance Criteria
   - 4.7 Test Cases
5. [Shared Technical Standards](#5-shared-technical-standards)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Risk Register](#7-risk-register)
8. [QA & Acceptance Gates](#8-qa--acceptance-gates)
9. [Multi-Agent Execution Strategy](#9-multi-agent-execution-strategy)
10. [Appendix A — Environment Variables](#appendix-a--environment-variables)
11. [Appendix B — API Contract Reference](#appendix-b--api-contract-reference)
12. [Appendix C — Stripe Quick Reference](#appendix-c--stripe-quick-reference)
13. [Appendix D — AWS Architecture Diagram](#appendix-d--aws-architecture-diagram)

---

## 1. Product Context & Phase Summary

### Slipwise One Sub-Products

| Module | Description | Status |
|---|---|---|
| SW Docs | Invoices (5 templates), Vouchers (5 templates), Salary Slips (5 templates) | ✅ Phase 3 |
| PDF Studio | 10 tools: merge, split, delete, organize, resize, fill-sign, protect, header-footer, pdf-to-image, repair | ✅ Phase 8 |
| SW Pixel | 5 tools: passport photo, resize, adjust, print layout, labels | ✅ Phase 9 |
| SW Pay | Payment lifecycle, receivables, proof uploads | ✅ Phase 4 |
| SW Flow | Recurring billing, scheduled sends, Trigger.dev orchestration | ✅ Phase 5 |
| SW Intel | KPI dashboard, reports, CSV export | ✅ Phase 6 |
| SW Auth | 7 roles, 15 modules, proxy grants, full audit log | ✅ Phase 7 |
| SW Billing | Razorpay India subscriptions, plan enforcement, usage metering | ✅ Phase 11 |

### Delivery Roadmap

| Phase | Name | Status |
|---|---|---|
| 0–9 | Foundation → PDF Studio → Pixel | ✅ Done |
| 10 | Hardening + Infrastructure | ✅ Done |
| 11 | Razorpay Billing + Growth + Marketing | ✅ Done |
| **12** | **Global Billing + API Platform + Enterprise** | 🔲 This Document |
| **13** | **AWS Migration + AI + Integrations** | 🔲 This Document |

---

## 2. Current State Post Phase 11

### What Exists in Codebase

| File/Module | Location | Purpose |
|---|---|---|
| Plan config | `src/lib/plans/config.ts` | 4 tiers, PlanLimits interface |
| Plan enforcement | `src/lib/plans/enforcement.ts` | `checkLimit`, `checkFeature`, `requirePlan` |
| Usage tracking | `src/lib/plans/usage.ts` | `incrementUsage`, `getMonthlyUsage` |
| Razorpay SDK | `src/lib/razorpay.ts` | Lazy-init wrapper, webhook verify |
| Billing logic | `src/lib/billing.ts` | Subscription CRUD, trial management |
| Billing API | `src/app/api/billing/razorpay/*` | Create, webhook, cancel |
| Billing UI | `src/app/app/billing/*` | Overview, upgrade, success, cancel |
| Rate limiting | `src/lib/rate-limit.ts` | Upstash Redis sliding window |
| Storage adapter | `src/lib/storage-adapter.ts` | Supabase impl + S3 stub |
| Referrals | `src/lib/referral.ts` | Codes, conversion, credits |
| Onboarding | `src/lib/onboarding-tracker.ts` | 7-step tracker |
| Document sharing | `src/lib/document-sharing.ts` | Share tokens, revoke |
| Marketing | `src/app/(marketing)/*` | 6 public pages |

### Current Prisma Models (40 total post Phase 11)

Relevant models for Phase 12-13 context:
- `Subscription` — orgId, planId, status, razorpaySubId, razorpayCustomerId, trialEndsAt
- `UsageRecord` — orgId, resource, periodMonth, count
- `RazorpayEvent` — id, type, payload, processedAt
- `Organization` — id, name, slug, createdAt
- `Profile` — id (UUID), name, email, avatarUrl
- `Member` — orgId, userId, role

### What Phase 12 Must Add

1. **No Stripe integration** — international users cannot pay
2. **No public API** — no programmatic access for power users/integrations
3. **No SSO/SAML** — enterprise clients cannot use their identity provider
4. **No multi-org management** — users cannot switch between multiple orgs
5. **No API keys** — no developer access to document data
6. **No custom domains** — all users on slipwise.app subdomain

### What Phase 13 Must Add

1. **Deployed on Vercel** — no cost control, no SLA, vertical scale only
2. **Supabase storage only** — no CDN, no performance optimization at scale
3. **No AI features** — manual data entry only
4. **No GST integration** — manual GST calculations
5. **No Tally/QuickBooks** — accountants cannot sync data
6. **No mobile PWA** — desktop-only experience

---

## 3. Phase 12 — Global Expansion, API Platform & Enterprise

### Objective

Scale Slipwise One globally. Add Stripe billing for international customers, build a developer-facing REST API with API keys and webhooks, and introduce enterprise-grade features (SSO/SAML, multi-org management, custom domains, white-label).

---

### 3.1 Sprint 12.1 — BillingGateway Adapter + Stripe Global Billing

**Duration:** 1 sprint (before API and Enterprise sprints)
**Goal:** Abstract billing so Razorpay (India) and Stripe (global) coexist under a single interface. Add Stripe checkout, webhooks, customer portal.
**Dependency:** Must complete BEFORE Sprints 12.2 and 12.3 (API usage tracking needs billing)

#### A. BillingGateway Interface

Create `src/lib/billing-gateway.ts`:

```typescript
export interface SubscriptionDetails {
  externalCustomerId: string;
  externalSubId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  checkoutUrl?: string;
}

export interface BillingGateway {
  name: "razorpay" | "stripe";
  createCustomer(params: { name: string; email: string; phone?: string; orgId: string }): Promise<{ customerId: string }>;
  createSubscription(params: { customerId: string; planId: string; interval: "monthly" | "yearly"; currency: string }): Promise<SubscriptionDetails>;
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
  changeSubscriptionPlan(subscriptionId: string, newPlanId: string): Promise<void>;
  createBillingPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
```

Rules:
- `BILLING_GATEWAY=razorpay` (default) → use Razorpay
- `BILLING_GATEWAY=stripe` → use Stripe
- Org-level override: if org was created from a `IN` country IP → Razorpay; else → Stripe
- Store `billingGateway: "razorpay" | "stripe"` on Subscription model
- Update `src/lib/billing.ts` to use `BillingGateway` interface internally

#### B. Stripe SDK Integration

**Install:** `npm install stripe @stripe/stripe-js`

Create `src/lib/stripe.ts`:
- `getStripe()` — lazy-init Stripe SDK (return null if keys not configured)
- `verifyStripeWebhookSignature(rawBody, signature)` — use `stripe.webhooks.constructEvent`
- `createStripeCustomer(params)` — creates Stripe customer
- `createStripeCheckoutSession(params)` — hosted checkout for subscriptions
- `createStripePortalSession(customerId, returnUrl)` — Stripe customer portal
- `cancelStripeSubscription(subscriptionId)` — cancel at period end
- `retrieveStripeSubscription(subscriptionId)` — fetch full details

**Stripe Products/Prices Configuration:**
- Create Stripe Products and Prices via Stripe Dashboard
- Store Price IDs in env vars (see Appendix A)
- Support currencies: INR (₹), USD ($), EUR (€), GBP (£), SGD (S$), AED (د.إ)

**Currency Detection Logic:**
1. Check `Accept-Language` header → map locale to currency
2. Check user's org `countryCode` field (if set)
3. Check Cloudflare/Vercel `CF-IPCountry` / `x-vercel-ip-country` header
4. Default: USD

#### C. Stripe API Routes

Create `src/app/api/billing/stripe/`:

##### `create-checkout-session/route.ts` — POST
Request body:
```json
{
  "orgId": "clxxxx",
  "planId": "starter" | "pro" | "enterprise",
  "billingInterval": "monthly" | "yearly",
  "currency": "USD" | "EUR" | "GBP",
  "successUrl": "https://app.slipwise.com/app/billing/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://app.slipwise.com/app/billing/cancel"
}
```
Response: `{ checkoutUrl: string }` — redirect to Stripe hosted checkout

Edge cases:
- If org already has active Stripe subscription → return error "Already subscribed, use portal"
- If org is on Razorpay → return error "Please use INR billing"
- Auth required — 401 if not authenticated

##### `webhook/route.ts` — POST
Handle Stripe events:
- `checkout.session.completed` → activate subscription
- `customer.subscription.created` → create Subscription record
- `customer.subscription.updated` → update plan/status
- `customer.subscription.deleted` → mark cancelled
- `invoice.payment_succeeded` → update period dates, reset usage if new period
- `invoice.payment_failed` → set status to `past_due`, notify org admin
- `invoice.upcoming` → send renewal reminder email (7 days before)
- `customer.subscription.trial_will_end` → send trial ending email (3 days before)
- `payment_intent.payment_failed` → increment retry counter

Idempotency: check `StripeEvent` model before processing (identical to `RazorpayEvent` pattern)
Always return 200 OK to Stripe regardless of processing outcome.
Log all events in console with `[Stripe Webhook]` prefix.

##### `cancel/route.ts` — POST
```json
{ "orgId": "clxxxx", "immediateCancel": false }
```
- `immediateCancel: false` → cancel at period end (default)
- `immediateCancel: true` → cancel immediately (Enterprise only, requires confirmation)
- Update Subscription record: `cancelAtPeriodEnd: true` or status `cancelled`

##### `portal/route.ts` — POST
```json
{ "orgId": "clxxxx", "returnUrl": "/app/billing" }
```
- Creates Stripe Customer Portal session
- Returns `{ url: string }` — redirect to Stripe portal
- Portal allows: update card, download invoices, cancel subscription

#### D. Multi-Currency Pricing

**Starter Plan pricing:**
| Currency | Monthly | Yearly | Notes |
|---|---|---|---|
| INR | ₹999 | ₹9,990 | Razorpay |
| USD | $12 | $120 | Stripe |
| EUR | €11 | €110 | Stripe |
| GBP | £10 | £100 | Stripe |
| SGD | S$16 | S$160 | Stripe |

**Pro Plan pricing:**
| Currency | Monthly | Yearly |
|---|---|---|
| INR | ₹2,999 | ₹29,990 |
| USD | $29 | $290 |
| EUR | €27 | €270 |
| GBP | £24 | £240 |
| SGD | S$40 | S$400 |

**Enterprise Plan:** Custom pricing — "Contact Sales" CTA

#### E. Upgrade/Downgrade Flow

1. **Upgrade (Starter → Pro):**
   - Immediately switch to Pro
   - Prorate charge for remaining period
   - Razorpay: raise new subscription with plan change
   - Stripe: `stripe.subscriptions.update({ items: [{ price: newPriceId }] })`

2. **Downgrade (Pro → Starter):**
   - Downgrade takes effect at end of current billing period
   - Show "Your plan will change to Starter on {date}" banner
   - Do NOT immediately reduce features
   - Stripe: schedule downgrade via `proration_behavior: "none"` + future date

3. **Free → Paid:**
   - New subscription created
   - Trial starts immediately (14 days Pro trial)
   - Credit card required to activate trial

4. **Pause subscription (Pro+ only):**
   - Pause billing for up to 3 months
   - Features frozen at current plan level
   - Stripe: `stripe.subscriptions.update({ pause_collection: { behavior: "void" } })`

5. **Reactivate:**
   - Remove pause
   - Resume normal billing from next cycle

#### F. Billing UI Updates

Update `src/app/app/billing/` pages:

**Overview page updates:**
- Show `billingGateway` (Razorpay/Stripe badge)
- Show currency symbol based on gateway
- Add "Manage via Stripe Portal" button for Stripe customers
- Show next renewal date with amount
- Show payment method (card last 4 digits, UPI handle, or "Bank Transfer")
- Invoices/receipts table: list past 12 invoices with download links

**Upgrade page updates:**
- Add currency selector (INR/USD/EUR/GBP/SGD)
- Auto-detect currency from locale
- Show Razorpay for INR, Stripe for others
- Add "Payment protected by Razorpay" / "Payment protected by Stripe" badge

---

### 3.2 Sprint 12.2 — Public REST API Platform

**Duration:** 1 sprint (parallel with 12.3)
**Goal:** Build a versioned, authenticated public REST API for developers. Full CRUD on all document types with pagination, filtering, webhook outbound delivery, and rate limits per plan.

#### A. API Key Management

##### Database Models (add to schema.prisma):

```prisma
model ApiKey {
  id          String    @id @default(cuid())
  orgId       String
  name        String
  keyHash     String    @unique  // SHA-256 of the actual key
  keyPrefix   String              // First 8 chars for identification e.g. "slw_live"
  scopes      String[]            // ["read:invoices", "write:invoices", ...]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, isActive])
  @@index([keyHash])
  @@map("api_key")
}

model ApiWebhookEndpoint {
  id          String    @id @default(cuid())
  orgId       String
  url         String
  events      String[]  // ["invoice.created", "invoice.sent", "invoice.paid", ...]
  secret      String    // HMAC signing secret (stored hashed)
  isActive    Boolean   @default(true)
  description String?
  createdAt   DateTime  @default(now())
  lastDeliveredAt DateTime?
  failureCount    Int   @default(0)

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  deliveries   ApiWebhookDelivery[]

  @@index([orgId, isActive])
  @@map("api_webhook_endpoint")
}

model ApiWebhookDelivery {
  id              String    @id @default(cuid())
  endpointId      String
  eventType       String
  payload         Json
  responseStatus  Int?
  responseBody    String?
  durationMs      Int?
  success         Boolean
  attempt         Int       @default(1)
  deliveredAt     DateTime  @default(now())

  endpoint ApiWebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, deliveredAt])
  @@map("api_webhook_delivery")
}

model ApiRequestLog {
  id         String   @id @default(cuid())
  orgId      String
  apiKeyId   String?
  method     String
  path       String
  statusCode Int
  durationMs Int?
  ip         String?
  createdAt  DateTime @default(now())

  @@index([orgId, createdAt])
  @@index([apiKeyId, createdAt])
  @@map("api_request_log")
}
```

##### API Scopes Definition:

| Scope | Description |
|---|---|
| `read:invoices` | Read invoice list and details |
| `write:invoices` | Create and update invoices |
| `delete:invoices` | Delete invoices |
| `read:vouchers` | Read voucher list and details |
| `write:vouchers` | Create and update vouchers |
| `delete:vouchers` | Delete vouchers |
| `read:salary_slips` | Read salary slip list and details |
| `write:salary_slips` | Create and update salary slips |
| `read:customers` | Read customers list |
| `write:customers` | Create and update customers |
| `read:employees` | Read employees list |
| `write:employees` | Create and update employees |
| `read:vendors` | Read vendors list |
| `write:vendors` | Create and update vendors |
| `read:reports` | Read report snapshots |
| `webhooks:manage` | Create and manage webhook endpoints |

Per-plan API access:
- **Free:** No API access
- **Starter:** No API access
- **Pro:** API access — up to 2 API keys, 10,000 requests/month
- **Enterprise:** Unlimited API keys, unlimited requests

##### API Key Generation UI

Route: `src/app/app/settings/api/page.tsx`

Features:
- List all API keys for org (name, prefix, scopes, last used, status)
- Create new API key:
  - Name (required)
  - Select scopes (checkbox list)
  - Expiry (optional: 30/90/365 days or never)
  - Show key ONCE on creation (copy-to-clipboard, dismiss warning)
- Revoke key (confirm dialog)
- Regenerate key (creates new key, old key immediately invalid)
- Show monthly usage counter (X / 10,000 requests)

Edge cases:
- Attempt to create key on Free/Starter plan → show `UpgradeGate` with "Upgrade to Pro" message
- After showing key once, it CANNOT be retrieved again. Store only `keyHash` (SHA-256)
- If user refreshes after seeing key → show "Key was shown once. If lost, regenerate."

##### API Authentication

All API requests must include:
```
Authorization: Bearer slw_live_xxxxxxxxxxxxx
```
or
```
X-API-Key: slw_live_xxxxxxxxxxxxx
```

Key format: `slw_live_` + nanoid(32) (production) or `slw_test_` + nanoid(32) (test)

API key verification middleware (`src/app/api/v1/middleware.ts`):
1. Extract Bearer token from Authorization header
2. SHA-256 hash the token
3. Lookup `ApiKey` by `keyHash` where `isActive = true`
4. Check `expiresAt` — reject if expired
5. Extract scopes from `ApiKey.scopes`
6. Check requested endpoint's required scope
7. Check plan limit (`Pro` required minimum)
8. Set `req.apiContext = { orgId, apiKeyId, scopes }` on request
9. Update `lastUsedAt` asynchronously (fire-and-forget)
10. Log to `ApiRequestLog` asynchronously

#### B. REST API Endpoints

Base URL: `/api/v1/`
All endpoints: 
- Return `Content-Type: application/json`
- Accept `Content-Type: application/json` for write operations
- Support pagination via `?page=1&limit=20` (max limit 100)
- Support sorting via `?sort=createdAt&order=desc`

##### Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "hasMore": true
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice with ID clxxxx not found",
    "details": {}
  }
}
```

**Standard error codes:**
| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Valid key but missing scope |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `PLAN_LIMIT_REACHED` | 402 | Monthly quota exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `FEATURE_GATED` | 402 | Feature not in plan |

##### Invoices API

`GET /api/v1/invoices`
- Scope: `read:invoices`
- Query params: `?status=draft|sent|paid|overdue|cancelled&customer=clxxxx&from=2026-01-01&to=2026-04-30&page=1&limit=20&sort=createdAt&order=desc`
- Returns: paginated invoice list with `id, number, status, totalAmount, customer, dueDate, createdAt`

`GET /api/v1/invoices/:id`
- Scope: `read:invoices`
- Returns: full invoice with all line items, payments, status events

`POST /api/v1/invoices`
- Scope: `write:invoices`
- Body:
```json
{
  "customerId": "clxxxx",
  "templateId": "classic",
  "currency": "INR",
  "lineItems": [
    {
      "description": "Web Development",
      "quantity": 10,
      "unitPrice": 5000,
      "hsnCode": "998314",
      "taxPercent": 18
    }
  ],
  "dueDate": "2026-05-15",
  "notes": "Thank you for your business",
  "terms": "Payment due within 30 days"
}
```
- Returns: created invoice with `id`, computed `invoiceNumber`, computed totals
- Edge case: increments `invoicesPerMonth` usage counter; reject if plan limit reached

`PATCH /api/v1/invoices/:id`
- Scope: `write:invoices`
- Body: partial invoice fields (cannot change `status` directly — use action endpoints)
- Only allowed if invoice status is `DRAFT`
- Returns: updated invoice

`DELETE /api/v1/invoices/:id`
- Scope: `delete:invoices`
- Only allowed if invoice status is `DRAFT` or `CANCELLED`
- Soft-delete pattern (set `deletedAt` timestamp)

`POST /api/v1/invoices/:id/send`
- Scope: `write:invoices`
- Body: `{ "recipientEmail": "client@example.com", "message": "optional custom message" }`
- Sends invoice PDF via email
- Changes status to `SENT`
- Increments `emailSendsPerMonth` usage counter

`POST /api/v1/invoices/:id/mark-paid`
- Scope: `write:invoices`
- Body: `{ "amount": 50000, "paymentMethod": "upi", "paymentDate": "2026-04-06", "reference": "TXN123" }`
- Creates `InvoicePayment` record
- Changes status to `PAID`

`GET /api/v1/invoices/:id/pdf`
- Scope: `read:invoices`
- Returns: PDF as binary stream with `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="invoice-{number}.pdf"`

##### Vouchers API

`GET /api/v1/vouchers`
- Scope: `read:vouchers`
- Query params: `?type=receipt|payment|journal&from=&to=&page=&limit=`
- Returns: paginated voucher list

`GET /api/v1/vouchers/:id`
- Scope: `read:vouchers`

`POST /api/v1/vouchers`
- Scope: `write:vouchers`
- Body:
```json
{
  "type": "receipt",
  "vendorId": "clxxxx",
  "templateId": "modern",
  "lines": [
    { "account": "Sales Revenue", "debit": 0, "credit": 50000, "narration": "Product sale" }
  ],
  "voucherDate": "2026-04-06",
  "narration": "Received from customer"
}
```

`PATCH /api/v1/vouchers/:id`
- Scope: `write:vouchers`

`DELETE /api/v1/vouchers/:id`
- Scope: `delete:vouchers`

##### Salary Slips API

`GET /api/v1/salary-slips`
- Scope: `read:salary_slips`
- Query params: `?employeeId=&month=2026-03&page=&limit=`

`GET /api/v1/salary-slips/:id`
- Scope: `read:salary_slips`

`POST /api/v1/salary-slips`
- Scope: `write:salary_slips`
- Body:
```json
{
  "employeeId": "clxxxx",
  "month": "2026-03",
  "templateId": "modern",
  "components": [
    { "name": "Basic Salary", "type": "earning", "amount": 50000 },
    { "name": "HRA", "type": "earning", "amount": 20000 },
    { "name": "Professional Tax", "type": "deduction", "amount": 200 },
    { "name": "TDS", "type": "deduction", "amount": 5000 }
  ]
}
```

`GET /api/v1/salary-slips/:id/pdf`
- Scope: `read:salary_slips`
- Returns: PDF binary

##### Customers API

`GET /api/v1/customers`
- Scope: `read:customers`
- Query params: `?search=&page=&limit=`

`GET /api/v1/customers/:id`

`POST /api/v1/customers`
- Scope: `write:customers`
- Body: `{ name, email, phone, gstNumber, address: { line1, city, state, pincode, country } }`

`PATCH /api/v1/customers/:id`
- Scope: `write:customers`

`DELETE /api/v1/customers/:id`
- Scope: `delete:customers` (not in standard scopes — omit or add)

##### Employees API

`GET /api/v1/employees`
- Scope: `read:employees`

`GET /api/v1/employees/:id`

`POST /api/v1/employees`
- Scope: `write:employees`
- Body: `{ name, email, phone, employeeId, designation, department, joinDate, pan, aadhaarLast4, bank: { name, accountNumber, ifsc } }`

`PATCH /api/v1/employees/:id`

##### Reports API

`GET /api/v1/reports/summary`
- Scope: `read:reports`
- Query: `?from=2026-01-01&to=2026-03-31`
- Returns: `{ totalInvoiced, totalCollected, totalOutstanding, totalVouchers, slipsGenerated, byMonth: [...] }`

`GET /api/v1/reports/outstanding`
- Scope: `read:reports`
- Returns: list of unpaid invoices grouped by aging (0-30, 31-60, 61-90, 90+ days)

#### C. Outbound Webhooks

**Management UI:** `src/app/app/settings/webhooks/page.tsx`

Features:
- List all webhook endpoints
- Add endpoint: URL, select events, description
- Test endpoint: sends `ping` event
- View delivery history per endpoint (last 50)
- Retry failed delivery
- Disable/enable endpoint
- View secret (show once, then masked)

**Supported outbound events:**
| Event | Trigger |
|---|---|
| `invoice.created` | New invoice created |
| `invoice.updated` | Invoice fields changed |
| `invoice.sent` | Invoice emailed |
| `invoice.paid` | Invoice marked paid |
| `invoice.overdue` | Invoice past due date |
| `invoice.cancelled` | Invoice cancelled |
| `voucher.created` | Voucher created |
| `voucher.updated` | Voucher updated |
| `salary_slip.created` | Salary slip created |
| `salary_slip.sent` | Salary slip emailed |
| `subscription.activated` | Plan activated |
| `subscription.trial_ending` | Trial ends in 3 days |
| `subscription.cancelled` | Subscription cancelled |
| `member.invited` | Team member invited |
| `member.joined` | Team member accepted invite |
| `ping` | Test event |

**Webhook payload format:**
```json
{
  "id": "evt_01HXXX",
  "type": "invoice.paid",
  "created": "2026-04-06T08:00:00Z",
  "orgId": "clxxxx",
  "data": {
    "object": { ... full invoice object ... }
  },
  "apiVersion": "2026-04"
}
```

**Signing:**
- `Slipwise-Signature: t=1234567890,v1=xxxxxxxxxxxx`
- HMAC-SHA256 of `{timestamp}.{rawBody}` using endpoint secret
- Verify: compute expected signature, compare with `crypto.timingSafeEqual`

**Delivery mechanics:**
- Attempt delivery immediately via background job
- Timeout: 30 seconds
- Retry on non-2xx: 3 retries with exponential backoff (5min, 30min, 2hr)
- After 3 failures: mark delivery failed, increment `failureCount` on endpoint
- After 10 consecutive failures: auto-disable endpoint + notify org admin

#### D. Developer Portal

Route: `src/app/(marketing)/developers/page.tsx`

Contents:
- Hero: "Build on Slipwise One" + code snippet
- Getting Started section with auth example
- Interactive API reference (link to OpenAPI spec)
- Code examples: Node.js, Python, PHP, cURL
- Webhook guide with payload examples
- Link to changelog

Route: `src/app/api/v1/openapi.json/route.ts`
- Returns OpenAPI 3.1 spec as JSON
- Auto-generated from route definitions
- Include all endpoints, schemas, error codes

---

### 3.3 Sprint 12.3 — Enterprise Features

**Duration:** 1 sprint (parallel with 12.2)
**Goal:** Enterprise-grade authentication (SSO/SAML), multi-org management, custom domains, white-labeling, SLA features.

#### A. SSO / SAML 2.0

**Install:** `npm install @auth/core saml2-js` or use a managed service like WorkOS/Auth0

**Supported Identity Providers:**
- Okta
- Microsoft Entra ID (Azure AD)
- Google Workspace (SAML)
- Ping Identity
- OneLogin
- Any SAML 2.0 compliant IdP

**Flow:**
1. Org admin configures SSO in Settings → Security → SSO
2. Admin enters IdP metadata URL or XML
3. Slipwise shows SP metadata (ACS URL, Entity ID) for IdP configuration
4. Admin tests SSO connection
5. Admin enforces SSO (optional — blocks password login for org members)

**Database models:**
```prisma
model SsoConfig {
  id              String    @id @default(cuid())
  orgId           String    @unique
  provider        String    // "okta" | "azure" | "google" | "saml"
  metadataUrl     String?
  metadataXml     String?
  acsUrl          String    // e.g. https://app.slipwise.com/api/auth/sso/{orgSlug}/callback
  entityId        String    // e.g. https://app.slipwise.com
  ssoEnforced     Boolean   @default(false)
  isActive        Boolean   @default(true)
  testedAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("sso_config")
}
```

**SSO API Routes:**
- `GET /api/auth/sso/{orgSlug}/initiate` — redirect to IdP login
- `POST /api/auth/sso/{orgSlug}/callback` — handle SAML assertion, create session
- `GET /api/auth/sso/{orgSlug}/metadata` — return SP metadata XML

**SSO Login Flow:**
1. User visits `https://app.slipwise.com/auth/login?org=acme`
2. If org has SSO configured and enforced → redirect to IdP
3. IdP authenticates user → sends SAML assertion to ACS URL
4. Parse assertion, extract email + name
5. Find Profile by email → update session → redirect to app
6. If no Profile exists → create Profile + Member → onboard user
7. If SSO enforced → block regular email/password login for this org's members

**Settings UI:** `src/app/app/settings/security/sso/page.tsx`
- SSO configuration form
- Test SSO button
- "Enforce SSO" toggle (with warning: "All members must use SSO after enabling")
- Show SP metadata for admin to configure in IdP

**Plan requirement:** Enterprise plan only. Show `UpgradeGate` for non-Enterprise orgs.

#### B. Multi-Organization Management

**Use case:** A user may own or be a member of multiple organizations (e.g., personal freelance + company).

**Database changes:**
```prisma
// Profile already has multiple Members
// Add org switcher state:
model UserOrgPreference {
  userId           String   @id @db.Uuid
  activeOrgId      String
  updatedAt        DateTime @updatedAt

  user Profile      @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [activeOrgId], references: [id], onDelete: Cascade)

  @@map("user_org_preference")
}
```

**Org Switcher UI:**
- Add org switcher to app header/sidebar
- Shows list of all orgs user belongs to with role badge
- Quick switch without re-login
- "Create New Organization" option
- "Leave Organization" option (not for owners)

**Org switching flow:**
1. User clicks org switcher
2. List orgs from `db.member.findMany({ where: { userId } })`
3. User selects org
4. Update `UserOrgPreference.activeOrgId`
5. Refresh app with new org context
6. All documents, settings, billing reflect selected org

**Edge cases:**
- Owner cannot leave org (must transfer ownership first)
- If only 1 org: hide switcher (or show as non-interactive)
- If user leaves org while viewing it: redirect to another org or org creation
- Deleted org: automatically removed from switcher

#### C. Custom Domains

**Use case:** Enterprise clients want `billing.acme.com` instead of `slipwise.app`.

**Implementation:**
- Use Vercel custom domain API or Cloudflare Workers routing
- `OrgDomain` model stores verified domain + SSL status
- CNAME: `docs.acme.com` → `custom.slipwise.app`

**Database model:**
```prisma
model OrgDomain {
  id           String    @id @default(cuid())
  orgId        String    @unique
  domain       String    @unique  // e.g. "billing.acme.com"
  verified     Boolean   @default(false)
  sslEnabled   Boolean   @default(false)
  verifyToken  String    // DNS TXT record value for domain verification
  createdAt    DateTime  @default(now())
  verifiedAt   DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("org_domain")
}
```

**Domain verification flow:**
1. Org admin enters custom domain in Settings → Branding → Custom Domain
2. System generates verify token (nanoid)
3. Admin adds DNS TXT record: `_slipwise-verify.acme.com → {token}`
4. Admin clicks "Verify Domain"
5. Backend calls DNS lookup to confirm TXT record
6. Mark domain verified, provision SSL via Vercel/Cloudflare API
7. Public share links and invoice pages use custom domain

**Plan requirement:** Enterprise plan only.

#### D. White-Label (Remove Slipwise Branding)

**Plan:** Enterprise only

White-label options:
- Remove "Powered by Slipwise" from:
  - Shared document pages
  - Exported PDFs (footer area)
  - Email footers
  - Invoice/Voucher/Salary Slip PDFs
- Custom logo in emails (already in BrandingProfile)
- Custom color scheme for exported docs

**Database changes:**
```prisma
// Add to OrgDefaults or create new OrgWhiteLabel model
model OrgWhiteLabel {
  id              String   @id @default(cuid())
  orgId           String   @unique
  removeBranding  Boolean  @default(false)
  emailFromName   String?  // "Acme Corp" instead of "Slipwise One"
  emailReplyTo    String?  // custom reply-to address
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("org_white_label")
}
```

**White-label check in PDF generation:**
- Before rendering PDF template: check `orgWhiteLabel.removeBranding`
- If true: skip footer Slipwise logo and watermark
- Else: render "Generated with Slipwise One" footer text in gray

#### E. Enterprise Admin Dashboard

Route: `src/app/app/settings/enterprise/page.tsx`

Sections:
1. **SSO Configuration** — Configure IdP, test, enforce
2. **Custom Domain** — Add/verify domain
3. **White-Label** — Toggle branding removal
4. **API Keys** — Manage keys (already in 12.2)
5. **Webhooks** — Manage endpoints (already in 12.2)
6. **Audit Log** — Full audit trail (existing, enhanced)
7. **Organization Domains** — Add org-verified email domains (auto-assign role to new signups)
8. **SLA Status** — Uptime dashboard link + support contact

#### F. Org Verified Domains (Auto-Provisioning)

**Use case:** Any user signing up with `@acme.com` email is auto-assigned to Acme's org with a default role.

```prisma
model OrgEmailDomain {
  id            String   @id @default(cuid())
  orgId         String
  emailDomain   String   // e.g. "acme.com"
  defaultRole   String   @default("viewer")
  autoJoin      Boolean  @default(false)
  createdAt     DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, emailDomain])
  @@map("org_email_domain")
}
```

**Auto-join flow:**
1. New user signs up with `john@acme.com`
2. On profile creation: lookup `OrgEmailDomain` where `emailDomain = "acme.com"` and `autoJoin = true`
3. If found: automatically create `Member` record with `defaultRole`
4. Notify org owner: "New member john@acme.com joined automatically via email domain policy"

---

### 3.4 Phase 12 Database Schema Additions

**Add to `prisma/schema.prisma`:**

```prisma
// API Platform
model ApiKey                  (see Section 3.2A above)
model ApiWebhookEndpoint      (see Section 3.2C above)
model ApiWebhookDelivery      (see Section 3.2C above)
model ApiRequestLog           (see Section 3.2A above)

// Enterprise
model SsoConfig               (see Section 3.3A above)
model UserOrgPreference       (see Section 3.3B above)
model OrgDomain               (see Section 3.3C above)
model OrgWhiteLabel           (see Section 3.3D above)
model OrgEmailDomain          (see Section 3.3F above)

// Stripe
model StripeEvent {
  id          String   @id   // Stripe event ID (evt_xxx)
  type        String
  payload     Json
  processedAt DateTime @default(now())

  @@index([type])
  @@map("stripe_event")
}
```

**Subscription model update:**
```prisma
// Add fields to existing Subscription model:
billingGateway      String    @default("razorpay") // "razorpay" | "stripe"
stripeCustomerId    String?   @unique
stripeSubId         String?   @unique
currency            String    @default("INR")
countryCode         String?   // ISO 3166-1 alpha-2
```

**Organization model update:**
```prisma
// Add to Organization:
slug          String   @unique  // URL-safe identifier
countryCode   String?
timezone      String   @default("Asia/Kolkata")
ssoConfig     SsoConfig?
emailDomains  OrgEmailDomain[]
domain        OrgDomain?
whiteLabel    OrgWhiteLabel?
apiKeys       ApiKey[]
webhookEndpoints ApiWebhookEndpoint[]
```

---

### 3.5 Phase 12 Route Map

**API Platform:**
```
GET  /api/v1/invoices
POST /api/v1/invoices
GET  /api/v1/invoices/:id
PATCH /api/v1/invoices/:id
DELETE /api/v1/invoices/:id
POST /api/v1/invoices/:id/send
POST /api/v1/invoices/:id/mark-paid
GET  /api/v1/invoices/:id/pdf

GET  /api/v1/vouchers
POST /api/v1/vouchers
GET  /api/v1/vouchers/:id
PATCH /api/v1/vouchers/:id
DELETE /api/v1/vouchers/:id

GET  /api/v1/salary-slips
POST /api/v1/salary-slips
GET  /api/v1/salary-slips/:id
GET  /api/v1/salary-slips/:id/pdf

GET  /api/v1/customers
POST /api/v1/customers
GET  /api/v1/customers/:id
PATCH /api/v1/customers/:id

GET  /api/v1/employees
POST /api/v1/employees
GET  /api/v1/employees/:id
PATCH /api/v1/employees/:id

GET  /api/v1/vendors
POST /api/v1/vendors
GET  /api/v1/vendors/:id
PATCH /api/v1/vendors/:id

GET  /api/v1/reports/summary
GET  /api/v1/reports/outstanding

GET  /api/v1/openapi.json
```

**Billing (Stripe):**
```
POST /api/billing/stripe/create-checkout-session
POST /api/billing/stripe/webhook
POST /api/billing/stripe/cancel
POST /api/billing/stripe/portal
```

**Auth (SSO):**
```
GET  /api/auth/sso/[orgSlug]/initiate
POST /api/auth/sso/[orgSlug]/callback
GET  /api/auth/sso/[orgSlug]/metadata
```

**App Pages:**
```
/app/settings/api           (API key management)
/app/settings/webhooks      (Webhook endpoints)
/app/settings/security/sso  (SSO configuration)
/app/settings/enterprise    (Enterprise admin)
/(marketing)/developers     (Developer portal)
```

---

### 3.6 Phase 12 Edge Cases & Acceptance Criteria

#### Billing Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Stripe checkout session expires (30 min) | User redirected to cancel URL; no subscription created |
| Razorpay subscription + user tries Stripe | Block; show "You are on INR billing. Contact support to switch" |
| Stripe webhook received out of order | Idempotency check via StripeEvent model; skip if already processed |
| User upgrades and immediately downgrades | Allow; proration applied on Stripe; cancellation at period end |
| Trial expires while Stripe checkout pending | Show "Your trial has expired. Complete checkout to continue" |
| Card declined during renewal | Set status `past_due`; email notification; 72hr grace period |
| User cancels during trial | Immediately revert to free; no charge |
| Org deleted with active Stripe subscription | Auto-cancel subscription via Stripe API before deletion |
| Currency mismatch (INR org tries USD checkout) | Block with "Your billing is in INR. Use Razorpay." |

#### API Edge Cases

| Scenario | Expected Behavior |
|---|---|
| API key used after revocation | Immediate 401; `revokedAt` checked in middleware |
| API key expiry to the second | Time-based check in middleware; 401 on expiry |
| API request with missing required fields | 422 Unprocessable Entity with field-level error details |
| API invoice creation hits plan limit | 402 with `{ code: "PLAN_LIMIT_REACHED", current: 100, limit: 100 }` |
| Concurrent API requests exceed rate limit | 429 with `Retry-After` header |
| Webhook endpoint URL unreachable | Retry 3 times; disable endpoint after 10 consecutive failures |
| Webhook delivery times out (>30s) | Mark as failed; schedule retry |
| Malicious webhook URL (SSRF) | Validate URL: reject localhost, RFC-1918 IPs, non-HTTPS |
| API key used from different IP | Log `ip` in ApiRequestLog; alert if suspicious pattern |
| OpenAPI spec request | Return spec without authentication |

#### SSO Edge Cases

| Scenario | Expected Behavior |
|---|---|
| SAML assertion expired (>5 min) | Reject with "Authentication expired, please retry" |
| SAML assertion signature invalid | Reject with 403 |
| SSO user email not in org | Create new Member with default viewer role; notify admin |
| SSO enforced but user tries password login | Redirect: "This organization requires SSO. Click here to login via {IdP}" |
| SSO config deleted while users logged in | Sessions remain valid; new logins fall back to email/password |
| IdP sends unrecognized attribute | Log warning; proceed with available attributes (email, name) |
| Admin disables SSO enforcement | Notify all members via email that password login is re-enabled |

---

### 3.7 Phase 12 Test Cases

#### Billing Tests

```
TC-12-01: Stripe checkout session creation
  Given: Pro plan, monthly, USD, authenticated org owner
  When:  POST /api/billing/stripe/create-checkout-session
  Then:  Returns 200 with valid Stripe checkout URL
         URL matches https://checkout.stripe.com/*
         Stripe Customer created in DB

TC-12-02: Stripe webhook subscription.activated
  Given: Valid Stripe-Signature header, subscription.activated payload
  When:  POST /api/billing/stripe/webhook
  Then:  Subscription record updated: status=active
         StripeEvent record created for idempotency
         Returns 200

TC-12-03: Duplicate Stripe webhook (idempotency)
  Given: StripeEvent with same ID already processed
  When:  Same event received again
  Then:  Returns 200 without processing
         DB state unchanged

TC-12-04: Stripe card declined
  Given: invoice.payment_failed event from Stripe
  When:  POST /api/billing/stripe/webhook
  Then:  Subscription status = past_due
         Email sent to org admin: "Payment failed"
         Returns 200

TC-12-05: Subscription downgrade scheduling
  Given: Pro plan, user requests downgrade to Starter
  When:  POST /api/billing/stripe/create-checkout-session { planId: "starter" }
  Then:  Stripe schedules change at period end
         DB: cancelAtPeriodEnd = true (until period ends)
         Banner shown: "Downgrade to Starter on {date}"
```

#### API Tests

```
TC-12-06: Valid API key authentication
  Given: Active API key with read:invoices scope
  When:  GET /api/v1/invoices with valid Bearer token
  Then:  Returns 200 with invoice list
         ApiRequestLog entry created
         lastUsedAt updated on ApiKey

TC-12-07: Revoked API key rejection
  Given: Revoked API key (revokedAt set)
  When:  GET /api/v1/invoices with revoked token
  Then:  Returns 401 { error: { code: "UNAUTHORIZED" } }

TC-12-08: Missing scope rejection
  Given: API key with read:invoices only
  When:  POST /api/v1/invoices (requires write:invoices)
  Then:  Returns 403 { error: { code: "FORBIDDEN" } }

TC-12-09: Plan limit on invoice creation
  Given: Starter plan at 100/100 invoices
  When:  POST /api/v1/invoices
  Then:  Returns 402 { error: { code: "PLAN_LIMIT_REACHED", current: 100, limit: 100 } }

TC-12-10: Webhook delivery and retry
  Given: webhook endpoint registered for invoice.paid
  When:  Invoice marked paid
  Then:  Delivery attempted within 5 seconds
         On 404 response from endpoint: retry after 5 min
         After 3 failures: ApiWebhookDelivery.success = false

TC-12-11: SSRF protection on webhook URL
  Given: Webhook endpoint URL = "http://169.254.169.254/latest/meta-data/"
  When:  POST /app/api/webhooks/create with that URL
  Then:  Returns 422 "Webhook URL must be publicly accessible HTTPS URL"

TC-12-12: API rate limiting
  Given: Pro plan with 10,000 req/month limit
  When:  10,001st request in current month
  Then:  Returns 429 { error: { code: "RATE_LIMITED" } }

TC-12-13: Pagination
  Given: Org has 143 invoices
  When:  GET /api/v1/invoices?page=2&limit=20
  Then:  Returns 20 invoices (items 21-40)
         meta.total = 143, meta.page = 2, meta.hasMore = true
```

#### SSO Tests

```
TC-12-14: SAML SSO login initiation
  Given: Org has SSO configured with Okta
  When:  GET /api/auth/sso/acme-corp/initiate
  Then:  Returns 302 redirect to Okta login URL
         SAMLRequest encoded in redirect

TC-12-15: Valid SAML assertion callback
  Given: Valid SAML response from Okta with email=john@acme.com
  When:  POST /api/auth/sso/acme-corp/callback
  Then:  Profile found by email
         Supabase session created
         Redirect to /app/home

TC-12-16: SSO enforcement blocks password login
  Given: Org has ssoEnforced = true
  When:  User tries POST /api/auth/login with email/password
  Then:  Returns 403 "This organization enforces SSO"
         Includes redirectUrl to SSO login
```

---

## 4. Phase 13 — AWS Migration, AI Platform & Third-Party Integrations

### Objective

Migrate Slipwise One from Vercel + Supabase to AWS infrastructure for cost control, compliance, and global scale. Introduce AI-powered document intelligence, connect with third-party accounting tools, and deliver a mobile-optimized Progressive Web App.

---

### 4.1 Sprint 13.1 — AWS Infrastructure Migration

**Duration:** 1 sprint (must complete before other Phase 13 sprints)
**Goal:** Zero-downtime migration from Vercel → AWS ECS Fargate. All existing functionality must work identically after migration.

#### A. Target AWS Architecture

```
Internet
    │
    ▼
CloudFront (CDN + WAF)
    │
    ├── Static assets (S3 + CloudFront)
    │
    └── Application Load Balancer (ALB)
            │
            ├── ECS Fargate Cluster
            │     ├── Task: next-app (2 replicas min, auto-scale to 10)
            │     └── Task: worker (background jobs — 1 replica)
            │
            ├── RDS PostgreSQL (Multi-AZ, db.t4g.medium)
            │
            ├── ElastiCache Redis (cache.t4g.small, cluster mode off)
            │
            └── S3 Buckets
                  ├── slipwise-assets (logos, public)
                  ├── slipwise-private (attachments, proofs — private, signed URLs)
                  └── slipwise-exports (generated PDFs — 24hr presigned URLs)
```

#### B. Infrastructure as Code

**Tool:** AWS CDK v2 (TypeScript)
**Location:** `infra/` directory at repo root

Stacks:
1. `NetworkStack` — VPC, subnets (public + private), NAT gateway, security groups
2. `DatabaseStack` — RDS PostgreSQL 15, parameter group, subnet group, backup config
3. `CacheStack` — ElastiCache Redis 7, subnet group, auth token
4. `StorageStack` — S3 buckets, bucket policies, CORS config
5. `EcrStack` — ECR repositories for app + worker Docker images
6. `AppStack` — ECS cluster, task definitions, service, ALB, target groups, auto-scaling
7. `CdnStack` — CloudFront distribution, S3 origin, custom domain cert (ACM)
8. `SecretsStack` — Secrets Manager secrets (DB password, Redis token, app secrets)
9. `MonitoringStack` — CloudWatch dashboards, alarms (CPU > 80%, DB connections > 80%, error rate > 1%)

#### C. Containerization

**Dockerfile** at repo root:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
EXPOSE 3000
CMD ["node", "server.js"]
```

**next.config.ts update:**
```typescript
output: "standalone",
```

**Worker Dockerfile** (for background jobs):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/lib/ ./src/lib/
COPY src/workers/ ./src/workers/
COPY src/generated/ ./src/generated/
CMD ["node", "src/workers/index.js"]
```

#### D. CI/CD Pipeline

**GitHub Actions:** `.github/workflows/deploy.yml`

Stages:
1. **Lint + Type-check** — `npm run lint && npx tsc --noEmit`
2. **Unit tests** — `npm run test`
3. **Build Docker image** — `docker build -t slipwise-app:{SHA}`
4. **Push to ECR** — `docker push {ECR_URI}:{SHA}`
5. **Run Prisma migrations** — `npx prisma migrate deploy`
6. **Update ECS service** — `aws ecs update-service --force-new-deployment`
7. **Wait for stable** — `aws ecs wait services-stable`
8. **Smoke tests** — curl health check endpoints
9. **Notify Slack** — deployment success/failure notification

**Environments:**
- `staging` — deploys on every PR merge to `develop`
- `production` — deploys on every PR merge to `main`

**Rollback:**
- If ECS deployment fails → automatic rollback to previous task definition
- Manual rollback: re-run pipeline with previous commit SHA

#### E. Database Migration (Supabase → RDS)

**Migration steps (executed once, not code):**
1. Export Supabase database: `pg_dump {SUPABASE_URL} > backup.sql`
2. Create RDS instance with same schema
3. Import: `psql {RDS_URL} < backup.sql`
4. Verify row counts on all tables
5. Update `DATABASE_URL` in Secrets Manager
6. Run smoke tests against RDS
7. Maintenance window: update DNS, cutover
8. Keep Supabase read-only for 24hr as fallback

**App changes for RDS:**
- Keep same Prisma adapter pattern (`@prisma/adapter-pg`)
- Update `DATABASE_URL` format: `postgresql://user:pass@rds.endpoint:5432/slipwise?sslmode=require`
- Connection pooling: use `pgBouncer` via RDS Proxy (add `?pgbouncer=true` to URL)
- Connection limit: `pool_size: 20` per ECS task (2 tasks × 20 = 40 max connections)

#### F. File Storage Migration (Supabase → S3)

Update `src/lib/storage-adapter.ts` S3 implementation (currently a stub):

```typescript
export class S3StorageAdapter implements StorageAdapter {
  private s3: S3Client;
  
  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? "ap-south-1",
      credentials: fromEnv(), // uses AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
    });
  }
  
  async upload(bucket, key, buffer, contentType) {
    await this.s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
    return { key };
  }
  
  async getSignedUrl(bucket, key, expiresIn = 3600) {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }
  
  async delete(bucket, key) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
  
  getPublicUrl(bucket, key) {
    return `https://${process.env.CLOUDFRONT_URL}/${key}`;
  }
}
```

**Install:** `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers`

**Bucket mapping:**
| Old Supabase Bucket | New S3 Bucket | Access |
|---|---|---|
| `logos` | `slipwise-assets/logos/` | Public via CloudFront |
| `attachments` | `slipwise-private/attachments/` | Private, signed URLs |
| `proofs` | `slipwise-private/proofs/` | Private, signed URLs |
| (new) exports | `slipwise-exports/` | Private, 24hr presigned URLs |

#### G. Redis Migration (Upstash → ElastiCache)

Update `src/lib/rate-limit.ts` to support both Upstash and native Redis:
- If `REDIS_URL` (ElastiCache format) set → use `ioredis` client
- If `UPSTASH_REDIS_REST_URL` set → use Upstash client
- Fail-open behavior retained

**Install:** `npm install ioredis`

#### H. Monitoring & Observability

**CloudWatch Dashboards:**
- Application: request rate, error rate, response time (p50/p95/p99)
- Database: connections, query time, CPU, IOPS
- Cache: hit rate, memory usage
- ECS: CPU utilization, memory utilization, task count

**CloudWatch Alarms → SNS → Email/Slack:**
- ECS CPU > 80% for 5 min → scale out
- RDS CPU > 80% for 5 min → alert
- HTTP 5xx rate > 1% → alert
- RDS storage < 10GB → alert
- ElastiCache memory > 80% → alert

**Integrate Sentry (now with DSN):**
- Install `@sentry/nextjs` fully
- Set `SENTRY_DSN` from Sentry dashboard
- Configure `sentry.client.config.ts` and `sentry.server.config.ts`
- Add user context: `Sentry.setUser({ id: userId, orgId })`
- Capture all unhandled errors with stack traces + request context

**PostHog Analytics:**
- Install `posthog-js` for client-side, `posthog-node` for server-side
- Track events: `document_created`, `document_exported`, `subscription_started`, `feature_gated`
- Create funnel: anonymous_visit → signup → first_document → export → subscribe
- Set up dashboard for: DAU, MAU, conversion rate, trial→paid rate

---

### 4.2 Sprint 13.2 — AI-Powered Features

**Duration:** 1 sprint (parallel with 13.3)
**Goal:** Add AI intelligence to document creation and business insights. Reduce manual data entry, surface patterns, automate smart suggestions.

#### A. Smart OCR — Invoice/Receipt Extraction

**Use case:** Upload a photo or PDF of a receipt/purchase order → auto-populate invoice/voucher fields.

**Implementation:**
- Use AWS Textract (via `@aws-sdk/client-textract`) for document analysis
- Or use OpenAI GPT-4o vision API for higher accuracy on handwritten/non-standard docs
- Process: image upload → Textract AnalyzeDocument → extract key-value pairs → populate form

**API route:** `POST /api/ai/extract-document`
Request: `FormData` with `file` (image or PDF, max 5MB)
Response:
```json
{
  "type": "invoice",
  "confidence": 0.92,
  "extracted": {
    "vendorName": "Acme Supplies",
    "vendorGST": "27AADCB2230M1Z3",
    "amount": 15000,
    "taxAmount": 2700,
    "invoiceDate": "2026-03-15",
    "invoiceNumber": "INV-2026-0123",
    "lineItems": [
      { "description": "Office Supplies", "quantity": 10, "unitPrice": 1500 }
    ]
  }
}
```

**UI integration:**
- On Invoice/Voucher creation form: "Upload receipt to auto-fill" button
- Upload → spinner → fields populated → user reviews + submits
- Confidence score shown: "90% confident — please verify highlighted fields"
- Fields below 70% confidence highlighted in yellow

**Database model:**
```prisma
model OcrJob {
  id            String   @id @default(cuid())
  orgId         String
  status        String   @default("pending") // pending, processing, completed, failed
  inputKey      String   // S3 key of uploaded file
  extractedData Json?
  confidence    Float?
  errorMessage  String?
  createdAt     DateTime @default(now())
  completedAt   DateTime?

  @@index([orgId, createdAt])
  @@map("ocr_job")
}
```

**Plan access:** Starter+ (Free plan: 5 OCR scans/month; Starter: 50/month; Pro+: 200/month)

#### B. AI Expense Categorization

**Use case:** When creating a voucher from an OCR-extracted receipt, auto-suggest the accounting category (GL account).

**Implementation:**
- Fine-tuned prompt to OpenAI GPT-4o-mini: "Given vendor name '{vendor}' and description '{description}', suggest accounting category from: [Office Supplies, Travel, Software, Marketing, Utilities, Professional Services, Rent, Salary, Other]"
- Cache results by (vendor, description) hash in Redis (1 week TTL)

**UI:** Dropdown with AI-suggested category pre-selected + ability to override.

#### C. Smart Salary Insights

**Use case:** HR manager can ask: "Which employees had salary increases > 10% this year?" or see anomalies.

**Features:**
1. **Salary trend chart** — per employee, 12-month bar chart
2. **Anomaly detection** — flag if employee salary differs > 20% from month-to-month (likely error)
3. **Department totals** — total salary cost by department over time
4. **CTC breakdown** — automatic gross-to-net calculation with Indian tax slabs

**Implementation:**
- Aggregate from `SalarySlip` + `SalaryComponent` models
- Client-side charting with Recharts (already installed)
- Anomaly: if `|currentMonth - avgLast3Months| / avgLast3Months > 0.2` → flag

**Route:** `GET /api/ai/salary-insights?orgId=&period=2026-Q1`

#### D. AI Invoice Drafting

**Use case:** "Create an invoice for Acme Corp for 10 hours of consulting at ₹5,000/hr"

**Implementation:**
- Natural language input field on invoice creation page
- Send to OpenAI: "Parse this into structured invoice data: {userInput}"
- Return structured data, pre-populate form
- User reviews and confirms

**UI:** Small text area at top of invoice form with "Describe invoice" placeholder + "Auto-fill" button.

#### E. Smart Late-Payment Predictor

**Use case:** Before sending an invoice, warn "This customer has paid late 3 out of 5 times. Consider adding a late payment clause."

**Implementation:**
- Query `InvoicePayment` history for customer
- Calculate: `latePayments = invoices where (paidAt - dueDate) > 0`
- `lateRate = latePayments / totalPaidInvoices`
- If `lateRate > 0.5` → show yellow warning on invoice send

**No ML required** — pure SQL aggregation.

#### F. GST Smart Calculator

**Use case:** When adding line items to an invoice, automatically compute correct GST (CGST+SGST for intra-state, IGST for inter-state) based on HSN code and parties' states.

**Implementation:**
- HSN code → GST rate lookup (static JSON database, ~12,000 HSN codes)
- Customer state (from `Customer.address.state`) vs Org state (from `OrgDefaults.state`)
- If same state → CGST (half rate) + SGST (half rate)
- If different state → IGST (full rate)

**Files:**
- `src/lib/gst-calculator.ts` — `calculateGST(hsnCode, amount, fromState, toState)`
- `src/data/hsn-rates.json` — static lookup table

**UI integration:**
- Line item form: HSN code field with autocomplete
- On HSN code entry: auto-fill tax rate
- Show breakdown: `CGST: ₹X + SGST: ₹X` or `IGST: ₹X`

---

### 4.3 Sprint 13.3 — Third-Party Integrations + Mobile PWA

**Duration:** 1 sprint (parallel with 13.2)
**Goal:** Connect Slipwise One with major Indian accounting software and optimize for mobile use as a Progressive Web App.

#### A. Tally Integration

**Use case:** Export invoices and vouchers in Tally-compatible XML format for import into Tally Prime/ERP 9.

**Tally XML Format:**
- ENVELOPE/BODY/IMPORTDATA structure
- `<LEDGER>` entries for parties
- `<VOUCHER>` entries with type (Sales, Purchase, Receipt, Payment)
- HSN/GST data in `<ALLINVENTORYENTRIES.LIST>`

**Implementation:**
- `src/lib/integrations/tally.ts` — `invoiceToTallyXML(invoice)`, `voucherToTallyXML(voucher)`
- Tally date format: `YYYYMMDD`
- Currency handling: always INR for Tally
- GST in Tally: separate ledgers for CGST, SGST, IGST

**API Route:** `POST /api/export/tally`
Body: `{ type: "invoice" | "voucher", ids: string[], format: "xml" }`
Response: XML file download

**UI:** In invoice/voucher list page — "Export to Tally" button (multi-select + export)

#### B. QuickBooks Online Integration

**Use case:** Sync invoices bidirectionally with QuickBooks Online India.

**Implementation:**
- OAuth 2.0 flow with QuickBooks (Intuit) API
- Store tokens in `OrgIntegration` model
- Map Slipwise Customer → QBO Customer
- Map Slipwise Invoice → QBO Invoice
- Sync: manual ("Sync Now") or automatic (on save)

**Database:**
```prisma
model OrgIntegration {
  id             String    @id @default(cuid())
  orgId          String
  provider       String    // "quickbooks" | "zoho" | "tally_cloud"
  accessToken    String
  refreshToken   String
  tokenExpiresAt DateTime
  externalOrgId  String?   // e.g. QBO RealmId
  config         Json?     // provider-specific config
  isActive       Boolean   @default(true)
  lastSyncAt     DateTime?
  createdAt      DateTime  @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, provider])
  @@map("org_integration")
}
```

**Routes:**
- `GET /api/integrations/quickbooks/connect` — OAuth initiate
- `GET /api/integrations/quickbooks/callback` — OAuth callback
- `POST /api/integrations/quickbooks/sync` — manual sync trigger
- `DELETE /api/integrations/quickbooks/disconnect` — revoke

**UI:** `src/app/app/settings/integrations/page.tsx`
- Integration cards: QuickBooks, Zoho, Tally, more coming
- Connected: show last sync time + "Sync Now" button
- Disconnected: "Connect" button

#### C. Zoho Books Integration

Identical pattern to QuickBooks but using Zoho Books API.
OAuth 2.0, map to Zoho Contacts, Zoho Invoices.
Support GST returns (GSTR-1 data export from Zoho).

#### D. GSTR-1 Report

**Use case:** Generate GSTR-1 report ready for filing on GST portal.

**Implementation:**
- `src/lib/gst-reports.ts` — `generateGSTR1(orgId, period: "YYYY-MM")` 
- Aggregate all invoices for the period
- Group by: B2B (business customers with GSTIN), B2C (consumers), exports
- Format as per GST portal JSON schema
- Support both JSON export (for API filing) and Excel export

**Output:**
- `B2B.json` — B2B invoices grouped by GSTIN
- `B2CS.json` — B2C summary
- `GSTR1_Summary.xlsx` — Human-readable

**Route:** `GET /api/export/gstr1?period=2026-03`

#### E. UPI Payment Link Generation

**Use case:** On invoice "Send" flow, auto-generate a UPI payment link so customer can pay in one tap.

**Implementation:**
- UPI deep link format: `upi://pay?pa={vpa}&pn={name}&am={amount}&tn={invoiceNo}&cu=INR`
- Generate QR code from UPI deep link (use `qrcode` npm package)
- Embed in invoice PDF (bottom right area)
- Also show as clickable button in digital invoice share page

**Install:** `npm install qrcode`

**Files:**
- `src/lib/upi-link.ts` — `generateUpiLink(vpa, amount, invoiceName)`, `generateUpiQr(link)`
- Org settings: VPA/UPI ID field in `OrgDefaults`

**UI:** Settings → Payment → "Add your UPI ID" field

#### F. Progressive Web App (PWA)

**Goal:** Allow mobile users to install Slipwise One as a native-like app on their phone.

**Implementation:**
- `public/manifest.json` — PWA manifest
```json
{
  "name": "Slipwise One",
  "short_name": "Slipwise",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }, { "src": "/icon-512.png", "sizes": "512x512" }],
  "start_url": "/app/home",
  "display": "standalone",
  "theme_color": "#dc2626",
  "background_color": "#ffffff"
}
```
- Service worker (`public/sw.js`) via `next-pwa` or manual:
  - Cache strategy: Cache-First for static assets
  - Network-First for API calls
  - Offline fallback page
- `next.config.ts`: add PWA plugin configuration
- `<link rel="manifest">` in app layout
- Add to Home Screen prompt: trigger on 3rd app visit

**Mobile UX optimizations:**
- All forms: `inputMode` attributes (`numeric` for amounts, `email` for emails)
- Touch targets: minimum 44×44px
- Bottom navigation for mobile (hamburger → bottom tabs on small screens)
- Invoice list: swipe-right to mark paid, swipe-left to delete
- Camera integration: use device camera for OCR (Section 4.2A)
- Pull-to-refresh on list pages

**Push Notifications:**
- Web Push API for: payment received, invoice overdue, trial ending, team invite
- `POST /api/push/subscribe` — save `PushSubscription` to DB
- `src/lib/push-notifications.ts` — `sendPushNotification(userId, { title, body, url })`
- **Install:** `npm install web-push`

```prisma
model PushSubscription {
  id           String   @id @default(cuid())
  userId       String   @db.Uuid
  endpoint     String   @unique
  keys         Json     // { p256dh, auth }
  userAgent    String?
  createdAt    DateTime @default(now())

  user Profile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("push_subscription")
}
```

---

### 4.4 Phase 13 Database Schema Additions

```prisma
// AI
model OcrJob         (see Section 4.2A)

// Integrations
model OrgIntegration (see Section 4.3B)

// Mobile
model PushSubscription (see Section 4.3F)

// Add to OrgDefaults:
upiVpa          String?  // UPI VPA for payment links
gstNumber       String?  // GSTIN for GST reports
gstState        String?  // State code for GST calculations
```

---

### 4.5 Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS ap-south-1                          │
│                                                                 │
│  Route 53 ──► CloudFront ──► ALB                                │
│                   │           │                                 │
│                   │           ├── ECS Fargate (Next.js App)     │
│                   │           │     ├── Task A (2 replicas min) │
│                   │           │     └── Task B (auto-scale)     │
│                   │           │                                 │
│                   │           └── ECS Fargate (Worker)          │
│                   │                 └── 1 replica               │
│                   │                                             │
│                   S3                                            │
│                   ├── slipwise-assets (public)                  │
│                   ├── slipwise-private (signed)                 │
│                   └── slipwise-exports (temp)                   │
│                                                                 │
│  RDS PostgreSQL 15 (Multi-AZ)                                   │
│  ├── Primary: db.t4g.medium (ap-south-1a)                       │
│  └── Standby: (ap-south-1b)                                     │
│                                                                 │
│  ElastiCache Redis 7 (cache.t4g.small)                          │
│                                                                 │
│  Secrets Manager (all credentials)                              │
│  CloudWatch (logs + metrics + alarms)                           │
│  ECR (Docker image registry)                                    │
│  WAF (OWASP rule set on CloudFront)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.6 Phase 13 Edge Cases & Acceptance Criteria

#### AWS Migration Edge Cases

| Scenario | Expected Behavior |
|---|---|
| ECS task crashes mid-request | ALB health check detects; requests routed to healthy task; ECS restarts task |
| RDS failover (Multi-AZ) | Automatic failover in ~60s; app retries with exponential backoff |
| S3 upload timeout | Retry up to 3 times; fail-open (return error to user if all retry) |
| CloudFront cache stale after deploy | Cache invalidation triggered in CI/CD pipeline on deploy |
| Secrets Manager rotation | App uses cached credentials; refresh on next cold start |
| ECS task count at max during traffic spike | ALB queues requests; p99 latency alert fires; manual scale-up decision |
| Docker image fails health check | ECS rolls back to previous task definition |
| Database migration fails halfway | Prisma migrate deploy is transactional; rolls back on error |
| ElastiCache connection refused | Rate limiting falls back to fail-open; performance degradation logged |

#### AI Edge Cases

| Scenario | Expected Behavior |
|---|---|
| OCR fails to extract any data | Show "Could not read document. Please enter details manually." |
| OCR confidence < 40% | Show all fields as empty + warning "Low confidence extraction" |
| AI expense categorization API down | Skip suggestion; show uncategorized dropdown |
| HSN code not in lookup table | Allow manual entry; flag "Unknown HSN code" warning |
| GST calculation with missing state | Use "Other" state; show "Please update your billing state for accurate GST" |
| Large receipt image (>5MB) | Return 413 "File too large. Max 5MB." |
| GSTR-1 with invoices missing GSTIN | Group in B2C bucket with warning count |
| Duplicate OCR submission (same file) | Deduplicate by file hash; return cached result |

#### Integration Edge Cases

| Scenario | Expected Behavior |
|---|---|
| QuickBooks OAuth token expired | Auto-refresh; if refresh fails → mark integration inactive + notify admin |
| Tally XML import fails | Show error message from Tally; provide corrected XML download |
| UPI VPA not set | Hide UPI QR on invoice; show "Add UPI ID in Settings" to org admin |
| QR code generation fails | Skip QR silently; invoice PDF still generated |
| Push notification permission denied | Gracefully degrade; don't show push settings |
| Offline access to cached data | Show stale data with "Last synced: {time}" badge |
| PWA install prompt blocked | Log to analytics; don't show again for 7 days |

---

### 4.7 Phase 13 Test Cases

#### AWS Infrastructure Tests

```
TC-13-01: Docker image builds successfully
  Given: Main branch code
  When:  docker build -t slipwise-app .
  Then:  Build completes in < 3 minutes
         Image size < 500MB

TC-13-02: ECS health check
  Given: Running ECS task
  When:  ALB performs health check GET /api/health
  Then:  Returns 200 { status: "ok", db: "connected", cache: "connected" }

TC-13-03: Zero-downtime deployment
  Given: Active users with in-flight requests
  When:  ECS deployment triggered
  Then:  No 5xx errors during deployment
         New tasks healthy before old tasks drained

TC-13-04: RDS connection pool
  Given: 20 concurrent requests
  When:  All hit database simultaneously
  Then:  No "too many connections" error
         All queries complete within 2s

TC-13-05: S3 signed URL expiry
  Given: Signed URL generated with 1hr expiry
  When:  URL accessed after 61 minutes
  Then:  Returns 403 Forbidden from S3

TC-13-06: CI/CD pipeline
  Given: Code pushed to main branch
  When:  GitHub Actions runs
  Then:  Lint → Test → Build → Deploy all pass
         ECS deployment completes in < 10 minutes
         Slack notification sent
```

#### AI Tests

```
TC-13-07: OCR extraction accuracy
  Given: Clear invoice image with vendor name, amount, date
  When:  POST /api/ai/extract-document
  Then:  vendorName extracted (confidence > 0.8)
         amount extracted correctly
         date in ISO format

TC-13-08: OCR file size limit
  Given: Image file of 6MB
  When:  POST /api/ai/extract-document
  Then:  Returns 413 { error: "File too large" }

TC-13-09: GST calculator intra-state
  Given: Org in Maharashtra (state code 27), Customer in Maharashtra
         HSN code 9983 (IT services), amount ₹10,000, rate 18%
  When:  calculateGST("9983", 10000, "27", "27")
  Then:  Returns { cgst: 900, sgst: 900, igst: 0, total: 11800 }

TC-13-10: GST calculator inter-state
  Given: Org in Maharashtra, Customer in Karnataka
         Same HSN and amount
  When:  calculateGST("9983", 10000, "27", "29")
  Then:  Returns { cgst: 0, sgst: 0, igst: 1800, total: 11800 }

TC-13-11: GSTR-1 generation
  Given: 10 B2B invoices + 5 B2C invoices in March 2026
  When:  GET /api/export/gstr1?period=2026-03
  Then:  JSON with correct B2B, B2CS sections
         All GST amounts add up correctly
         Returns 200 with download headers
```

#### Integration Tests

```
TC-13-12: Tally XML export
  Given: 3 invoices selected for export
  When:  POST /api/export/tally { type: "invoice", ids: [...] }
  Then:  Returns XML file with Content-Type: application/xml
         XML validates against Tally schema
         All 3 invoices present

TC-13-13: UPI link generation
  Given: Org with VPA "acme@paytm", invoice for ₹5,000
  When:  generateUpiLink is called
  Then:  Returns "upi://pay?pa=acme@paytm&pn=Acme&am=5000&cu=INR"
         QR code generated as base64 PNG

TC-13-14: PWA manifest availability
  Given: App deployed
  When:  GET /manifest.json
  Then:  Returns valid PWA manifest
         All required fields present (name, icons, start_url, display)

TC-13-15: Push notification subscription
  Given: Browser push permission granted
  When:  POST /api/push/subscribe { endpoint, keys }
  Then:  PushSubscription created in DB
         Returns 200 success

TC-13-16: Offline fallback
  Given: Service worker installed, device offline
  When:  User navigates to /app/home
  Then:  Shows cached version or offline fallback page
         No blank white screen
```

---

## 5. Shared Technical Standards

### Code Conventions
- **TypeScript strict mode** (`"strict": true` in tsconfig)
- **Server actions pattern:** `"use server"` directive, `ActionResult<T>` type defined per-file
- **Server-only modules:** All `src/lib/` utilities that touch DB must have `import "server-only"` at top
- **Prisma 7 import:** `import { PrismaClient } from "@/generated/prisma/client"`
- **Prisma 7 nullable JSON:** Use `Prisma.DbNull` for null JSON fields, cast with `as Prisma.InputJsonValue`
- **RBAC enforcement:** Every protected server action must call `requirePermission(orgId, userId, module, action)`
- **Error handling:** `try/catch` on all async operations; fire-and-forget utilities never throw
- **Audit logging:** All destructive operations (delete, role change, export) must call `logAudit()`
- **ActionResult<T> pattern:**
```typescript
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
```

### API Standards
- All public REST API routes under `/api/v1/`
- Versioning via URL path (not headers)
- API responses always in JSON envelope (see Section 3.2B)
- HTTP methods: GET (read), POST (create), PATCH (partial update), DELETE (delete)
- No PUT (prefer PATCH for updates)
- All write endpoints require authentication
- Idempotency-Key header supported for POST endpoints

### Database Standards
- Prisma migrations: `npx prisma migrate dev --name {descriptive-name}`
- All models have `createdAt DateTime @default(now())`
- Soft delete: use `deletedAt DateTime?` (never hard-delete user data)
- All foreign keys use `onDelete: Cascade` unless explicitly noted
- Index all foreign key columns + frequently filtered columns
- UUID columns: `@db.Uuid` + proper index
- JSON fields: explicit `Json?` not `String` for structured data

### Security Standards
- No secrets in code — all via environment variables
- API keys hashed (SHA-256) before storage — never store plaintext
- Webhook secrets hashed before storage
- SSRF protection on all user-provided URLs
- File uploads: validate MIME type (server-side), max file size enforced
- CORS: restrict `/api/v1/*` to known origins only
- Rate limiting: all public endpoints (see `src/lib/rate-limit.ts`)
- Content Security Policy headers on all pages

---

## 6. Non-Functional Requirements

### Performance
| Metric | Target |
|---|---|
| Time to first byte (TTFB) | < 200ms (p95) |
| Largest Contentful Paint (LCP) | < 2.5s |
| PDF generation time | < 5s per document |
| API response time (p95) | < 500ms for reads, < 1s for writes |
| OCR processing time | < 30s per document |
| Webhook delivery time | < 5s from event to first attempt |
| Database query time (p95) | < 100ms |
| ECS auto-scale trigger | CPU > 80% for 2 consecutive minutes |

### Availability
| Component | Target SLA |
|---|---|
| Application (ECS) | 99.9% (< 8.7 hr/year downtime) |
| Database (RDS Multi-AZ) | 99.95% |
| Storage (S3) | 99.99% |
| CDN (CloudFront) | 99.99% |

### Security
- All data encrypted at rest (RDS: AWS KMS, S3: SSE-S3)
- All data encrypted in transit (TLS 1.3 minimum)
- GDPR-ready: right to erasure (delete org + all data), data portability (JSON export)
- SOC 2 Type II readiness (audit logging, access controls, monitoring)
- VAPT: conduct before production launch

### Scalability
- Application: 1 → 10 ECS tasks automatically
- Database: read replicas on demand (beyond 1,000 orgs)
- Storage: S3 (unlimited, auto-scaled)
- API rate limiting: per-org quotas enforced at middleware level

### Compliance (India)
- Data residency: `ap-south-1` (Mumbai) region exclusively
- GSTIN validation on customer/vendor forms
- GSTR-1/2A report generation
- TDS calculation assistance
- PAN/Aadhaar data: minimal collection, encrypted at rest

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe India approval delays | Medium | High | Use Razorpay as primary; Stripe for global only (Phase 12.1B) |
| AWS migration data loss | Low | Critical | Full pg_dump backup; 24hr parallel run; rollback plan |
| Tally XML format changes | Low | Medium | Version-specific XML templates; user-selectable Tally version |
| QuickBooks API quota (500 req/min) | Medium | Medium | Queue sync jobs; rate-limit with retry backoff |
| OpenAI API cost overrun | Medium | High | Per-org monthly limit on AI calls; per-plan quotas; cost monitoring |
| SAML assertion spoofing | Low | Critical | Always verify assertion signature; validate timestamp (< 5 min) |
| API key database leak | Very Low | Critical | Only store SHA-256 hash; never log raw keys |
| ECS task memory leak | Low | Medium | Memory limit per task; CloudWatch alarm; auto-restart |
| OCR accuracy for low-quality images | High | Low | Show confidence score; manual entry fallback always available |
| Push notification permission rate | High | Low | Only prompt on user action; respect browser permission API |
| Multi-org data isolation bug | Low | Critical | Row-level security on all DB queries; orgId filter on every query |

---

## 8. QA & Acceptance Gates

### Phase 12 Acceptance Gates

**Before merging to master:**
1. ✅ `npx tsc --noEmit` — zero TypeScript errors
2. ✅ `npx eslint src/` — zero ESLint errors
3. ✅ All test cases TC-12-01 through TC-12-16 pass
4. ✅ Stripe test mode: full checkout flow completes
5. ✅ API: all 20+ endpoints return correct response codes
6. ✅ SAML SSO: tested with Okta developer account
7. ✅ Multi-org: user can create 2 orgs and switch between them
8. ✅ Webhook delivery: end-to-end test with Webhook.site
9. ✅ API key: create/use/revoke cycle works correctly
10. ✅ White-label: PDF exports correctly hide Slipwise branding when enabled

### Phase 13 Acceptance Gates

**Before merging to master:**
1. ✅ Docker image builds successfully
2. ✅ All test cases TC-13-01 through TC-13-16 pass
3. ✅ ECS deployment completes without downtime (blue-green verified)
4. ✅ RDS migration: zero data loss verified (row count match)
5. ✅ S3 migration: all existing files accessible via new adapter
6. ✅ OCR: successfully extracts from 5 sample invoice images
7. ✅ GSTR-1: report validates against government JSON schema
8. ✅ Tally XML: import test in Tally Prime demo
9. ✅ PWA: installable on Android Chrome + iOS Safari
10. ✅ CloudWatch alarms: all 5 configured alarms trigger in test

---

## 9. Multi-Agent Execution Strategy

### Phase 12 Agent Split

```
Phase 12, Sprint 12.1 (first — billing blocks API usage tracking):
  └── Agent 12-A: BillingGateway interface + Stripe SDK + all Stripe API routes + billing UI updates

Sprint 12.2 + 12.3 (parallel — after 12-A completes):
  ├── Agent 12-B: Public REST API (API keys, all /api/v1/* endpoints, rate limiting)
  ├── Agent 12-C: Outbound webhooks (endpoint CRUD, delivery engine, retry mechanism)
  └── Agent 12-D: Enterprise features (SSO/SAML, multi-org switcher, custom domains, white-label)

Final:
  └── Agent 12-E: Verification (tsc, eslint, integration tests)
```

### Phase 13 Agent Split

```
Phase 13, Sprint 13.1 (first — AWS infra blocks everything):
  ├── Agent 13-A: Docker + CDK infra stacks (Dockerfile, CDK TypeScript, GitHub Actions CI/CD)
  └── Agent 13-B: S3 adapter (complete implementation) + Redis migration + health check endpoint

Sprint 13.2 + 13.3 (parallel — after 13.1 completes):
  ├── Agent 13-C: AI features (OCR route, expense categorization, GST calculator, salary insights)
  ├── Agent 13-D: Third-party integrations (Tally XML, QuickBooks OAuth, Zoho, GSTR-1)
  └── Agent 13-E: Mobile PWA (manifest, service worker, push notifications, mobile UX)

Final:
  └── Agent 13-F: Verification (tsc, eslint, Docker build, smoke tests)
```

### Agent Context Requirements

Every agent MUST:
1. Read `prisma/schema.prisma` before any DB schema changes
2. Read `src/lib/` directory to avoid recreating existing utilities
3. Use `ActionResult<T>` pattern (defined per-file, not shared import)
4. Use `requirePermission(orgId, userId, module, action)` on all protected routes
5. Use `import "server-only"` on all server-only modules
6. Run `npx tsc --noEmit` after each file batch — fix all errors
7. Follow Prisma 7: `import { PrismaClient } from "@/generated/prisma/client"`
8. Never store secrets in code
9. Never hard-delete user data (use soft delete `deletedAt`)
10. Every feature behind plan check using `checkFeature()` or `requirePlan()`

---

## Appendix A — Environment Variables

### Phase 12 New Variables

```bash
# Stripe (global billing)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Stripe Price IDs — Starter
STRIPE_STARTER_MONTHLY_USD_PRICE_ID=price_xxxx
STRIPE_STARTER_ANNUAL_USD_PRICE_ID=price_xxxx
STRIPE_STARTER_MONTHLY_EUR_PRICE_ID=price_xxxx
STRIPE_STARTER_ANNUAL_EUR_PRICE_ID=price_xxxx
STRIPE_STARTER_MONTHLY_GBP_PRICE_ID=price_xxxx
STRIPE_STARTER_ANNUAL_GBP_PRICE_ID=price_xxxx

# Stripe Price IDs — Pro
STRIPE_PRO_MONTHLY_USD_PRICE_ID=price_xxxx
STRIPE_PRO_ANNUAL_USD_PRICE_ID=price_xxxx
STRIPE_PRO_MONTHLY_EUR_PRICE_ID=price_xxxx
STRIPE_PRO_ANNUAL_EUR_PRICE_ID=price_xxxx

# Billing gateway routing
BILLING_GATEWAY=razorpay     # default; "stripe" for global deployments

# API Platform
API_SIGNING_SECRET=xxxx      # HMAC secret for outbound webhook signatures

# Enterprise / SSO
SAML_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
SAML_CERT=-----BEGIN CERTIFICATE-----...

# AI Features
OPENAI_API_KEY=sk-xxxxxxxxxxxx
AWS_TEXTRACT_REGION=ap-south-1    # for Textract OCR

# Feature flags
FEATURE_STRIPE_ENABLED=true
FEATURE_API_PLATFORM_ENABLED=true
FEATURE_SSO_ENABLED=true
FEATURE_MULTI_ORG_ENABLED=true
```

### Phase 13 New Variables

```bash
# AWS infrastructure
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
AWS_S3_BUCKET_ASSETS=slipwise-assets
AWS_S3_BUCKET_PRIVATE=slipwise-private
AWS_S3_BUCKET_EXPORTS=slipwise-exports
CLOUDFRONT_URL=xxxx.cloudfront.net

# Redis (ElastiCache — replaces Upstash in production)
REDIS_URL=redis://slipwise.cache.amazonaws.com:6379
REDIS_TOKEN=xxxx    # ElastiCache auth token

# Third-party integrations
QUICKBOOKS_CLIENT_ID=xxxx
QUICKBOOKS_CLIENT_SECRET=xxxx
QUICKBOOKS_ENVIRONMENT=production    # or "sandbox"
ZOHO_CLIENT_ID=xxxx
ZOHO_CLIENT_SECRET=xxxx

# Push notifications
VAPID_PUBLIC_KEY=xxxx
VAPID_PRIVATE_KEY=xxxx
VAPID_SUBJECT=mailto:support@slipwise.app

# Sentry (now with real DSN)
SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_AUTH_TOKEN=xxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx

# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Appendix B — API Contract Reference

### Full OpenAPI Summary

```yaml
openapi: 3.1.0
info:
  title: Slipwise One API
  version: "2026-04"
  description: Public REST API for Slipwise One document operations

servers:
  - url: https://app.slipwise.com/api/v1
    description: Production

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: APIKey

  schemas:
    Invoice:
      type: object
      properties:
        id: { type: string }
        invoiceNumber: { type: string }
        status: { type: string, enum: [DRAFT, SENT, PAID, OVERDUE, CANCELLED] }
        customerId: { type: string }
        totalAmount: { type: number }
        currency: { type: string }
        dueDate: { type: string, format: date }
        createdAt: { type: string, format: date-time }

    Pagination:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
        hasMore: { type: boolean }

    Error:
      type: object
      properties:
        success: { type: boolean, example: false }
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
```

### Rate Limits by Plan

| Plan | Requests/Month | Requests/Minute |
|---|---|---|
| Free | 0 (no access) | — |
| Starter | 0 (no access) | — |
| Pro | 10,000 | 100 |
| Enterprise | Unlimited | 1,000 |

---

## Appendix C — Stripe Quick Reference

**Stripe Subscription States:**
| State | Meaning |
|---|---|
| `trialing` | Trial period active |
| `active` | Paid and billing normally |
| `past_due` | Payment failed, in grace period |
| `canceled` | Subscription ended |
| `unpaid` | Multiple payment failures, access suspended |
| `paused` | Billing paused (Pro+ feature) |

**Key Stripe API calls:**
```javascript
// Create checkout session
stripe.checkout.sessions.create({
  mode: "subscription",
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: successUrl,
  cancel_url: cancelUrl,
  subscription_data: { trial_period_days: 14 }
})

// Create customer portal
stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: returnUrl
})

// Cancel subscription at period end
stripe.subscriptions.update(subId, { cancel_at_period_end: true })

// Upgrade/downgrade plan immediately
stripe.subscriptions.update(subId, {
  items: [{ id: currentItemId, price: newPriceId }],
  proration_behavior: "create_prorations"
})

// Verify webhook
stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
```

**Stripe Price ID naming convention:**
`slipwise_starter_monthly_usd`, `slipwise_pro_annual_eur`, etc.

---

## Appendix D — AWS Architecture Diagram

```
          Users (Global)
               │
               ▼
    ┌─────────────────────┐
    │   Route 53 DNS      │
    │   app.slipwise.com  │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  CloudFront CDN     │  ◄── WAF (OWASP rules)
    │  ap-south-1 + Edge  │
    └──────┬──────┬───────┘
           │      │
    Static │      │ Dynamic
    Assets │      │ Requests
           │      │
    ┌──────▼──┐  ┌▼──────────────────────┐
    │   S3    │  │   Application Load     │
    │ Assets  │  │   Balancer (ALB)       │
    └─────────┘  └──────────┬────────────┘
                             │
              ┌──────────────▼───────────────┐
              │      ECS Fargate Cluster      │
              │   (ap-south-1a + 1b + 1c)    │
              │                               │
              │  ┌─────────────────────────┐  │
              │  │  next-app service       │  │
              │  │  ├─ Task A (t3.small)   │  │
              │  │  ├─ Task B (t3.small)   │  │
              │  │  └─ Task C... (scaled)  │  │
              │  └─────────────────────────┘  │
              │                               │
              │  ┌─────────────────────────┐  │
              │  │  worker service         │  │
              │  │  └─ Task (t3.small)     │  │
              │  └─────────────────────────┘  │
              └──────────────────────────────┘
                             │
               ┌─────────────┼──────────────┐
               │             │              │
    ┌──────────▼──┐  ┌───────▼──────┐  ┌───▼──────────┐
    │    RDS      │  │ ElastiCache  │  │     S3        │
    │ PostgreSQL  │  │   Redis 7    │  │ Private Bucket│
    │  (Multi-AZ) │  │ (t4g.small)  │  │ (Attachments) │
    └─────────────┘  └──────────────┘  └───────────────┘

    ┌─────────────────────────────────────────────────┐
    │              Supporting Services                │
    │  Secrets Manager  │  CloudWatch  │  ECR         │
    │  SNS (Alerts)     │  IAM Roles   │  SSM Params  │
    └─────────────────────────────────────────────────┘
```

---

*End of Phase 12 & 13 PRD — Slipwise One*
*Version 1.0 | 2026-04-06 | Global Expansion + AWS + AI + Integrations*
*Prepared by: Copilot Engineering Assistant | Parent Company: Zenxvio*
