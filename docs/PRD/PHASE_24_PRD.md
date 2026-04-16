# Phase 24: SW> Pay — Payment Gateway, Intelligent Collections & Reconciliation OS

**Document Version:** 1.0  
**Date:** April 2026  
**Phase Sequence:** Phase 24 (follows Phase 23: SW Pixel & Commercial Readiness)  
**Branch:** `feature/phase-24` (from `master` after Phase 23 merge)  
**Sprint Sub-branches:** `feature/phase-24-sprint-24-1` through `feature/phase-24-sprint-24-5`  
**All PRs target:** `feature/phase-24` (never `master` directly)

---

## 1. Phase Overview

Phase 24 activates the **SW> Pay payment gateway loop** — the most commercially significant missing piece in the Slipwise One product suite. The schema foundation was laid in earlier phases (Razorpay fields on `Invoice`, `RazorpayEvent`, `CustomerVirtualAccount`, `PaymentArrangement`, `PaymentInstallment`, `BankStatementImport`, `BankTransaction`, `BankTransactionMatch`, `UnmatchedPayment`). **None of these are wired to a live gateway or an intelligent processing engine.**

Phase 24 connects these models to real Razorpay APIs, builds the customer payment experience, activates virtual account-based auto-collection, completes the intelligent bank reconciliation engine, and delivers collections intelligence dashboards — completing the payment operations loop from invoice creation through to confirmed cash reconciliation.

This phase does **not** build a new payment gateway from scratch. It activates, wires, and makes production-ready the gateway scaffolding that already exists in the data model.

---

## 2. Strategic Context (Master Plan Alignment)

The Slipwise One Master PRD v1.1 defines SW> Pay as:

> *"The payment and receivables operations suite. It is not a payment gateway in early phases. It is a payment operations layer."*

Phase 24 crosses this boundary deliberately and intentionally. After 23 phases of building the document creation, workflow, portal, and pixel suite, the product now has:
- A stable auth and org model
- Persistent invoice, voucher, and salary slip records
- A customer portal with tokenized access
- A usage metering and plan gate system
- An intel and insights engine

The correct next step, per the Master PRD, is to close the **money loop**: invoice → customer receives → customer pays → business confirms → books reconciled. This is the commercial revenue unlock.

**Phase 24 delivers:**
- Customers paying invoices via Razorpay (UPI, cards, net banking, wallets)
- Virtual accounts per customer for auto-credit collection
- Intelligent bank statement reconciliation with AI-assisted matching
- Collections intelligence: aging buckets, at-risk customer detection, payment recovery signals
- Enterprise security for payment flows: 2FA enforcement, SSO configuration UI, high-value payment approvals

---

## 3. Phase Baseline — What Already Exists

### 3.1 Schema Models (built, not yet wired)

| Model | Status | Location |
|-------|--------|----------|
| `Invoice.razorpayPaymentLinkId` | Field exists, not populated | `prisma/schema.prisma` |
| `Invoice.razorpayPaymentLinkUrl` | Field exists, not populated | `prisma/schema.prisma` |
| `Invoice.paymentLinkStatus` | Field exists, not populated | `prisma/schema.prisma` |
| `Invoice.paymentLinkExpiresAt` | Field exists, not populated | `prisma/schema.prisma` |
| `Invoice.amountPaid` | Field exists, manually updated | `prisma/schema.prisma` |
| `Invoice.remainingAmount` | Field exists, manually updated | `prisma/schema.prisma` |
| `RazorpayEvent` | Schema only — no webhook handler | `prisma/schema.prisma` |
| `CustomerVirtualAccount` | Schema only — no Razorpay API calls | `prisma/schema.prisma` |
| `UnmatchedPayment` | Schema only — no processing queue | `prisma/schema.prisma` |
| `PaymentArrangement` | Schema + full CRUD UI | `/app/pay/arrangements` |
| `PaymentInstallment` | Schema + linked to arrangement | `prisma/schema.prisma` |
| `BankStatementImport` | Schema + books import UI | `/app/books/reconciliation/imports` |
| `BankTransaction` | Schema + basic books listing | `/app/books/banks` |
| `BankTransactionMatch` | Schema only — no match engine | `prisma/schema.prisma` |
| `OrgIntegration` | Schema + settings page (stubs) | `/app/settings/integrations` |

### 3.2 Pages Already Built

| Route | State |
|-------|-------|
| `/app/pay/arrangements` | Full CRUD — list, create, view installments |
| `/app/pay/receivables` | Built — invoice receivables dashboard |
| `/app/pay/proofs` | Built — proof upload review queue |
| `/app/pay/dunning` | Built — dunning sequence management |
| `/app/books/banks` | Built — bank account management |
| `/app/books/reconciliation` | Built — basic reconciliation UI |
| `/app/settings/integrations` | Built — stub client page |
| `/app/settings/security` | Built — password change only |
| `POST /api/cron/reminders` | Built — dunning reminders |

### 3.3 What Is NOT Built (Phase 24 Must Build)

- Razorpay webhook receiver (`/api/webhooks/razorpay`)
- Gateway org configuration (API key/secret storage per org)
- Payment link generation from invoice
- Razorpay Checkout embedded on the public invoice page
- Auto-invoice state transition on confirmed payment
- Virtual account creation via Razorpay API
- Unmatched payment queue processing
- Auto-match engine: bank transactions → invoices
- Confidence-scored match suggestions UI
- Collections intelligence: aging analysis, at-risk customers
- SSO configuration UI (`/app/settings/sso`)
- 2FA setup flow (`/app/settings/security` enhancement)
- High-value payment approval gate

---

## 4. Sprint Breakdown

### Sprint 24.1 — Razorpay Gateway Foundation
### Sprint 24.2 — Customer Payment Experience
### Sprint 24.3 — Virtual Accounts & Auto-Collections
### Sprint 24.4 — Intelligent Bank Reconciliation Engine
### Sprint 24.5 — Collections Intelligence & Enterprise Hardening

---

## 5. Sprint 24.1: Razorpay Gateway Foundation

### Objective

Wire Razorpay to the org layer. Store gateway credentials securely, create payment orders and links for invoices, and receive + process Razorpay webhook events reliably.

### 5.1 Gateway Configuration per Org

**Route:** `GET /app/settings/integrations/razorpay`  
**Route:** `POST /app/settings/integrations/razorpay` (save config)

Each organization that wants to accept gateway payments must configure their own Razorpay account. This is a **per-org configuration** — Slipwise is the platform, each org's Razorpay account processes their payments.

**Config fields:**
- `razorpayKeyId` — Razorpay API Key ID (non-secret, safe to display masked)
- `razorpayKeySecret` — Razorpay Secret (encrypted at rest using AES-256, never returned to client)
- `razorpayMode` — `"test"` or `"live"`
- `webhookSecret` — Razorpay webhook secret for signature verification
- `autoReconcile` — Boolean: automatically create `InvoicePayment` on webhook confirmation
- `defaultCurrency` — Default: `"INR"`

**Storage:** Extend `OrgIntegration` model with `provider = "razorpay"`, secrets stored in `accessToken` (encrypted), config in `config` JSON field. Use a server-side encryption key from environment variable `RAZORPAY_ENCRYPTION_KEY`.

**Prisma — no migration needed.** `OrgIntegration` with `@@unique([orgId, provider])` already covers this.

**Server Actions (`src/app/app/settings/integrations/razorpay/actions.ts`):**
```typescript
saveRazorpayConfig(orgId, config): ActionResult<void>
getRazorpayConfig(orgId): ActionResult<RazorpayConfigPublic>   // returns masked secret
deleteRazorpayConfig(orgId): ActionResult<void>
testRazorpayConnection(orgId): ActionResult<{ mode: string; accountName: string }>
```

**Authorization:** `requireRole('admin')` — only org admins can configure gateway credentials.

### 5.2 Payment Link Generation

**Server Action:** `createPaymentLink(invoiceId): ActionResult<{ url: string; linkId: string }>`

**File:** `src/app/app/docs/invoices/payment-link-actions.ts`

