# Slipwise One — Phase 14 & Phase 15
## Product Requirements Document (PRD)
### Version 1.0 | Advanced AR Automation + Customer Portal + Tax Compliance + Global Expansion
### Engineering Handover Document

---

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 14: Advanced AR Automation + Customer Portal + Cash Flow Intelligence · Phase 15: India Tax Compliance + Global Expansion + Template Marketplace + Developer Ecosystem v2 |
| **Document Version** | 1.0 |
| **Date** | 2026-04-08 |
| **Document Purpose** | Full engineering handover — autonomous multi-agent execution ready |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–13 completed and merged to master |
| **Branch Convention** | `feature/phase-14-ar-automation` · `feature/phase-15-compliance-expansion` |
| **Sprint Model** | 3 sprints (Phase 14) + 3 sprints (Phase 15) |
| **Total Sprints** | 6 sprints |
| **Engineering Model** | Multi-agent parallel execution recommended |
| **Payment Gateway** | Razorpay (all phases — India + International) — **No Stripe** |
| **Parent Company** | Zenxvio |

---

## 🇮🇳 Payment Gateway: Razorpay Only (All Markets)

Razorpay is the **only payment gateway** for all phases of Slipwise One. Stripe is NOT used anywhere in the codebase. All invoice payment collection, subscription billing, dunning flows, refunds, and payouts go through Razorpay.

