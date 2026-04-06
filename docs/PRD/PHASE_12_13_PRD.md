# Slipwise One — Phase 12 & Phase 13
## Product Requirements Document (PRD)
### Version 1.0 | Razorpay Global Expansion + API Platform + AWS + AI
### Engineering Handover Document

---

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 12: Global Billing Expansion + API + Enterprise · Phase 13: AWS + AI + Integrations |
| **Document Version** | 1.0 |
| **Date** | 2026-04-06 |
| **Document Purpose** | Full engineering handover — autonomous multi-agent execution ready |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–11 completed and merged to master |
| **Branch Convention** | `feature/phase-12-global` · `feature/phase-13-aws-ai` |
| **Sprint Model** | 3 sprints (Phase 12) + 3 sprints (Phase 13) |
| **Total Sprints** | 6 sprints |
| **Engineering Model** | Multi-agent parallel execution recommended |
| **Payment Gateway** | Razorpay (all phases — India + International) |
| **No Stripe** | Razorpay is the sole payment gateway. Stripe is NOT used. |
| **Parent Company** | Zenxvio |

---

## 🇮🇳 Payment Gateway: Razorpay Only (All Markets)

**Decision:** Razorpay is the **only payment gateway** for all phases of Slipwise One.

Razorpay capabilities used across Phase 12:

| Feature | Razorpay Support | Usage |
|---|---|---|
| UPI (India) | ✅ Native, 0% fee | Subscriptions + one-time |
| UPI AutoPay | ✅ NPCI mandate | Recurring subscriptions |
| Indian Cards (Visa/MC/Amex/RuPay) | ✅ Full support | All plans |
| International Cards | ✅ Visa/MC/Amex international | Global users paying in INR |
| Netbanking | ✅ All major Indian banks | Indian customers |
| Wallets | ✅ Paytm, PhonePe, etc. | Indian customers |
| Payment Links | ✅ Hosted payment page | Invoice payment collection |
| Smart Collect (VA) | ✅ Virtual bank account | Automated payment reconciliation |
| Subscriptions v2 | ✅ Full lifecycle | All plan tiers |
| Multi-currency display | ✅ Display in USD/EUR, settle in INR | International pricing display |
| GST compliant invoices | ✅ Built-in | All billing receipts |
| Razorpay Invoices | ✅ Native invoice creation | Alternative invoice delivery |
| Instant Settlement | ✅ Available (extra fee) | Enterprise option |
| RazorpayX (Payouts) | ✅ Vendor/salary payouts | Future SW Pay expansion |