**Logic:**
1. `requireRole('admin')` or `requireRole('finance_manager')`
2. Load invoice; verify `invoice.organizationId === orgId`
3. Load org Razorpay config from `OrgIntegration` (decrypt secret server-side)
4. Validate invoice status is `ISSUED`, `DUE`, `OVERDUE`, or `PARTIALLY_PAID` — reject `DRAFT`, `PAID`, `CANCELLED`
5. If `invoice.razorpayPaymentLinkId` already exists and `paymentLinkStatus === "active"`, return existing URL (idempotent)
6. Call Razorpay `POST /v1/payment_links` with:
   - `amount`: `Math.round(invoice.remainingAmount * 100)` (paise)
   - `currency`: `"INR"`
   - `description`: `"Payment for Invoice ${invoice.invoiceNumber}"`
   - `customer.name`, `customer.email`, `customer.contact` from linked Customer
   - `notify.email: true`, `notify.sms: false` (respect privacy)
   - `reminder_enable: true`
   - `callback_url`: `${NEXT_PUBLIC_APP_URL}/api/webhooks/razorpay/payment-link-callback`
   - `callback_method`: `"get"`
   - `expire_by`: Unix timestamp 30 days from now
   - `reference_id`: `invoice.id` (for correlation)
7. On success: update `invoice.razorpayPaymentLinkId`, `razorpayPaymentLinkUrl`, `paymentLinkExpiresAt`, `paymentLinkStatus = "active"`, `paymentLinkLastEventAt = now()`
8. Log `InvoiceStateEvent` with `reason = "payment_link_created"`
9. Return `{ url, linkId }`

**Cancel Payment Link:**
`cancelPaymentLink(invoiceId): ActionResult<void>` — calls Razorpay `PATCH /v1/payment_links/:id` with `status: "cancelled"`, updates `paymentLinkStatus = "cancelled"`.

### 5.3 Razorpay Webhook Handler

**Route:** `POST /api/webhooks/razorpay`  
**File:** `src/app/api/webhooks/razorpay/route.ts`

This is the most security-critical route in Phase 24. Every incoming webhook must be signature-verified before any business logic executes.

**Signature verification:**
```typescript
import crypto from "crypto";

function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig, "hex"),
    Buffer.from(signature, "hex")
  );
}
```

**Critical:** Read raw body as `text()` before parsing as JSON. The `X-Razorpay-Signature` header must be verified against the raw body string, not the parsed JSON.

**Webhook must also identify which org's webhook secret to use.** The Razorpay `account_id` field in the payload identifies the Razorpay account. Use this to look up the `OrgIntegration` record by `config.razorpayAccountId`. If not found, return `200 OK` immediately (may be from a different env or tenant).

**Event types to handle:**

| Event | Action |
|-------|--------|
| `payment_link.paid` | Mark invoice PAID, create InvoicePayment, fire RecordUsageEvent |
| `payment_link.partially_paid` | Mark invoice PARTIALLY_PAID, create InvoicePayment for amount |
| `payment_link.cancelled` | Update `paymentLinkStatus = "cancelled"`, log state event |
| `payment_link.expired` | Update `paymentLinkStatus = "expired"` |
| `virtual_account.credited` | Create UnmatchedPayment record, trigger match engine |
| `payment.captured` | Log to RazorpayEvent; correlate with payment_link events |
| `payment.failed` | Log to RazorpayEvent; update invoice `paymentLinkLastEventAt` |
| `refund.created` | Log to RazorpayEvent for future reconciliation |

**Idempotency:** Before processing any event, check `RazorpayEvent` table for existing `id`. If found, return `200 OK` immediately without re-processing. The `RazorpayEvent.id` is the Razorpay event ID from the payload.

**Processing pattern:**
```typescript
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  // 1. Parse JSON
  const event = JSON.parse(rawBody);

  // 2. Find org by Razorpay account_id
  const orgIntegration = await findOrgByRazorpayAccount(event.account_id);
  if (!orgIntegration) return new Response("OK", { status: 200 });

  // 3. Verify signature
  const secret = decrypt(orgIntegration.config.webhookSecret);
  if (!verifyRazorpaySignature(rawBody, signature, secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  // 4. Idempotency check
  const exists = await db.razorpayEvent.findUnique({ where: { id: event.id } });
  if (exists) return new Response("OK", { status: 200 });

  // 5. Store event
  await db.razorpayEvent.create({
    data: { id: event.id, type: event.event, payload: event },
  });

  // 6. Dispatch to handler
  await handleRazorpayEvent(event, orgIntegration.orgId);

  return new Response("OK", { status: 200 });
}
```

**Handler dispatch lives in:** `src/lib/razorpay/event-handlers.ts`

**Rate limiting:** Apply Upstash Redis rate limiting at the webhook route level: 100 events/min per IP. Legitimate Razorpay IPs will be well within this. Add `Retry-After: 60` on 429.

### 5.4 Invoice Payment Auto-Processing

**File:** `src/lib/razorpay/event-handlers.ts`

On `payment_link.paid` event:

1. Extract `reference_id` (= `invoice.id`) from `event.payload.payment_link.entity`
2. Load invoice; verify it belongs to the org from webhook context
3. Call `createPaymentFromGateway(invoiceId, orgId, paymentData)`:
   - Creates `InvoicePayment` with `source = "razorpay_gateway"`, `status = "SETTLED"`, `externalPaymentId = payment.id`, `externalPayload = event.payload`
   - Updates `invoice.amountPaid`, `invoice.remainingAmount`, `invoice.lastPaymentAt`, `invoice.lastPaymentMethod`
   - If `remainingAmount <= 0`: transition invoice to `PAID`, set `invoice.paidAt = now()`
   - If `remainingAmount > 0`: transition invoice to `PARTIALLY_PAID`
   - Logs `InvoiceStateEvent` with `actorName = "razorpay_webhook"`, `reason = "gateway_payment_confirmed"`
4. Fire `recordUsageEvent(orgId, "INVOICE_PAYMENT_RECEIVED")` (new resource type — see §11)
5. Send payment confirmation email to customer via Resend (non-blocking)
6. Enqueue dunning pause: if invoice just moved to PAID, cancel any active dunning steps for this invoice

### 5.5 New Dependencies

```json
{
  "razorpay": "^2.9.x"
}
```

**Server-side only.** Never import `razorpay` in client components.

### 5.6 New Environment Variables (Sprint 24.1)

| Variable | Description |
|----------|-------------|
| `RAZORPAY_ENCRYPTION_KEY` | 32-byte hex key for AES-256 encryption of org Razorpay secrets at rest |
| `RAZORPAY_WEBHOOK_TOLERANCE_SECONDS` | Max age for webhook events (default: 300) |

### 5.7 Tests (Sprint 24.1)

File: `src/app/api/webhooks/razorpay/__tests__/route.test.ts`

- Webhook with invalid signature returns 400
- Webhook with valid signature but unknown account returns 200 (silent skip)
- Duplicate event ID is accepted (200) without re-processing
- `payment_link.paid` event creates InvoicePayment and transitions invoice to PAID
- `payment_link.partially_paid` event transitions invoice to PARTIALLY_PAID
- `virtual_account.credited` event creates UnmatchedPayment record
- `createPaymentLink` rejects DRAFT invoice with descriptive error
- `createPaymentLink` returns existing URL if link already active (idempotent)

---

## 6. Sprint 24.2: Customer Payment Experience

### Objective

Build the embedded payment experience on the public invoice page. Customers who receive a Razorpay payment link (or open a tokenized portal invoice) can pay directly in-browser via Razorpay Checkout without leaving the Slipwise-branded page.

### 6.1 Enhanced Public Invoice Payment Page

**Route:** `/pay/invoice/[token]` (existing, extended)

The current public invoice view shows invoice details and allows proof upload. Sprint 24.2 upgrades it to also show the **Razorpay Checkout button** if the org has an active payment link for the invoice.

**Page behavior:**
- If `invoice.razorpayPaymentLinkUrl` is set and `paymentLinkStatus === "active"`: show "Pay Now" button
- "Pay Now" opens Razorpay Checkout in a modal (client-side via Razorpay `checkout.js`)
- On payment success callback: display success screen, email receipt sent by webhook (already handled in 24.1)
- If payment link is expired or cancelled: show "Contact vendor to request a new payment link"
- The proof upload path (manual upload) remains fully available as a fallback

**Razorpay Checkout integration:**
```tsx
// Client component: src/app/pay/invoice/[token]/pay-button.tsx
"use client";
// Dynamically load Razorpay checkout.js
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  document.body.appendChild(script);
}, []);
```

**Data flow for payment page:**
- Page fetches `invoice.razorpayPaymentLinkUrl` server-side
- Passes `paymentLinkUrl` to client component
- Client opens the Razorpay-hosted payment link in the Checkout modal or redirects to the Razorpay-hosted page
- **Do not pass API keys to the client.** The checkout uses the payment link URL, not a direct Razorpay key.

### 6.2 Invoice Detail Page — Gateway Payment Panel

**Route:** `/app/docs/invoices/[id]` (existing, extended)

Add a **"Payment Gateway"** panel to the invoice detail page (admin-facing):