| Feature Used in Phase 14-15 | Razorpay API |
|---|---|
| Invoice Pay-Now (existing) | Payment Links v1 |
| Smart Dunning / Retry | Subscription retry + webhook events |
| Customer portal payment | Payment Links v2 + redirect |
| Refunds | `razorpay.refunds.create()` |
| UPI AutoPay mandates | Subscription UPI mandate flow |
| GST invoices | Razorpay Invoices API (GST-compliant) |
| RazorpayX Payouts (future) | RazorpayX API (stub in Phase 15) |

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State Post Phase 13](#2-current-state-post-phase-13)
3. [Phase 14 — Advanced AR Automation + Customer Self-Service Portal + Cash Flow Intelligence](#3-phase-14)
   - 3.1 Sprint 14.1 — Dunning Engine + Smart Payment Reminders
   - 3.2 Sprint 14.2 — Customer Self-Service Portal
   - 3.3 Sprint 14.3 — Quote-to-Invoice + Cash Flow Intelligence
   - 3.4 Database Schema Additions (Phase 14)
   - 3.5 Route Map (Phase 14)
   - 3.6 Edge Cases & Acceptance Criteria (Phase 14)
4. [Phase 15 — India Tax Compliance + Global Expansion + Template Marketplace + Developer Ecosystem v2](#4-phase-15)
   - 4.1 Sprint 15.1 — India GST & Tax Compliance Engine
   - 4.2 Sprint 15.2 — Global Expansion + Multi-Language + Multi-Currency
   - 4.3 Sprint 15.3 — Template Marketplace + Developer Ecosystem v2
   - 4.4 Database Schema Additions (Phase 15)
   - 4.5 Route Map (Phase 15)
   - 4.6 Edge Cases & Acceptance Criteria (Phase 15)
5. [Shared Technical Standards](#5-shared-technical-standards)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Risk Register](#7-risk-register)
8. [QA & Acceptance Gates](#8-qa--acceptance-gates)
9. [Multi-Agent Execution Strategy](#9-multi-agent-execution-strategy)
10. [Appendix A — Environment Variables](#appendix-a--environment-variables)
11. [Appendix B — Razorpay Dunning & Retry Reference](#appendix-b--razorpay-dunning--retry-reference)
12. [Appendix C — GST e-Invoicing API Reference](#appendix-c--gst-e-invoicing-api-reference)

---

## 1. Product Context & Phase Summary

### Slipwise One Sub-Products (Post Phase 13)

| Module | Description | Status |
|---|---|---|
| SW Docs | Invoices (5 templates), Vouchers (5 templates), Salary Slips (5 templates) | ✅ Phase 3 |
| PDF Studio | 10 tools: merge, split, delete, organize, resize, fill-sign, protect, header-footer, pdf-to-image, repair | ✅ Phase 8 |
| SW Pixel | 5 tools: passport photo, resize, adjust, print layout, labels | ✅ Phase 9 |
| SW Pay | Payment lifecycle, receivables, proof uploads, Razorpay payment links, virtual accounts | ✅ Phase 12 |
| SW Flow | Recurring billing, scheduled sends, Trigger.dev orchestration | ✅ Phase 5 |
| SW Intel | KPI dashboard, reports, CSV export, AI document analysis | ✅ Phases 6 + 13 |
| SW Auth | 7 roles, 15 modules, proxy grants, full audit log, SAML SSO | ✅ Phases 7 + 12 |
| SW Billing | Razorpay India subscriptions, plan enforcement, usage metering, international billing | ✅ Phases 11 + 12 |
| API Platform | REST API v1, webhooks, API keys, developer portal | ✅ Phase 12 |
| AI Platform | Document OCR, extraction, categorization, anomaly detection | ✅ Phase 13 |
| AWS Infrastructure | ECS Fargate, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront | ✅ Phase 13 |
| Integrations | QuickBooks, Zoho Books, Slack, Google Workspace, MS Teams | ✅ Phase 13 |
| Mobile PWA | Offline-capable, push notifications, app install prompt | ✅ Phase 13 |

### Delivery Roadmap

| Phase | Name | Status |
|---|---|---|
| 0–9 | Foundation → PDF Studio → Pixel | ✅ Done |
| 10 | Hardening + Infrastructure | ✅ Done |
| 11 | Razorpay Billing + Growth + Marketing | ✅ Done |
| 12 | Razorpay Expansion + API Platform + Enterprise | ✅ Done |
| 13 | AWS Migration + AI Platform + Integrations + Mobile | ✅ Done |
| **14** | **Advanced AR Automation + Customer Portal + Cash Flow Intelligence** | 🔲 This Document |
| **15** | **India Tax Compliance + Global Expansion + Marketplace + Dev Ecosystem v2** | 🔲 This Document |

---

## 2. Current State Post Phase 13

### What Exists in Codebase (Phase 13 Deliverables)

| File/Module | Location | Purpose |
|---|---|---|
| AWS infra config | `infra/` | ECS, RDS, S3, CloudFront, Route 53 |
| OCR jobs | `src/lib/ocr.ts` + `OcrJob` model | PDF text extraction |
| AI extraction | `src/app/api/ai/extract-document/` | AI-powered invoice data extraction |
| Integrations | `src/lib/integrations/` + `OrgIntegration` model | QuickBooks, Zoho, Slack, Google |
| Push notifications | `src/lib/push.ts` + `PushSubscription` model | Web push for key events |
| Mobile PWA | `next.config.ts` + `public/manifest.json` | Service worker, app manifest |
| Developer portal | `src/app/(marketing)/developers/` | API docs, guides, API key management |
| SSO / SAML | `src/lib/sso.ts` + `SsoConfig` model | SAML 2.0 enterprise SSO |
| Multi-org | `src/lib/multi-org.ts` + `OrgDomain` model | Org switching, domain claiming |
| White-label | `src/lib/white-label.ts` + `OrgWhiteLabel` model | Custom branding |
| Razorpay payment links | `src/lib/payment-links.ts` | Invoice pay-now flow |
| Razorpay virtual accounts | `CustomerVirtualAccount` model | Smart Collect |
| Unmatched payments | `UnmatchedPayment` model | Reconciliation queue |
| Invoice reconciliation | `src/lib/invoice-reconciliation.ts` | Ledger-driven canonical reconciliation |

### Pain Points / Gaps That Phase 14-15 Address

| Gap | Current State | Phase 14-15 Fix |
|---|---|---|
| No automated reminders | Manual follow-up only | Dunning engine with multi-step sequences |
| No customer self-service | Customers only get a tokenized invoice page | Full customer portal with history, statements |
| No quote workflow | Invoices only, no pre-invoice quotes | Quote → Approval → Convert to Invoice |
| No cash flow intelligence | Static AR aging report | Dynamic cash flow forecasting + health score |
| No GST e-invoicing | Manual GSTIN fields on invoice | Government IRN generation, e-way bill |
| No TDS/TCS tracking | No tax withholding support | TDS deduction ledger, Form 26AS export |
| No multi-language | English only | Hindi, Arabic, Spanish, French, German |
| No multi-currency invoice | INR-only | USD, EUR, GBP, AED invoice display + conversion |
| No template marketplace | Internal templates only | Buy/sell templates, community store |
| Webhook v1 limitations | Basic delivery, no retries | Webhook v2 with retry, versioning, dead-letter queue |
| No OAuth for third-party apps | API key only | OAuth 2.0 Authorization Code flow |

---

## 3. Phase 14 — Advanced AR Automation + Customer Self-Service Portal + Cash Flow Intelligence {#3-phase-14}

### Objective

Transform Slipwise One's SW Pay module from a reactive payment-tracking tool into a proactive AR automation platform. Equip businesses with intelligent dunning, customer self-service, quote workflows, and cash flow forecasting so they can reduce DSO (Days Sales Outstanding) and improve revenue predictability — all powered by Razorpay.

### 3.1 Sprint 14.1 — Dunning Engine + Smart Payment Reminders

**Goal:** Automate multi-step payment reminder sequences with escalating urgency, stopping automatically when the invoice is paid or a partial payment arrangement is made.

---

#### A. Dunning Engine Architecture

**Dunning** is the process of automated, progressively-urgent outreach to customers with overdue invoices. The engine must be:
- **Idempotent** — re-queuing jobs on app restart must not send duplicate reminders
- **Stoppable** — once an invoice transitions to `PAID`, `CANCELLED`, or `ARRANGEMENT_MADE`, all future reminders stop immediately
- **Configurable** — each org can define their own dunning sequence (step count, intervals, tone, channel)
- **Auditable** — every reminder sent is logged in `DunningLog` with status and error details

**Default Dunning Sequence (org-configurable):**

| Step | Trigger | Channel | Tone | Subject |
|---|---|---|---|---|
| Step 1 | Due date | Email | Friendly | "Your invoice is due today" |
| Step 2 | +3 days past due | Email + SMS | Polite | "Invoice INV-XXX is overdue" |
| Step 3 | +7 days past due | Email + SMS | Firm | "Action required: Invoice INV-XXX" |
| Step 4 | +14 days past due | Email | Urgent | "Final notice: Invoice INV-XXX" |
| Step 5 | +30 days past due | Email + Internal ticket | Escalate | Create internal `InvoiceTicket` marked ESCALATED + email |

**Fields:**
```
DunningSequence
  id             String   (cuid)
  orgId          String   (FK Organization)
  name           String   (e.g. "Standard 30-day sequence")
  isDefault      Boolean
  isActive       Boolean
  createdAt      DateTime
  updatedAt      DateTime

DunningStep
  id             String   (cuid)
  sequenceId     String   (FK DunningSequence)
  stepNumber     Int      (1-based)
  daysOffset     Int      (days relative to due date; 0 = on due date, 3 = 3 days past)
  channels       String[] (["email", "sms", "whatsapp"])
  emailSubject   String
  emailBody      String   (Markdown / template variable support)
  smsBody        String?
  tone           Enum     (FRIENDLY | POLITE | FIRM | URGENT | ESCALATE)
  createTicket   Boolean  (true for step 5 — triggers InvoiceTicket creation)
  createdAt      DateTime

DunningLog
  id             String   (cuid)
  orgId          String   (FK Organization)
  invoiceId      String   (FK Invoice)
  sequenceId     String   (FK DunningSequence)
  stepNumber     Int
  channel        String   (email | sms | whatsapp)
  status         Enum     (SENT | FAILED | SKIPPED)
  errorMessage   String?
  sentAt         DateTime?
  createdAt      DateTime
```

**Job Scheduling:**
- Trigger.dev cron job runs every 15 minutes: queries all `OVERDUE` and `PARTIALLY_PAID` invoices where `dueDate` is past
- For each invoice, computes which dunning step should fire based on `daysPastDue`
- Checks `DunningLog` — if this step was already sent for this invoice, skip (idempotency guard)
- Fires email via Resend, SMS via MSG91 (India) / Twilio (International), records `DunningLog`

**Stopping Conditions:** Any of these immediately cancel all pending dunning steps for the invoice:
- Invoice status changes to `PAID`
- Invoice status changes to `CANCELLED`
- Invoice status changes to `ARRANGEMENT_MADE` (new status — payment plan agreed)
- Org disables dunning for the invoice (`Invoice.dunningEnabled = false`)
- Customer unsubscribes from reminders (generates a `DunningOptOut` record)

**Dunning Template Variables:**
```
{{customer_name}}
{{invoice_number}}
{{invoice_amount}}
{{currency}}
{{due_date}}
{{days_overdue}}
{{pay_now_link}}
{{org_name}}
{{org_email}}
{{org_phone}}
{{partial_amount_paid}}
{{remaining_balance}}
```

---

#### B. Dunning Management UI

**Route:** `/app/pay/dunning`

**Pages:**

1. **`/app/pay/dunning`** — Dunning overview dashboard
   - Active sequences list
   - Pending reminder queue (next 7 days)
   - Dunning stats: reminders sent this month, response rate (paid within 3 days of reminder), avg days to pay after first reminder
   - Opt-out management

2. **`/app/pay/dunning/sequences`** — Sequence management
   - Create / edit / delete sequences
   - Toggle default sequence
   - Per-step email template editor (rich text with variable insertion)
   - Step preview (rendered email preview modal)

3. **`/app/pay/dunning/log`** — Dunning activity log
   - Filterable by invoice, customer, step, status, date range
   - CSV export

4. **`/app/pay/dunning/opt-outs`** — Customer opt-out list
   - Unsubscribe link in every reminder email generates a signed token → `GET /unsubscribe/dunning?token=...`
   - Org can manually re-enable opt-out

**Invoice Detail Integration:**
- On `/app/docs/invoices/[id]` — add "Dunning" tab:
  - Timeline of sent reminders
  - Toggle dunning on/off per invoice
  - Override sequence for this invoice
  - Manual "Send reminder now" button (fires next pending step immediately)

---

#### C. SMS Integration (India-first)

**Provider:** MSG91 (India) — fallback to Twilio for international

**MSG91 DLT (Distributed Ledger Technology) compliance:**
- All SMS templates pre-registered with TRAI via MSG91 DLT portal
- Template ID stored in `DunningStep.smsTemplateId`
- India sender ID: `SLIPWS`

**WhatsApp (Phase 14 stub, full in Phase 15):**
- `channels` array accepts `"whatsapp"` but implementation deferred
- Log with `status: SKIPPED` and `errorMessage: "WhatsApp not yet configured"` if selected
- No silent failure

---

#### D. Bulk Reminder Actions

**Route:** `POST /api/v1/invoices/bulk-remind`

**Request:**
```json
{
  "invoiceIds": ["inv_xxx", "inv_yyy"],
  "stepOverride": 2
}
```

**Behavior:** Fires dunning step 2 (or specified step) for all provided invoices immediately, regardless of schedule. Logs in `DunningLog` with channel `email`.

**Plan gate:** Pro+ only. Free / Starter orgs see reminder sent manually per invoice.

---

### 3.2 Sprint 14.2 — Customer Self-Service Portal

**Goal:** Give each customer of an org a dedicated self-service portal where they can view all their invoices, download statements, make payments, track payment history, and raise queries — without needing to register as a Slipwise user.

---

#### A. Customer Portal Architecture

**Access Model:**
- Customers do NOT need a Slipwise account
- Each customer has a unique **portal access token** (JWT, 30-day expiry, refreshable)
- Portal is hosted at `/portal/[orgSlug]/[customerToken]` (public route, no auth required)
- Org can optionally configure a custom domain (e.g., `portal.acme.com`) via `OrgWhiteLabel`
- Portal respects the org's white-label branding (logo, colors, custom name)

**Token Issuance:**
1. Org user clicks "Send Portal Access" on a customer record
2. System generates `CustomerPortalToken` (signed JWT, 30-day expiry, stored hashed in DB)
3. Email sent to customer with portal link
4. Customer clicks link → authenticated into their portal view
5. Token refresh: portal issues a new token on each visit if >15 days old (silent refresh)

**Security constraints:**
- Customers can ONLY see their own invoices (scoped by `Customer.id`)
- Customers cannot see other customers' data under the same org
- Customers cannot access org settings, other documents (vouchers, salary slips), or the internal app
- Portal token is single-use-per-session (new token on each login attempt for security)

---

#### B. Customer Portal Pages

**Route prefix:** `/portal/[orgSlug]`

**Pages:**

1. **`/portal/[orgSlug]`** — Portal login (enter email → receive magic link)
   - Customer enters email
   - System checks if customer exists under that org
   - Sends portal access email with signed token link
   - No password required

2. **`/portal/[orgSlug]/[token]/dashboard`** — Customer dashboard
   - Welcome header: "Hello, [Customer Name]"
   - Summary cards:
     - Total outstanding: ₹X
     - Overdue: ₹X (N invoices)
     - Paid this year: ₹X
     - Partial payments pending: N
   - Recent invoice list (last 5)
   - Quick action: "Pay Now" for any outstanding invoice

3. **`/portal/[orgSlug]/[token]/invoices`** — All invoices
   - Full list with filters: status (All / Unpaid / Partial / Paid / Overdue), date range
   - Per invoice: number, date, amount, status, action (View / Pay / Download PDF)
   - Pagination (20 per page)

4. **`/portal/[orgSlug]/[token]/invoices/[invoiceId]`** — Invoice detail
   - Full invoice render (same template as existing public invoice page)
   - Payment status timeline
   - Pay Now button (triggers Razorpay payment link)
   - Download PDF
   - Upload payment proof
   - Raise a query (creates `InvoiceTicket`)

5. **`/portal/[orgSlug]/[token]/payments`** — Payment history
   - All settled payments across all invoices
   - Per payment: date, invoice, amount, method (UPI/card/bank), Razorpay payment ID
   - Download payment receipt PDF

6. **`/portal/[orgSlug]/[token]/statements`** — Account statement
   - Date-range selector
   - Statement showing: opening balance, invoices raised, payments received, closing balance
   - Download as PDF (server-rendered via Puppeteer) or CSV

7. **`/portal/[orgSlug]/[token]/tickets`** — Support tickets
   - List of raised queries
   - Per ticket: subject, status (OPEN / RESOLVED), last reply, invoice reference
   - Create new ticket form

8. **`/portal/[orgSlug]/[token]/profile`** — Customer profile
   - View contact info (read-only — they cannot change address/details; must contact org)
   - Communication preferences: unsubscribe from dunning reminders

---

#### C. New Prisma Models (Customer Portal)

```
CustomerPortalToken
  id              String   (cuid)
  orgId           String   (FK Organization)
  customerId      String   (FK Customer)
  tokenHash       String   @unique  (SHA-256 hash of the JWT token)
  expiresAt       DateTime
  lastUsedAt      DateTime?
  isRevoked       Boolean  @default(false)
  createdAt       DateTime @default(now())

CustomerStatement
  id              String   (cuid)
  orgId           String   (FK Organization)
  customerId      String   (FK Customer)
  fromDate        DateTime
  toDate          DateTime
  openingBalance  Decimal
  closingBalance  Decimal
  totalInvoiced   Decimal
  totalReceived   Decimal
  fileUrl         String?  (S3/Supabase storage URL for generated PDF)
  generatedAt     DateTime @default(now())
```

---

#### D. Org-Side Customer Portal Management

**Route:** `/app/pay/portal`

- Enable/disable portal per org (toggle in settings)
- Customer list with portal status: "Active" / "Never sent" / "Token expired"
- Bulk "Send portal invites" to all customers
- Revoke access for a customer
- View portal access log (which customers visited, when, which pages)
- Configure portal branding (inherits OrgWhiteLabel but portal has additional overrides):
  - Portal header message ("Pay invoices from [Org Name]")
  - Footer text
  - Support email / phone shown on portal

---

#### E. Payment Flow from Customer Portal

1. Customer clicks "Pay Now" on invoice in portal
2. System calls `createRazorpayPaymentLink(invoiceId, customerId, amount, currency)`
3. Customer redirected to Razorpay hosted payment page
4. Payment completes → Razorpay fires `payment_link.paid` webhook
5. `handlePaymentLinkPaid()` runs → `reconcileInvoicePayment()` runs
6. Invoice status updated (PAID or PARTIALLY_PAID)
7. Customer portal reflects new status within 5 seconds (via SSE or polling)
8. Customer receives confirmation email (Resend)
9. Org admin receives "Invoice paid" push notification

---

### 3.3 Sprint 14.3 — Quote-to-Invoice + Cash Flow Intelligence

**Goal:** Add formal quote/estimate creation before invoicing, and build intelligent cash flow forecasting from AR data.

---

#### A. Quote / Estimate Module

**Business Logic:**
- A **Quote** is a pre-invoice document sent to a customer for approval
- Quotes can be: `DRAFT` → `SENT` → `ACCEPTED` → `CONVERTED` or `DECLINED` or `EXPIRED`
- When a quote is `ACCEPTED`, it can be **converted to an Invoice** in one click
- Quote conversion copies all line items, customer, tax rates, and branding to a new Invoice draft

**Quote Fields (mirrors Invoice with these differences):**
- `validUntil`: DateTime — after this, status auto-transitions to `EXPIRED`
- `termsAndConditions`: String — shown on PDF
- `notes`: String — internal notes (not shown on PDF)
- `acceptanceMethod`: Enum (`MANUAL` | `ONLINE_SIGNATURE`) — Phase 14 only implements MANUAL
- `convertedInvoiceId`: String? — set when converted

```
Quote
  id                  String   (cuid)
  orgId               String   (FK Organization)
  customerId          String   (FK Customer)
  quoteNumber         String   @unique (auto-generated: QTE-2026-0001)
  title               String
  status              Enum     (DRAFT | SENT | ACCEPTED | DECLINED | EXPIRED | CONVERTED)
  issueDate           DateTime
  validUntil          DateTime
  subtotal            Decimal
  taxAmount           Decimal
  discountAmount      Decimal
  totalAmount         Decimal
  currency            String   @default("INR")
  notes               String?
  termsAndConditions  String?
  templateId          String?
  convertedInvoiceId  String?  (set on conversion)
  acceptedAt          DateTime?
  declinedAt          DateTime?
  declineReason       String?
  createdBy           String   (FK Profile)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  archivedAt          DateTime?

QuoteLineItem
  id          String   (cuid)
  quoteId     String   (FK Quote)
  description String
  quantity    Decimal
  unitPrice   Decimal
  taxRate     Decimal
  amount      Decimal
  sortOrder   Int
```

**Quote PDF:** Uses the same template system as Invoice. Quote template header says "QUOTE" / "ESTIMATE" (configurable in org defaults). Same 5 template designs available.

**Routes:**
- `GET/POST /app/docs/quotes` — list + create
- `GET/PUT/DELETE /app/docs/quotes/[id]` — detail + edit + archive
- `POST /app/docs/quotes/[id]/send` — marks SENT, sends email with PDF
- `POST /app/docs/quotes/[id]/accept` — marks ACCEPTED
- `POST /app/docs/quotes/[id]/decline` — marks DECLINED, requires reason
- `POST /app/docs/quotes/[id]/convert` — converts ACCEPTED quote to Invoice (DRAFT)
- `GET /quote/[token]` — public customer-facing quote view page (tokenized, like invoice public page)

**Public Quote View (`/quote/[token]`):**
- Shows quote PDF render
- Accept button → marks quote ACCEPTED, fires confirmation email to org
- Decline button → shows reason textarea → marks DECLINED
- Download PDF
- Expiry countdown banner if within 3 days of `validUntil`

---

#### B. Cash Flow Intelligence Dashboard

**Route:** `/app/intel/cash-flow`

**Purpose:** Give business owners a forward-looking view of expected cash receipts and business financial health, derived entirely from SW Pay data (no manual input required).

**Dashboard Sections:**

1. **Cash Flow Forecast (Next 90 days)**
   - Bar chart: expected receivables per week (from UNPAID/PARTIALLY_PAID invoices by `dueDate`)
   - Colour coding: green (on time), orange (overdue 1-15 days), red (overdue 15+ days)
   - Toggle between optimistic (100% collection) / conservative (70% collection, based on customer payment history)

2. **AR Aging Report** (enhanced from existing)
   - Current (0 days) / 1-30 days / 31-60 days / 61-90 days / 90+ days
   - Per-customer breakdown
   - Total at-risk value highlighted
   - Export to CSV

3. **DSO (Days Sales Outstanding) Tracker**
   - Rolling 30/60/90 day DSO
   - Trend line chart
   - Industry benchmark comparison (hardcoded benchmarks for Indian SMB segments: manufacturing, services, trading)
   - Alert badge if DSO > 45 days

4. **Customer Payment Health Score**
   - Per customer: weighted score based on avg days to pay, payment disputes, partial payments
   - Score tiers: Excellent (< 10 days avg) / Good / Fair / At Risk
   - Shown on Customer detail page + used to suggest dunning sequence urgency

5. **Revenue Recognition Summary**
   - Monthly: raised vs collected vs outstanding
   - YTD: total invoiced, total received, total overdue
   - Pending in partial: amount received + remaining for all PARTIALLY_PAID invoices

6. **Alert Panel**
   - Invoices going overdue in next 48 hours (N invoices, ₹X total)
   - High-value invoices (>₹50,000) that are overdue 15+ days
   - Customers with payment health score "At Risk" who have open invoices

---

#### C. Payment Arrangement / Installment Plan

**Business case:** Customer can't pay the full amount at once — org agrees to a structured payment plan.

**New Status:** `ARRANGEMENT_MADE` — invoice is neither UNPAID nor PAID, it's under an agreed installment plan. Dunning stops automatically.

**Fields:**
```
PaymentArrangement
  id                  String   (cuid)
  orgId               String   (FK Organization)
  invoiceId           String   @unique (FK Invoice)
  customerId          String   (FK Customer)
  totalArranged       Decimal  (must equal invoice.remainingAmount at time of creation)
  installmentCount    Int      (number of agreed installments)
  status              Enum     (ACTIVE | COMPLETED | DEFAULTED | CANCELLED)
  notes               String?
  createdBy           String   (FK Profile)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

PaymentInstallment
  id                  String   (cuid)
  arrangementId       String   (FK PaymentArrangement)
  installmentNumber   Int
  dueDate             DateTime
  amount              Decimal
  status              Enum     (PENDING | PAID | OVERDUE | WAIVED)
  invoicePaymentId    String?  (FK InvoicePayment — set when paid)
  paidAt              DateTime?
  createdAt           DateTime @default(now())
```

**Installment dunning:** Each installment generates its own mini-dunning sequence (2 reminders max — on due date + 3 days after). Controlled via `Notification` system.

---

### 3.4 Database Schema Additions — Phase 14

```prisma
// ─── Dunning Engine ───────────────────────────────────────────────────────────

enum DunningTone {
  FRIENDLY
  POLITE
  FIRM
  URGENT
  ESCALATE
}

enum DunningLogStatus {
  SENT
  FAILED
  SKIPPED
}

model DunningSequence {
  id        String   @id @default(cuid())
  orgId     String
  name      String
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org   Organization  @relation(fields: [orgId], references: [id])
  steps DunningStep[]
  logs  DunningLog[]

  @@map("dunning_sequences")
}

model DunningStep {
  id           String      @id @default(cuid())
  sequenceId   String
  stepNumber   Int
  daysOffset   Int
  channels     String[]
  emailSubject String
  emailBody    String      @db.Text
  smsBody      String?
  smsTemplateId String?
  tone         DunningTone
  createTicket Boolean     @default(false)
  createdAt    DateTime    @default(now())

  sequence DunningSequence @relation(fields: [sequenceId], references: [id])

  @@unique([sequenceId, stepNumber])
  @@map("dunning_steps")
}

model DunningLog {
  id           String           @id @default(cuid())
  orgId        String
  invoiceId    String
  sequenceId   String
  stepNumber   Int
  channel      String
  status       DunningLogStatus
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime         @default(now())

  org      Organization    @relation(fields: [orgId], references: [id])
  invoice  Invoice         @relation(fields: [invoiceId], references: [id])
  sequence DunningSequence @relation(fields: [sequenceId], references: [id])

  @@map("dunning_logs")
}

model DunningOptOut {
  id         String   @id @default(cuid())
  orgId      String
  customerId String
  token      String   @unique
  optedOutAt DateTime @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@map("dunning_opt_outs")
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

model CustomerPortalToken {
  id          String    @id @default(cuid())
  orgId       String
  customerId  String
  tokenHash   String    @unique
  expiresAt   DateTime
  lastUsedAt  DateTime?
  isRevoked   Boolean   @default(false)
  createdAt   DateTime  @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@map("customer_portal_tokens")
}

model CustomerStatement {
  id              String   @id @default(cuid())
  orgId           String
  customerId      String
  fromDate        DateTime
  toDate          DateTime
  openingBalance  Decimal  @db.Decimal(12, 2)
  closingBalance  Decimal  @db.Decimal(12, 2)
  totalInvoiced   Decimal  @db.Decimal(12, 2)
  totalReceived   Decimal  @db.Decimal(12, 2)
  fileUrl         String?
  generatedAt     DateTime @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@map("customer_statements")
}

// ─── Quotes / Estimates ───────────────────────────────────────────────────────

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
  EXPIRED
  CONVERTED
}

model Quote {
  id                 String      @id @default(cuid())
  orgId              String
  customerId         String
  quoteNumber        String      @unique
  title              String
  status             QuoteStatus @default(DRAFT)
  issueDate          DateTime
  validUntil         DateTime
  subtotal           Decimal     @db.Decimal(12, 2)
  taxAmount          Decimal     @db.Decimal(12, 2)
  discountAmount     Decimal     @db.Decimal(12, 2) @default(0)
  totalAmount        Decimal     @db.Decimal(12, 2)
  currency           String      @default("INR")
  notes              String?     @db.Text
  termsAndConditions String?     @db.Text
  templateId         String?
  publicToken        String?     @unique
  convertedInvoiceId String?
  acceptedAt         DateTime?
  declinedAt         DateTime?
  declineReason      String?
  createdBy          String
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  archivedAt         DateTime?

  org       Organization    @relation(fields: [orgId], references: [id])
  customer  Customer        @relation(fields: [customerId], references: [id])
  creator   Profile         @relation(fields: [createdBy], references: [id])
  lineItems QuoteLineItem[]

  @@map("quotes")
}

model QuoteLineItem {
  id          String  @id @default(cuid())
  quoteId     String
  description String
  quantity    Decimal @db.Decimal(10, 3)
  unitPrice   Decimal @db.Decimal(12, 2)
  taxRate     Decimal @db.Decimal(5, 2)
  amount      Decimal @db.Decimal(12, 2)
  sortOrder   Int

  quote Quote @relation(fields: [quoteId], references: [id])

  @@map("quote_line_items")
}

// ─── Payment Arrangements / Installment Plans ────────────────────────────────

enum ArrangementStatus {
  ACTIVE
  COMPLETED
  DEFAULTED
  CANCELLED
}

enum InstallmentStatus {
  PENDING
  PAID
  OVERDUE
  WAIVED
}

model PaymentArrangement {
  id                 String            @id @default(cuid())
  orgId              String
  invoiceId          String            @unique
  customerId         String
  totalArranged      Decimal           @db.Decimal(12, 2)
  installmentCount   Int
  status             ArrangementStatus @default(ACTIVE)
  notes              String?
  createdBy          String
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  org          Organization        @relation(fields: [orgId], references: [id])
  invoice      Invoice             @relation(fields: [invoiceId], references: [id])
  customer     Customer            @relation(fields: [customerId], references: [id])
  creator      Profile             @relation(fields: [createdBy], references: [id])
  installments PaymentInstallment[]

  @@map("payment_arrangements")
}

model PaymentInstallment {
  id                String            @id @default(cuid())
  arrangementId     String
  installmentNumber Int
  dueDate           DateTime
  amount            Decimal           @db.Decimal(12, 2)
  status            InstallmentStatus @default(PENDING)
  invoicePaymentId  String?
  paidAt            DateTime?
  createdAt         DateTime          @default(now())

  arrangement    PaymentArrangement @relation(fields: [arrangementId], references: [id])
  invoicePayment InvoicePayment?    @relation(fields: [invoicePaymentId], references: [id])

  @@unique([arrangementId, installmentNumber])
  @@map("payment_installments")
}
```

**Invoice model additions (Phase 14):**
```prisma
// Add to Invoice model:
dunningEnabled      Boolean  @default(true)
dunningSequenceId   String?  // FK DunningSequence — null = use org default
arrangementStatus   Enum?    // mirrors PaymentArrangement.status for fast query
```

---

### 3.5 Route Map — Phase 14

#### Server Actions

| File | Action | Description |
|---|---|---|
| `src/app/app/pay/dunning/actions.ts` | `createDunningSequence` | Create custom sequence |
| `src/app/app/pay/dunning/actions.ts` | `updateDunningStep` | Edit step template |
| `src/app/app/pay/dunning/actions.ts` | `toggleInvoiceDunning` | Enable/disable dunning for invoice |
| `src/app/app/pay/dunning/actions.ts` | `sendImmediateReminder` | Manual fire of next step |
| `src/app/app/pay/portal/actions.ts` | `issuePortalToken` | Generate + email portal access |
| `src/app/app/pay/portal/actions.ts` | `revokePortalToken` | Revoke customer portal access |
| `src/app/app/docs/quotes/actions.ts` | `createQuote` | Draft a quote |
| `src/app/app/docs/quotes/actions.ts` | `sendQuote` | Mark SENT + email |
| `src/app/app/docs/quotes/actions.ts` | `convertQuoteToInvoice` | Create Invoice from ACCEPTED quote |
| `src/app/app/pay/arrangements/actions.ts` | `createArrangement` | Create installment plan |
| `src/app/app/pay/arrangements/actions.ts` | `recordInstallmentPayment` | Mark installment as paid |

#### API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/quotes` | List org quotes (API key auth, Pro+) |
| POST | `/api/v1/quotes` | Create quote |
| GET | `/api/v1/quotes/[id]` | Get quote |
| POST | `/api/v1/quotes/[id]/convert` | Convert to invoice |
| POST | `/api/invoices/[id]/dunning/send` | Manual reminder trigger |
| GET | `/api/intel/cash-flow` | Cash flow forecast data |
| GET | `/api/intel/ar-aging` | AR aging report |
| GET | `/api/intel/dso` | DSO metrics |

#### Public Routes

| Route | Description |
|---|---|
| `/portal/[orgSlug]` | Customer portal login |
| `/portal/[orgSlug]/[token]/dashboard` | Customer dashboard |
| `/portal/[orgSlug]/[token]/invoices` | Invoice list |
| `/portal/[orgSlug]/[token]/invoices/[id]` | Invoice detail + pay |
| `/portal/[orgSlug]/[token]/payments` | Payment history |
| `/portal/[orgSlug]/[token]/statements` | Account statement |
| `/portal/[orgSlug]/[token]/tickets` | Raise queries |
| `/quote/[token]` | Public quote view + accept/decline |
| `/unsubscribe/dunning` | Dunning opt-out (via signed token) |

#### Background Jobs (Trigger.dev)

| Job | Schedule | Description |
|---|---|---|
| `dunning-scheduler` | Every 15 min | Fire due dunning steps |
| `quote-expiry-checker` | Daily 9am IST | Expire quotes past `validUntil` |
| `installment-overdue-checker` | Daily 9am IST | Mark overdue installments |
| `portal-token-cleanup` | Daily midnight | Delete expired portal tokens |
| `cash-flow-snapshot` | Daily 6am IST | Pre-compute cash flow forecast |

---

### 3.6 Edge Cases & Acceptance Criteria — Phase 14

#### Dunning Engine

| Edge Case | Expected Behavior |
|---|---|
| Invoice paid while reminder is in-flight | Reminder still sends (race condition OK), but all future steps cancelled |
| Invoice partially paid between Step 2 and Step 3 | Step 3 fires with updated remaining balance in template variables |
| Customer opts out of reminders | `DunningOptOut` record created; all future steps SKIPPED not cancelled |
| Resend (email provider) rate limit hit | `DunningLog.status = FAILED`, `errorMessage = "rate_limited"`, retry in 1 hour |
| Dunning step fires for cancelled invoice | Check invoice.status before sending; SKIPPED if CANCELLED |
| Two orgs have invoices due same minute | Trigger.dev concurrency control; each org processed independently |
| Step 5 (createTicket) fires but ticket already exists | Idempotency: check for existing ESCALATED ticket for this invoice; skip creation |

#### Customer Portal

| Edge Case | Expected Behavior |
|---|---|
| Customer visits portal with expired token | Show "Session expired" page with "Request new link" button |
| Customer pays via portal but webhook delayed | Portal shows "Payment processing..." with 30s polling; resolves when webhook fires |
| Org disables portal after customer has active token | Customer sees "This portal has been disabled by [Org Name]" page |
| Customer tries to view invoice from different org | 403 — portal scoped strictly to `customerId` + `orgId` |
| Statement generation times out (large dataset) | Queue as background job; email customer when ready with download link |

#### Quotes

| Edge Case | Expected Behavior |
|---|---|
| Quote accepted after `validUntil` | Reject acceptance; return "Quote has expired" error |
| Quote converted twice | `convertedInvoiceId` set on first conversion; second attempt returns "Already converted" |
| Line items change after quote sent | Quote is immutable once SENT; must create new version (v2 — future enhancement note) |
| Customer declines quote without reason | `declineReason` optional; allowed empty but flagged in org notification |

---

## 4. Phase 15 — India Tax Compliance + Global Expansion + Template Marketplace + Developer Ecosystem v2 {#4-phase-15}

### Objective

Make Slipwise One the most compliant, global-ready, and developer-friendly document operations platform for India-origin SMBs expanding globally. Deliver:
1. Full India GST / e-invoicing / TDS compliance (critical for enterprise accounts in India)
2. Multi-language and multi-currency support for global users
3. A community template marketplace that drives organic growth
4. A hardened Developer Ecosystem v2 (OAuth, webhook v2, partner program)

---

### 4.1 Sprint 15.1 — India GST & Tax Compliance Engine

**Goal:** Make Slipwise One fully compliant with India GST regulations, including e-invoicing (IRN generation), e-way bill, TDS/TCS tracking, and GSTR data export — enabling enterprise Indian businesses to use Slipwise as their primary invoicing tool.

---

#### A. GST Invoice Compliance

**Current gap:** Invoices have GSTIN fields but no structured GST computation engine, no CGST/SGST/IGST split, no HSN/SAC code management.

**GST Computation Rules:**
- If supplier state == customer state → CGST + SGST (each at half the GST rate)
- If supplier state != customer state → IGST (at full GST rate)
- Exempt goods/services → GST rate = 0%
- Composition scheme dealers → different rates (1%, 2%, 5%)

**GST Rate Slabs:** 0%, 5%, 12%, 18%, 28%

**New Fields on InvoiceLineItem:**
```prisma
hsnCode         String?   // HSN code (goods) or SAC code (services)
gstRate         Decimal?  @db.Decimal(5, 2)   // 0, 5, 12, 18, 28
gstType         Enum?     // CGST_SGST | IGST | EXEMPT
cgstAmount      Decimal?  @db.Decimal(10, 2)
sgstAmount      Decimal?  @db.Decimal(10, 2)
igstAmount      Decimal?  @db.Decimal(10, 2)
cessAmount      Decimal?  @db.Decimal(10, 2)  // cess on 28% items
```

**New Fields on Invoice:**
```prisma
supplierGstin   String?
customerGstin   String?
placeOfSupply   String?   // state code (e.g., "29" for Karnataka)
reverseCharge   Boolean   @default(false)
exportType      Enum?     // REGULAR | SEZ | EXPORT | DEEMED_EXPORT
gstTotalCgst    Decimal?  @db.Decimal(10, 2)
gstTotalSgst    Decimal?  @db.Decimal(10, 2)
gstTotalIgst    Decimal?  @db.Decimal(10, 2)
gstTotalCess    Decimal?  @db.Decimal(10, 2)
irnNumber       String?   // Invoice Reference Number (from NIC portal)
irnAckNumber    String?
irnAckDate      DateTime?
irnQrCode       String?   // Base64 QR code data
eWayBillNumber  String?
eWayBillDate    DateTime?
eWayBillExpiry  DateTime?
```

**HSN/SAC Master Model:**
```prisma
model HsnSacCode {
  id          String  @id @default(cuid())
  code        String  @unique
  type        Enum    // HSN | SAC
  description String
  gstRate     Decimal @db.Decimal(5, 2)
  cessRate    Decimal @db.Decimal(5, 2) @default(0)

  @@map("hsn_sac_codes")
}
```

Seed database with top 500 HSN/SAC codes. UI provides searchable autocomplete on line item entry.

---

#### B. e-Invoicing (IRN Generation via NIC Portal / IRP)

**What is e-Invoicing:**
India mandates e-invoicing (electronic invoice reporting) for businesses with turnover > ₹5 crore (threshold lowering yearly). Invoices must be uploaded to the Invoice Registration Portal (IRP), which returns a signed QR code and IRN (Invoice Reference Number). The invoice is only legally valid once IRN is generated.

**e-Invoicing Flow:**
1. User creates invoice in Slipwise → status `DRAFT`
2. User clicks "Generate IRN" button (or auto-generate on finalize)
3. Slipwise prepares JSON payload as per GST e-invoice schema v1.1
4. POST to IRP sandbox/production API: `POST https://einvoice1.gst.gov.in/eicore/v1.03/Invoice`
5. IRP returns: `AckNo`, `AckDt`, `Irn`, `SignedQRCode`, `SignedInvoice`
6. Store IRN, AckNo, AckDt, SignedQRCode in Invoice model
7. Print QR code on invoice PDF (mandatory)
8. Invoice is now legally valid

**IRP Integration:**
- Use `@einvoice/client` or direct HTTP calls with JWT auth to NIC portal
- Sandbox testing before prod: `https://einv-apisandbox.nic.in/`
- Auth: session token via `POST /eivital/v1.04/auth` with GSTIN + client ID + client secret
- Session token valid 6 hours — refresh using Trigger.dev job

**IRN Error Handling:**
- `2150`: Duplicate IRN (invoice already registered) → fetch existing IRN
- `2130`: GSTIN inactive → show user-friendly error with link to GST portal
- `2000`: Success
- Network errors: retry 3 times with exponential backoff; keep invoice in `DRAFT` if all retries fail

**Plan gate:** e-Invoicing available on Pro and Enterprise plans only. Free/Starter sees "Upgrade to Pro for e-Invoicing" in IRN button.

---

#### C. e-Way Bill Integration

**What is e-Way Bill:**
Required for movement of goods worth > ₹50,000. Generated on the NIC e-Way Bill portal.

**e-Way Bill Fields (additions to Invoice):**
```prisma
ewbTransportMode    Enum?   // ROAD | RAIL | AIR | SHIP
ewbVehicleNumber    String?
ewbTransporterGstin String?
ewbTransportDocNo   String?
ewbDistanceKm       Int?
ewbFromPincode      String?
ewbToPincode        String?
```

**Flow:** After IRN generated, user optionally generates e-Way Bill on same screen. API: NIC e-Way Bill portal API. This is services-type invoices optional (many Slipwise users are service businesses).

---

#### D. TDS / TCS Management

**TDS (Tax Deducted at Source):** Buyer deducts TDS from payment; must report to IT dept via TDS returns.

**TCS (Tax Collected at Source):** Seller collects TCS on certain transactions.

```prisma
enum TdsSection {
  SECTION_194A  // Interest
  SECTION_194C  // Contractors
  SECTION_194J  // Professional services
  SECTION_194H  // Commission
  SECTION_194I  // Rent
  SECTION_194Q  // Purchase of goods
  OTHER
}

model TdsRecord {
  id             String     @id @default(cuid())
  orgId          String
  invoiceId      String
  customerId     String
  section        TdsSection
  tdsRate        Decimal    @db.Decimal(5, 2)
  tdsAmount      Decimal    @db.Decimal(10, 2)
  netPayable     Decimal    @db.Decimal(10, 2)  // invoice total - tdsAmount
  certificateNo  String?    // TDS certificate number from customer
  quarter        String     // "Q1-FY2026-27"
  status         Enum       // PENDING_CERT | CERT_RECEIVED | INCLUDED_IN_RETURN
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  org      Organization @relation(fields: [orgId], references: [id])
  invoice  Invoice      @relation(fields: [invoiceId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@map("tds_records")
}
```

**TDS UI:**
- On invoice creation: optional "TDS Deduction" section — select section, auto-compute TDS amount
- TDS dashboard at `/app/pay/tds`:
  - Per-customer TDS summary
  - Form 26AS reconciliation (upload 26AS PDF → OCR matches to TDS records — uses existing AI/OCR)
  - Quarterly TDS report (export CSV for CA/tax consultant)

---

#### E. GSTR Data Export

**What:** Export invoice data in GSTR-1/GSTR-3B compatible format for accountants/CAs.

**GSTR-1 export:** B2B invoices with GSTIN — structured Excel/CSV per GST portal specification

**GSTR-3B summary:** Monthly summary (outward supplies, inward supplies, ITC available)

**Route:** `/app/intel/gst-reports`
- Month/quarter selector
- Download GSTR-1 (B2B) CSV
- Download GSTR-1 (B2C) CSV
- Download GSTR-3B summary
- Reconciliation check: flag invoices with missing GSTIN or HSN codes

**Plan gate:** GST reports available on Pro and Enterprise plans.

---

### 4.2 Sprint 15.2 — Global Expansion: Multi-Language + Multi-Currency + Localization

**Goal:** Support Slipwise One users outside India and Indian businesses with international clients, by adding multi-language document generation and multi-currency invoice display.

---

#### A. Multi-Language Support

**Scope:** Language support affects two distinct areas:
1. **App UI language** (the dashboard, forms, menus)
2. **Document language** (the PDF that gets sent to customers)

These are **independent settings** — an org might run the app in English but send invoices in Arabic.

**Phase 15 supported languages:**

| Language | Code | UI | Documents | RTL |
|---|---|---|---|---|
| English | `en` | ✅ (current) | ✅ (current) | No |
| Hindi | `hi` | ✅ | ✅ | No |
| Arabic | `ar` | ✅ | ✅ | **Yes** |
| Spanish | `es` | ✅ | ✅ | No |
| French | `fr` | ✅ | ✅ | No |
| German | `de` | ✅ | ✅ | No |

**Implementation:**
- App UI: Next.js `next-intl` library for i18n routing (`/en/app/...`, `/hi/app/...`, etc.)
- Translation files: `src/locales/[lang]/common.json`, `invoices.json`, `vouchers.json`, etc.
- Document language: set per-invoice at creation time (defaults to org language)
- PDF generation: document templates render labels (Invoice, Date, Amount, etc.) in selected language
- RTL PDF support for Arabic: `pdf-lib` right-to-left text rendering with Arabic font (Noto Sans Arabic)

**Org Settings:**
```prisma
// Add to OrgDefaults:
defaultLanguage     String  @default("en")
defaultDocLanguage  String  @default("en")  // language for PDFs sent to customers
```

**Customer-level language override:**
```prisma
// Add to Customer:
preferredLanguage   String?  // if set, PDFs sent to this customer use this language
```

---

#### B. Multi-Currency Invoice Display

**Current state:** All invoices stored in INR. Phase 15 adds display conversion and multi-currency invoicing.

**Multi-currency rules:**
- The **accounting currency** (what's stored in DB, used for AR aging, tax) is always the org's base currency (default: INR)
- The **display currency** can be different — invoice shows amount in USD with exchange rate footnote
- Exchange rate source: Open Exchange Rates API (free tier, daily refresh) or manual override
- Tax computation is always in base currency (INR)

**New Invoice fields:**
```prisma
displayCurrency     String?   // ISO 4217 (e.g., "USD", "EUR", "AED")
exchangeRate        Decimal?  @db.Decimal(14, 6)  // displayCurrency to INR rate at invoice creation
displayTotalAmount  Decimal?  @db.Decimal(12, 2)  // totalAmount * exchangeRate
exchangeRateDate    DateTime? // when the rate was fetched
```

**Invoice PDF:** When `displayCurrency` is set, PDF shows:
```
Invoice Total: USD 1,200.00
(Equivalent: ₹99,960 at USD 1 = ₹83.30 on 08-Apr-2026)
```

**Currency Model:**
```prisma
model ExchangeRate {
  id           String   @id @default(cuid())
  fromCurrency String
  toCurrency   String
  rate         Decimal  @db.Decimal(14, 6)
  fetchedAt    DateTime @default(now())

  @@unique([fromCurrency, toCurrency, fetchedAt])
  @@map("exchange_rates")
}
```

**Trigger.dev job:** `exchange-rate-refresh` — daily 7am IST, fetches rates for USD, EUR, GBP, AED, SGD, AUD, SAR from Open Exchange Rates API.

---

#### C. Localized Invoice Formats

**Country-specific invoice format templates:**

| Country/Region | Specific Requirements |
|---|---|
| India | GSTIN, HSN/SAC, CGST/SGST/IGST columns, IRN QR code, "Tax Invoice" header |
| UAE / GCC | TRN (Tax Registration Number), VAT 5%, Arabic + English bilingual |
| UK | VAT registration number, "VAT Invoice" header, GBP |
| US | No VAT, optional state tax, USD, "Invoice" |
| Germany/EU | USt-IdNr. (VAT number), EUR, "Rechnung" header |

**Implementation:** `InvoiceTemplate.countryFormat` field selects the country-specific rendering variant. Templates auto-detect from `org.country` if not overridden per invoice.

---

#### D. Org Country and Tax Registration

```prisma
// Add to OrgDefaults or Organization:
country           String  @default("IN")   // ISO 3166-1 alpha-2
baseCurrency      String  @default("INR")  // ISO 4217
timezone          String  @default("Asia/Kolkata")
vatRegNumber      String?   // UAE TRN, UK VAT, EU VAT number
vatRate           Decimal?  @db.Decimal(5, 2)  // e.g., 5 for UAE, 20 for UK
fiscalYearStart   Int     @default(4)  // month number (4 = April for India)
```

---

### 4.3 Sprint 15.3 — Template Marketplace + Developer Ecosystem v2

**Goal:** Build a self-sustaining template economy and a hardened developer platform with OAuth, reliable webhooks, and a partner program.

---

#### A. Template Marketplace

**Vision:** A marketplace where:
1. **Slipwise curates** a library of premium, professionally designed invoice/voucher/salary slip templates
2. **Org admins can publish** their custom templates to sell to other orgs (with revenue sharing)
3. **All orgs can browse and install** templates — free ones instantly, paid ones via Razorpay payment

**Marketplace Architecture:**

```
MarketplaceTemplate
  id                String    (cuid)
  templateType      Enum      (INVOICE | VOUCHER | SALARY_SLIP)
  name              String
  description       String
  previewImageUrl   String    (S3 URL)
  previewPdfUrl     String    (S3 URL)
  category          String[]  (["modern", "minimalist", "gst-compliant", "international"])
  tags              String[]
  price             Decimal   @db.Decimal(8, 2)  (0 = free)
  currency          String    @default("INR")
  publisherOrgId    String?   (null = Slipwise official)
  publisherName     String    ("Slipwise" | org name)
  isOfficial        Boolean   @default(false)
  isApproved        Boolean   @default(false)  (marketplace review gate)
  status            Enum      (DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED)
  downloadCount     Int       @default(0)
  rating            Decimal?  @db.Decimal(3, 2)
  ratingCount       Int       @default(0)
  templateData      Json      (the actual template config JSON)
  version           String    @default("1.0.0")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

MarketplacePurchase
  id                String   (cuid)
  orgId             String   (FK Organization)
  templateId        String   (FK MarketplaceTemplate)
  amount            Decimal  @db.Decimal(8, 2)
  razorpayPaymentId String?
  installedAt       DateTime @default(now())
  
  @@unique([orgId, templateId])

MarketplaceReview
  id                String   (cuid)
  orgId             String   (FK Organization)
  templateId        String   (FK MarketplaceTemplate)
  rating            Int      // 1-5
  review            String?
  createdAt         DateTime @default(now())
  
  @@unique([orgId, templateId])
```

**Marketplace Pages:**

1. **`/app/docs/templates/marketplace`** — Browse all templates
   - Category filter (All / Invoice / Voucher / Salary Slip)
   - Tag filter (modern, GST-compliant, minimalist, etc.)
   - Sort: Popular / Newest / Top-rated / Free first
   - Template card: preview image, name, publisher, price/FREE badge, rating
   - "Preview" → modal with full PDF preview
   - "Install" → free: immediate | paid: Razorpay checkout

2. **`/app/docs/templates/my-templates`** — Installed + created templates
   - Tabs: Installed (from marketplace) / Created (custom)
   - Set as default per document type

3. **`/app/docs/templates/publish`** — Publish a template to marketplace
   - Only orgs on Pro+ can publish
   - Upload preview image, write description, set price
   - Submit for review → Slipwise reviews within 48h

4. **`/(marketing)/marketplace`** — Public marketing page
   - Showcase top templates
   - Drive discovery (SEO: "free GST invoice template India")
   - CTA: "Install free" → redirects to signup if not logged in

**Revenue Sharing:**
- Paid templates: 70% to publisher org, 30% to Slipwise (Razorpay transfer via RazorpayX payout — Phase 16 stub)
- Phase 15: revenue sharing tracked in `MarketplaceRevenue` model; actual payouts manual in Phase 15, automated in Phase 16

---

#### B. Developer Ecosystem v2

**OAuth 2.0 Authorization Code Flow:**

Phase 12 implemented API key auth. Phase 15 adds OAuth 2.0 so third-party developers can build apps that connect to customer Slipwise accounts without sharing API keys.

```
OAuthApp
  id              String   (cuid)
  orgId           String   (FK Organization — the developer's org)
  name            String
  description     String
  websiteUrl      String
  redirectUris    String[] (allowed redirect URIs)
  logoUrl         String?
  clientId        String   @unique (auto-generated)
  clientSecret    String   (hashed with bcrypt)
  scopes          String[] (allowed scope list)
  isPublic        Boolean  @default(false)  (listed in marketplace)
  isApproved      Boolean  @default(false)  (Slipwise review)
  createdAt       DateTime @default(now())

OAuthAuthorization
  id              String   (cuid)
  appId           String   (FK OAuthApp)
  orgId           String   (FK Organization — the resource owner's org)
  grantedBy       String   (FK Profile)
  scopes          String[]
  accessToken     String   @unique (hashed)
  refreshToken    String   @unique (hashed)
  accessExpiresAt  DateTime
  refreshExpiresAt DateTime
  isRevoked       Boolean  @default(false)
  createdAt       DateTime @default(now())
```

**OAuth Endpoints:**
- `GET /oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=...` — authorization page
- `POST /oauth/token` — exchange code for access/refresh token
- `POST /oauth/token/refresh` — refresh access token
- `POST /oauth/revoke` — revoke token
- `GET /api/v1/me` — get token info (which org, which scopes)

**Webhook v2 (Reliable Delivery):**

Phase 12 webhooks had no retry mechanism. Phase 15 replaces with Webhook v2:

```
ApiWebhookEndpoint v2 additions:
  apiVersion        String   @default("v2")
  signingSecret     String   (HMAC-SHA256 key)
  maxRetries        Int      @default(5)
  retryBackoff      String   @default("exponential")  // "exponential" | "linear"
  isActive          Boolean  @default(true)
  consecutiveFails  Int      @default(0)
  autoDisableAt     Int      @default(10)  // disable after N consecutive fails
  lastDeliveryAt    DateTime?
  lastSuccessAt     DateTime?

ApiWebhookDelivery v2 additions:
  attempt           Int      @default(1)
  nextRetryAt       DateTime?
  requestBody       Json
  responseStatus    Int?
  responseBody      String?
  durationMs        Int?
  deliveredAt       DateTime?
```

**Retry logic (Trigger.dev job `webhook-retry`):**
- Failed deliveries retried at: 1min → 5min → 15min → 1hr → 4hr → 24hr
- After `maxRetries` exhausted → `ApiWebhookDelivery.status = "dead_lettered"`
- Dead-letter queue visible in developer portal
- Org can manually replay dead-lettered deliveries

**Webhook Signature Verification (v2):**
```
X-Slipwise-Signature: sha256=<HMAC-SHA256(signingSecret, rawBody)>
X-Slipwise-Delivery: <delivery_id>
X-Slipwise-Event: invoice.paid
X-Slipwise-Timestamp: <unix_timestamp>
```

**Developer Portal Enhancements:**

Route: `/developers` (marketing) + `/app/settings/developer` (in-app)

New pages:
- **`/app/settings/developer/oauth-apps`** — Create and manage OAuth apps
- **`/app/settings/developer/webhooks/v2`** — Webhook v2 management with delivery log and replay
- **`/app/settings/developer/webhooks/[id]/deliveries`** — Per-endpoint delivery timeline
- **`/developers/oauth`** — OAuth flow documentation (public)
- **`/developers/webhooks`** — Webhook v2 documentation with signature verification guide (public)

---

#### C. Partner / Reseller Program (Phase 15 Foundation)

**Partner types:**
- **Accountant Partners** — CAs and accounting firms who manage multiple client orgs on Slipwise
- **Technology Partners** — SaaS tools that integrate with Slipwise via API/OAuth
- **Reseller Partners** — Agencies that resell Slipwise to their clients

```prisma
enum PartnerType {
  ACCOUNTANT
  TECHNOLOGY
  RESELLER
}

model PartnerProfile {
  id              String      @id @default(cuid())
  orgId           String      @unique (FK Organization)
  type            PartnerType
  companyName     String
  website         String?
  description     String?
  logoUrl         String?
  status          Enum        (PENDING | APPROVED | SUSPENDED)
  partnerCode     String      @unique  // for referral tracking
  revenueShare    Decimal     @db.Decimal(5, 2)  // percentage (e.g., 20.00)
  managedOrgCount Int         @default(0)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@map("partner_profiles")
}

model PartnerManagedOrg {
  id          String   @id @default(cuid())
  partnerId   String   (FK PartnerProfile)
  orgId       String   (FK Organization — client org)
  addedAt     DateTime @default(now())

  @@unique([partnerId, orgId])
  @@map("partner_managed_orgs")
}
```

**Partner Portal:** `/app/partner`
- Partner dashboard: managed client count, revenue, referral stats
- Client list: add/remove managed clients (requires client org to grant partner access)
- Billing overview: revenue share earned, payout history
- Quick-switch: jump into any managed client's org context

**Accountant Partner use case:**
- CA firm creates their Slipwise org → applies for Accountant Partner status
- Approved → gets access to multi-org view
- Clients authorize the CA's org to view/manage their invoices (scoped permission grant)
- CA can generate GST reports, reconcile TDS, export for filing — all from one portal

---

### 4.4 Database Schema Additions — Phase 15

```prisma
// ─── GST / e-Invoicing ────────────────────────────────────────────────────────

enum GstType {
  CGST_SGST
  IGST
  EXEMPT
}

enum TdsSection {
  SECTION_194A
  SECTION_194C
  SECTION_194J
  SECTION_194H
  SECTION_194I
  SECTION_194Q
  OTHER
}

model HsnSacCode {
  id          String  @id @default(cuid())
  code        String  @unique
  type        String  // "HSN" | "SAC"
  description String
  gstRate     Decimal @db.Decimal(5, 2)
  cessRate    Decimal @db.Decimal(5, 2) @default(0)

  @@map("hsn_sac_codes")
}

model TdsRecord {
  id            String     @id @default(cuid())
  orgId         String
  invoiceId     String
  customerId    String
  section       TdsSection
  tdsRate       Decimal    @db.Decimal(5, 2)
  tdsAmount     Decimal    @db.Decimal(10, 2)
  netPayable    Decimal    @db.Decimal(10, 2)
  certificateNo String?
  quarter       String
  status        String     @default("PENDING_CERT")
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  org      Organization @relation(fields: [orgId], references: [id])
  invoice  Invoice      @relation(fields: [invoiceId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@map("tds_records")
}

// ─── Multi-Currency ───────────────────────────────────────────────────────────

model ExchangeRate {
  id           String   @id @default(cuid())
  fromCurrency String
  toCurrency   String
  rate         Decimal  @db.Decimal(14, 6)
  fetchedAt    DateTime @default(now())

  @@unique([fromCurrency, toCurrency, fetchedAt])
  @@map("exchange_rates")
}

// ─── Template Marketplace ─────────────────────────────────────────────────────

enum MarketplaceTemplateStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  REJECTED
  ARCHIVED
}

model MarketplaceTemplate {
  id              String                    @id @default(cuid())
  templateType    String
  name            String
  description     String
  previewImageUrl String
  previewPdfUrl   String?
  category        String[]
  tags            String[]
  price           Decimal                   @db.Decimal(8, 2)
  currency        String                    @default("INR")
  publisherOrgId  String?
  publisherName   String
  isOfficial      Boolean                   @default(false)
  isApproved      Boolean                   @default(false)
  status          MarketplaceTemplateStatus @default(DRAFT)
  downloadCount   Int                       @default(0)
  rating          Decimal?                  @db.Decimal(3, 2)
  ratingCount     Int                       @default(0)
  templateData    Json
  version         String                    @default("1.0.0")
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  publisherOrg Organization?         @relation(fields: [publisherOrgId], references: [id])
  purchases    MarketplacePurchase[]
  reviews      MarketplaceReview[]

  @@map("marketplace_templates")
}

model MarketplacePurchase {
  id                String   @id @default(cuid())
  orgId             String
  templateId        String
  amount            Decimal  @db.Decimal(8, 2)
  razorpayPaymentId String?
  installedAt       DateTime @default(now())

  org      Organization        @relation(fields: [orgId], references: [id])
  template MarketplaceTemplate @relation(fields: [templateId], references: [id])

  @@unique([orgId, templateId])
  @@map("marketplace_purchases")
}

model MarketplaceReview {
  id         String   @id @default(cuid())
  orgId      String
  templateId String
  rating     Int
  review     String?
  createdAt  DateTime @default(now())

  org      Organization        @relation(fields: [orgId], references: [id])
  template MarketplaceTemplate @relation(fields: [templateId], references: [id])

  @@unique([orgId, templateId])
  @@map("marketplace_reviews")
}

// ─── OAuth 2.0 ────────────────────────────────────────────────────────────────

model OAuthApp {
  id           String   @id @default(cuid())
  orgId        String
  name         String
  description  String
  websiteUrl   String
  redirectUris String[]
  logoUrl      String?
  clientId     String   @unique
  clientSecret String
  scopes       String[]
  isPublic     Boolean  @default(false)
  isApproved   Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  org            Organization        @relation(fields: [orgId], references: [id])
  authorizations OAuthAuthorization[]

  @@map("oauth_apps")
}

model OAuthAuthorization {
  id               String   @id @default(cuid())
  appId            String
  orgId            String
  grantedBy        String
  scopes           String[]
  accessToken      String   @unique
  refreshToken     String   @unique
  accessExpiresAt  DateTime
  refreshExpiresAt DateTime
  isRevoked        Boolean  @default(false)
  createdAt        DateTime @default(now())

  app       OAuthApp     @relation(fields: [appId], references: [id])
  org       Organization @relation(fields: [orgId], references: [id])
  grantedByProfile Profile @relation(fields: [grantedBy], references: [id])

  @@map("oauth_authorizations")
}

// ─── Partner Program ──────────────────────────────────────────────────────────

enum PartnerType {
  ACCOUNTANT
  TECHNOLOGY
  RESELLER
}

model PartnerProfile {
  id              String      @id @default(cuid())
  orgId           String      @unique
  type            PartnerType
  companyName     String
  website         String?
  description     String?
  logoUrl         String?
  status          String      @default("PENDING")
  partnerCode     String      @unique
  revenueShare    Decimal     @db.Decimal(5, 2)
  managedOrgCount Int         @default(0)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  org         Organization        @relation(fields: [orgId], references: [id])
  managedOrgs PartnerManagedOrg[]

  @@map("partner_profiles")
}

model PartnerManagedOrg {
  id        String   @id @default(cuid())
  partnerId String
  orgId     String
  addedAt   DateTime @default(now())

  partner PartnerProfile @relation(fields: [partnerId], references: [id])
  org     Organization   @relation(fields: [orgId], references: [id])

  @@unique([partnerId, orgId])
  @@map("partner_managed_orgs")
}
```

---

### 4.5 Route Map — Phase 15

#### App Routes

| Route | Description |
|---|---|
| `/app/pay/tds` | TDS management dashboard |
| `/app/pay/tds/[invoiceId]` | TDS record for invoice |
| `/app/intel/gst-reports` | GSTR-1 / GSTR-3B data export |
| `/app/intel/cash-flow` | Cash flow dashboard (moved from Phase 14 stub) |
| `/app/docs/invoices/[id]/irn` | IRN generation page |
| `/app/docs/quotes` | Quote list |
| `/app/docs/quotes/[id]` | Quote detail + edit |
| `/app/docs/templates/marketplace` | Template marketplace |
| `/app/docs/templates/my-templates` | Installed templates |
| `/app/docs/templates/publish` | Publish a template |
| `/app/settings/developer/oauth-apps` | OAuth app management |
| `/app/settings/developer/webhooks/v2` | Webhook v2 management |
| `/app/partner` | Partner portal |
| `/app/partner/clients` | Managed client list |

#### API Routes

| Method | Route | Description |
|---|---|
| POST | `/api/gst/irn/generate` | Generate IRN for invoice |
| POST | `/api/gst/eway-bill` | Generate e-Way Bill |
| GET | `/api/gst/reports/gstr1` | GSTR-1 export data |
| GET | `/api/gst/reports/gstr3b` | GSTR-3B summary |
| GET | `/api/marketplace/templates` | Browse marketplace |
| GET | `/api/marketplace/templates/[id]` | Template detail |
| POST | `/api/marketplace/templates/[id]/install` | Install free template |
| POST | `/api/marketplace/purchase` | Purchase paid template (Razorpay) |
| GET/POST | `/oauth/authorize` | OAuth authorization |
| POST | `/oauth/token` | OAuth token exchange |
| POST | `/oauth/token/refresh` | OAuth token refresh |
| POST | `/oauth/revoke` | OAuth revoke |
| GET | `/api/v1/me` | Token introspection |
| GET | `/api/exchange-rates` | Get current exchange rates |

#### Background Jobs (Trigger.dev — Phase 15 additions)

| Job | Schedule | Description |
|---|---|---|
| `exchange-rate-refresh` | Daily 7am IST | Refresh exchange rates from Open Exchange Rates |
| `irn-session-refresh` | Every 5 hours | Refresh IRP session token |
| `quote-expiry-checker` | Daily 9am IST | Expire quotes past validUntil (if not done in Phase 14) |
| `webhook-retry-v2` | Every 1 min | Retry failed webhook deliveries |
| `marketplace-stats-rollup` | Daily midnight | Update download counts, rating averages |
| `partner-org-sync` | Hourly | Sync managed org count to PartnerProfile |

---

### 4.6 Edge Cases & Acceptance Criteria — Phase 15

#### GST / e-Invoicing

| Edge Case | Expected Behavior |
|---|---|
| IRP API down | Retry 3x with backoff; keep invoice in DRAFT; show "IRP unavailable" error with manual retry button |
| Duplicate IRN (error 2150) | Fetch existing IRN from IRP and save — treat as success |
| GSTIN format validation fails | Show inline error before even calling IRP API |
| Invoice modified after IRN generated | IRN is immutable — show "Cancel and re-issue required" warning; block editing |
| e-Way Bill optional for services | Hide e-Way Bill section for service-type invoices (no HSN physical goods code) |
| TDS rate changes mid-year | `TdsRecord.tdsRate` stored at time of recording; no retroactive changes |
| GSTR-1 export with missing GSTIN | Flag affected invoices in report; export excludes them from B2B table but includes in B2C |

#### Multi-Language / Multi-Currency

| Edge Case | Expected Behavior |
|---|---|
| Arabic RTL invoice with LTR numbers | Numbers remain LTR within RTL text per Unicode BiDi standard |
| Exchange rate API unavailable | Use last cached rate; display "Rate as of [date]" footnote; alert if rate > 7 days old |
| Customer preferred language different from org default | Customer language takes precedence for PDFs sent to that customer |
| Currency mismatch on payment | Payment always processed in INR (Razorpay); display currency is cosmetic only |

#### Template Marketplace

| Edge Case | Expected Behavior |
|---|---|
| Org tries to install already-installed template | Idempotent: skip install, show "Already installed" |
| Paid template purchase fails (Razorpay) | No installation; payment failure page with retry |
| Publisher deletes published template | Mark ARCHIVED; all orgs that installed it keep their installed copy |
| Org rates a template before purchasing | Block: "You must install this template to review it" |
| Template review fails Slipwise QA | Status = REJECTED; publisher notified with reason |

#### OAuth 2.0

| Edge Case | Expected Behavior |
|---|---|
| Access token expired | Return 401 with `error: "token_expired"`; client must use refresh token |
| Refresh token expired | Return 401 `error: "refresh_token_expired"`; user must re-authorize |
| App requests more scopes than granted | Token only has scopes user consented to; extra scopes silently excluded |
| Same app authorized twice by same org | Existing authorization updated (scopes merged + refreshed); no duplicate records |
| App revoked but access token still presented | Immediate 401; no grace period |

---

## 5. Shared Technical Standards

### Authentication
- Internal routes: Supabase session (`createSupabaseServer` from `@/lib/supabase/server`)
- API routes (v1): API key via `validateApiKey()` from `@/lib/api-keys.ts`
- API routes (v2/OAuth): Bearer token via `OAuthAuthorization` lookup
- Public routes (customer portal, quote page): signed token in URL (no session)

### Authorization
- All org data scoped by `orgId` on every DB query
- Permission checks via `requirePermission(orgId, userId, module, action)` from `@/lib/permissions.ts`
- Plan gates via `requirePlan(orgId, "pro")` from `@/lib/plans/enforcement.ts`

### Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 42 }
}
```
Errors:
```json
{
  "success": false,
  "error": { "code": "RESOURCE_NOT_FOUND", "message": "Quote not found" }
}
```

### Prisma 7 Patterns
- Import: `import type { Prisma } from "@/generated/prisma/client"`
- Nullable JSON: `Prisma.DbNull` not plain `null`
- PrismaClient from `@/lib/db.ts` (singleton with `@prisma/adapter-pg`)

### Payment Gateway
- Razorpay only. No Stripe. No PayPal.
- All Razorpay calls go through `src/lib/razorpay.ts` wrapper (lazy-init)
- Webhook verification: `Razorpay.validateWebhookSignature(rawBody, sig, secret)` — always verify before processing

### Error Handling
- Server actions return `ActionResult<T>` (defined per file, pattern: `{ success: true; data: T } | { success: false; error: string }`)
- API routes use consistent envelope (above)
- Background jobs: log errors to `JobLog` model; never throw unhandled

---

## 6. Non-Functional Requirements

### Performance
- Customer portal pages load < 2s (SSR with React cache)
- Cash flow forecast pre-computed nightly; dashboard reads from `ReportSnapshot`
- Marketplace browse page: cached at CDN edge (15 min TTL)
- IRN generation: < 3s response time (IRP API SLA)
- Exchange rate data: stale-while-revalidate (serve from cache, refresh in background)

### Reliability
- Dunning scheduler: idempotent — safe to re-run on app restart
- IRN generation: retry-safe — always check for existing IRN before calling IRP
- Webhook v2: guaranteed at-least-once delivery (dead-letter after 5 retries)
- Payment arrangement: installment status machine is append-only (no direct status edits)

### Scalability
- Marketplace templates: stored in S3, served via CloudFront CDN
- Dunning jobs: Trigger.dev with concurrency limit per org (max 5 concurrent per org)
- OAuth tokens: Redis-backed token cache for high-frequency API calls

### Security
- Customer portal tokens: SHA-256 hashed in DB; raw token only in email link
- OAuth client secrets: bcrypt-hashed in DB; shown only once on creation
- IRN/IRP credentials: stored in AWS Secrets Manager (not env vars)
- Dunning opt-out tokens: HMAC-SHA256 signed with `DUNNING_OPT_OUT_SECRET`
- All marketplace template purchases: verified via Razorpay webhook before installing

### Compliance
- e-Invoicing: fully compliant with GST e-invoice schema v1.1 (NIC specification)
- e-Way Bill: compliant with NIC e-Way Bill API v1.03
- TDS: follows Income Tax Act sections 194A/C/H/I/J/Q
- GSTR data: compatible with GST portal upload format as of FY2026-27

---

## 7. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | IRP API (e-invoicing) breaks or changes schema | Medium | High | Maintain adapter layer `src/lib/irp-client.ts`; monitor GST council bulletins |
| R2 | Customer portal token leakage | Low | Critical | Tokens hashed in DB; one-time use per session; TLS enforced everywhere |
| R3 | Multi-language PDF rendering quality | High | Medium | Thorough QA of each language × template combination; Arabic RTL testing critical |
| R4 | Marketplace template abuse (malicious template data) | Low | High | Template data sanitization before save; sandboxed preview rendering |
| R5 | OAuth app credentials compromise | Low | Critical | Client secrets hashed; rotation UI available; revoke-all endpoint |
| R6 | Dunning spam risk (customer receives too many emails) | Medium | High | Org-configurable max reminders; opt-out link in every email; rate limit per customer per day |
| R7 | Exchange rate stale data causes billing confusion | Medium | Medium | Always show exchange rate date on invoice; allow manual override |
| R8 | Webhook v2 delivery storms on high-volume events | Medium | Medium | Per-endpoint rate limiting; Trigger.dev concurrency control |
| R9 | Partner program abuse (unauthorized org access) | Low | Critical | Client org must explicitly authorize partner; no passive access grants |
| R10 | IRN generated for incorrect invoice (can't cancel) | Low | High | Confirmation modal before IRN generation; clear warning about immutability |

---

## 8. QA & Acceptance Gates

### Phase 14 Acceptance Gates

| Sprint | Gate |
|---|---|
| 14.1 | Dunning scheduler fires correct step for overdue invoices; duplicate guard works (same step not sent twice); opt-out link unsubscribes customer; invoice paid → all future steps cancelled |
| 14.2 | Customer portal: login flow works; invoice list scoped to customer only; Pay Now → Razorpay → webhook → status update < 30s; statement PDF downloads correctly |
| 14.3 | Quote created → sent → customer accepts via public page → converts to invoice with all line items; cash flow forecast chart shows correct due amounts by week; installment plan dunning fires per installment |

### Phase 15 Acceptance Gates

| Sprint | Gate |
|---|---|
| 15.1 | IRN generated and stored for test invoice on IRP sandbox; CGST/SGST split correct for intrastate; IGST correct for interstate; TDS deduction reduces net payable correctly; GSTR-1 CSV export matches GST portal spec |
| 15.2 | Invoice PDF renders correctly in Hindi, Arabic (RTL), Spanish; exchange rate footnote shown on USD invoice; date format changes per locale; org country setting drives tax field display |
| 15.3 | Template marketplace: free template installs immediately; paid template requires payment before install; OAuth: third-party app can get access token and call `/api/v1/invoices` on user's behalf; Webhook v2: failed delivery retried 5 times with exponential backoff; dead-letter visible in portal |

### Test Scenarios (Key)

```
TC-14-001: Dunning Step 1 fires on due date
TC-14-002: Dunning Step 2 fires 3 days past due
TC-14-003: Invoice paid → step 3 not fired (cancelled)
TC-14-004: Customer opts out → all future steps SKIPPED
TC-14-005: Portal token expired → redirect to login
TC-14-006: Customer pays via portal → status reflects in org app
TC-14-007: Quote accepted on public page → org notified
TC-14-008: Quote expired → cannot be accepted
TC-14-009: Quote converted → invoice created with same line items
TC-14-010: Payment arrangement created → dunning paused for invoice
TC-14-011: Installment overdue → mini-dunning fires

TC-15-001: IRN generation on IRP sandbox — success path
TC-15-002: IRN generation — duplicate error → idempotent fetch
TC-15-003: Intrastate invoice → CGST/SGST split shown on PDF
TC-15-004: Interstate invoice → IGST shown on PDF
TC-15-005: Hindi invoice PDF — labels in Hindi
TC-15-006: Arabic invoice PDF — RTL layout
TC-15-007: USD display currency → exchange rate footnote on PDF
TC-15-008: Template marketplace — free install
TC-15-009: Template marketplace — paid install (mock Razorpay)
TC-15-010: OAuth authorize → get token → call API
TC-15-011: OAuth token expired → 401 response
TC-15-012: Webhook v2 — first delivery fails → retry schedule correct
TC-15-013: Webhook v2 — after 5 retries → dead-lettered
TC-15-014: Webhook v2 — manual replay from portal
TC-15-015: Partner org can view managed client invoices
```

---

## 9. Multi-Agent Execution Strategy

### Phase 14 Parallel Lanes

| Lane | Agent | Scope |
|---|---|---|
| A | Agent 1 | Dunning Engine: schema migrations, DunningSequence CRUD, Trigger.dev scheduler job, DunningLog |
| B | Agent 2 | Customer Portal: token model, `/portal/[orgSlug]` routes, portal pages, statement generation |
| C | Agent 3 | Quotes module: Quote + QuoteLineItem schema, actions, public `/quote/[token]` page, convert flow |
| D | Agent 4 | Cash Flow Intelligence: AR aging enhancements, DSO tracker, cash flow forecast API + chart |
| E | Agent 5 | Payment Arrangements: schema, actions, installment dunning, `ARRANGEMENT_MADE` invoice status |

### Phase 15 Parallel Lanes

| Lane | Agent | Scope |
|---|---|---|
| A | Agent 1 | GST engine: HSN/SAC model, CGST/SGST/IGST computation, invoice PDF GST table |
| B | Agent 2 | e-Invoicing: IRP client lib, IRN generation API route, QR code on PDF, error handling |
| C | Agent 3 | TDS/TCS module: TdsRecord schema, TDS UI, GSTR data export |
| D | Agent 4 | Multi-language: next-intl setup, translation files (6 languages), RTL PDF for Arabic |
| E | Agent 5 | Multi-currency: ExchangeRate model, Trigger.dev rate-fetch job, invoice display currency |
| F | Agent 6 | Template Marketplace: schema, browse/install/purchase flow, publish flow, Razorpay purchase |
| G | Agent 7 | OAuth 2.0: OAuthApp + OAuthAuthorization schema, authorize/token/revoke endpoints |
| H | Agent 8 | Webhook v2: schema additions, retry job, dead-letter UI, signature verification |

---

## Appendix A — Environment Variables

### Phase 14 Additions

```env
# Dunning / SMS
MSG91_API_KEY=                  # MSG91 API key for India SMS
MSG91_SENDER_ID=SLIPWS          # TRAI-registered sender ID
MSG91_TEMPLATE_IDS=             # JSON map of step -> DLT template ID
DUNNING_OPT_OUT_SECRET=         # HMAC secret for opt-out link signing

# Customer Portal
CUSTOMER_PORTAL_JWT_SECRET=     # JWT secret for portal access tokens
CUSTOMER_PORTAL_TOKEN_EXPIRY=30d # Token expiry duration
```

### Phase 15 Additions

```env
# GST / e-Invoicing (IRP)
IRP_CLIENT_ID=                  # NIC IRP client ID
IRP_CLIENT_SECRET=              # NIC IRP client secret
IRP_API_BASE_URL=https://einvoice1.gst.gov.in/eicore/v1.03
IRP_SANDBOX_URL=https://einv-apisandbox.nic.in
IRP_MODE=sandbox                # "sandbox" | "production"

# e-Way Bill
EWB_CLIENT_ID=                  # NIC EWB client ID
EWB_CLIENT_SECRET=              # NIC EWB client secret
EWB_API_BASE_URL=https://developer.gst.gov.in/devapi/api/ewb

# Multi-Currency
OPEN_EXCHANGE_RATES_APP_ID=     # Open Exchange Rates API key

# OAuth 2.0
OAUTH_AUTHORIZATION_CODE_EXPIRY=10m
OAUTH_ACCESS_TOKEN_EXPIRY=1h
OAUTH_REFRESH_TOKEN_EXPIRY=30d

# Marketplace
MARKETPLACE_REVIEW_NOTIFY_EMAIL=marketplace@slipwise.com

# Partner Program
PARTNER_REVENUE_SHARE_DEFAULT=20  # default 20%
```

---

## Appendix B — Razorpay Dunning & Retry Reference

### Subscription Retry Events (Phase 14 Dunning Integration)

When a Slipwise subscription payment fails, Razorpay fires retry events. These should also trigger internal dunning-style org notifications:

| Razorpay Event | Slipwise Action |
|---|---|
| `subscription.halted` | Notify org owner: "Subscription payment failed — update payment method" |
| `subscription.charged` (after retry success) | Resume subscription; notify org: "Payment recovered" |
| `payment.failed` on payment link | Log to `DunningLog` as FAILED; increment retry attempt |

### Payment Link Expiry Handling (Phase 14)

In Phase 12, payment links were created with 7-day expiry. Phase 14 dunning engine must handle expired links gracefully:

1. On each dunning step fire, check if `Invoice.paymentLinkExpiresAt` < now
2. If expired: auto-generate a new payment link → update `Invoice.paymentLinkUrl` → include new link in reminder email
3. Log the link regeneration in `ActivityLog`

---

## Appendix C — GST e-Invoicing API Reference

### IRN Generation Payload (GST e-Invoice Schema v1.1)

```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2B",
    "RegRev": "N",
    "EcmGstin": null
  },
  "DocDtls": {
    "Typ": "INV",
    "No": "INV-2026-0042",
    "Dt": "08/04/2026"
  },
  "SellerDtls": {
    "Gstin": "29AADCB2230M1ZP",
    "LglNm": "Acme Corp Pvt Ltd",
    "Addr1": "123 Main Street",
    "Loc": "Bengaluru",
    "Pin": 560001,
    "Stcd": "29"
  },
  "BuyerDtls": {
    "Gstin": "27AAJCB3029H1Z5",
    "LglNm": "Beta Enterprises",
    "Pos": "27",
    "Addr1": "456 Park Avenue",
    "Loc": "Mumbai",
    "Pin": 400001,
    "Stcd": "27"
  },
  "ItemList": [
    {
      "SlNo": "1",
      "PrdDesc": "Software Development Services",
      "IsServc": "Y",
      "HsnCd": "998314",
      "Qty": 1,
      "Unit": "NOS",
      "UnitPrice": 100000,
      "TotAmt": 100000,
      "AssAmt": 100000,
      "GstRt": 18,
      "IgstAmt": 18000,
      "CgstAmt": 0,
      "SgstAmt": 0,
      "TotItemVal": 118000
    }
  ],
  "ValDtls": {
    "AssVal": 100000,
    "IgstVal": 18000,
    "CgstVal": 0,
    "SgstVal": 0,
    "TotInvVal": 118000
  }
}
```

### IRP Response

```json
{
  "AckNo": "112024060000012345",
  "AckDt": "2026-04-08 10:30:00",
  "Irn": "a3ece254ab8d41b8c10b5e5c8bb5dcb9d3a24b5e1c6f7d8e9f0a1b2c3d4e5f6",
  "SignedQRCode": "<base64 QR>",
  "SignedInvoice": "<base64 signed JSON>",
  "Status": "1",
  "InfoDtls": []
}
```

### Error Codes

| Code | Meaning | Action |
|---|---|---|
| 2000 | Success | Store IRN, AckNo, QR code |
| 2150 | Duplicate IRN | Fetch existing IRN; treat as success |
| 2130 | Supplier GSTIN inactive | Show "Your GSTIN is inactive on GST portal" |
| 2176 | Buyer GSTIN inactive | Show "Customer GSTIN is inactive" |
| 2283 | HSN code invalid | Show inline error on line item |
| 4000 | Auth failure | Re-fetch session token and retry once |

---

*End of Phase 14 & 15 PRD — Slipwise One*
*Version 1.0 | 2026-04-08 | Razorpay-Only — India-First + Global Scale*
*Prepared by: Copilot Engineering Assistant | Parent Company: Zenxvio*