**Why not Stripe:**
- Razorpay covers 100% of the required use cases
- Faster India approval (1-2 weeks vs 3 months for Stripe)
- Lower fees on UPI (0% vs Stripe's 2.9%)
- GST invoices built-in (Stripe requires manual setup)
- UPI recurring mandates not available on Stripe
- All our target customers (India-first SMBs) prefer UPI/netbanking

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State Post Phase 11](#2-current-state-post-phase-11)
3. [Phase 12 — Razorpay Expansion, API Platform & Enterprise](#3-phase-12--razorpay-expansion-api-platform--enterprise)
   - 3.1 Sprint 12.1 — Razorpay Feature Expansion + International Billing
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
12. [Appendix C — Razorpay Advanced Features Reference](#appendix-c--razorpay-advanced-features-reference)
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
| **12** | **Razorpay Expansion + API Platform + Enterprise** | 🔲 This Document |
| **13** | **AWS Migration + AI + Integrations + Mobile** | 🔲 This Document |

---

## 2. Current State Post Phase 11

### What Exists in Codebase (Phase 11 Deliverables)

| File/Module | Location | Purpose |
|---|---|---|
| Plan config | `src/lib/plans/config.ts` | 4 tiers (Free/Starter/Pro/Enterprise), PlanLimits |
| Plan enforcement | `src/lib/plans/enforcement.ts` | `checkLimit`, `checkFeature`, `requirePlan` |
| Usage tracking | `src/lib/plans/usage.ts` | `incrementUsage`, `getMonthlyUsage` |
| Razorpay SDK | `src/lib/razorpay.ts` | Lazy-init wrapper, webhook verify, subscription CRUD |
| Billing logic | `src/lib/billing.ts` | Subscription CRUD, trial management, idempotent events |
| Billing API | `src/app/api/billing/razorpay/*` | create-subscription, webhook, cancel |
| Billing UI | `src/app/app/billing/*` | Overview, upgrade, success, cancel |
| Rate limiting | `src/lib/rate-limit.ts` | Upstash Redis sliding window, fail-open |
| Storage adapter | `src/lib/storage-adapter.ts` | Supabase impl + S3 stub |
| Referrals | `src/lib/referral.ts` | Codes, conversion, credits |
| Onboarding | `src/lib/onboarding-tracker.ts` | 7-step tracker |
| Document sharing | `src/lib/document-sharing.ts` | Share tokens, revoke |
| Marketing | `src/app/(marketing)/*` | Homepage, pricing, features, privacy, terms |

### Razorpay Integration Already Live (Phase 11)

- Subscription lifecycle: created → authenticated → active → paused → halted → cancelled
- Webhooks: 9 event types with idempotency via `RazorpayEvent` model
- Plan enforcement: Free / Starter ₹999 / Pro ₹2,999 / Enterprise ₹9,999
- Trial system: 14-day Pro trial for new upgrades
- Billing UI: overview, upgrade (monthly/yearly toggle), success, cancel

### What Phase 12 Adds

1. **No payment links for invoices** — customers can't pay invoices online (Pay Now button)
2. **No international card billing** — international customers currently blocked
3. **No Razorpay smart collect** — no automated bank transfer reconciliation
4. **No pause/resume subscriptions** — missing from Phase 11 implementation
5. **No public API** — no programmatic access for developers/integrations
6. **No SSO/SAML** — enterprise clients can't use their identity provider
7. **No multi-org management** — users stuck in single org
8. **No API keys** — developers can't automate document workflows

---

## 3. Phase 12 — Razorpay Expansion, API Platform & Enterprise

### Objective

Expand Razorpay usage beyond basic subscriptions to cover the full payment lifecycle. Add Razorpay Payment Links so customers can pay invoices online, Smart Collect for automated reconciliation, and international card support. Build a developer-facing REST API with API keys and webhooks, and introduce enterprise-grade features (SSO/SAML, multi-org, custom domains, white-label).

---

### 3.1 Sprint 12.1 — Razorpay Feature Expansion + International Billing

**Duration:** 1 sprint
**Goal:** Unlock advanced Razorpay features: Payment Links (invoice pay-now), Smart Collect (virtual accounts), subscription pause/resume, international card support, RazorpayX payouts foundation.
**Dependency:** Must complete BEFORE Sprints 12.2 and 12.3 (payment links used in API, billing UI enhanced)

#### A. Razorpay Payment Links (Invoice Pay-Now)

**Use case:** Sender creates invoice → email has "Pay Now" button → customer clicks → Razorpay hosted payment page → customer pays via UPI/card/netbanking → invoice auto-marked paid.

**How it works:**
- Razorpay Payment Links API: `POST https://api.razorpay.com/v1/payment_links`
- Generate a shareable `short_url` (e.g., `https://rzp.io/l/xxxxx`)
- Embed this URL in invoice email as "Pay Now" button
- Embed as QR code on PDF invoice
- Razorpay calls our webhook on payment: `payment_link.paid` event
- Webhook handler: find invoice by `reference_id`, mark paid, notify sender

**API endpoint:** `POST /api/billing/razorpay/create-payment-link`
Request:
```json
{
  "invoiceId": "clxxxx",
  "amount": 118000,
  "currency": "INR",
  "description": "Invoice #INV-2026-0042",
  "customerName": "Acme Corp",
  "customerEmail": "accounts@acme.com",
  "customerPhone": "9876543210",
  "expiryDate": "2026-05-15"
}
```
Response:
```json
{
  "paymentLinkId": "plink_xxxxxx",
  "shortUrl": "https://rzp.io/l/xxxxx",
  "qrCodeUrl": "data:image/png;base64,..."
}
```

**SDK call:**
```javascript
razorpay.paymentLink.create({
  amount: 118000,  // in paise
  currency: "INR",
  description: "Invoice #INV-2026-0042",
  reference_id: invoiceId,  // used in webhook to find invoice
  customer: { name, email, contact },
  expire_by: unixTimestamp,
  notify: { sms: true, email: true },
  reminder_enable: true,
  callback_url: `${appUrl}/api/billing/razorpay/webhook`,
  callback_method: "get"
})
```

**Webhook event:** `payment_link.paid`
Handler:
1. Extract `reference_id` (= invoiceId)
2. Find invoice in DB
3. Get payment amount, method, date from payload
4. Create `InvoicePayment` record
5. Set invoice status to `PAID`
6. Create `SendLog` entry
7. Send confirmation email to org owner: "Invoice #{number} has been paid!"
8. Create `Notification` for org admin

**Database changes:**
```prisma
// Add to Invoice model:
razorpayPaymentLinkId   String?
razorpayPaymentLinkUrl  String?
paymentLinkExpiresAt    DateTime?
```

**UI integration:**
- Invoice actions dropdown: "Generate Pay Now Link" button (Starter+)
- On generate: show link + copy button + QR code
- Invoice detail page: show payment link status (active/expired/paid)
- Invoice email template: add "Pay Now →" CTA button (if payment link exists)
- Invoice PDF: embed payment QR code in bottom-right corner

**Plan access:** Free = no payment links; Starter+ = unlimited payment links

#### B. Razorpay Smart Collect (Virtual Accounts)

**Use case:** Large clients prefer NEFT/RTGS/IMPS bank transfers. Assign each client a dedicated virtual account number → any transfer auto-reconciled to that customer.

**How it works:**
- Razorpay Smart Collect API: creates a virtual bank account per customer
- Customer is given: account number + IFSC (Federal Bank / YES Bank route)
- Customer does NEFT/RTGS transfer using their regular bank
- Razorpay detects the transfer, calls our webhook: `virtual_account.credited`
- Webhook: find customer, match amount to oldest outstanding invoice, mark paid

**API endpoint:** `POST /api/billing/razorpay/create-virtual-account`
Request: `{ customerId: "clxxxx", invoiceId?: "clxxxx" }`
Response: `{ virtualAccountId, accountNumber, ifsc, description }`

**SDK call:**
```javascript
razorpay.virtualAccount.create({
  receivers: { types: ["bank_account"] },
  description: `Slipwise - Acme Corp`,
  amount: invoiceAmountInPaise,  // optional: fixed amount
  customer_id: razorpayCustomerId,
  close_by: unixTimestamp,
  notify: { email: true }
})
```

**Webhook event:** `virtual_account.credited`
Handler:
1. Extract `virtual_account_id` and `amount_paid`
2. Find customer with this virtual account
3. Match to oldest unpaid invoice with matching or close amount
4. Auto-reconcile: create `InvoicePayment`, mark invoice paid
5. If amount doesn't match any invoice → create `UnmatchedPayment` record for manual review
6. Notify org admin of payment received

**Database changes:**
```prisma
model CustomerVirtualAccount {
  id                  String    @id @default(cuid())
  orgId               String
  customerId          String
  razorpayVaId        String    @unique
  accountNumber       String
  ifsc                String
  isActive            Boolean   @default(true)
  createdAt           DateTime  @default(now())
  closedAt            DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  customer     Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([orgId, customerId])
  @@map("customer_virtual_account")
}

model UnmatchedPayment {
  id              String   @id @default(cuid())
  orgId           String
  virtualAccountId String
  amountPaise     BigInt
  payerName       String?
  payerAccount    String?
  payerIfsc       String?
  razorpayPaymentId String
  status          String   @default("unmatched") // "unmatched" | "matched" | "ignored"
  matchedInvoiceId String?
  receivedAt      DateTime @default(now())
  resolvedAt      DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
  @@map("unmatched_payment")
}
```

**UI:** Settings → Smart Collect
- Per-customer: "Enable Smart Collect" button
- Shows assigned account number + IFSC
- Unmatched payments dashboard: list + manual match buttons

**Plan access:** Pro+ only

#### C. Subscription Pause / Resume

**Use case:** Customer going on leave / business slow season wants to pause billing for 1-3 months without cancelling.

**Razorpay API:**
```javascript
// Pause subscription
razorpay.subscriptions.update(subscriptionId, { pause_collection: { behavior: "void", resumes_at: unixTimestamp } })

// Resume subscription
razorpay.subscriptions.resume(subscriptionId)
```

**Update `src/lib/razorpay.ts`:**
- Add `pauseRazorpaySubscription(subscriptionId: string, resumeAt: Date): Promise<void>`
- Add `resumeRazorpaySubscription(subscriptionId: string): Promise<void>`

**Update `src/lib/billing.ts`:**
- Add `pauseSubscription(orgId: string, resumeAt: Date): Promise<void>`
- Add `resumeSubscription(orgId: string): Promise<void>`

**New webhook events to handle** (add to existing webhook handler):
- `subscription.paused` → status = `paused`, set `pausedAt`
- `subscription.resumed` → status = `active`, clear `pausedUntil`

**Database changes:**
```prisma
// Add to Subscription model:
pausedAt        DateTime?
pausedUntil     DateTime?
pauseReason     String?
```

**API routes:**
- `POST /api/billing/razorpay/pause` — `{ orgId, resumeDate }`
- `POST /api/billing/razorpay/resume` — `{ orgId }`

**UI:**
- Billing overview page: "Pause Subscription" button (Pro+ only)
- Date picker: "Resume billing on" (max 3 months)
- Active pause banner: "Subscription paused until {date}. Click to resume early."

**Plan access:** Pro+ only (Starter cannot pause — must cancel)

#### D. Subscription Upgrade / Downgrade (Enhanced)

**Phase 11 implemented basic cancel + re-subscribe. Phase 12 implements in-place plan changes:**

**Upgrade (Starter → Pro):**
```javascript
// Razorpay: change plan on existing subscription
razorpay.subscriptions.update(subscriptionId, {
  plan_id: newRazorpayPlanId,
  quantity: 1,
  remaining_count: newRemainingCount,
  replace_immediately: 1  // take effect now, not at period end
})
```
- Immediate effect
- Prorate current period: charge proportional amount for upgrade
- Show "You've been upgraded to Pro ✓" success message

**Downgrade (Pro → Starter):**
- Takes effect at end of current billing period
- Razorpay: update at cycle end (`replace_immediately: 0`)
- Show banner: "Your plan will change to Starter on {next billing date}"
- Pro features remain active until period end

**Update `src/lib/razorpay.ts`:**
- Add `changeSubscriptionPlan(subscriptionId: string, newPlanId: string, immediate: boolean): Promise<void>`

**New API route:** `POST /api/billing/razorpay/change-plan`
Body: `{ orgId, newPlanId, billingInterval, immediate }`

#### E. International Card Support

**Razorpay supports international cards (Visa/MC/Amex) for India-based merchants.**

**Requirements for activation:**
1. Enable international payments in Razorpay Dashboard → Settings → International Payments
2. Razorpay handles currency conversion (customer pays in USD/EUR, merchant receives INR)
3. No code changes required — existing subscription flow works for international cards
4. Add note to pricing page: "International cards accepted. Amount charged in INR equivalent."

**UI changes:**
- Upgrade page: add "International cards accepted" badge under payment section
- Show approximate USD/EUR price on pricing page:
  - "≈ $12/month (charged in ₹999)" for Starter
  - "≈ $36/month (charged in ₹2,999)" for Pro
- Note: "Prices in INR. International customers are charged in INR equivalent."

**Exchange rate display:** `GET /api/billing/exchange-rates`
- Fetches rates from ExchangeRate-API (free tier, cached hourly in Redis)
- Used only for display — actual charge always in INR via Razorpay

#### F. Razorpay Invoices (Supplementary)

**Use case:** For Enterprise customers who need Razorpay-branded payment receipts via Razorpay's own invoicing system (in addition to Slipwise invoices).

**Razorpay Invoices API:** Create and send payment invoices via Razorpay.

```javascript
razorpay.invoice.create({
  type: "invoice",
  date: unixTimestamp,
  customer_id: razorpayCustomerId,
  line_items: [{ name: "Pro Plan - Monthly", amount: 299900 }],
  sms_notify: 1,
  email_notify: 1,
  currency: "INR",
  expire_by: unixTimestamp
})
```

**When used:** After each subscription renewal, generate a Razorpay Invoice for compliance/GST records. Store `razorpayInvoiceId` on `UsageRecord` or create a new `BillingInvoice` model.

**Database model:**
```prisma
model BillingInvoice {
  id                  String   @id @default(cuid())
  orgId               String
  razorpayInvoiceId   String?  @unique
  razorpayPaymentId   String?
  planId              String
  amountPaise         BigInt
  currency            String   @default("INR")
  periodStart         DateTime
  periodEnd           DateTime
  status              String   @default("paid") // "paid" | "pending" | "failed"
  pdfUrl              String?  // Razorpay invoice PDF URL
  createdAt           DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, createdAt])
  @@map("billing_invoice")
}
```

**UI:** Billing overview → "Billing History" section → list all `BillingInvoice` with PDF download links

---

### 3.2 Sprint 12.2 — Public REST API Platform

**Duration:** 1 sprint (parallel with 12.3)
**Goal:** Build a versioned, authenticated public REST API for developers. Full CRUD on all document types with pagination, filtering, webhook outbound delivery, and rate limits per plan.

#### A. API Key Management

**Database models:**
```prisma
model ApiKey {
  id          String    @id @default(cuid())
  orgId       String
  name        String
  keyHash     String    @unique  // SHA-256 of the actual key — NEVER store plaintext
  keyPrefix   String              // First 12 chars for identification e.g. "slw_live_Ab12"
  scopes      String[]            // ["read:invoices", "write:invoices", ...]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  requestLogs  ApiRequestLog[]

  @@index([orgId, isActive])
  @@index([keyHash])
  @@map("api_key")
}

model ApiWebhookEndpoint {
  id              String    @id @default(cuid())
  orgId           String
  url             String
  events          String[]  // ["invoice.created", "invoice.paid", ...]
  secretHash      String    // SHA-256 of signing secret
  isActive        Boolean   @default(true)
  description     String?
  failureCount    Int       @default(0)
  createdAt       DateTime  @default(now())
  lastDeliveredAt DateTime?

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

  apiKey ApiKey? @relation(fields: [apiKeyId], references: [id])

  @@index([orgId, createdAt])
  @@index([apiKeyId, createdAt])
  @@map("api_request_log")
}
```

**API Scopes:**
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
| `read:customers` | Read customers |
| `write:customers` | Create and update customers |
| `read:employees` | Read employees |
| `write:employees` | Create and update employees |
| `read:vendors` | Read vendors |
| `write:vendors` | Create and update vendors |
| `read:reports` | Read report snapshots |
| `webhooks:manage` | Create and manage webhook endpoints |

**Per-plan API access:**
- **Free:** No API access
- **Starter:** No API access
- **Pro:** Up to 2 API keys, 10,000 requests/month
- **Enterprise:** Unlimited API keys, unlimited requests/month

**API Key Format:** `slw_live_` + nanoid(32) (production) or `slw_test_` + nanoid(32) (test)

**Key security:**
- Show key ONCE on creation (copy-to-clipboard)
- Store ONLY SHA-256 hash in DB
- After dismissing creation modal: key cannot be retrieved — must regenerate
- Show prefix for identification: "slw_live_Ab12..."

**API Key UI:** `src/app/app/settings/api/page.tsx`
- List all API keys: name, prefix, scopes, last used, status, expiry
- Create new key:
  - Name (required)
  - Scope selector (checkbox list with descriptions)
  - Expiry (never / 30 / 90 / 365 days)
  - After creation: one-time key reveal with "I've copied this key" confirmation
- Revoke key (confirmation: "This will immediately break any integration using this key")
- Regenerate: creates new key + immediately revokes old
- Usage meter: "X / 10,000 requests this month"

#### B. API Authentication Middleware

Create `src/app/api/v1/_middleware.ts` (or use Next.js middleware pattern):

```typescript
// Per-request validation flow:
1. Extract token: Authorization: Bearer {key} OR X-API-Key: {key}
2. SHA-256 hash the token
3. Lookup ApiKey by keyHash WHERE isActive = true
4. Check expiresAt — return 401 if expired
5. Check plan allows API access (Pro+ required)
6. Check request scope against ApiKey.scopes
7. Set request context: { orgId, apiKeyId, scopes }
8. Update lastUsedAt (async, fire-and-forget)
9. Log to ApiRequestLog (async, fire-and-forget)
```

#### C. REST API Endpoints

Base URL: `/api/v1/`

**Standard Response Envelope:**
```json
// Success:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 143, "hasMore": true }
}

// Error:
{
  "success": false,
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice with ID clxxxx not found"
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
| `RATE_LIMITED` | 429 | Monthly quota exceeded |
| `PLAN_LIMIT_REACHED` | 402 | Document creation quota hit |
| `INTERNAL_ERROR` | 500 | Server error |

##### Invoices API

`GET /api/v1/invoices`
- Scope: `read:invoices`
- Query: `?status=DRAFT|SENT|PAID|OVERDUE|CANCELLED&customerId=&from=&to=&page=1&limit=20&sort=createdAt&order=desc`
- Returns: paginated invoice list: `{ id, invoiceNumber, status, totalAmount, currency, customerId, dueDate, createdAt }`

`GET /api/v1/invoices/:id`
- Scope: `read:invoices`
- Returns: full invoice with line items, payments, status events

`POST /api/v1/invoices`
- Scope: `write:invoices`
- Increments `invoicesPerMonth` usage; reject if plan limit hit (402)
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
- Returns: created invoice with computed `invoiceNumber` and totals

`PATCH /api/v1/invoices/:id`
- Scope: `write:invoices`
- Only DRAFT invoices can be patched
- Partial update of fields

`DELETE /api/v1/invoices/:id`
- Scope: `delete:invoices`
- Only DRAFT or CANCELLED invoices
- Soft delete: set `deletedAt`

`POST /api/v1/invoices/:id/send`
- Scope: `write:invoices`
- Body: `{ "recipientEmail": "client@example.com", "message": "optional" }`
- Sends invoice PDF via Resend; changes status to SENT
- Increments `emailSendsPerMonth`

`POST /api/v1/invoices/:id/mark-paid`
- Scope: `write:invoices`
- Body: `{ "amount": 118000, "paymentMethod": "upi", "paymentDate": "2026-04-06", "reference": "TXN123" }`
- Creates `InvoicePayment`; changes status to PAID

`POST /api/v1/invoices/:id/payment-link`
- Scope: `write:invoices`
- Creates Razorpay payment link for this invoice
- Returns `{ shortUrl, qrCodeDataUrl, expiresAt }`

`GET /api/v1/invoices/:id/pdf`
- Scope: `read:invoices`
- Returns: PDF binary with `Content-Type: application/pdf`

##### Vouchers API

`GET /api/v1/vouchers`
- Scope: `read:vouchers`
- Query: `?type=receipt|payment|journal&from=&to=&page=&limit=`

`GET /api/v1/vouchers/:id`

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
`DELETE /api/v1/vouchers/:id`

##### Salary Slips API

`GET /api/v1/salary-slips`
- Scope: `read:salary_slips`
- Query: `?employeeId=&month=2026-03&page=&limit=`

`GET /api/v1/salary-slips/:id`

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
- Returns: PDF binary

##### Customers API

`GET /api/v1/customers` — Scope: `read:customers`
`GET /api/v1/customers/:id`
`POST /api/v1/customers` — Scope: `write:customers`
- Body: `{ name, email, phone, gstNumber, address: { line1, city, state, pincode, country } }`
`PATCH /api/v1/customers/:id`

##### Employees API

`GET /api/v1/employees` — Scope: `read:employees`
`GET /api/v1/employees/:id`
`POST /api/v1/employees` — Scope: `write:employees`
- Body: `{ name, email, phone, employeeId, designation, department, joinDate, pan, bank: { name, accountNumber, ifsc } }`
`PATCH /api/v1/employees/:id`

##### Vendors API

`GET /api/v1/vendors` — Scope: `read:vendors`
`GET /api/v1/vendors/:id`
`POST /api/v1/vendors` — Scope: `write:vendors`
`PATCH /api/v1/vendors/:id`

##### Reports API

`GET /api/v1/reports/summary`
- Scope: `read:reports`
- Query: `?from=2026-01-01&to=2026-03-31`
- Returns: `{ totalInvoiced, totalCollected, totalOutstanding, totalVouchers, slipsGenerated, byMonth: [...] }`

`GET /api/v1/reports/outstanding`
- Returns: unpaid invoices grouped by aging: 0-30, 31-60, 61-90, 90+ days

`GET /api/v1/openapi.json`
- No auth required
- Returns OpenAPI 3.1 spec

#### D. Outbound Webhooks

**Management UI:** `src/app/app/settings/webhooks/page.tsx`
- List all webhook endpoints (URL, events, status, last delivery)
- Add endpoint: URL (HTTPS only, no localhost/RFC-1918), events, description
- Test endpoint: sends `ping` event
- View delivery history per endpoint (last 50)
- Retry failed delivery
- Disable/enable endpoint
- Rotate signing secret

**Supported outbound events:**
| Event | Trigger |
|---|---|
| `invoice.created` | Invoice created |
| `invoice.updated` | Invoice fields changed |
| `invoice.sent` | Invoice emailed to customer |
| `invoice.paid` | Invoice marked paid (manual or via payment link) |
| `invoice.overdue` | Invoice past due date |
| `invoice.cancelled` | Invoice cancelled |
| `invoice.payment_link.created` | Payment link generated |
| `voucher.created` | Voucher created |
| `voucher.updated` | Voucher updated |
| `salary_slip.created` | Salary slip created |
| `salary_slip.sent` | Salary slip emailed |
| `subscription.activated` | Razorpay subscription active |
| `subscription.trial_ending` | Trial ends in 3 days |
| `subscription.cancelled` | Subscription cancelled |
| `member.invited` | Team member invited |
| `member.joined` | Invite accepted |
| `payment.received` | Payment link / virtual account payment received |
| `ping` | Test event |

**Webhook payload:**
```json
{
  "id": "evt_01HXXX",
  "type": "invoice.paid",
  "created": "2026-04-06T08:00:00Z",
  "orgId": "clxxxx",
  "data": { "object": { ... full object ... } },
  "apiVersion": "2026-04"
}
```

**Signing header:** `Slipwise-Signature: t={timestamp},v1={hmac_sha256}`
- HMAC-SHA256 of `{timestamp}.{rawBody}` using endpoint secret
- Receiver verifies with `crypto.timingSafeEqual`

**Delivery mechanics:**
- Attempt delivery immediately via `setImmediate` / background job
- Timeout: 30 seconds per attempt
- Retry on non-2xx: 3 retries (5 min, 30 min, 2 hr backoff)
- Auto-disable endpoint after 10 consecutive failures + notify org admin
- Log every attempt in `ApiWebhookDelivery`

**SSRF protection:** Reject URLs matching:
- `localhost`, `127.0.0.1`, `0.0.0.0`
- RFC-1918: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- Non-HTTPS (HTTP URLs rejected)
- `169.254.x.x` (AWS metadata service)

#### E. Developer Portal

**Route:** `src/app/(marketing)/developers/page.tsx`

Contents:
- Hero: "Build on Slipwise One" with code snippet
- Quick start: create API key → first API call (cURL example)
- Authentication guide
- Full endpoint reference (link to OpenAPI spec)
- Code examples: Node.js, Python, PHP, cURL
- Webhook integration guide with HMAC verification example
- Changelog and versioning policy

---

### 3.3 Sprint 12.3 — Enterprise Features

**Duration:** 1 sprint (parallel with 12.2)
**Goal:** Enterprise authentication (SSO/SAML), multi-org management, custom domains, white-labeling.

#### A. SSO / SAML 2.0

**Supported Identity Providers:**
- Okta
- Microsoft Entra ID (Azure AD)
- Google Workspace (SAML)
- Ping Identity
- OneLogin
- Any SAML 2.0 compliant IdP

**Database model:**
```prisma
model SsoConfig {
  id              String    @id @default(cuid())
  orgId           String    @unique
  provider        String    // "okta" | "azure" | "google" | "saml_custom"
  metadataUrl     String?
  metadataXml     String?   @db.Text
  acsUrl          String    // https://app.slipwise.com/api/auth/sso/{orgSlug}/callback
  entityId        String    // https://app.slipwise.com
  ssoEnforced     Boolean   @default(false)
  isActive        Boolean   @default(true)
  testedAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("sso_config")
}
```

**SSO Routes:**
- `GET /api/auth/sso/[orgSlug]/initiate` — redirect to IdP with SAMLRequest
- `POST /api/auth/sso/[orgSlug]/callback` — receive SAML assertion, create session
- `GET /api/auth/sso/[orgSlug]/metadata` — return SP metadata XML for IdP config

**SSO Login Flow:**
1. User visits `https://app.slipwise.com/auth/login?org=acme-corp`
2. Org has SSO configured → redirect to IdP
3. IdP authenticates → sends SAML assertion to ACS URL
4. Parse + verify assertion signature (reject if expired >5 min or invalid sig)
5. Extract email, name from assertion attributes
6. Find `Profile` by email → create Supabase session → redirect to `/app/home`
7. If no Profile: create Profile + Member (default viewer) → onboard
8. If SSO enforced: block standard email/password login for this org

**Settings UI:** `src/app/app/settings/security/sso/page.tsx`
- SSO config form: provider selector, metadata URL / XML upload
- SP metadata display (copy ACS URL, Entity ID for IdP setup)
- "Test SSO" button (opens SSO login in new window)
- "Enforce SSO" toggle with warning
- Last tested timestamp

**Plan requirement:** Enterprise only — show `UpgradeGate` for others

#### B. Multi-Organization Management

**Use case:** A user owns/belongs to multiple orgs (personal freelance + company).

**Database model:**
```prisma
model UserOrgPreference {
  userId      String   @id @db.Uuid
  activeOrgId String
  updatedAt   DateTime @updatedAt

  user Profile      @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [activeOrgId], references: [id], onDelete: Cascade)

  @@map("user_org_preference")
}
```

**Org Switcher UI** (add to app header):
- Dropdown showing all orgs user belongs to (with role badge)
- Click to switch — updates `UserOrgPreference.activeOrgId`
- "Create New Organization" option
- "Leave Organization" (not for owners)
- Current org highlighted with checkmark

**Org switching flow:**
1. User clicks org name in header
2. `db.member.findMany({ where: { userId } })` → list orgs
3. User selects → `PUT /api/org/switch { activeOrgId }`
4. Cookie/session updated → page reloads with new org context
5. All documents, settings, billing reflect new org

**Edge cases:**
- Owner cannot leave org (must transfer ownership first)
- Deleted org: auto-removed from switcher
- If only 1 org: show org name non-interactively (no dropdown)

**New API route:** `PUT /api/org/switch` — `{ activeOrgId }` — updates preference, validates membership

#### C. Custom Domains

**Use case:** Enterprise: `docs.acme.com` or `billing.acme.com` instead of `app.slipwise.com`.

**Database model:**
```prisma
model OrgDomain {
  id           String    @id @default(cuid())
  orgId        String    @unique
  domain       String    @unique  // "billing.acme.com"
  verified     Boolean   @default(false)
  verifyToken  String    // DNS TXT record value
  createdAt    DateTime  @default(now())
  verifiedAt   DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("org_domain")
}
```

**Domain verification flow:**
1. Admin enters domain in Settings → Branding → Custom Domain
2. System generates `verifyToken` (nanoid)
3. Admin adds DNS TXT: `_slipwise-verify.acme.com` → `{token}`
4. Admin clicks "Verify" → backend DNS lookup confirms TXT record
5. Mark verified → provision via Vercel custom domain API
6. Share links use custom domain: `https://billing.acme.com/share/invoice/{token}`

**Plan requirement:** Enterprise only

#### D. White-Label (Remove Slipwise Branding)

**Plan:** Enterprise only

**Database model:**
```prisma
model OrgWhiteLabel {
  id              String   @id @default(cuid())
  orgId           String   @unique
  removeBranding  Boolean  @default(false)
  emailFromName   String?  // "Acme Corp" instead of "Slipwise One"
  emailReplyTo    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("org_white_label")
}
```

**White-label applies to:**
- PDF exports: hide "Generated with Slipwise One" footer
- Shared document pages: remove Slipwise logo
- Emails: `From: Acme Corp <noreply@slipwise.app>` instead of "Slipwise One"
- Invoice watermark: removed
- Payment link pages: remove "Powered by Slipwise"

**PDF generation check:**
```typescript
const whiteLabel = await db.orgWhiteLabel.findUnique({ where: { orgId } });
const hideBranding = whiteLabel?.removeBranding ?? false;
// Pass to PDF template renderer
```

#### E. Org Email Domain Auto-Provisioning

**Use case:** Any user signing up with `@acme.com` auto-joins Acme org.

```prisma
model OrgEmailDomain {
  id          String   @id @default(cuid())
  orgId       String
  emailDomain String
  defaultRole String   @default("viewer")
  autoJoin    Boolean  @default(false)
  createdAt   DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, emailDomain])
  @@map("org_email_domain")
}
```

**Auto-join flow:**
1. New user signs up with `john@acme.com`
2. On Profile creation: lookup `OrgEmailDomain` where `emailDomain = "acme.com"` and `autoJoin = true`
3. Found: auto-create `Member` with `defaultRole`
4. Notify org owner: "New member joined via email domain policy"

---

### 3.4 Phase 12 Database Schema Additions

```prisma
// Payment
model CustomerVirtualAccount   (Section 3.1B)
model UnmatchedPayment          (Section 3.1B)
model BillingInvoice            (Section 3.1F)

// Subscription enhancements (add fields to Subscription):
// pausedAt, pausedUntil, pauseReason
// billingGateway (always "razorpay")

// Invoice enhancements (add fields to Invoice):
// razorpayPaymentLinkId, razorpayPaymentLinkUrl, paymentLinkExpiresAt

// API Platform
model ApiKey                    (Section 3.2A)
model ApiWebhookEndpoint        (Section 3.2A)
model ApiWebhookDelivery        (Section 3.2A)
model ApiRequestLog             (Section 3.2A)

// Enterprise
model SsoConfig                 (Section 3.3A)
model UserOrgPreference         (Section 3.3B)
model OrgDomain                 (Section 3.3C)
model OrgWhiteLabel             (Section 3.3D)
model OrgEmailDomain            (Section 3.3E)

// Organization model: add slug (unique), countryCode, timezone
// Add relations: ssoConfig, emailDomains, domain, whiteLabel, apiKeys, webhookEndpoints
```

---

### 3.5 Phase 12 Route Map

```
// Razorpay expanded billing:
POST /api/billing/razorpay/create-payment-link
POST /api/billing/razorpay/create-virtual-account
POST /api/billing/razorpay/pause
POST /api/billing/razorpay/resume
POST /api/billing/razorpay/change-plan
GET  /api/billing/exchange-rates

// Public API v1:
GET/POST/PATCH/DELETE /api/v1/invoices/*
GET/POST/PATCH/DELETE /api/v1/vouchers/*
GET/POST/PATCH/DELETE /api/v1/salary-slips/*
GET/POST/PATCH        /api/v1/customers/*
GET/POST/PATCH        /api/v1/employees/*
GET/POST/PATCH        /api/v1/vendors/*
GET                   /api/v1/reports/*
GET                   /api/v1/openapi.json

// Auth SSO:
GET  /api/auth/sso/[orgSlug]/initiate
POST /api/auth/sso/[orgSlug]/callback
GET  /api/auth/sso/[orgSlug]/metadata

// Org management:
PUT  /api/org/switch

// App settings pages:
/app/settings/api
/app/settings/webhooks
/app/settings/security/sso
/app/settings/enterprise

// Marketing:
/(marketing)/developers
```

---

### 3.6 Phase 12 Edge Cases & Acceptance Criteria

#### Razorpay Payment Links

| Scenario | Expected Behavior |
|---|---|
| Payment link expires before customer pays | Invoice remains SENT; show "Link expired" badge; allow regeneration |
| Customer pays partial amount via link | Create `InvoicePayment` for partial; keep status as SENT; show partial payment badge |
| Duplicate `payment_link.paid` webhook | Idempotency check via `RazorpayEvent`; skip if already processed |
| Payment link created for already-paid invoice | Block: "Invoice is already paid" error |
| Razorpay Payment Link API unavailable | Return 503 "Payment link service unavailable. Try again later." |
| Invoice deleted with active payment link | Cancel the Razorpay payment link via API before deletion |

#### Smart Collect / Virtual Accounts

| Scenario | Expected Behavior |
|---|---|
| Payment received but amount doesn't match any invoice | Create `UnmatchedPayment`; notify admin; manual match UI |
| Multiple invoices match the received amount | Create `UnmatchedPayment` for manual match |
| Virtual account closed but payment received | Razorpay rejects; no action needed |
| Customer has multiple open invoices | Auto-apply to oldest outstanding invoice |

#### API Platform

| Scenario | Expected Behavior |
|---|---|
| API key used after revocation | Immediate 401; `revokedAt` checked in middleware |
| API key expiry to the second | Time check in middleware; 401 on expiry |
| Missing required fields in POST | 422 with field-level error details |
| Invoice creation hits plan limit | 402 `{ code: "PLAN_LIMIT_REACHED", current: 100, limit: 100 }` |
| Concurrent requests exceed rate limit | 429 with `Retry-After` header |
| Webhook endpoint URL is localhost | 422 "Webhook URL must be a publicly accessible HTTPS URL" |
| Webhook delivery times out (>30s) | Mark failed; retry with backoff |
| After 10 consecutive failures | Auto-disable endpoint + notify admin |
| Free/Starter plan tries to use API | 402 `{ code: "FEATURE_GATED", minimumPlan: "pro" }` |

#### SSO

| Scenario | Expected Behavior |
|---|---|
| SAML assertion expired (>5 min) | Reject: "Authentication expired, please retry" |
| SAML assertion signature invalid | 403 |
| SSO user email not in org | Create Member with default viewer role; notify admin |
| SSO enforced, user tries password login | "This org requires SSO. Click here to login via {IdP}" |
| Admin disables SSO enforcement | Email all members: "Password login re-enabled for your account" |

---

### 3.7 Phase 12 Test Cases

#### Payment Link Tests

```
TC-12-01: Payment link creation
  Given: Sent invoice for ₹11,800, authenticated org owner
  When:  POST /api/billing/razorpay/create-payment-link { invoiceId }
  Then:  Returns 200 with shortUrl (https://rzp.io/l/xxxxx)
         Invoice.razorpayPaymentLinkId set in DB
         Returns QR code data URL

TC-12-02: Payment link paid webhook
  Given: Razorpay sends payment_link.paid event with reference_id = invoiceId
  When:  POST /api/billing/razorpay/webhook
  Then:  Invoice status = PAID
         InvoicePayment record created
         RazorpayEvent record created (idempotency)
         Notification created for org admin

TC-12-03: Duplicate payment webhook (idempotency)
  Given: RazorpayEvent with same ID already in DB
  When:  Same webhook received
  Then:  Returns 200; no duplicate InvoicePayment; invoice status unchanged

TC-12-04: Subscription pause
  Given: Active Pro subscription
  When:  POST /api/billing/razorpay/pause { resumeDate: "2026-07-01" }
  Then:  Razorpay subscription paused
         Subscription.pausedAt set, pausedUntil set
         Status = "paused"
         Banner shown in billing UI

TC-12-05: Subscription resume
  Given: Paused subscription
  When:  POST /api/billing/razorpay/resume
  Then:  Razorpay subscription resumed
         Subscription.status = "active"
         pausedAt, pausedUntil cleared

TC-12-06: Unmatched virtual account payment
  Given: Virtual account receives ₹50,000, no invoice for that amount
  When:  virtual_account.credited webhook
  Then:  UnmatchedPayment record created
         Notification to org admin: "Unmatched payment of ₹50,000 received"
```

#### API Tests

```
TC-12-07: Valid API key authentication
  Given: Active API key with read:invoices scope
  When:  GET /api/v1/invoices Authorization: Bearer {key}
  Then:  Returns 200 with paginated invoice list
         ApiRequestLog entry created
         ApiKey.lastUsedAt updated

TC-12-08: Revoked API key
  Given: API key with revokedAt set
  When:  GET /api/v1/invoices with revoked key
  Then:  Returns 401 { error: { code: "UNAUTHORIZED" } }

TC-12-09: Missing scope
  Given: API key with only read:invoices
  When:  POST /api/v1/invoices (requires write:invoices)
  Then:  Returns 403 { error: { code: "FORBIDDEN" } }

TC-12-10: Plan limit on API invoice creation
  Given: Starter plan (no API access)
  When:  POST /api/v1/invoices
  Then:  Returns 402 { error: { code: "FEATURE_GATED", minimumPlan: "pro" } }

TC-12-11: Webhook SSRF protection
  Given: Webhook URL = "http://169.254.169.254/metadata"
  When:  POST /app/settings/webhooks with that URL
  Then:  Returns 422 "Webhook URL must be a publicly accessible HTTPS URL"

TC-12-12: API pagination
  Given: Org has 143 invoices
  When:  GET /api/v1/invoices?page=2&limit=20
  Then:  Returns 20 items (items 21-40)
         meta.total=143, meta.page=2, meta.hasMore=true

TC-12-13: PDF download via API
  Given: Valid invoice ID, API key with read:invoices
  When:  GET /api/v1/invoices/:id/pdf
  Then:  Returns binary PDF
         Content-Type: application/pdf
         Content-Disposition: attachment; filename="invoice-{number}.pdf"
```

#### SSO Tests

```
TC-12-14: SSO login initiation
  Given: Org with Okta SSO configured
  When:  GET /api/auth/sso/acme-corp/initiate
  Then:  Returns 302 redirect to Okta with SAMLRequest

TC-12-15: Valid SAML assertion
  Given: Valid signed SAML response, email=john@acme.com is org member
  When:  POST /api/auth/sso/acme-corp/callback
  Then:  Supabase session created; redirect to /app/home

TC-12-16: SSO enforcement blocks password login
  Given: Org with ssoEnforced = true
  When:  Standard auth login attempt for john@acme.com
  Then:  Blocked with message + redirect URL to SSO
```

---

## 4. Phase 13 — AWS Migration, AI Platform & Third-Party Integrations

### Objective

Migrate Slipwise One from Vercel + Supabase to AWS for cost control, compliance, and scale. Introduce AI-powered document intelligence, connect with major Indian accounting tools, deliver a mobile Progressive Web App, and complete the GST compliance toolkit.

---

### 4.1 Sprint 13.1 — AWS Infrastructure Migration

**Duration:** 1 sprint (must complete before other Phase 13 sprints)
**Goal:** Zero-downtime migration. All existing features work identically post-migration.

#### A. Target AWS Architecture

```
Internet
    │
    ▼
CloudFront (CDN + WAF + HTTPS)
    │
    ├── Static assets → S3 (slipwise-assets)
    │
    └── Application Load Balancer (ALB)
            │
            ├── ECS Fargate (next-app service)
            │     ├── Task A — t3.small (min 2 replicas)
            │     ├── Task B — t3.small
            │     └── Task C... (auto-scale to 10)
            │
            └── ECS Fargate (worker service)
                  └── Task — background jobs (1 replica)

Supporting:
- RDS PostgreSQL 15 (Multi-AZ, db.t4g.medium, ap-south-1)
- ElastiCache Redis 7 (cache.t4g.small)
- S3: slipwise-assets (public) + slipwise-private (signed) + slipwise-exports (temp)
- Secrets Manager (all credentials)
- CloudWatch (dashboards + alarms)
- ECR (Docker image registry)
- WAF (OWASP rule set on CloudFront)
```

#### B. Infrastructure as Code (CDK v2 TypeScript)

**Location:** `infra/` directory at repo root

**Stacks:**
1. `NetworkStack` — VPC, subnets (public/private), NAT gateway, security groups
2. `DatabaseStack` — RDS PostgreSQL 15, Multi-AZ, automated backups (7 days), parameter group
3. `CacheStack` — ElastiCache Redis 7, subnet group, auth token
4. `StorageStack` — 3 S3 buckets, bucket policies, CORS config
5. `EcrStack` — ECR repos for app + worker Docker images
6. `AppStack` — ECS cluster, task definitions, service, ALB, target groups, auto-scaling policies
7. `CdnStack` — CloudFront distribution, S3 origin, custom domain cert (ACM), WAF
8. `SecretsStack` — Secrets Manager secrets (DB password, Redis token, Razorpay keys, etc.)
9. `MonitoringStack` — CloudWatch dashboards, alarms → SNS → email/Slack

**Auto-scaling policy:**
- Scale out: CPU > 70% for 2 consecutive minutes → add 2 tasks
- Scale in: CPU < 30% for 10 consecutive minutes → remove 1 task
- Min: 2 tasks; Max: 10 tasks

#### C. Dockerfile (Next.js Standalone)

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
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

**`next.config.ts` change:** Add `output: "standalone"`

**Health check endpoint:** `GET /api/health`
```json
{ "status": "ok", "db": "connected", "cache": "connected", "timestamp": "..." }
```

#### D. GitHub Actions CI/CD Pipeline

**File:** `.github/workflows/deploy.yml`

Stages:
1. `lint-typecheck` — `npm run lint && npx tsc --noEmit`
2. `test` — `npm test`
3. `build-push` — Docker build → tag with git SHA → push to ECR
4. `migrate` — `npx prisma migrate deploy` against RDS
5. `deploy` — `aws ecs update-service --force-new-deployment`
6. `wait-stable` — `aws ecs wait services-stable` (timeout 10 min)
7. `smoke-test` — `curl https://app.slipwise.com/api/health` (must return 200)
8. `notify` — Slack notification with deploy status

**Rollback:** If ECS deployment fails health checks → automatic rollback to previous task definition

**Environments:**
- `staging` → triggered on merge to `develop` branch
- `production` → triggered on merge to `main` branch

#### E. Database Migration (Supabase → RDS)

**One-time migration procedure (not code — documented for ops team):**
1. `pg_dump {SUPABASE_DB_URL} > slipwise_backup_{date}.sql`
2. Create RDS PostgreSQL 15 instance
3. `psql {RDS_URL} < slipwise_backup_{date}.sql`
4. Verify: compare row counts on all 40+ tables
5. Run `npx prisma migrate deploy` for any pending migrations
6. Update `DATABASE_URL` in Secrets Manager
7. Deploy app pointing to RDS — smoke test
8. DNS cutover
9. Keep Supabase DB read-only for 24hr (emergency fallback)

**Connection config:**
- `DATABASE_URL=postgresql://user:pass@{rds-endpoint}:5432/slipwise?sslmode=require`
- RDS Proxy for connection pooling: `?pgbouncer=true` suffix
- Pool size per task: 20 connections (2 tasks × 20 = 40 max)

#### F. S3 Storage Migration

**Complete the S3 stub in `src/lib/storage-adapter.ts`:**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3StorageAdapter implements StorageAdapter {
  private s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-south-1" });

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

**Install:** `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

**Bucket mapping:**
| Supabase Bucket | AWS S3 Bucket | Access |
|---|---|---|
| `logos` | `slipwise-assets/logos/` | Public via CloudFront |
| `attachments` | `slipwise-private/attachments/` | Signed URLs (1hr) |
| `proofs` | `slipwise-private/proofs/` | Signed URLs (1hr) |
| (new) PDF exports | `slipwise-exports/` | Signed URLs (24hr) |

#### G. Redis Migration (Upstash → ElastiCache)

Update `src/lib/rate-limit.ts` to support ElastiCache (ioredis) alongside Upstash:
- If `REDIS_URL` set → use `ioredis` client (ElastiCache format)
- If `UPSTASH_REDIS_REST_URL` set → use Upstash (local dev / staging)
- Fail-open behavior retained in both cases

**Install:** `npm install ioredis`

#### H. Full Sentry + PostHog Integration

**Sentry (`@sentry/nextjs` — full integration now with real DSN):**
- `sentry.client.config.ts` — `Sentry.init({ dsn, integrations: [BrowserTracing, Replay] })`
- `sentry.server.config.ts` — `Sentry.init({ dsn })`
- `sentry.edge.config.ts` — `Sentry.init({ dsn })`
- Set user context on auth: `Sentry.setUser({ id: userId, email, extra: { orgId } })`
- Source maps upload in CI/CD: `npx sentry-cli sourcemaps inject + upload`

**PostHog analytics:**
- Install: `npm install posthog-js posthog-node`
- Client: `PostHogProvider` wraps `RootLayout`
- Track key events:
  - `document_created` — type, templateId
  - `document_exported` — type, format (pdf/png)
  - `subscription_started` — planId, billingInterval
  - `trial_started` — planId
  - `feature_gated` — featureName, planId
  - `api_key_created` — scopes
  - `payment_link_created` — invoiceAmount
  - `invoice_paid_via_link` — amount, method
- Funnels: anonymous_visit → signup → first_document → export → subscribe → pay

---

### 4.2 Sprint 13.2 — AI-Powered Features

**Duration:** 1 sprint (parallel with 13.3)
**Goal:** Reduce manual data entry, surface business insights, automate GST calculations.

#### A. Smart OCR — Receipt/Invoice Extraction

**Use case:** Upload photo/PDF of receipt → fields auto-filled in invoice/voucher form.

**Implementation:** AWS Textract `AnalyzeDocument` API (or OpenAI GPT-4o vision for handwritten).

**API route:** `POST /api/ai/extract-document`
- Request: `FormData` with `file` (image/PDF, max 5MB)
- Validate: MIME type must be `image/*` or `application/pdf`
- Upload to S3 `slipwise-private/ocr-input/{orgId}/{uuid}`
- Call Textract `AnalyzeDocument` with `FeatureTypes: ["FORMS", "TABLES"]`
- Parse key-value pairs + tables
- Map extracted fields to invoice schema
- Return:
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

**Database model:**
```prisma
model OcrJob {
  id            String   @id @default(cuid())
  orgId         String
  status        String   @default("pending")  // pending|processing|completed|failed
  inputS3Key    String
  extractedData Json?
  confidence    Float?
  errorMessage  String?
  createdAt     DateTime @default(now())
  completedAt   DateTime?

  @@index([orgId, createdAt])
  @@map("ocr_job")
}
```

**UI:** Invoice/Voucher creation form:
- "📷 Upload receipt to auto-fill" button
- Upload → spinner → form fields populated
- Confidence shown: "92% confident — yellow highlight = low confidence fields"
- User reviews, edits, then submits

**Monthly limits by plan:**
- Free: 5 OCR scans/month
- Starter: 50/month
- Pro: 200/month
- Enterprise: Unlimited

#### B. AI Expense Categorization

**Use case:** When creating voucher from OCR receipt, auto-suggest accounting category.

**Implementation:** OpenAI GPT-4o-mini prompt:
```
Given vendor: "{vendorName}" and description: "{description}", 
suggest one accounting category from:
[Office Supplies, Travel & Transport, Software & Subscriptions, Marketing,
Utilities, Professional Services, Rent, Salary & Wages, Equipment, Other]
Respond with just the category name.
```

**Caching:** Redis key = SHA-256(`${vendor}:${description}`) → category, TTL 7 days

**UI:** Voucher category dropdown with AI chip: "✨ Suggested: Software & Subscriptions"

#### C. GST Smart Calculator

**Use case:** Line items get auto-filled GST based on HSN code and party states.

**Implementation files:**
- `src/lib/gst-calculator.ts`
- `src/data/hsn-gst-rates.json` — static lookup (HSN code → GST rate %)

**Function:**
```typescript
export function calculateGST(params: {
  hsnCode: string;
  amount: number;    // in rupees
  fromState: string; // ISO state code e.g. "27" (Maharashtra)
  toState: string;
}): { cgst: number; sgst: number; igst: number; totalGst: number; totalAmount: number }
```

**Logic:**
- Look up `hsnCode` in `hsn-gst-rates.json` → get `gstRate` (e.g., 18)
- If `fromState === toState` (intra-state) → CGST = gstRate/2, SGST = gstRate/2, IGST = 0
- If `fromState !== toState` (inter-state) → IGST = gstRate, CGST = 0, SGST = 0
- Handle exempted HSN codes (0% GST)

**UI integration:**
- Line item HSN code field: autocomplete with top-200 common HSN codes
- On HSN entry: auto-fill tax rate + show CGST/SGST/IGST breakdown
- Invoice totals: show tax breakdown table (CGST, SGST, IGST subtotals)

#### D. GSTR-1 Report Generator

**Use case:** One-click GSTR-1 JSON report for monthly GST filing on the government portal.

**API route:** `GET /api/export/gstr1?period=2026-03`

**Logic:**
1. Fetch all invoices for org in given month where status = PAID or SENT
2. For each invoice: get customer GSTIN, amount, tax breakdown
3. Group:
   - **B2B** (customer has GSTIN): group by GSTIN
   - **B2C Small** (< ₹2.5 lakh, no GSTIN): aggregate
   - **B2C Large** (≥ ₹2.5 lakh, no GSTIN): individual entries
   - **Export** (country ≠ India)
4. Output: JSON per government GSTR-1 schema + Excel summary

**GSTR-1 JSON schema (simplified):**
```json
{
  "gstin": "27AADCB2230M1Z3",
  "fp": "032026",
  "b2b": [{ "ctin": "...", "inv": [...] }],
  "b2cs": [{ "typ": "OE", "pos": "29", "txval": 100000, "iamt": 18000 }]
}
```

#### E. Smart Salary Insights

**Features:**
1. **Salary trend chart** — per employee, 12-month Recharts bar chart
2. **Anomaly detection** — flag if `|currentMonth - avgLast3Months| / avg > 0.2`
3. **Department cost totals** — total salary cost by department, by month
4. **Year-over-year comparison** — current vs previous year
5. **Net pay calculator** — gross → deductions → net (TDS auto-calculated for Indian tax slabs 2026)

**API:** `GET /api/ai/salary-insights?orgId=&period=2026-Q1`

**TDS slabs (FY 2026-27, New Regime):**
- Up to ₹3 lakh: 0%
- ₹3–7 lakh: 5%
- ₹7–10 lakh: 10%
- ₹10–12 lakh: 15%
- ₹12–15 lakh: 20%
- Above ₹15 lakh: 30%

#### F. Late Payment Predictor

**Use case:** Before sending invoice, warn "This customer has paid late 3/5 times."

**Logic (pure SQL — no ML):**
```sql
SELECT 
  COUNT(*) FILTER (WHERE paid_date > due_date) as late_count,
  COUNT(*) as total_paid
FROM invoices
WHERE customer_id = $1 AND status = 'PAID'
```

**UI:** Orange warning chip on invoice send dialog: "⚠️ This customer has a 60% late payment history. Consider adding a late fee clause."

---

### 4.3 Sprint 13.3 — Third-Party Integrations + Mobile PWA

**Duration:** 1 sprint (parallel with 13.2)

#### A. Tally Prime XML Export

**Use case:** Export invoices/vouchers as Tally-compatible XML for import into Tally Prime / ERP 9.

**Implementation:** `src/lib/integrations/tally.ts`

```typescript
export function invoiceToTallyXML(invoice: InvoiceWithItems): string {
  // ENVELOPE → BODY → IMPORTDATA → REQUESTDATA → TALLYMESSAGE
  // LEDGER entries for parties + VOUCHER entries with GST data
}
```

**Tally XML specifics:**
- Date format: `YYYYMMDD`
- Currency: always INR (Tally doesn't support multi-currency in basic mode)
- GST ledgers: separate CGST, SGST, IGST ledger entries
- Voucher type: `Sales` for invoices, `Receipt` for payment vouchers

**API route:** `POST /api/export/tally`
Body: `{ type: "invoice" | "voucher", ids: string[] }`
Response: XML file download (`Content-Type: application/xml`)

**UI:** Invoice list + Voucher list → multi-select checkboxes → "Export to Tally" button (Starter+)

#### B. QuickBooks Online Integration

**OAuth 2.0 flow with QuickBooks Intuit API:**

**Database:**
```prisma
model OrgIntegration {
  id             String    @id @default(cuid())
  orgId          String
  provider       String    // "quickbooks" | "zoho"
  accessToken    String    // encrypted at rest
  refreshToken   String    // encrypted at rest
  tokenExpiresAt DateTime
  externalOrgId  String?   // QBO RealmId
  config         Json?
  isActive       Boolean   @default(true)
  lastSyncAt     DateTime?
  createdAt      DateTime  @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, provider])
  @@map("org_integration")
}
```

**Routes:**
- `GET /api/integrations/quickbooks/connect` — OAuth initiate (redirect to Intuit)
- `GET /api/integrations/quickbooks/callback` — OAuth callback, store tokens
- `POST /api/integrations/quickbooks/sync` — manual sync trigger
- `DELETE /api/integrations/quickbooks/disconnect` — revoke

**Sync flow (invoices):**
1. Fetch orgs' customers from QBO → merge with Slipwise customers
2. For each Slipwise invoice: check if QBO equivalent exists by `invoiceNumber`
3. If not: create in QBO via `POST /v3/company/{realmId}/invoice`
4. If exists: update if Slipwise version is newer
5. Log sync results in `OrgIntegration.lastSyncAt`

**Token refresh:** If `tokenExpiresAt < now + 5min` → auto-refresh before API call

#### C. Zoho Books Integration

Same OAuth 2.0 pattern as QuickBooks:
- Zoho Books API v3
- Routes: `connect`, `callback`, `sync`, `disconnect`
- Map Slipwise → Zoho: Customers, Invoices, Vouchers (as Expenses)
- Support GSTR exports from Zoho (retrieve GSTR data to compare with Slipwise)

#### D. UPI Payment Link + QR in PDFs

**`src/lib/upi-link.ts`:**
```typescript
export function generateUpiDeeplink(params: {
  vpa: string;         // e.g. "acmecorp@paytm"
  payeeName: string;
  amount: number;      // in rupees
  transactionNote: string; // invoice number
}): string {
  return `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payeeName)}&am=${amount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;
}

export async function generateUpiQrCode(deeplink: string): Promise<string> {
  // Returns base64 PNG data URL
  const qrDataUrl = await QRCode.toDataURL(deeplink, { width: 150, margin: 1 });
  return qrDataUrl;
}
```

**Install:** `npm install qrcode @types/qrcode`

**Org Settings:** Settings → Payment → "UPI ID" field (validate format: `xxx@bank`)

**PDF integration:**
- Invoice PDF bottom-right: UPI QR code (150×150px)
- Above QR: "Scan to pay via UPI"
- Below QR: UPI ID text

#### E. Progressive Web App (PWA)

**`public/manifest.json`:**
```json
{
  "name": "Slipwise One",
  "short_name": "Slipwise",
  "description": "Document operations for Indian businesses",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "start_url": "/app/home",
  "display": "standalone",
  "theme_color": "#dc2626",
  "background_color": "#ffffff",
  "orientation": "portrait",
  "categories": ["business", "finance", "productivity"]
}
```

**Service Worker** (`public/sw.js`):
- Cache strategy: Cache-First for static assets (JS, CSS, images)
- Network-First for API calls (fall through to cache on failure)
- Offline fallback: serve `/offline` page when network unavailable
- Background sync: queue failed form submissions for retry on reconnect

**`next.config.ts`:** Add `next-pwa` plugin configuration.

**Add to Home Screen prompt:** Trigger after 3rd visit with a toast: "Install Slipwise on your phone for quick access" + "Install" button.

**Mobile UX optimizations:**
- All amount inputs: `inputMode="decimal"` for numeric keyboard
- Email inputs: `inputMode="email"` for email keyboard
- Touch targets: minimum 44×44px for all buttons
- Invoice list: swipe-right gesture = mark paid, swipe-left = more actions
- Pull-to-refresh on all list pages
- Bottom navigation bar on mobile (≤768px): Home, Documents, Create, Pay, Settings
- Camera integration: tap camera icon on OCR upload → use device camera
- Pinch-to-zoom on PDF preview

#### F. Push Notifications

**Install:** `npm install web-push`

**VAPID setup:** Generate VAPID key pair, store public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

**Database:**
```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String   @db.Uuid
  endpoint  String   @unique
  keys      Json     // { p256dh, auth }
  userAgent String?
  createdAt DateTime @default(now())

  user Profile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("push_subscription")
}
```

**Routes:**
- `POST /api/push/subscribe` — save subscription to DB
- `DELETE /api/push/unsubscribe` — remove subscription
- `POST /api/push/send` (internal) — send notification to user

**Notification triggers:**
| Event | Push content |
|---|---|
| Invoice paid (via payment link) | "✅ Invoice #{num} paid by {customer} — ₹{amount}" |
| Invoice overdue | "⚠️ Invoice #{num} overdue — {customer} owes ₹{amount}" |
| Trial ending in 3 days | "⏰ Your Pro trial ends in 3 days. Upgrade to keep access." |
| Team member joined | "👋 {name} joined your organization" |
| Unmatched payment received | "💸 ₹{amount} received — needs manual matching" |

---

### 4.4 Phase 13 Database Schema Additions

```prisma
// AI
model OcrJob              (Section 4.2A)

// Integrations
model OrgIntegration      (Section 4.3B)

// Mobile
model PushSubscription    (Section 4.3F)

// OrgDefaults additions:
upiVpa        String?  // UPI VPA e.g. "acmecorp@paytm"
gstNumber     String?  // GSTIN
gstStateCode  String?  // State code e.g. "27" for Maharashtra
panNumber     String?  // PAN for TDS compliance
```

---

### 4.5 Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AWS ap-south-1                             │
│                                                                     │
│  Route 53 ──► CloudFront ──► WAF ──► ALB                            │
│                    │                  │                             │
│                    │                  ├── ECS next-app (2-10 tasks) │
│                    │                  └── ECS worker (1 task)       │
│                    │                                                │
│                    └── S3                                           │
│                         ├── slipwise-assets  (CloudFront, public)  │
│                         ├── slipwise-private (signed URLs)         │
│                         └── slipwise-exports (24hr presigned)      │
│                                                                     │
│  RDS PostgreSQL 15 Multi-AZ (db.t4g.medium)                        │
│  ElastiCache Redis 7 (cache.t4g.small)                             │
│  ECR (Docker image registry)                                       │
│  Secrets Manager (all credentials)                                 │
│  CloudWatch (logs + metrics + 5 alarms)                            │
└─────────────────────────────────────────────────────────────────────┘
```

**CloudWatch Alarms:**
| Alarm | Threshold | Action |
|---|---|---|
| ECS CPU > 80% | 5 min | Scale out + SNS alert |
| RDS CPU > 80% | 5 min | SNS alert |
| HTTP 5xx rate > 1% | 1 min | SNS alert (P1) |
| RDS storage < 10GB | Any | SNS alert |
| ElastiCache memory > 80% | 5 min | SNS alert |

---

### 4.6 Phase 13 Edge Cases & Acceptance Criteria

#### AWS Migration

| Scenario | Expected Behavior |
|---|---|
| ECS task crashes mid-request | ALB routes to healthy task; ECS restarts automatically |
| RDS failover (Multi-AZ switchover) | Auto-failover ~60s; app retries with backoff |
| S3 upload timeout | Retry 3 times; fail with user-visible error on all retries |
| CloudFront cache stale after deploy | Cache invalidation triggered in CI/CD deploy step |
| Docker image fails health check | ECS rolls back to previous task definition |
| DB migration fails | Prisma migrate deploy is transactional; rolls back |
| ElastiCache unreachable | Rate limiting fails open; warning logged |
| ECS at max scale (10 tasks) | ALB queues; p99 latency alarm fires; manual intervention |

#### AI Features

| Scenario | Expected Behavior |
|---|---|
| OCR: no data extracted | "Could not read document. Please enter manually." |
| OCR: confidence < 40% | Show all fields empty with "Low confidence" warning |
| OCR: file >5MB | 413 "File too large. Maximum 5MB." |
| OCR: non-invoice document | "This doesn't appear to be an invoice. Fields may be inaccurate." |
| AI categorization API down | Skip suggestion; show plain category dropdown |
| HSN code not in lookup | Allow manual entry; show "Unrecognized HSN code" warning |
| GST calculation: missing state | Use "Other Territory" state; prompt to update billing address |
| GSTR-1: invoices missing GSTIN | Group in B2C; show count of invoices without GSTIN |
| Duplicate OCR submission | Deduplicate by SHA-256 of file content; return cached result |

#### Integrations

| Scenario | Expected Behavior |
|---|---|
| QuickBooks token expired during sync | Auto-refresh; if refresh fails → mark inactive + notify admin |
| QuickBooks API rate limit (500 req/min) | Queue sync; retry with backoff |
| Tally XML import error in Tally | Show error message; provide corrected XML download |
| UPI VPA not configured | Hide UPI QR on PDF; show "Add UPI ID in Settings" prompt to admin |
| QR code generation fails | Skip QR silently; PDF still generated |
| PWA install prompt dismissed | Don't show again for 7 days; track dismissal in localStorage |
| Push notification permission denied | Gracefully degrade; hide push notification settings |

---

### 4.7 Phase 13 Test Cases

#### AWS Tests

```
TC-13-01: Docker build
  Given: Main branch code
  When:  docker build -t slipwise-app .
  Then:  Build completes < 3 min; image size < 500MB

TC-13-02: Health check endpoint
  Given: Running ECS task
  When:  GET /api/health
  Then:  { status: "ok", db: "connected", cache: "connected" } in < 200ms

TC-13-03: Zero-downtime deployment
  Given: Active users with in-flight requests
  When:  ECS deployment triggered
  Then:  No 5xx errors during deployment; rolling update verified

TC-13-04: RDS connection pooling
  Given: 20 concurrent requests hitting DB
  When:  All execute simultaneously
  Then:  No "too many connections" error; all complete < 2s

TC-13-05: S3 signed URL expiry
  Given: Signed URL generated with 1hr expiry
  When:  Accessed after 61 minutes
  Then:  S3 returns 403 Forbidden

TC-13-06: Full CI/CD pipeline
  Given: Code pushed to main branch
  When:  GitHub Actions runs
  Then:  Lint + test + build + deploy all pass < 10 min total
         Slack notification: "Deployed slipwise-app sha:{commit}"
```

#### AI Tests

```
TC-13-07: OCR extraction (clear invoice)
  Given: High-quality invoice image with vendor, amount, date visible
  When:  POST /api/ai/extract-document
  Then:  vendorName extracted (confidence > 0.8)
         amount extracted correctly
         date returned in ISO format

TC-13-08: OCR file size rejection
  Given: 6MB image file
  When:  POST /api/ai/extract-document
  Then:  Returns 413 { error: "File too large. Maximum 5MB." }

TC-13-09: GST intra-state calculation
  Given: Org in Maharashtra (27), Customer in Maharashtra (27)
         HSN 9983 (IT services, 18%), amount ₹10,000
  When:  calculateGST({ hsnCode: "9983", amount: 10000, fromState: "27", toState: "27" })
  Then:  { cgst: 900, sgst: 900, igst: 0, totalGst: 1800, totalAmount: 11800 }

TC-13-10: GST inter-state calculation
  Given: Org in Maharashtra (27), Customer in Karnataka (29)
  When:  calculateGST({ hsnCode: "9983", amount: 10000, fromState: "27", toState: "29" })
  Then:  { cgst: 0, sgst: 0, igst: 1800, totalGst: 1800, totalAmount: 11800 }

TC-13-11: GSTR-1 generation
  Given: 10 B2B + 5 B2C invoices in March 2026 with correct GST data
  When:  GET /api/export/gstr1?period=2026-03
  Then:  Valid GSTR-1 JSON with b2b and b2cs sections
         All tax amounts sum correctly
         Content-Disposition: attachment; filename="GSTR1_2026-03.json"
```

#### Integration Tests

```
TC-13-12: Tally XML export
  Given: 3 invoices selected
  When:  POST /api/export/tally { type: "invoice", ids: [...] }
  Then:  Returns Content-Type: application/xml
         XML contains 3 VOUCHER elements
         All GST ledger entries present

TC-13-13: UPI link generation
  Given: Org with VPA "acme@paytm", invoice ₹5,000
  When:  generateUpiDeeplink({ vpa: "acme@paytm", amount: 5000, ... })
  Then:  Returns "upi://pay?pa=acme@paytm&am=5000&cu=INR..."
         QR code base64 PNG returned

TC-13-14: PWA manifest
  Given: App deployed
  When:  GET /manifest.json
  Then:  Returns valid PWA manifest with all required fields
         theme_color = "#dc2626"
         start_url = "/app/home"

TC-13-15: Push notification subscription
  Given: Browser push permission granted
  When:  POST /api/push/subscribe { endpoint, keys }
  Then:  PushSubscription created in DB; returns 200

TC-13-16: Offline fallback
  Given: Service worker installed, device offline
  When:  User navigates to /app/home
  Then:  Offline fallback page shown (no blank white screen)
         Cached data visible with "Offline" indicator
```

---

## 5. Shared Technical Standards

### Code Conventions
- **TypeScript strict mode** throughout
- **Server-only modules:** All `src/lib/` utilities touching DB → `import "server-only"` at top
- **Prisma 7 import:** `import { PrismaClient } from "@/generated/prisma/client"`
- **Prisma 7 nullable JSON:** `Prisma.DbNull` for null, cast `as Prisma.InputJsonValue`
- **RBAC:** Every protected action → `requirePermission(orgId, userId, module, action)`
- **ActionResult<T> pattern** — defined per-file:
```typescript
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
```
- **Audit logging:** All deletes, role changes, exports → `logAudit()`
- **Usage metering:** All document creates → `incrementUsage()`
- **Plan check:** All features → `checkFeature()` or `requirePlan()`

### Security Standards
- No secrets in code — all via environment variables
- API keys: SHA-256 hashed, never stored plaintext
- Webhook secrets: SHA-256 hashed
- SSRF protection on all user-provided URLs
- File uploads: server-side MIME validation + max size
- Rate limiting on all public endpoints
- Content Security Policy headers

### Database Standards
- All models: `createdAt DateTime @default(now())`
- Soft delete: `deletedAt DateTime?` — never hard-delete user data
- Foreign keys: `onDelete: Cascade` unless explicitly noted
- Index: all FK columns + frequently filtered fields

---

## 6. Non-Functional Requirements

| Metric | Target |
|---|---|
| Time to first byte | < 200ms (p95) |
| PDF generation | < 5s per document |
| API response (reads) | < 500ms (p95) |
| API response (writes) | < 1s (p95) |
| OCR processing | < 30s per document |
| Webhook delivery | < 5s from event |
| DB query time | < 100ms (p95) |
| App uptime (ECS) | 99.9% |
| Database uptime (RDS Multi-AZ) | 99.95% |
| Storage uptime (S3) | 99.99% |
| Data residency | ap-south-1 (Mumbai) exclusively |
| Encryption at rest | AWS KMS (RDS), SSE-S3 (S3) |
| Encryption in transit | TLS 1.3 minimum |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Razorpay Payment Link API downtime | Low | High | Show fallback: "Pay via bank transfer to account {VA}" |
| AWS migration data loss | Low | Critical | Full pg_dump; 24hr parallel run; tested rollback plan |
| Smart Collect mismatched payment | Medium | Medium | UnmatchedPayment model + manual match UI for admins |
| Tally XML format changes across Tally versions | Low | Medium | Version-specific templates; user selects Tally version |
| QuickBooks API quota (500 req/min) | Medium | Medium | Queue sync jobs; rate-limit with backoff |
| OpenAI API cost overrun on OCR | Medium | High | Per-org monthly limit; per-plan quotas; cost alerts |
| SAML assertion spoofing | Low | Critical | Always verify sig; validate timestamp (< 5 min); enforce HTTPS |
| API key DB exposure | Very Low | Critical | SHA-256 hash only; never log raw keys |
| ECS task memory leak | Low | Medium | Memory limit per task; CloudWatch alarm; auto-restart |
| GSTR-1 schema changes (govt updates) | Medium | Medium | Versioned report templates; announcements monitored |
| OCR poor accuracy for handwritten docs | High | Low | Confidence threshold; always allow manual override |
| Multi-org data isolation bug | Low | Critical | orgId filter on EVERY query; row-level access checks |

---

## 8. QA & Acceptance Gates

### Phase 12 Acceptance Gates

1. ✅ `npx tsc --noEmit` — zero TypeScript errors
2. ✅ `npx eslint src/` — zero ESLint errors
3. ✅ Razorpay payment link: end-to-end test (create link → simulate webhook → invoice paid)
4. ✅ Smart Collect: virtual account created via Razorpay test mode
5. ✅ Subscription pause/resume: tested in Razorpay test mode
6. ✅ API: all 22+ endpoints return correct responses
7. ✅ API key: create → use → revoke → verify blocked
8. ✅ Outbound webhook: delivery tested with Webhook.site
9. ✅ SSO: tested with Okta developer account
10. ✅ Multi-org: user creates 2 orgs, switches, data isolated correctly
11. ✅ White-label: PDF export has no Slipwise branding when enabled
12. ✅ All TC-12-01 through TC-12-16 pass

### Phase 13 Acceptance Gates

1. ✅ Docker image builds in < 3 min, health check returns 200
2. ✅ ECS deployment: zero-downtime verified (no 5xx during deploy)
3. ✅ RDS: migration verified, row counts match
4. ✅ S3: all existing files accessible via new adapter
5. ✅ CI/CD: full pipeline runs end-to-end in < 10 min
6. ✅ OCR: extracts from 5 sample invoice images with > 70% confidence
7. ✅ GST calculator: intra-state and inter-state calculations verified
8. ✅ GSTR-1: JSON validates against government schema
9. ✅ Tally XML: import test passes in Tally Prime demo
10. ✅ PWA: installable on Android Chrome + iOS Safari
11. ✅ Push notifications: received on Chrome + Firefox
12. ✅ All TC-13-01 through TC-13-16 pass

---

## 9. Multi-Agent Execution Strategy

### Phase 12 Agent Split

```
Sprint 12.1 (FIRST — payment features needed by API):
  └── Agent 12-A: Razorpay expansion
      - Payment Links API route + webhook handler + UI
      - Smart Collect (Virtual Accounts) API + UI
      - Subscription pause/resume (SDK + API routes + UI)
      - Plan change (upgrade/downgrade) enhanced flow
      - International card UI updates + exchange rates endpoint
      - BillingInvoice model + billing history UI
      - DB schema: CustomerVirtualAccount, UnmatchedPayment, BillingInvoice

Sprint 12.2 + 12.3 (PARALLEL — after 12-A):
  ├── Agent 12-B: Public REST API
  │   - ApiKey, ApiWebhookEndpoint, ApiWebhookDelivery, ApiRequestLog models
  │   - /api/v1/* all endpoints (invoices, vouchers, slips, customers, employees, vendors, reports)
  │   - API key management UI at /app/settings/api
  │   - OpenAPI spec route
  │
  ├── Agent 12-C: Outbound Webhooks + Developer Portal
  │   - Webhook endpoint CRUD + delivery engine + retry
  │   - SSRF protection
  │   - Webhook management UI at /app/settings/webhooks
  │   - Developer portal marketing page
  │
  └── Agent 12-D: Enterprise Features
      - SSO/SAML (SsoConfig model + /api/auth/sso/* routes + settings UI)
      - Multi-org switcher (UserOrgPreference model + /api/org/switch + header UI)
      - Custom domain (OrgDomain model + settings UI)
      - White-label (OrgWhiteLabel model + PDF check + settings UI)
      - Org email domain auto-provisioning

Final:
  └── Agent 12-E: Verification (tsc, eslint, all test cases)
```

### Phase 13 Agent Split

```
Sprint 13.1 (FIRST — infra needed by everything):
  ├── Agent 13-A: AWS CDK + Docker + CI/CD
  │   - infra/ directory with all 9 CDK stacks
  │   - Dockerfile + next.config.ts output:standalone
  │   - .github/workflows/deploy.yml
  │   - /api/health endpoint
  │
  └── Agent 13-B: S3 + Redis + Sentry + PostHog
      - Complete S3StorageAdapter implementation
      - ioredis support in rate-limit.ts
      - Full Sentry setup (sentry.*.config.ts)
      - PostHog integration (PostHogProvider + key events)

Sprint 13.2 + 13.3 (PARALLEL — after 13.1):
  ├── Agent 13-C: AI Features
  │   - /api/ai/extract-document (OCR via Textract)
  │   - OcrJob model + src/lib/gst-calculator.ts
  │   - src/data/hsn-gst-rates.json
  │   - /api/export/gstr1
  │   - /api/ai/salary-insights
  │   - Late payment predictor
  │   - AI expense categorization with Redis cache
  │
  ├── Agent 13-D: Third-Party Integrations
  │   - src/lib/integrations/tally.ts + /api/export/tally
  │   - QuickBooks OAuth + sync routes
  │   - Zoho Books OAuth + sync routes
  │   - OrgIntegration model
  │   - /app/settings/integrations page
  │   - UPI link + QR (src/lib/upi-link.ts + PDF integration)
  │
  └── Agent 13-E: Mobile PWA
      - public/manifest.json + icons
      - public/sw.js (service worker)
      - Push notifications (web-push + /api/push/* routes)
      - PushSubscription model
      - Mobile UX: bottom nav, touch targets, swipe gestures
      - PWA install prompt component
      - Offline fallback page

Final:
  └── Agent 13-F: Verification (tsc, eslint, Docker build, smoke tests)
```

### Agent Context Requirements

Every agent MUST:
1. Read `prisma/schema.prisma` before DB changes
2. Read `src/lib/` listing to avoid recreating existing utilities
3. Use `import "server-only"` on all server-only modules
4. Use `ActionResult<T>` pattern (per-file)
5. Enforce RBAC with `requirePermission()`
6. Call `incrementUsage()` on document creation
7. Call `checkFeature()` or `requirePlan()` on gated features
8. Run `npx tsc --noEmit` after each batch — fix all errors
9. Never store secrets in code
10. Never hard-delete user data (soft delete with `deletedAt`)

---

## Appendix A — Environment Variables

### Phase 12 New Variables

```bash
# Razorpay (existing + new for Phase 12)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx          # Already set Phase 11
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx   # Already set Phase 11
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx       # Already set Phase 11

# Razorpay Plan IDs (already set Phase 11):
RAZORPAY_STARTER_MONTHLY_PLAN_ID=plan_xxxx
RAZORPAY_STARTER_ANNUAL_PLAN_ID=plan_xxxx
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_xxxx
RAZORPAY_PRO_ANNUAL_PLAN_ID=plan_xxxx
RAZORPAY_ENTERPRISE_MONTHLY_PLAN_ID=plan_xxxx

# Exchange rates (for display only)
EXCHANGE_RATE_API_KEY=xxxx                     # exchangerate-api.com free tier

# API Platform
API_WEBHOOK_SIGNING_SECRET=xxxx               # HMAC secret for outbound webhook signing

# Enterprise SSO
SAML_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
SAML_CERTIFICATE=-----BEGIN CERTIFICATE-----...

# Feature flags
FEATURE_PAYMENT_LINKS_ENABLED=true
FEATURE_SMART_COLLECT_ENABLED=true
FEATURE_API_PLATFORM_ENABLED=true
FEATURE_SSO_ENABLED=true
FEATURE_MULTI_ORG_ENABLED=true
```

### Phase 13 New Variables

```bash
# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
AWS_S3_BUCKET_ASSETS=slipwise-assets
AWS_S3_BUCKET_PRIVATE=slipwise-private
AWS_S3_BUCKET_EXPORTS=slipwise-exports
CLOUDFRONT_URL=xxxx.cloudfront.net

# Redis (ElastiCache — replaces Upstash in prod)
REDIS_URL=redis://slipwise.cache.amazonaws.com:6379
REDIS_AUTH_TOKEN=xxxx

# AI
OPENAI_API_KEY=sk-xxxxxxxxxxxx
AWS_TEXTRACT_REGION=ap-south-1

# Integrations
QUICKBOOKS_CLIENT_ID=xxxx
QUICKBOOKS_CLIENT_SECRET=xxxx
QUICKBOOKS_ENVIRONMENT=production
ZOHO_CLIENT_ID=xxxx
ZOHO_CLIENT_SECRET=xxxx

# Push Notifications
VAPID_PUBLIC_KEY=xxxx
VAPID_PRIVATE_KEY=xxxx
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxx
VAPID_SUBJECT=mailto:support@slipwise.app

# Sentry (full integration)
SENTRY_DSN=https://xxxx@sentry.io/xxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_AUTH_TOKEN=xxxx

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Appendix B — API Contract Reference

### Endpoint Summary

| Method | Path | Scope | Plan |
|---|---|---|---|
| GET | /api/v1/invoices | read:invoices | Pro+ |
| POST | /api/v1/invoices | write:invoices | Pro+ |
| GET | /api/v1/invoices/:id | read:invoices | Pro+ |
| PATCH | /api/v1/invoices/:id | write:invoices | Pro+ |
| DELETE | /api/v1/invoices/:id | delete:invoices | Pro+ |
| POST | /api/v1/invoices/:id/send | write:invoices | Pro+ |
| POST | /api/v1/invoices/:id/mark-paid | write:invoices | Pro+ |
| POST | /api/v1/invoices/:id/payment-link | write:invoices | Pro+ |
| GET | /api/v1/invoices/:id/pdf | read:invoices | Pro+ |
| GET | /api/v1/vouchers | read:vouchers | Pro+ |
| POST | /api/v1/vouchers | write:vouchers | Pro+ |
| GET | /api/v1/salary-slips | read:salary_slips | Pro+ |
| POST | /api/v1/salary-slips | write:salary_slips | Pro+ |
| GET | /api/v1/salary-slips/:id/pdf | read:salary_slips | Pro+ |
| GET | /api/v1/customers | read:customers | Pro+ |
| POST | /api/v1/customers | write:customers | Pro+ |
| GET | /api/v1/employees | read:employees | Pro+ |
| POST | /api/v1/employees | write:employees | Pro+ |
| GET | /api/v1/vendors | read:vendors | Pro+ |
| POST | /api/v1/vendors | write:vendors | Pro+ |
| GET | /api/v1/reports/summary | read:reports | Pro+ |
| GET | /api/v1/reports/outstanding | read:reports | Pro+ |
| GET | /api/v1/openapi.json | none | Public |

### Rate Limits

| Plan | Requests/Month | Requests/Minute |
|---|---|---|
| Free | ❌ No access | — |
| Starter | ❌ No access | — |
| Pro | 10,000 | 100 |
| Enterprise | Unlimited | 1,000 |

---

## Appendix C — Razorpay Advanced Features Reference

### Payment Link States
| State | Meaning |
|---|---|
| `created` | Link created, not yet paid |
| `paid` | Customer paid successfully |
| `partially_paid` | Partial payment received |
| `expired` | Expired without payment |
| `cancelled` | Manually cancelled |

### Subscription States (Razorpay)
| State | Meaning |
|---|---|
| `created` | Subscription created |
| `authenticated` | UPI mandate / card auth done |
| `active` | Recurring payments running |
| `paused` | Billing paused |
| `halted` | Max retries exceeded |
| `cancelled` | User cancelled |
| `completed` | All cycles done |
| `expired` | Never authenticated |

### Virtual Account States
| State | Meaning |
|---|---|
| `active` | Accepting payments |
| `paid` | Fixed-amount VA fully paid |
| `closed` | Manually closed |

### Key Razorpay API Calls (Phase 12)

```javascript
// Payment Link
razorpay.paymentLink.create({
  amount: 118000, currency: "INR",
  description: "Invoice #INV-2026-0042",
  reference_id: invoiceId,
  customer: { name, email, contact },
  expire_by: unixTimestamp,
  notify: { sms: true, email: true }
})

// Virtual Account
razorpay.virtualAccount.create({
  receivers: { types: ["bank_account"] },
  description: "Slipwise - Acme Corp",
  customer_id: razorpayCustomerId
})

// Pause Subscription
razorpay.subscriptions.update(subId, {
  pause_collection: { behavior: "void", resumes_at: unixTimestamp }
})

// Resume Subscription
razorpay.subscriptions.resume(subId)

// Change Plan
razorpay.subscriptions.update(subId, {
  plan_id: newPlanId,
  replace_immediately: 1  // or 0 for at period end
})

// Verify webhook
Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret)
```

---

## Appendix D — AWS Architecture Diagram

```
                        Users (India + Global)
                               │
                    ┌──────────▼──────────┐
                    │    Route 53 DNS      │
                    │  app.slipwise.com   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  CloudFront CDN     │◄── WAF (OWASP rules)
                    │  ap-south-1 edges   │
                    └──────┬──────┬───────┘
                           │      │
                   Static  │      │ Dynamic
                   Assets  │      │ Requests
                           │      │
                    ┌──────▼──┐  ┌▼──────────────────────────┐
                    │   S3    │  │  Application Load Balancer │
                    │ Assets  │  │       (ALB, Multi-AZ)      │
                    └─────────┘  └────────────┬───────────────┘
                                              │
                       ┌──────────────────────▼──────────────────────┐
                       │           ECS Fargate Cluster                │
                       │         (ap-south-1a + 1b + 1c)             │
                       │                                              │
                       │  ┌──────────────────────────────────────┐   │
                       │  │  next-app service                    │   │
                       │  │  ├─ Task A (t3.small, 512MB mem)     │   │
                       │  │  ├─ Task B (t3.small, 512MB mem)     │   │
                       │  │  └─ Task C... (auto-scaled, max 10)  │   │
                       │  └──────────────────────────────────────┘   │
                       │                                              │
                       │  ┌──────────────────────────────────────┐   │
                       │  │  worker service                      │   │
                       │  │  └─ Task (t3.small) — background jobs│   │
                       │  └──────────────────────────────────────┘   │
                       └───────────────┬──────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────────┐
                    │                  │                       │
         ┌──────────▼──────┐  ┌────────▼───────┐  ┌──────────▼──────┐
         │  RDS PostgreSQL │  │  ElastiCache   │  │       S3        │
         │  15 Multi-AZ    │  │  Redis 7       │  │  Private Bucket │
         │  db.t4g.medium  │  │  cache.t4g.sm  │  │  (signed URLs)  │
         └─────────────────┘  └────────────────┘  └─────────────────┘

         ┌─────────────────────────────────────────────────────────┐
         │                 Supporting Services                     │
         │  Secrets Manager  │  CloudWatch  │  ECR  │  IAM Roles  │
         │  SNS (Alerts)     │  WAF         │  SSM  │  ACM (SSL)  │
         └─────────────────────────────────────────────────────────┘
```

---

*End of Phase 12 & 13 PRD — Slipwise One*
*Version 1.0 | 2026-04-06 | Razorpay-Only — India-First + Global Scale*
*Prepared by: Copilot Engineering Assistant | Parent Company: Zenxvio*