```
┌─────────────────────────────────┐
│  Payment Link                   │
│  Status: Active ●               │
│  Link: rzp.io/l/abc123 [Copy]  │
│  Expires: May 16, 2026         │
│  [View Link] [Cancel Link]     │
│  [Generate New Link]           │
└─────────────────────────────────┘
```

- Show payment link status badge
- Allow copy-to-clipboard of the link
- Allow cancel + regenerate
- Show payment receipt when confirmed

### 6.3 Bulk Payment Link Generation

**Route:** `GET /app/pay/receivables` (existing, extended)

Add a bulk action: **"Generate Payment Links"** for selected unpaid invoices. Bulk action calls `createPaymentLink` for each selected invoice in sequence with concurrency limit of 3 (respect Razorpay rate limits).

Show a progress indicator. On completion, display how many links were created vs failed.

**Server Action:** `bulkCreatePaymentLinks(invoiceIds: string[]): ActionResult<BulkLinkResult>`

Constraint: max 50 invoices per bulk operation.

### 6.4 Payment Receipt Generation

On confirmed gateway payment (`payment_link.paid` webhook), generate a PDF payment receipt.

**Server Action:** `generatePaymentReceipt(invoicePaymentId): ActionResult<{ url: string }>`

**File:** `src/lib/razorpay/payment-receipt.ts`

Receipt contains:
- Receipt number (format: `RCP-{year}-{sequence}`)
- Organization logo and name
- Payment date, amount, currency
- Payment method (e.g., "UPI - phonepe@ybl")
- Invoice number reference
- Razorpay Payment ID for the customer's records
- "This is a computer-generated receipt" footer

Generate using `pdf-lib` (already installed). Store to S3 under `receipts/{orgId}/{paymentId}.pdf`. Attach as `FileAttachment` to the invoice.

### 6.5 Customer Portal Payment Tab

**Route:** `/portal/[orgSlug]/invoices/[invoiceId]/pay`

The existing customer portal (`/portal/[orgSlug]`) shows invoices. Extend the invoice detail view with a **Pay** tab:
- If payment link active: show Razorpay Checkout button
- Show payment history for the invoice (amounts, dates, methods)
- Show installment schedule if `PaymentArrangement` exists

**Authorization:** Portal JWT session (`requirePortalSession`) + customer must own the invoice.

### 6.6 Tests (Sprint 24.2)

File: `src/app/pay/invoice/__tests__/payment-page.test.ts`

- Public invoice page renders "Pay Now" when payment link is active
- Public invoice page renders fallback text when link is expired
- Public invoice page does not render Pay Now when org has no Razorpay config
- Invoice detail panel shows correct payment link status
- `bulkCreatePaymentLinks` is capped at 50 invoices
- `generatePaymentReceipt` creates a valid PDF and stores FileAttachment

---

## 7. Sprint 24.3: Virtual Accounts & Automated Collections

### Objective

Activate Razorpay Virtual Accounts — a dedicated bank account number per customer that routes incoming NEFT/RTGS/IMPS credits directly to Slipwise for automatic reconciliation. Implement the unmatched payment queue so manual NEFT payments don't get lost.

### 7.1 Virtual Account Creation

**Server Action:** `createCustomerVirtualAccount(customerId, orgId): ActionResult<VirtualAccountPublic>`

**File:** `src/app/app/pay/virtual-accounts/actions.ts`

**Flow:**
1. `requireRole('admin')`
2. Verify `customerId` belongs to `orgId` (IDOR guard)
3. Check if `CustomerVirtualAccount` already exists and `isActive === true` → return existing (idempotent)
4. Load org Razorpay config
5. Call Razorpay `POST /v1/virtual_accounts`:
   - `receivers.types: ["bank_account"]`
   - `description: "Collections account for ${customer.name}"`
   - `customer_id`: Razorpay customer ID (create Razorpay customer if not stored)
   - `close_by`: Unix timestamp 365 days from now
   - `notify.email: false` (we control notification)
6. Store `CustomerVirtualAccount` with `razorpayVaId`, `accountNumber`, `ifsc`
7. Update `Customer` with `razorpayCustomerId` (new field — see §11)
8. Return `{ accountNumber, ifsc, customerId }` for display to admin

**Route:** `GET /app/pay/virtual-accounts` — list all active virtual accounts per org

**Display:** Show `accountNumber` and `ifsc` to admin for sharing with customer (e.g., "Bank Transfer Details" panel on invoice).

### 7.2 Unmatched Payment Processing

When Razorpay sends `virtual_account.credited` webhook (handled in Sprint 24.1), the event handler:
1. Creates `UnmatchedPayment` record with all payment metadata
2. Calls `tryAutoMatchUnmatchedPayment(unmatchedPaymentId)` asynchronously

**Auto-match logic (`src/lib/razorpay/unmatched-payment-matcher.ts`):**

```typescript
async function tryAutoMatchUnmatchedPayment(
  unmatchedPaymentId: string
): Promise<MatchResult> {
  const payment = await db.unmatchedPayment.findUniqueOrThrow({...});
  
  // 1. Find customer by virtual account
  const va = await db.customerVirtualAccount.findUnique({
    where: { razorpayVaId: payment.virtualAccountId }
  });
  
  // 2. Find open invoices for this customer, sorted by due date
  const invoices = await db.invoice.findMany({
    where: {
      organizationId: va.orgId,
      customerId: va.customerId,
      status: { in: ["ISSUED", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
    },
    orderBy: { dueDate: "asc" }
  });
  
  // 3. Exact amount match → auto-confirm
  const exactMatch = invoices.find(
    (inv) => Math.abs(inv.remainingAmount * 100 - Number(payment.amountPaise)) < 100 // within ₹1
  );
  
  if (exactMatch) {
    await confirmMatch(payment, exactMatch, "AUTO_EXACT");
    return { matched: true, confidence: 1.0, invoiceId: exactMatch.id };
  }
  
  // 4. Single open invoice for customer → suggest
  if (invoices.length === 1) {
    await suggestMatch(payment, invoices[0], 0.85);
    return { matched: false, confidence: 0.85, invoiceId: invoices[0].id };
  }
  
  // 5. No match → leave as UNMATCHED, flag for manual review
  return { matched: false, confidence: 0, invoiceId: null };
}
```

**Manual Match UI:** `GET /app/pay/unmatched`

Displays all unmatched payments with:
- Payer name, amount, date, reference
- Suggested invoice match (if confidence ≥ 0.7)
- "Confirm Match" button → calls `confirmUnmatchedPayment(unmatchedPaymentId, invoiceId)`
- "Split Payment" button → apply to multiple invoices
- "Mark as Other" → close without linking to invoice (e.g., advance payment, refund return)

### 7.3 Virtual Account Close / Reassign

**Server Action:** `closeCustomerVirtualAccount(virtualAccountId, orgId): ActionResult<void>`
- Calls Razorpay `PATCH /v1/virtual_accounts/:id` with `status: "closed"`
- Sets `CustomerVirtualAccount.isActive = false`, `closedAt = now()`
- Cannot be reversed — creates a new VA if needed

### 7.4 New Schema Fields (Migration Required)

```prisma
// Add to Customer model
razorpayCustomerId  String?          @unique
```

**Migration:** `prisma migrate dev --name add-razorpay-customer-id`

### 7.5 Virtual Account Cron

**Route:** `GET /api/cron/virtual-account-close-check`  
**File:** `src/app/api/cron/virtual-account-close-check/route.ts`

Daily cron to close virtual accounts for customers with no open invoices for > 90 days. This prevents accumulating dormant Razorpay resources.

```
SELECT va WHERE isActive=true 
  AND customer has no open invoices 
  AND lastActivity > 90 days ago
```

### 7.6 Tests (Sprint 24.3)

File: `src/features/pay/__tests__/virtual-accounts.test.ts`

- `createCustomerVirtualAccount` returns existing active VA (idempotent)
- `createCustomerVirtualAccount` rejects customer from different org (IDOR)
- Auto-matcher: exact amount creates confirmed payment and transitions invoice to PAID
- Auto-matcher: single open invoice creates SUGGESTED match with confidence 0.85
- Auto-matcher: multiple invoices, no exact → leaves as UNMATCHED
- `confirmUnmatchedPayment` with invoiceId from wrong org is rejected
- `closeCustomerVirtualAccount` from wrong org is rejected (IDOR)

---

## 8. Sprint 24.4: Intelligent Bank Reconciliation Engine

### Objective

The existing `BankStatementImport`, `BankTransaction`, and `BankTransactionMatch` models have a basic import UI in `/app/books/reconciliation`. Phase 24.4 replaces the stub matching with a real confidence-scored engine, adds a streamlined manual match UI, and introduces the cash position summary.

### 8.1 Statement Import Hardening

**Existing:** `/app/books/reconciliation/imports` has a basic CSV upload

**Enhancements:**
- Support XLSX in addition to CSV
- Auto-detect column mapping using header name normalization (fuzzy match to: `date`, `amount`, `description`, `balance`, `reference`)
- Persist `mappingProfile` on `BankStatementImport` so re-imports from the same bank auto-map
- Show `importedRows`, `failedRows`, `errorRows` on import status page
- Duplicate detection: `@@unique([bankAccountId, checksum])` already prevents duplicate imports
- Parse `txnDate` and `valueDate` separately when both are present
- Normalize `description` to `normalizedPayee` using simple pattern matching (remove bank codes, normalize UPI handles)

**File:** `src/lib/bank/statement-parser.ts`

```typescript
interface ParsedRow {
  txnDate: Date;
  valueDate?: Date;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  runningBalance?: number;
  reference?: string;
  description: string;
  normalizedPayee?: string;
  fingerprint: string; // SHA-256 of (date + amount + description)
}
```

**Fingerprint:** Used for deduplication within a statement. `@@unique` on `fingerprint` within a bank account prevents double-import of the same transaction.

### 8.2 Auto-Match Engine

**File:** `src/lib/bank/reconciliation-engine.ts`

After a successful statement import, run the auto-match engine on all `UNMATCHED` transactions in that import:

```typescript
async function runAutoMatch(importId: string, orgId: string): Promise<MatchSummary> {
  const transactions = await db.bankTransaction.findMany({
    where: { importId, orgId, status: "UNMATCHED", direction: "CREDIT" }
  });

  for (const txn of transactions) {
    const match = await findBestMatch(txn, orgId);
    if (match.confidence >= 0.95) {
      await confirmMatch(txn, match); // auto-confirm high-confidence matches
    } else if (match.confidence >= 0.70) {
      await suggestMatch(txn, match); // create SUGGESTED match for review
    }
    // Below 0.70: leave UNMATCHED
  }
}
```

**Match scoring (`src/lib/bank/match-scorer.ts`):**

| Signal | Weight |
|--------|--------|
| Exact amount match | 0.40 |
| Amount within 1% | 0.25 |
| Date within 3 days of invoice due date | 0.20 |
| Payer name contains customer name | 0.10 |
| UTR/reference contains invoice number | 0.20 |
| Only one open invoice for this customer in period | 0.15 |

Score is capped at 1.0. Confidence ≥ 0.95 = auto-confirm. 0.70–0.94 = suggest. < 0.70 = no suggestion.

**Store match:** `BankTransactionMatch` with `confidenceScore`, `status = "AUTO_CONFIRMED"` or `"SUGGESTED"`.

### 8.3 Reconciliation Workbench UI

**Route:** `GET /app/books/reconciliation/workbench`

Three-pane interface:

**Left pane:** Unmatched bank transactions (CREDIT direction, filterable by date range, amount)  
**Middle pane:** Open invoices and vendor bills (filterable by customer, date, status)  
**Right pane:** Match summary + confirm button

**Interactions:**
- Click transaction on left → highlights suggested matches on middle
- Drag invoice to transaction (or click "Match") → previews the match with confidence
- "Confirm" button → creates `BankTransactionMatch` with `status = "CONFIRMED"`, creates `InvoicePayment` or `VendorBillPayment`
- "Ignore" button → marks transaction as `IGNORED` (e.g., bank fee, internal transfer)
- "Split" button → match one transaction to multiple documents

**Server Actions (`src/app/app/books/reconciliation/actions.ts`):**
```typescript
getUnmatchedTransactions(bankAccountId, orgId, filters): ActionResult<BankTransaction[]>
getSuggestedMatches(bankTxnId, orgId): ActionResult<SuggestedMatch[]>
confirmBankMatch(bankTxnId, entityType, entityId, orgId): ActionResult<void>
rejectBankMatch(bankTxnId, matchId, orgId): ActionResult<void>
ignoreTransaction(bankTxnId, orgId, reason): ActionResult<void>
getReconciliationSummary(bankAccountId, orgId, period): ActionResult<ReconcSummary>
```

**Authorization:** All actions require `requireOrgContext()`. Confirmation requires `requireRole('finance_manager')` or `requireRole('admin')`.

### 8.4 Cash Position Summary

**Route:** `GET /app/books/reconciliation/cash-position`

Dashboard-style view showing:
- Total balance across all bank accounts (latest `runningBalance` per account)
- Incoming (CREDIT) vs outgoing (DEBIT) in current month
- Unreconciled amount: total unmatched CREDITs
- "Available" vs "Expected" cash (including invoices due in next 7/30 days)
- Chart: 90-day rolling balance trend per bank account

**Server Action:** `getCashPosition(orgId): ActionResult<CashPositionData>`

### 8.5 Reconciliation Report Export

**Server Action:** `exportReconciliationReport(bankAccountId, orgId, from, to, format): ActionResult<{ url: string }>`

Exports a CSV/PDF reconciliation report:
- All transactions in period
- Matched vs unmatched status
- Linked invoice/vendor bill details
- Summary totals

### 8.6 New Schema Fields (Migration Required)

```prisma
// Add to BankTransaction
fingerprint   String   // already in schema — ensure index
@@unique([bankAccountId, fingerprint])  // add unique constraint for dedup
```

**Migration:** `prisma migrate dev --name add-bank-txn-fingerprint-unique`

### 8.7 Tests (Sprint 24.4)

File: `src/lib/bank/__tests__/reconciliation-engine.test.ts`

- CSV parser correctly maps standard HDFC/ICICI/SBI column formats
- CSV parser normalizes UPI payer names (strips bank codes)
- Fingerprint deduplication: same transaction on re-import is skipped
- Match scorer: exact amount + same-day date = confidence 0.95+
- Match scorer: amount off by 5% = confidence < 0.70 (no suggestion)
- `confirmBankMatch` creates `InvoicePayment` and transitions invoice status
- `confirmBankMatch` from different org is rejected (IDOR)
- `ignoreTransaction` with reason stores correctly
- `getCashPosition` returns correct totals across multiple bank accounts

---

## 9. Sprint 24.5: Collections Intelligence & Enterprise Hardening

### Objective

Build collections intelligence dashboards, aging analysis, at-risk customer detection, and complete the enterprise security layer (2FA setup, SSO configuration UI, high-value payment approval gate).

### 9.1 Collections Intelligence Dashboard

**Route:** `GET /app/pay/collections-intelligence`

**File:** `src/app/app/pay/collections-intelligence/page.tsx`

**Sections:**

**A. Aging Analysis**

| Bucket | Definition |
|--------|-----------|
| Current (0–30 days) | Due within next 30 days |
| 1–30 days overdue | Past due, 1–30 days |
| 31–60 days overdue | Past due, 31–60 days |
| 61–90 days overdue | Past due, 61–90 days |
| 90+ days overdue | Critically overdue |

Display as bar chart + table. Each bucket shows: count of invoices, total amount, percentage of total receivables. Click into a bucket → filtered invoice list with one-click "Send Reminder" and "Create Arrangement" actions.

**Server Action:** `getAgingBuckets(orgId): ActionResult<AgingBucket[]>`

**B. At-Risk Customer Signals**

A customer is flagged "at-risk" if:
- Has 2+ invoices in the 61–90 day bucket
- Has a pattern of paying 15+ days late (derived from `InvoiceStateEvent` history)
- Has an open `InvoiceTicket` with `AMOUNT_DISPUTE` category
- Has previously defaulted on a `PaymentArrangement`

**Server Action:** `getAtRiskCustomers(orgId): ActionResult<AtRiskCustomer[]>`

Display as a list with risk signal badges: `late_payer`, `disputed`, `arrangement_defaulted`, `critical_overdue`.

**C. Payment Recovery Rate**

Shows month-over-month:
- % of issued invoices that got paid within 30 days
- % of overdue invoices that got recovered via dunning
- % of disputed invoices resolved
- Average days to payment per customer

**Server Action:** `getPaymentRecoveryMetrics(orgId, months): ActionResult<RecoveryMetrics>`

**D. Gateway Performance Metrics**

- Payment link click rate (links generated vs links clicked via webhook callbacks)
- Payment success rate (links paid vs links created)
- Payment method breakdown (UPI / Cards / Net Banking / Wallets)
- Average time from link creation to payment

**Server Action:** `getGatewayMetrics(orgId, period): ActionResult<GatewayMetrics>`

### 9.2 Intel Insights Integration

Feed Phase 24 signals into the Phase 21 SW Intel engine (`IntelInsight` model):

| Signal | Severity | Category |
|--------|----------|----------|
| Customer has 3+ invoices 90+ days overdue | HIGH | `collections` |
| Payment link created but not clicked in 7 days | MEDIUM | `collections` |
| Virtual account credited but no matching invoice found | MEDIUM | `reconciliation` |
| Bank reconciliation has unmatched transactions > 30 days old | MEDIUM | `reconciliation` |
| Payment arrangement DEFAULTED | HIGH | `collections` |
| Cash position dropped below threshold (configurable, default ₹0) | HIGH | `cash_flow` |

**File:** `src/lib/pay/pay-signals.ts`

```typescript
export async function evaluateCollectionSignals(orgId: string): Promise<void> {
  // Run all signal evaluations and upsert IntelInsight records
  await Promise.all([
    checkCriticalOverdue(orgId),
    checkUnclickedPaymentLinks(orgId),
    checkUnmatchedVirtualCredits(orgId),
    checkStaleUnmatchedTransactions(orgId),
    checkDefaultedArrangements(orgId),
  ]);
}
```

Called by: `POST /api/cron/pay-signals` (new daily cron, runs after usage-snapshot cron)

### 9.3 SSO Configuration UI

**Route:** `GET /app/settings/sso`  
**File:** `src/app/app/settings/sso/page.tsx`

The `SsoConfig` model is fully defined in schema. Sprint 24.5 builds the UI.

**Tabs:**
1. **Overview** — SSO status badge, last login via SSO, "Test SSO" button
2. **Configure** — SAML metadata URL or XML paste, ACS URL display, Entity ID display
3. **Enforce** — Toggle `ssoEnforced` (requires admin confirm modal)
4. **Break Glass** — Show break-glass codes (for when SSO is down, admin can still log in)

**Server Actions (`src/app/app/settings/sso/actions.ts`):**
```typescript
getSsoConfig(orgId): ActionResult<SsoConfig | null>
saveSsoConfig(orgId, config): ActionResult<void>
testSsoConnection(orgId): ActionResult<{ success: boolean; error?: string }>
toggleSsoEnforced(orgId, enforce: boolean): ActionResult<void>
refreshSsoMetadata(orgId): ActionResult<void>
generateBreakGlassCode(orgId): ActionResult<{ code: string }>
```

**Authorization:** All SSO actions require `requireRole('admin')`. `toggleSsoEnforced` requires additional `requireRole('owner')` — only the org owner can enforce SSO.

**Metadata refresh cron:** The existing `POST /api/cron/irp-refresh` pattern can be adapted — add a `POST /api/cron/sso-metadata-refresh` that refreshes `SsoConfig` records with `metadataUrl` set.

### 9.4 2FA Setup Flow

**Route:** `GET /app/settings/security` (extend existing page)

**Current state:** `SecuritySettingsPage` has password change only.

**Add 2FA section:**

**2FA via TOTP (Google Authenticator, Authy):**
- "Enable 2FA" button → generates TOTP secret via `otpauth` npm package
- Displays QR code for scan
- User enters 6-digit code to confirm setup
- On verification: stores encrypted TOTP secret on `Profile` model (new field)
- Generates 8 recovery codes (stored hashed in DB)

**2FA via Email OTP (simpler fallback):**
- "Send OTP to my email" on login if 2FA enabled but TOTP unavailable

**New schema fields (migration required):**
```prisma
// Add to Profile model
totpSecret         String?   // AES-256 encrypted TOTP secret
totpEnabled        Boolean   @default(false)
totpEnabledAt      DateTime?
recoveryCodes      Json?     // array of bcrypt-hashed recovery codes
twoFaEnforcedByOrg Boolean  @default(false)
```

**Enforcement:** If `twoFaEnforcedByOrg = true` and user has not enrolled 2FA, redirect to 2FA enrollment page on every login.

**Server Actions (`src/app/app/settings/security/actions.ts`):**
```typescript
initiate2faSetup(userId): ActionResult<{ qrCodeUrl: string; secret: string }>
verify2faSetup(userId, totpCode): ActionResult<{ recoveryCodes: string[] }>
disable2fa(userId, currentPassword): ActionResult<void>
enforce2faForOrg(orgId): ActionResult<void>   // requireRole('owner')
```

**npm dependency:** `otpauth@^9.x`, `qrcode@^1.5.x`

### 9.5 High-Value Payment Approval Gate

For orgs that choose to enable it: any manual `InvoicePayment` with `amount > configurable_threshold` (default ₹100,000) requires a second admin to approve before the invoice status is updated.

**Config field (add to `OrgDefaults`):**
```prisma
highValuePaymentThreshold  Float  @default(100000)
requireDualApprovalPayment Boolean @default(false)
```

**Flow:**
1. Finance manager records manual payment > threshold
2. System creates `ApprovalRequest` with `docType = "invoice_payment"`, `docId = invoicePayment.id`
3. Invoice stays in current status until approval
4. Second admin approves → payment applied, invoice status updated
5. If rejected → payment record deleted, reviewer note captured

**Migration:** `prisma migrate dev --name add-high-value-payment-config`

### 9.6 Security Audit of All Payment Routes

Perform a systematic audit of all Phase 24 routes against:

- [ ] Every server action verifies `orgId` from session, not from request body
- [ ] Every `invoiceId` parameter is validated against `invoice.organizationId === session.orgId`
- [ ] `CustomerVirtualAccount` queries always include `orgId` filter
- [ ] `UnmatchedPayment` queries always include `orgId` filter
- [ ] `BankTransaction` queries always include `orgId` filter
- [ ] Razorpay API keys are never logged or returned to client
- [ ] Webhook route has no org-context requirement (but validates signature instead)
- [ ] Rate limiting applied to all public payment routes
- [ ] Sentry captures gateway errors without logging payment amounts or customer data (PII scrubbing)

### 9.7 Payment Gateway Health Monitoring

**Route:** `GET /app/settings/integrations/razorpay` (extend Sprint 24.1 page)

Add a **Health** tab showing:
- Last successful webhook received (from `RazorpayEvent` table)
- Last webhook failure (stored in error log)
- Count of payment links created in last 30 days
- Count of confirmed payments in last 30 days
- "Test Webhook" button — sends a test event from Razorpay Dashboard instructions

**Cron:** `POST /api/cron/gateway-health-check` — checks if any webhook has been received in the last 24 hours for active orgs. If not, creates an `IntelInsight` with severity HIGH: "No Razorpay webhooks received in 24 hours — check gateway config".

### 9.8 Tests (Sprint 24.5)

File: `src/features/pay/__tests__/collections-intelligence.test.ts`
File: `src/app/app/settings/sso/__tests__/actions.test.ts`
File: `src/app/app/settings/security/__tests__/totp.test.ts`

- `getAgingBuckets` correctly categorizes invoices into 5 buckets
- At-risk customer detection: `late_payer` flag set when avg payment > 15 days late
- At-risk customer detection: `arrangement_defaulted` flag set correctly
- `getSsoConfig` returns null when not configured
- `toggleSsoEnforced` rejects non-owner role
- 2FA: `initiate2faSetup` generates valid TOTP secret
- 2FA: `verify2faSetup` with wrong code returns error
- 2FA: `disable2fa` with wrong password returns error
- High-value payment: amount below threshold skips approval flow
- High-value payment: amount above threshold creates ApprovalRequest

---

## 10. Data Model Changes

### 10.1 New Schema Fields (Cumulative)

```prisma
// Customer model — add
razorpayCustomerId  String?   @unique
@map("razorpay_customer_id")

// Profile model — add  
totpSecret         String?   // AES-256 encrypted
totpEnabled        Boolean   @default(false)
totpEnabledAt      DateTime?
recoveryCodes      Json?     // hashed recovery codes
twoFaEnforcedByOrg Boolean  @default(false)

// OrgDefaults model — add
highValuePaymentThreshold  Float   @default(100000)
requireDualApprovalPayment Boolean @default(false)

// BankTransaction model — add unique constraint
@@unique([bankAccountId, fingerprint])
```

### 10.2 New Models

No new top-level models are required. Phase 24 activates the existing schema.

### 10.3 Migration Files

| Migration | Sprint | Description |
|-----------|--------|-------------|
| `add-razorpay-customer-id` | 24.3 | `Customer.razorpayCustomerId` field |
| `add-totp-fields` | 24.5 | TOTP and recovery code fields on Profile |
| `add-high-value-payment-config` | 24.5 | OrgDefaults gateway approval threshold |
| `add-bank-txn-fingerprint-unique` | 24.4 | Unique constraint on BankTransaction |

Run all migrations with `prisma migrate dev` during their respective sprints. Confirm `prisma migrate deploy` works cleanly on CI.

---

## 11. Route Map (Complete)

### New Routes Added in Phase 24

| Method | Route | Sprint | Auth | Description |
|--------|-------|--------|------|-------------|
| POST | `/api/webhooks/razorpay` | 24.1 | Signature verification | Razorpay webhook receiver |
| GET | `/app/settings/integrations/razorpay` | 24.1 | Admin | Gateway config page |
| POST | `/app/pay/virtual-accounts` | 24.3 | Admin | Virtual accounts list |
| GET | `/app/pay/unmatched` | 24.3 | Finance | Unmatched payments queue |
| GET | `/app/books/reconciliation/workbench` | 24.4 | Finance | Match workbench |
| GET | `/app/books/reconciliation/cash-position` | 24.4 | Finance | Cash position |
| GET | `/app/pay/collections-intelligence` | 24.5 | Finance/Admin | Collections dashboard |
| GET | `/app/settings/sso` | 24.5 | Admin | SSO configuration |
| GET | `/api/cron/virtual-account-close-check` | 24.3 | Cron secret | VA cleanup cron |
| GET | `/api/cron/pay-signals` | 24.5 | Cron secret | Collection signal evaluation |
| GET | `/api/cron/gateway-health-check` | 24.5 | Cron secret | Gateway health check |
| GET | `/api/cron/sso-metadata-refresh` | 24.5 | Cron secret | SSO metadata refresh |

### Extended Routes (Phase 24 Additions to Existing Pages)

| Route | Enhancement |
|-------|-------------|
| `/app/docs/invoices/[id]` | + Payment Gateway panel (Sprint 24.2) |
| `/app/pay/receivables` | + Bulk payment link generation (Sprint 24.2) |
| `/app/books/reconciliation` | + Enhanced import, workbench link (Sprint 24.4) |
| `/pay/invoice/[token]` | + Razorpay Checkout button (Sprint 24.2) |
| `/portal/[orgSlug]/invoices/[invoiceId]` | + Pay tab with installments (Sprint 24.2) |
| `/app/settings/security` | + 2FA section (Sprint 24.5) |
| `/app/settings/integrations` | + Razorpay tab (Sprint 24.1) |

---

## 12. Server Actions Index

### Sprint 24.1
```typescript
// src/app/app/settings/integrations/razorpay/actions.ts
saveRazorpayConfig(orgId, config)
getRazorpayConfig(orgId)
deleteRazorpayConfig(orgId)
testRazorpayConnection(orgId)

// src/app/app/docs/invoices/payment-link-actions.ts
createPaymentLink(invoiceId)
cancelPaymentLink(invoiceId)
```

### Sprint 24.2
```typescript
// src/app/app/docs/invoices/payment-link-actions.ts (extended)
bulkCreatePaymentLinks(invoiceIds: string[])

// src/lib/razorpay/payment-receipt.ts
generatePaymentReceipt(invoicePaymentId)
```

### Sprint 24.3
```typescript
// src/app/app/pay/virtual-accounts/actions.ts
createCustomerVirtualAccount(customerId, orgId)
closeCustomerVirtualAccount(virtualAccountId, orgId)
listVirtualAccounts(orgId)

// src/app/app/pay/unmatched/actions.ts
listUnmatchedPayments(orgId)
confirmUnmatchedPayment(unmatchedPaymentId, invoiceId)
splitUnmatchedPayment(unmatchedPaymentId, splits: { invoiceId, amount }[])
dismissUnmatchedPayment(unmatchedPaymentId, reason)
```

### Sprint 24.4
```typescript
// src/app/app/books/reconciliation/actions.ts (extended)
uploadBankStatement(bankAccountId, orgId, file)
getUnmatchedTransactions(bankAccountId, orgId, filters)
getSuggestedMatches(bankTxnId, orgId)
confirmBankMatch(bankTxnId, entityType, entityId, orgId)
rejectBankMatch(bankTxnId, matchId, orgId)
ignoreTransaction(bankTxnId, orgId, reason)
getReconciliationSummary(bankAccountId, orgId, period)
getCashPosition(orgId)
exportReconciliationReport(bankAccountId, orgId, from, to, format)
```

### Sprint 24.5
```typescript
// src/app/app/pay/collections-intelligence/actions.ts
getAgingBuckets(orgId)
getAtRiskCustomers(orgId)
getPaymentRecoveryMetrics(orgId, months)
getGatewayMetrics(orgId, period)

// src/app/app/settings/sso/actions.ts
getSsoConfig(orgId)
saveSsoConfig(orgId, config)
testSsoConnection(orgId)
toggleSsoEnforced(orgId, enforce)
refreshSsoMetadata(orgId)
generateBreakGlassCode(orgId)

// src/app/app/settings/security/actions.ts (extended)
initiate2faSetup(userId)
verify2faSetup(userId, totpCode)
disable2fa(userId, currentPassword)
enforce2faForOrg(orgId)
```

---

## 13. Security Model

### 13.1 Authorization Rules

All Phase 24 server actions must follow this pattern:

```typescript
// Read operations
const { orgId, userId } = await requireOrgContext();

// Write operations that affect billing/payment data
const { orgId, userId } = await requireRole('finance_manager');

// Gateway configuration, SSO, user management
const { orgId, userId } = await requireRole('admin');

// SSO enforcement toggle, 2FA org enforcement
const { orgId, userId } = await requireRole('owner');
```

### 13.2 IDOR Prevention (Payment-Specific)

Every query involving payment data must be double-scoped:

```typescript
// ❌ WRONG — trusts invoiceId from client
const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });

// ✅ CORRECT — org-scoped lookup
const invoice = await db.invoice.findFirst({
  where: { id: invoiceId, organizationId: orgId }
});
if (!invoice) throw new Error("Not found");
```

This pattern applies to: `Invoice`, `InvoicePayment`, `CustomerVirtualAccount`, `UnmatchedPayment`, `BankTransaction`, `BankTransactionMatch`, `PaymentArrangement`.

### 13.3 Razorpay Secret Handling

Gateway secrets are AES-256 encrypted using `RAZORPAY_ENCRYPTION_KEY` env var before storage. Decryption happens only server-side, only when needed for API calls. The `getRazorpayConfig()` server action returns only `keyId` (masked: `rzp_live_...***`) and `mode`, never the secret or webhook secret.

```typescript
// src/lib/crypto/gateway-secrets.ts
export function encryptGatewaySecret(plaintext: string): string { ... }
export function decryptGatewaySecret(ciphertext: string): string { ... }
```

Use `crypto.createCipheriv('aes-256-cbc', key, iv)` with a random IV stored as prefix of the ciphertext. Never use ECB mode.

### 13.4 Webhook Security

- Signature verification on every webhook (timing-safe compare)
- Idempotency on `RazorpayEvent.id` prevents replay attacks
- No IP allowlist (Razorpay IPs rotate; signature is sufficient)
- 100 events/min rate limit per IP
- Webhook returns `200 OK` even on rejection (prevents enumeration)

### 13.5 2FA Security

- TOTP secrets encrypted at rest using same gateway encryption pattern
- Recovery codes hashed with bcrypt (cost factor 12) before storage
- Recovery codes invalidated after first use
- 2FA enrollment requires current session auth (not just email)
- `disable2fa` requires current password verification

---

## 14. Business Logic & State Machines

### 14.1 Invoice Payment State Machine (Extended)

Phase 24 adds gateway-triggered transitions to the existing `InvoiceStatus` enum:

```
DRAFT 
  └── [issue] → ISSUED
                  └── [gateway_payment_full] → PAID
                  └── [gateway_payment_partial] → PARTIALLY_PAID
                  └── [overdue_cron] → OVERDUE
                      └── [gateway_payment_full] → PAID
                      └── [arrangement_created] → ARRANGEMENT_MADE
                          └── [arrangement_completed] → PAID
                          └── [arrangement_defaulted] → OVERDUE
```

All transitions triggered by gateway webhook go through `createPaymentFromGateway()`, which:
1. Creates `InvoicePayment` record
2. Updates `invoice.amountPaid` and `invoice.remainingAmount`
3. Decides new status based on `remainingAmount`
4. Logs `InvoiceStateEvent` with `actorName = "razorpay_webhook"`
5. Fires usage event for metering

**Idempotency guarantee:** `InvoicePayment.externalPaymentId` is unique. Duplicate webhook for the same Razorpay payment ID cannot create a duplicate `InvoicePayment`.

### 14.2 Bank Match State Machine

```
UNMATCHED
  ├── [auto_match_exact] → MATCHED (via AUTO_CONFIRMED BankTransactionMatch)
  ├── [auto_match_fuzzy] → SUGGESTED (via SUGGESTED BankTransactionMatch)
  │     ├── [user_confirms] → MATCHED
  │     └── [user_rejects] → UNMATCHED (suggested match deleted)
  ├── [user_manual_match] → MATCHED
  └── [user_ignores] → IGNORED
```

### 14.3 Payment Arrangement Lifecycle

```
ACTIVE
  ├── Each installment: PENDING → PAID (on payment confirmation)
  ├── [all installments PAID] → COMPLETED
  ├── [installment 30+ days overdue] → trigger dunning
  ├── [2+ consecutive missed installments] → DEFAULTED
  └── [admin cancel] → CANCELLED
```

On `DEFAULTED`: automatically create `IntelInsight` with severity HIGH.

### 14.4 Virtual Account Match Confidence Cascade

```
virtual_account.credited webhook
  └── Create UnmatchedPayment
        └── tryAutoMatchUnmatchedPayment()
              ├── confidence >= 0.95 → AUTO_CONFIRMED → create InvoicePayment
              ├── 0.70–0.94 → SUGGESTED → show in /app/pay/unmatched for review
              └── < 0.70 → UNMATCHED → show in queue, no suggestion
```

---

## 15. Environment Variables

### New Variables

| Variable | Description | Required | Sprint |
|----------|-------------|----------|--------|
| `RAZORPAY_ENCRYPTION_KEY` | 32-byte hex key for AES-256 encryption of Razorpay secrets | Production | 24.1 |
| `RAZORPAY_WEBHOOK_TOLERANCE_SECONDS` | Max webhook age in seconds (default: 300) | Optional | 24.1 |
| `HIGH_VALUE_PAYMENT_DEFAULT_THRESHOLD` | Default threshold in paise for dual-approval gate | Optional | 24.5 |

### Existing Variables Required

| Variable | Used by |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Rate limiting on `/api/webhooks/razorpay` |
| `UPSTASH_REDIS_REST_TOKEN` | Same |
| `CRON_SECRET` | All new cron endpoints |
| `NEXT_PUBLIC_APP_URL` | Payment link callback URLs, receipt footer |
| `RESEND_API_KEY` | Payment confirmation email |
| `SENTRY_DSN` | Gateway error monitoring |

### New npm Dependencies

| Package | Version | Reason | Scope |
|---------|---------|--------|-------|
| `razorpay` | `^2.9.x` | Razorpay Node.js SDK | Server-only |
| `otpauth` | `^9.x` | TOTP secret generation and verification | Server-only |
| `qrcode` | `^1.5.x` | TOTP QR code generation for 2FA setup | Server-only |
| `xlsx` | `^0.18.x` | XLSX bank statement parsing | Server-only |

---

## 16. Testing Strategy

### Unit Tests (Vitest)

| File | Coverage |
|------|----------|
| `src/app/api/webhooks/razorpay/__tests__/route.test.ts` | Signature verification, idempotency, event handlers |
| `src/app/app/docs/invoices/__tests__/payment-link-actions.test.ts` | Payment link CRUD, idempotency, status validation |
| `src/lib/razorpay/__tests__/event-handlers.test.ts` | Per-event-type processing, invoice state transitions |
| `src/lib/razorpay/__tests__/unmatched-payment-matcher.test.ts` | Auto-match confidence scenarios |
| `src/lib/bank/__tests__/statement-parser.test.ts` | CSV/XLSX parsing, column mapping, fingerprint dedup |
| `src/lib/bank/__tests__/reconciliation-engine.test.ts` | Match scoring, auto-confirm threshold |
| `src/features/pay/__tests__/virtual-accounts.test.ts` | VA CRUD, IDOR, idempotency |
| `src/features/pay/__tests__/collections-intelligence.test.ts` | Aging buckets, at-risk signals |
| `src/app/app/settings/sso/__tests__/actions.test.ts` | SSO CRUD, role enforcement |
| `src/app/app/settings/security/__tests__/totp.test.ts` | 2FA setup/verify/disable |
| `src/lib/crypto/__tests__/gateway-secrets.test.ts` | AES-256 encrypt/decrypt roundtrip |

### E2E Tests (Playwright)

| File | Scenario |
|------|----------|
| `tests/pay/payment-link.spec.ts` | Admin creates payment link, copies URL, cancels link |
| `tests/pay/public-invoice-pay.spec.ts` | Public invoice page shows Pay Now button when link active |
| `tests/reconciliation/bank-import.spec.ts` | Upload CSV, view imported transactions, confirm match |
| `tests/settings/sso-setup.spec.ts` | Admin saves SSO config, toggles enforcement |
| `tests/settings/2fa-setup.spec.ts` | User enrolls TOTP, verifies with code, generates recovery codes |

### Test Mock Requirements

Every test file that touches server actions using `checkUsageLimit`, `getOrgPlan`, or `requireRole` must mock those dependencies. Follow the established pattern from `shares/__tests__/shares.test.ts`:

```typescript
vi.mock("@/lib/plans/enforcement", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getOrgPlan: vi.fn().mockResolvedValue(mockPlan) };
});
```

---

## 17. Performance & Scalability

### Database Indexing

All new query patterns must have corresponding indexes:

```prisma
// UnmatchedPayment — already has @@index([orgId, status])
// BankTransaction — add @@index([orgId, direction, status]) for reconciliation queries
// RazorpayEvent — already has @@index([type]) and @@index([processedAt])
// InvoicePayment — ensure @@index([orgId, invoiceId]) exists
```

Verify via `EXPLAIN ANALYZE` on the three highest-frequency queries:
1. `getUnmatchedTransactions` (reconciliation workbench primary query)
2. `getAgingBuckets` (runs daily + on page load)
3. `tryAutoMatchUnmatchedPayment` (called on every webhook credit)

### Razorpay API Rate Limits

Razorpay allows 200 API calls/minute per account in test mode, 600/minute in live mode.

- `bulkCreatePaymentLinks`: cap at 50 invoices, 3 concurrent — max 50 calls/batch
- `createCustomerVirtualAccount`: no batching — 1 call per user action
- Webhook handler: read-only path, no outbound API calls

### Auto-Match Engine Performance

The `tryAutoMatchUnmatchedPayment` function must complete within 2 seconds. At org scale (1000 open invoices), the query `findMany({ where: { customerId, status: IN(...) } })` must use the existing `@@index([customerId])` on Invoice.

For very large orgs (10,000+ open invoices), add a `LIMIT 100` to the candidate invoice query and sort by `dueDate ASC` — the most recent invoices are the most likely matches.

### Bank Statement Processing

For large statements (1000+ rows):
- Process in batches of 100 transactions
- Run `runAutoMatch` as a background operation after import completes
- Show import status with live progress (poll `/api/import/status/[importId]` every 3 seconds from client)
- Do not block the HTTP response on auto-matching

---

## 18. Observability & Monitoring

### Sentry Integration

All Phase 24 server-side errors are captured via Sentry (installed in Phase 23). Add structured context for payment failures:

```typescript
Sentry.withScope((scope) => {
  scope.setTag("module", "payment_gateway");
  scope.setTag("org_id", orgId); // OK — org ID is not PII
  // ❌ Do NOT add: amount, customer name, payment method, account number
  Sentry.captureException(error);
});
```

### Key Metrics to Track

| Metric | Source | Target |
|--------|--------|--------|
| Webhook delivery rate | `RazorpayEvent` count vs Razorpay Dashboard | > 99% |
| Payment link paid rate | `payment_link.paid` events / links created | Baseline tracking |
| Auto-match rate | `AUTO_CONFIRMED` matches / total CREDIT transactions | > 60% over time |
| Reconciliation lag | Average time from `BankTransaction.txnDate` to `MATCHED` | < 48 hours |

### Cron Schedule (Additions)

| Cron | Schedule | Handler |
|------|----------|---------|
| `virtual-account-close-check` | `0 3 * * *` (3am daily) | Close dormant VAs |
| `pay-signals` | `0 7 * * *` (7am daily) | Evaluate collection signals |
| `gateway-health-check` | `0 8 * * *` (8am daily) | Check webhook liveness |
| `sso-metadata-refresh` | `0 4 * * *` (4am daily) | Refresh SSO IdP metadata |

---

## 19. Risk Register

| Risk | Likelihood | Severity | Mitigation |
|------|------------|----------|------------|
| Razorpay API key compromise via log leakage | Low | Critical | AES-256 encryption at rest; Sentry scrubbing rules; no key in logs |
| Duplicate InvoicePayment from webhook retry | Medium | High | Idempotency on `externalPaymentId` unique constraint |
| Auto-match incorrect — wrong invoice gets paid | Low | High | Only auto-confirm at ≥ 0.95 confidence; all others require human confirm |
| `RAZORPAY_ENCRYPTION_KEY` rotation breaks existing configs | Low | High | Document rotation procedure: decrypt all, update key, re-encrypt all |
| XLSX parser accepts malformed file, causes OOM | Low | Medium | File size limit (max 5MB), row limit (max 5000 rows), timeout after 30s |
| 2FA lockout if user loses both TOTP and recovery codes | Medium | High | Break-glass admin override: owner can disable 2FA for a specific user |
| Razorpay `close_by` on virtual accounts expires prematurely | Medium | Medium | Daily cron checks and extends `close_by` for active VAs |
| SSO misconfiguration locks out all org users | Low | Critical | `ssoEnforced` requires owner role + confirmation modal; break-glass codes always available |
| Bank fingerprint collision — different transactions get same fingerprint | Very Low | High | Include `bankAccountId + txnDate + amount + description substring(0,50)` in fingerprint; SHA-256 collision probability negligible |
| High-value payment approval creates ops bottleneck | Medium | Low | Feature is opt-in; threshold is configurable; approval timeout (48h) auto-approves if no reviewer |

---

## 20. Acceptance Criteria

### Sprint 24.1
- [ ] Org admin can save, test, and delete Razorpay gateway config
- [ ] Admin can generate a payment link for any ISSUED/DUE/OVERDUE invoice
- [ ] Webhook correctly processes `payment_link.paid` and creates InvoicePayment
- [ ] Duplicate webhook for same Razorpay payment ID does not create duplicate InvoicePayment
- [ ] Invalid webhook signature returns 400; valid returns 200
- [ ] All tests pass; `npm run lint && npm run build` clean

### Sprint 24.2
- [ ] Customer on public invoice page sees "Pay Now" when payment link is active
- [ ] Customer can complete payment via Razorpay Checkout
- [ ] Invoice status auto-updates to PAID/PARTIALLY_PAID after confirmed payment
- [ ] Payment receipt PDF is generated and attached to invoice
- [ ] Bulk payment link generation handles 50 invoices with progress indicator
- [ ] All tests pass; build clean

### Sprint 24.3
- [ ] Admin can create a virtual account for any customer
- [ ] Duplicate VA creation returns existing active VA (idempotent)
- [ ] Incoming virtual account credit with exact-match invoice auto-creates InvoicePayment
- [ ] Unmatched payments appear in `/app/pay/unmatched` queue
- [ ] Finance manager can manually match, split, or dismiss unmatched payments
- [ ] IDOR: all virtual account and unmatched payment actions reject cross-org IDs
- [ ] All tests pass; build clean

### Sprint 24.4
- [ ] CSV and XLSX bank statements import successfully
- [ ] Duplicate statement import is rejected (checksum check)
- [ ] Auto-match engine creates confirmed matches for exact-amount transactions
- [ ] Reconciliation workbench shows unmatched transactions with suggestions
- [ ] Finance manager can confirm, reject, or ignore matches
- [ ] Cash position summary correctly aggregates all bank account balances
- [ ] IDOR: all reconciliation actions reject cross-org IDs
- [ ] All tests pass; build clean

### Sprint 24.5
- [ ] Aging analysis correctly buckets all invoices into 5 aging categories
- [ ] At-risk customers flagged with correct signals
- [ ] SSO config page allows save, test, and enforcement toggle (owner only)
- [ ] 2FA setup generates valid TOTP QR code
- [ ] 2FA verification accepts correct TOTP code and rejects incorrect
- [ ] High-value payment above threshold creates ApprovalRequest
- [ ] All crons (`pay-signals`, `gateway-health-check`, `sso-metadata-refresh`, `virtual-account-close-check`) run without error
- [ ] `npm run lint && npm run test && npm run build` all pass clean
- [ ] PR opened targeting `feature/phase-24`

---

## 21. Branch Strategy & PR Workflow

### Branch Hierarchy

```
master (protected — never touch directly)
└── feature/phase-24 (Phase 24 integration branch)
    ├── feature/phase-24-sprint-24-1 (Gateway Foundation)
    ├── feature/phase-24-sprint-24-2 (Customer Payment Experience)
    ├── feature/phase-24-sprint-24-3 (Virtual Accounts & Auto-Collections)
    ├── feature/phase-24-sprint-24-4 (Intelligent Bank Reconciliation)
    └── feature/phase-24-sprint-24-5 (Collections Intelligence & Hardening)
```

### Baseline

Create `feature/phase-24` from `master` after Phase 23 has been reviewed, approved, and merged:

```bash
git checkout master
git pull origin master
git checkout -b feature/phase-24
git push -u origin feature/phase-24
```

### Sprint Branch Workflow

For each sprint:

```bash
# 1. Create sprint branch from phase branch
git checkout feature/phase-24
git pull origin feature/phase-24
git checkout -b feature/phase-24-sprint-24-N

# 2. Implement sprint work — commit with semantic messages
git commit -m "feat(pay): add razorpay gateway config and payment link creation"
git commit -m "feat(pay): add razorpay webhook receiver with signature verification"
git commit -m "feat(pay): add payment auto-processing on gateway confirmation"
git commit -m "test(pay): add sprint 24.1 unit tests"

# 3. Push and open PR
git push -u origin feature/phase-24-sprint-24-N

gh pr create \
  --base feature/phase-24 \
  --head feature/phase-24-sprint-24-N \
  --title "feat: Phase 24.N — <Sprint Title>" \
  --body "<PR body per template>"
```

### PR Dependency Order

| Sprint PR | Must be merged before |
|-----------|----------------------|
| Sprint 24.1 | Sprint 24.2 (payment links must exist before customer experience) |
| Sprint 24.2 | Sprint 24.3 (public invoice page is extended in both) |
| Sprint 24.3 | Sprint 24.5 (virtual accounts feed into intelligence signals) |
| Sprint 24.4 | Can run in parallel with 24.3 (bank recon is independent of VA flow) |
| Sprint 24.5 | Requires 24.1–24.4 merged (signals depend on all payment data) |

Sprints 24.3 and 24.4 can be developed in parallel.

### Commit Message Conventions

```
feat(pay): add razorpay gateway org configuration
feat(pay): add payment link generation and cancellation
feat(webhooks): add razorpay webhook receiver with idempotency
feat(pay): add virtual account creation and management
feat(pay): add unmatched payment auto-match engine
feat(reconciliation): add intelligent bank match scoring
feat(reconciliation): add reconciliation workbench UI
feat(reconciliation): add cash position summary
feat(collections): add aging analysis and at-risk detection
feat(settings): add sso configuration UI
feat(security): add totp 2fa setup and verification
feat(security): add high-value payment approval gate
fix(pay): ensure invoice state transitions are idempotent on gateway events
chore(pay): add razorpay webhook tolerance and rate limiting
```

### No-Touch Rules

- `master` must not be touched at any point during Phase 24
- No Phase 24 PR targets `master` — all PRs target `feature/phase-24`
- The engineering team must not self-merge — every PR requires owner review and approval
- All tests, linting, and build verification must pass before opening a PR
- Sentry must not capture Razorpay API keys, customer account numbers, or payment amounts

---

## 22. Deferred to Phase 25+

The following items were identified but are explicitly out of scope for Phase 24:

- **International payments / multi-currency** — Razorpay does support USD/EUR, but INR-only for Phase 24
- **Razorpay Route (marketplace splits)** — Pay-out to vendors from collected payments (complex compliance requirements; deferred)
- **Payment gateway A/B testing** — Second gateway (e.g., Cashfree, PayU) as fallback — Phase 25
- **Full GST reconciliation** — Matching GST input credits from vendor bills to GSTR-2A — Phase 25
- **EMI / loan-linked payment arrangements** — Third-party EMI integration via Razorpay — Phase 25
- **Custom SAML attribute mapping** — Advanced SSO attribute mapping for role provisioning from IdP — Phase 25
- **Hardware Security Key (FIDO2/WebAuthn) 2FA** — TOTP covers most enterprise use cases for now
- **Passkey authentication** — Future, tied to Supabase Auth roadmap
- **PDF/A archival format for receipts** — Standard PDF is sufficient for Phase 24

---

*End of Phase 24 PRD*  
*Next phase: Phase 25 — to be defined after Phase 24 delivery and payment gateway adoption metrics are available. Likely focus: SW> Flow Advanced Automation (visual workflow builder, event-driven triggers, Trigger.dev integration) or International Payments & Multi-Currency.*
