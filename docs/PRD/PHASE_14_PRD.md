# Slipwise One — Phase 14
## Product Requirements Document (PRD)
### Advanced AR Automation + Customer Self-Service Portal + Cash Flow Intelligence
### Version 1.0 — Engineering Handover Document

---

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phase** | Phase 14 |
| **Phase Title** | Advanced AR Automation + Customer Self-Service Portal + Cash Flow Intelligence |
| **Document Version** | 1.0 |
| **Date** | 2026-04-08 |
| **Status** | Ready for Engineering |
| **Prerequisite** | Phases 0–13 completed and merged to `master` |
| **Branch Convention** | `feature/phase-14-ar-automation` |
| **Sprint Model** | 3 sprints (~6 weeks) |
| **Engineering Model** | Multi-agent parallel execution (5 lanes) |
| **Payment Gateway** | Razorpay only — No Stripe |
| **Parent Company** | Zenxvio |
| **Tech Stack** | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL · Trigger.dev · Resend · Supabase Auth |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Codebase State (Post Phase 13)](#2-current-codebase-state-post-phase-13)
3. [Phase 14 Architecture Overview](#3-phase-14-architecture-overview)
4. [Sprint 14.1 — Dunning Engine & Smart Payment Reminders](#4-sprint-141--dunning-engine--smart-payment-reminders)
5. [Sprint 14.2 — Customer Self-Service Portal](#5-sprint-142--customer-self-service-portal)
6. [Sprint 14.3 — Quote-to-Invoice Workflow + Cash Flow Intelligence + Payment Arrangements](#6-sprint-143--quote-to-invoice-workflow--cash-flow-intelligence--payment-arrangements)
7. [Complete Database Schema Additions](#7-complete-database-schema-additions)
8. [Prisma Migration Strategy](#8-prisma-migration-strategy)
9. [Complete Route Map](#9-complete-route-map)
10. [API Contracts](#10-api-contracts)
11. [Plan Gates & Feature Access](#11-plan-gates--feature-access)
12. [Exhaustive Edge Cases](#12-exhaustive-edge-cases)
13. [Full Test Plan (50 Test Cases)](#13-full-test-plan-50-test-cases)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Risk Register](#15-risk-register)
16. [Multi-Agent Execution Strategy](#16-multi-agent-execution-strategy)
17. [Environment Variables](#17-environment-variables)
18. [Acceptance Gates per Sprint](#18-acceptance-gates-per-sprint)
19. [Appendix A — Dunning Email Template System](#appendix-a--dunning-email-template-system)
20. [Appendix B — Customer Portal Token Security](#appendix-b--customer-portal-token-security)
21. [Appendix C — Cash Flow Computation Logic](#appendix-c--cash-flow-computation-logic)

---

## 1. Executive Summary

### What Phase 14 Builds

Phase 14 transforms Slipwise One's **SW Pay** module from a reactive payment-tracking tool into a **proactive AR (Accounts Receivable) automation platform**.

The three core deliverables are:

| # | Deliverable | Business Value |
|---|---|---|
| 1 | **Dunning Engine** | Automatically chase overdue invoices with escalating reminders — reduce DSO (Days Sales Outstanding), minimize manual follow-up |
| 2 | **Customer Self-Service Portal** | Give customers a dedicated portal to view invoices, pay online, download statements, and raise queries — reduce inbound support load |
| 3 | **Quote-to-Invoice + Cash Flow Intelligence** | Add formal quoting before invoicing + give owners a forward-looking view of cash receipts and AR health |

### Why This Phase Now

Post Phase 12, Slipwise has Razorpay Payment Links working for invoice collection. However:
- There is **no automatic reminder** when invoices go overdue — businesses must manually follow up
- Customers have **no self-service way** to see their payment history or pay without receiving an individual link
- There is **no quote/estimate workflow** before invoicing (common in service businesses)
- There is **no cash flow forecast** — managers can't see expected collections for the next 30/60/90 days

Phase 14 closes all these gaps and elevates SW Pay from a tracking tool to a true AR management platform.

---

## 2. Current Codebase State (Post Phase 13)

### Existing Models Relevant to Phase 14

The engineering team must understand these existing models to build Phase 14 on top of them correctly.

| Model | Table | Key fields relevant to Phase 14 |
|---|---|---|
| `Invoice` | `invoice` | `id`, `organizationId`, `customerId`, `status` (InvoiceStatus enum), `totalAmount`, `amountPaid`, `remainingAmount`, `dueDate`, `razorpayPaymentLinkUrl`, `paymentLinkExpiresAt` |
| `InvoicePayment` | `invoice_payment` | `id`, `invoiceId`, `orgId`, `amount`, `status` (SETTLED/PENDING_REVIEW/REJECTED), `externalPaymentId`, `source` |
| `InvoiceProof` | `invoice_proof` | `id`, `invoiceId`, `fileUrl`, `reviewStatus` |
| `InvoiceTicket` | `invoice_ticket` | `id`, `invoiceId`, `orgId`, `status` (TicketStatus enum), `category`, `submitterEmail` |
| `Customer` | `customer` | `id`, `organizationId`, `name`, `email`, `phone` |
| `OrgDefaults` | `org_defaults` | `invoicePrefix`, `invoiceCounter`, `gstin`, `defaultInvoiceTemplate` |
| `PublicInvoiceToken` | `public_invoice_token` | `id`, `invoiceId`, `token` — tokenized public invoice access |
| `RecurringInvoiceRule` | `recurring_invoice_rule` | `orgId`, `status`, `nextRunAt` |
| `ReportSnapshot` | `report_snapshot` | Pre-computed report data (used by SW Intel) |
| `ActivityLog` | `activity_log` | Append-only activity trail per org |
| `Notification` | `notification` | In-app notification system |

### Existing InvoiceStatus Enum (Do Not Change)

```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  VIEWED
  DUE
  PARTIALLY_PAID
  PAID
  OVERDUE
  DISPUTED
  CANCELLED
  REISSUED
}
```

> **Phase 14 adds one new status: `ARRANGEMENT_MADE`** (see Sprint 14.3). This must be added to the enum.

### Existing Services to Use (Do Not Rewrite)

| Service | File | Phase 14 Usage |
|---|---|---|
| Invoice reconciliation | `src/lib/invoice-reconciliation.ts` | Call `reconcileInvoicePayment()` after every installment payment |
| Razorpay payment links | `src/lib/payment-links.ts` | Re-use `createRazorpayPaymentLink()` in dunning step and customer portal |
| Plan enforcement | `src/lib/plans/enforcement.ts` | `requirePlan()` and `checkFeature()` for Pro+ features |
| Rate limiting | `src/lib/rate-limit.ts` | Apply to portal endpoints and bulk dunning API |
| Notifications | `src/lib/notifications.ts` | `createNotification()` and `notifyOrgAdmins()` for dunning events |
| Push notifications | `src/lib/push.ts` | Notify org admins when portal customer pays |
| Supabase server | `src/lib/supabase/server.ts` | Use `createSupabaseServer` for auth in app routes |
| Org context | `src/lib/auth/require-org.ts` | Use `requireOrgContext()` in server actions, `getOrgContext()` in API routes |

### Existing Routes to Understand

| Route | Purpose | Phase 14 Relationship |
|---|---|---|
| `/app/pay/receivables` | Receivables list page | Extend with dunning column, arrangement badge |
| `/app/docs/invoices/[id]` | Invoice detail page | Add Dunning tab, Add "Create Quote" button (retroactively) |
| `/invoice/[token]` | Public tokenized invoice page | Customer portal mirrors this — do not duplicate the pay flow |
| `/app/pay/proofs/[proofId]` | Proof review page | Unchanged |
| `/api/v1/invoices` | Public API | Extend with `/bulk-remind` endpoint |

---

## 3. Phase 14 Architecture Overview

### Module Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SW Pay — Phase 14                            │
│                                                                     │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐   │
│  │   DUNNING ENGINE     │   │   CUSTOMER PORTAL                │   │
│  │                      │   │                                  │   │
│  │  DunningSequence     │   │  /portal/[orgSlug]               │   │
│  │  DunningStep         │   │  CustomerPortalToken             │   │
│  │  DunningLog          │   │  CustomerStatement               │   │
│  │  DunningOptOut       │   │  (tokenized, no Supabase auth)   │   │
│  │                      │   │                                  │   │
│  │  Trigger.dev cron    │   │  Razorpay pay-now integration    │   │
│  └──────────────────────┘   └──────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐   │
│  │  QUOTES / ESTIMATES  │   │  CASH FLOW INTELLIGENCE          │   │
│  │                      │   │                                  │   │
│  │  Quote               │   │  /app/intel/cash-flow            │   │
│  │  QuoteLineItem       │   │  DSO tracker                     │   │
│  │  /quote/[token]      │   │  AR aging (enhanced)             │   │
│  │  public accept page  │   │  Customer health score           │   │
│  └──────────────────────┘   └──────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PAYMENT ARRANGEMENTS                            │  │
│  │  PaymentArrangement · PaymentInstallment                     │  │
│  │  ARRANGEMENT_MADE status · per-installment mini-dunning      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Overdue Invoice Lifecycle with Phase 14

```
Invoice created (DRAFT)
  → Issued (ISSUED)
  → Due date approaches (DUE)
  → Due date passes → cron marks OVERDUE
  → Dunning Step 1 fires (Day 0 of overdue)
  → No response → Step 2 (Day +3)
  → No response → Step 3 (Day +7)
  → No response → Step 4 (Day +14)
  → No response → Step 5 (Day +30) → creates InvoiceTicket (ESCALATED)
  
  [At any point:]
  → Customer pays via portal/payment link → reconcileInvoicePayment() → PAID → dunning stops
  → Org creates PaymentArrangement → ARRANGEMENT_MADE → dunning stops → per-installment mini-dunning starts
  → Customer opts out → future steps SKIPPED (but SENT steps already sent)
```

---

## 4. Sprint 14.1 — Dunning Engine & Smart Payment Reminders

### Objective

Build a fully automated, configurable, idempotent payment reminder system that fires at the right time, with the right message, through the right channel — and stops the moment an invoice is resolved.

---

### 4.1 Dunning Sequence Architecture

#### What is a Dunning Sequence

A **dunning sequence** is an org-defined series of steps, each specifying:
- **When** to fire (days relative to the invoice due date)
- **How** to contact (email, SMS, or both)
- **What tone** to use (friendly → urgent)
- **What message** to send (customizable email/SMS template with variable substitution)

Each org gets a **default sequence** seeded on org creation. Orgs can create additional sequences and assign them to specific customers or invoices.

#### Default Sequence (seeded on org creation)

| Step | `daysOffset` | Channel | Tone | Subject Line |
|---|---|---|---|---|
| 1 | `0` (due date) | Email | FRIENDLY | "Your invoice {{invoice_number}} is due today" |
| 2 | `+3` | Email + SMS | POLITE | "Invoice {{invoice_number}} is now overdue" |
| 3 | `+7` | Email + SMS | FIRM | "Action needed: Invoice {{invoice_number}}" |
| 4 | `+14` | Email | URGENT | "Final notice: Invoice {{invoice_number}}" |
| 5 | `+30` | Email + Ticket | ESCALATE | "Escalation: Invoice {{invoice_number}} — 30 days overdue" |

> **`daysOffset` semantics:** `0` = on the due date. Positive integers = days _past_ the due date. Negative integers (future use) = days _before_ due date (pre-due reminders).

#### Key Design Principles

1. **Idempotency** — The dunning scheduler is a cron job. If it crashes and restarts, or runs twice in a window, NO duplicate reminders are sent. The guard is: before firing any step, check `DunningLog` for an existing record with `(invoiceId, stepNumber, status = SENT)`. If found, skip.

2. **Stopping conditions** — Any of the following immediately stop all future dunning for an invoice:
   - `invoice.status` becomes `PAID`
   - `invoice.status` becomes `CANCELLED`
   - `invoice.status` becomes `ARRANGEMENT_MADE`
   - `invoice.status` becomes `REISSUED`
   - `invoice.dunningEnabled = false`
   - A `DunningOptOut` record exists for the customer

3. **Per-invoice configurability** — Each invoice can:
   - Override the org default sequence with a specific sequence
   - Disable dunning entirely (`dunningEnabled = false`)
   - Have dunning paused via `dunningPausedUntil` DateTime field

4. **Template variable substitution** — All email and SMS templates support `{{variable}}` placeholders. The substitution engine resolves these from invoice + customer data at send time (never cached).

---

### 4.2 Dunning Scheduler (Trigger.dev Job)

#### Job: `dunning-scheduler`

**Schedule:** Every 15 minutes (`*/15 * * * *`)

**Algorithm:**

```
FOR each org with dunningEnabled:
  FIND all invoices WHERE:
    status IN (OVERDUE, PARTIALLY_PAID)
    AND dunningEnabled = true
    AND dunningPausedUntil IS NULL OR dunningPausedUntil < now()
    AND status NOT IN (PAID, CANCELLED, ARRANGEMENT_MADE, REISSUED)

  FOR each invoice:
    daysPastDue = DATEDIFF(now(), invoice.dueDate)  // positive = overdue
    
    dunningSequenceId = invoice.dunningSequenceId OR org.defaultDunningSequenceId
    steps = fetch all DunningStep WHERE sequenceId = dunningSequenceId ORDER BY stepNumber

    FOR each step WHERE step.daysOffset <= daysPastDue:
      // Idempotency guard
      existing = DunningLog WHERE invoiceId = invoice.id AND stepNumber = step.stepNumber AND status = SENT
      IF existing → SKIP this step (already sent)

      // Opt-out guard
      optOut = DunningOptOut WHERE customerId = invoice.customerId AND orgId = invoice.orgId
      IF optOut:
        LOG DunningLog(status: SKIPPED, errorMessage: "customer_opted_out")
        CONTINUE

      // Send
      FOR each channel in step.channels:
        IF channel = "email":
          body = resolveTemplate(step.emailBody, invoice, customer, org)
          subject = resolveTemplate(step.emailSubject, invoice, customer, org)
          result = sendEmail(customer.email, subject, body)  // via Resend
        IF channel = "sms":
          body = resolveTemplate(step.smsBody, invoice, customer, org)
          result = sendSms(customer.phone, body)  // via MSG91
        
        LOG DunningLog(invoiceId, stepNumber, channel, status: result.ok ? SENT : FAILED, ...)

      // Step 5 special: create InvoiceTicket
      IF step.createTicket = true:
        existingTicket = InvoiceTicket WHERE invoiceId = invoice.id AND category = ESCALATED
        IF NOT existingTicket:
          CREATE InvoiceTicket(category: OTHER, description: "Auto-escalated after 30 days overdue", ...)
          NOTIFY org admins via createNotification()
```

**Concurrency:** Trigger.dev `concurrencyLimit: 10` — max 10 invoices processed in parallel globally. Per-org sequencing not required (each invoice is independent).

**Error handling:**
- If Resend rate-limited (429): `DunningLog.status = FAILED`, `errorMessage = "rate_limited"`. The next cron run will NOT retry (idempotency guard prevents re-fire). Engineering note: for rate-limit recovery, a separate `dunning-retry` job retries FAILED steps within 1 hour.
- If customer has no email AND step has only email channel: `DunningLog.status = SKIPPED`, `errorMessage = "no_email_on_file"`
- If customer has no phone AND step includes SMS: skip SMS channel, fire email only, log separately

---

### 4.3 Dunning Management UI

#### Page: `/app/pay/dunning` — Dunning Overview

**Layout:** Standard app shell with sidebar nav. SW Pay section → "Dunning" nav item.

**Content:**

1. **Stats Row** (4 KPI cards):
   - Reminders sent this month
   - Invoices with active dunning (overdue + dunning enabled)
   - Response rate (% of invoices paid within 72h of a reminder)
   - Avg days to payment after first reminder

2. **Next 7 Days Queue** (table):
   - Columns: Invoice #, Customer, Due Since, Next Step, Scheduled For, Channel
   - Empty state: "No reminders scheduled in the next 7 days"

3. **Recent Activity** (last 20 DunningLog entries):
   - Invoice #, Customer, Step, Channel, Status (SENT/FAILED/SKIPPED), Sent At
   - Click row → jump to invoice

---

#### Page: `/app/pay/dunning/sequences` — Sequence Management

**Content:**

1. **Sequence List** (cards):
   - Each card: name, step count, "DEFAULT" badge if default, active toggle
   - Actions: Edit, Duplicate, Delete (cannot delete if assigned to active invoices), Set as Default

2. **Create/Edit Sequence** (modal or full page):
   - Name input
   - Step builder (drag-and-drop reorder):
     - Each step: `daysOffset`, `tone` selector, channel checkboxes (Email / SMS)
     - Email template editor (rich text, variable picker sidebar showing all `{{variable}}` options)
     - SMS template editor (char counter, DLT template ID field for India compliance)
     - "Create support ticket" toggle (only one step should have this on)
   - Preview button: opens modal showing rendered email for a sample invoice

3. **Variable Reference Panel** (sidebar in template editor):

| Variable | Resolves To |
|---|---|
| `{{customer_name}}` | Customer.name |
| `{{invoice_number}}` | Invoice.invoiceNumber |
| `{{invoice_amount}}` | Invoice.totalAmount (formatted with currency) |
| `{{amount_due}}` | Invoice.remainingAmount |
| `{{amount_paid}}` | Invoice.amountPaid |
| `{{due_date}}` | Invoice.dueDate (formatted) |
| `{{days_overdue}}` | Computed: days since dueDate |
| `{{pay_now_link}}` | Invoice.razorpayPaymentLinkUrl (auto-regenerated if expired) |
| `{{org_name}}` | Organization.name |
| `{{org_email}}` | BrandingProfile.email or OrgDefaults email |
| `{{org_phone}}` | BrandingProfile.phone |
| `{{invoice_date}}` | Invoice.invoiceDate |

---

#### Page: `/app/pay/dunning/log` — Activity Log

**Filters:** Invoice # (search), Customer (dropdown), Step (1-5), Channel (Email/SMS), Status (SENT/FAILED/SKIPPED), Date range

**Table:** DunningLog entries with all fields visible.

**Actions:**
- Export CSV (filtered)
- "Resend" action on FAILED rows: fires that step immediately for that invoice, creates new DunningLog entry (does NOT update the failed one)

---

#### Page: `/app/pay/dunning/opt-outs` — Opt-Out Management

**Table:** Customers who opted out — Name, Email, Opted Out At, Invoice context (the invoice whose reminder they unsubscribed from)

**Actions per row:**
- Re-enable: deletes `DunningOptOut` record. Customer will receive future reminders again.

**Note:** Org can never suppress the opt-out page itself — the unsubscribe link in every email must always work.

---

#### Invoice Detail Integration — Dunning Tab

**Route:** `/app/docs/invoices/[id]` → add "Dunning" tab (alongside existing tabs)

**Tab content:**
1. **Dunning Status Panel:**
   - Toggle: "Dunning enabled" (calls `toggleInvoiceDunning` action)
   - Current sequence: dropdown to override org default sequence for this invoice
   - Pause until: date picker to pause dunning until a specific date
   - "Send reminder now" button: fires next pending step immediately (plan gate: Pro+)

2. **Reminder Timeline:**
   - All `DunningLog` entries for this invoice
   - Visual timeline: sent (green checkmark), failed (red X), skipped (grey dash), scheduled (grey clock)
   - Each row expandable: shows email subject, channel, timestamp

---

### 4.4 SMS Integration

#### Provider: MSG91 (India Primary)

**API:** `https://api.msg91.com/api/v5/flow/`

**DLT Compliance (India):**
All transactional SMS to India numbers must use TRAI-registered templates via MSG91 DLT. Each `DunningStep.smsTemplateId` stores the pre-registered DLT template ID.

**Sender ID:** `SLIPWS` (6-character TRAI sender ID — must be registered)

**Sample MSG91 API call:**
```json
POST https://api.msg91.com/api/v5/flow/
{
  "flow_id": "{{MSG91_FLOW_ID_STEP_2}}",
  "sender": "SLIPWS",
  "mobiles": "91{{customer_phone}}",
  "VAR1": "INV-2026-0042",
  "VAR2": "₹18,000",
  "VAR3": "https://rzp.io/i/abc123"
}
```

**Fallback:** If `MSG91_API_KEY` not configured, SMS channel is skipped silently with `DunningLog.status = SKIPPED`, `errorMessage = "sms_provider_not_configured"`. Email still fires.

**WhatsApp:** `channels` array accepts `"whatsapp"` value — implementation deferred to Phase 15. If a step includes `"whatsapp"`, log as `SKIPPED` with `errorMessage = "whatsapp_not_configured"`.

---

### 4.5 Opt-Out Mechanism

Every dunning email must include an unsubscribe footer:

```html
<p style="font-size:12px;color:#666">
  Don't want to receive these reminders? 
  <a href="{{unsubscribe_url}}">Unsubscribe</a>
</p>
```

**`{{unsubscribe_url}}`** resolves to:
`https://app.slipwise.com/unsubscribe/dunning?token={{signed_opt_out_token}}`

**Token generation:**
```
optOutToken = HMAC-SHA256(
  key: DUNNING_OPT_OUT_SECRET,
  message: `${orgId}:${customerId}:${invoiceId}`
)
```

**Route: `GET /unsubscribe/dunning?token=...`** (public, no auth)
1. Parse and verify HMAC token (reject if invalid)
2. Check if `DunningOptOut` already exists for this `orgId + customerId`
3. If not: create `DunningOptOut` record
4. Render confirmation page: "You've been unsubscribed from payment reminders from [Org Name]. This applies to all future reminders from this business."
5. Include: "Changed your mind? Contact [org_email]"

**Scope:** Opt-out is per-customer per-org (not per-invoice). One unsubscribe stops ALL future dunning from that org to that customer.

---

### 4.6 Payment Link Auto-Renewal in Dunning Emails

Razorpay payment links expire after 7 days (as configured in Phase 12). When a dunning step fires for an invoice with an expired payment link, the engine must auto-renew the link:

**Logic in dunning scheduler (before template resolution):**
```
IF invoice.paymentLinkExpiresAt < now() + 1day:
  newLink = createRazorpayPaymentLink(invoice.id, ...)
  UPDATE invoice SET razorpayPaymentLinkUrl = newLink.url, paymentLinkExpiresAt = newLink.expiresAt
  LOG ActivityLog("Payment link renewed for dunning step")
```

This ensures `{{pay_now_link}}` in the email template always has a valid, clickable link.

---

### 4.7 Bulk Remind API

**Route:** `POST /api/v1/invoices/bulk-remind`

**Auth:** API key (`validateApiKey()`) or Supabase session

**Plan gate:** Pro+

**Request:**
```json
{
  "invoiceIds": ["inv_abc", "inv_def", "inv_ghi"],
  "stepOverride": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fired": 3,
    "skipped": 0,
    "failed": 0,
    "results": [
      { "invoiceId": "inv_abc", "status": "sent", "channels": ["email"] },
      { "invoiceId": "inv_def", "status": "sent", "channels": ["email", "sms"] },
      { "invoiceId": "inv_ghi", "status": "skipped", "reason": "customer_opted_out" }
    ]
  }
}
```

**Constraints:**
- Max 50 invoice IDs per request
- Rate limit: 10 requests/minute per org (Upstash Redis sliding window)

---

## 5. Sprint 14.2 — Customer Self-Service Portal

### Objective

Provide each customer (of any Slipwise org) a **secure, brandable self-service portal** where they can: view invoices, make payments, download account statements, upload payment proof, and raise support queries — without needing a Slipwise account.

---

### 5.1 Portal Architecture

#### Access Model

| Aspect | Detail |
|---|---|
| **Authentication** | Token-based. No Supabase account required for customers. |
| **Token type** | JWT (HS256), signed with `CUSTOMER_PORTAL_JWT_SECRET` |
| **Token expiry** | 30 days from issuance |
| **Token storage** | Hashed (SHA-256) in `CustomerPortalToken.tokenHash` |
| **Portal URL** | `/portal/[orgSlug]/[token]/...` |
| **Custom domain** | `portal.acme.com` → map via `OrgWhiteLabel.customPortalDomain` (Phase 12 model exists) |
| **Branding** | Inherits org's `BrandingProfile` (logo, colors) |
| **Data scope** | Strictly `customerId + orgId` — no cross-customer visibility possible |

#### JWT Payload

```json
{
  "sub": "cust_abc123",
  "org": "org_xyz789",
  "type": "customer_portal",
  "iat": 1712556000,
  "exp": 1715148000
}
```

**Token issuance flow:**

1. Org user visits customer record → clicks "Send Portal Access"
2. Server calls `issuePortalToken(orgId, customerId)`:
   - Generate JWT (30-day expiry)
   - Hash with SHA-256 → store in `CustomerPortalToken`
   - Mark any previous active tokens for this customer as `isRevoked = false` (can have multiple active — device-agnostic)
3. Send email via Resend with portal link
4. Customer clicks link → middleware validates JWT → portal loads

**Token validation middleware** (`src/middleware.ts` extension OR dedicated `src/lib/portal-auth.ts`):
- Extract `[token]` from URL path
- Decode JWT (verify signature, check expiry)
- Check `CustomerPortalToken` by `tokenHash`:
  - Not found → expired/invalid page
  - `isRevoked = true` → revoked page
  - `expiresAt < now()` → expired page
- Attach `{ customerId, orgId }` to request context

**Silent token refresh:** If token is valid but has < 15 days remaining, the portal response sets a `Set-Cookie: slipwise-portal-token=<new_token>` and updates `CustomerPortalToken` record. User never sees a re-login prompt.

---

### 5.2 Portal Pages (Detailed Spec)

#### Page: `/portal/[orgSlug]` — Portal Login (Magic Link)

**Purpose:** Entry point for customers who don't have a token or whose token is expired.

**UI:**
- Org logo (if available from `BrandingProfile`)
- Heading: "Access your invoices from [Org Name]"
- Single input: Email address
- Button: "Send me a link"
- On submit:
  1. Look up `Customer` by `email + org.slug`
  2. If found: issue token → send email with portal link → show "Check your email"
  3. If not found: show same "Check your email" message (don't reveal whether email exists — security)

**Email sent:**
- Subject: "Your invoice portal access link — [Org Name]"
- Body: "Click below to access your invoices from [Org Name]. This link is valid for 30 days."
- CTA button: "Open my portal"

---

#### Page: `/portal/[orgSlug]/[token]/dashboard` — Customer Dashboard

**URL pattern:** `/portal/acme-corp/eyJhbGci.../dashboard`

**Content:**

1. **Header bar:**
   - Org logo (left)
   - "Hello, [Customer Name]" (right)
   - Sign-out link (invalidates token, redirects to login page)

2. **Summary Cards (4):**

| Card | Value | Source |
|---|---|---|
| Total Outstanding | ₹X | Sum of `remainingAmount` for UNPAID/PARTIALLY_PAID invoices |
| Overdue | ₹X (N invoices) | Invoices with status = OVERDUE |
| Paid this year | ₹X | Sum of SETTLED InvoicePayments this calendar year |
| Partial payments | N invoices | Count of PARTIALLY_PAID invoices |

3. **Recent Invoices** (last 5, table):
   - Invoice #, Date, Amount, Status badge, Action (View / Pay Now)

4. **Quick Pay Panel** (if any invoices are OVERDUE or DUE):
   - Banner: "You have N invoices requiring attention — Total: ₹X"
   - "Pay all outstanding" button (creates separate Razorpay payment link per invoice — no bundle)

---

#### Page: `/portal/[orgSlug]/[token]/invoices` — Invoice List

**Filters:**
- Status: All / Unpaid / Partial / Paid / Overdue (pill tabs)
- Date range: This month / Last 3 months / This year / Custom

**Table columns:** Invoice # · Issue Date · Due Date · Amount · Paid · Balance · Status badge · Actions

**Actions per row:**
- **View** → `/portal/.../invoices/[id]`
- **Pay Now** (if unpaid/partial) → Razorpay redirect
- **Download PDF** → server-rendered PDF download (same export as internal)

**Pagination:** 20 per page

---

#### Page: `/portal/[orgSlug]/[token]/invoices/[invoiceId]` — Invoice Detail

**Content:**
1. **Invoice render** (same template as internal invoice view — full PDF-quality HTML render)
2. **Payment status timeline** (visual):
   - Invoice issued → Viewed → Due → Partial payment received (if any) → Paid / Overdue
3. **Action bar:**
   - "Pay Now" button (if any balance remaining) → creates/retrieves Razorpay payment link → redirect
   - "Upload payment proof" → modal (file picker, note field) → creates `InvoiceProof`
   - "Download PDF" → downloads invoice PDF
   - "Raise a query" → opens query form (creates `InvoiceTicket`)
4. **Payment history table** (InvoicePayment records for this invoice):
   - Date · Amount · Method · Reference · Status

**Real-time status update after payment:**
- After Razorpay redirect back, show "Payment processing..." with polling
- Poll `GET /api/portal/invoices/[id]/status` every 5 seconds (max 30s)
- Once `invoice.status = PAID`, show success banner: "Payment confirmed! ₹X received."

---

#### Page: `/portal/[orgSlug]/[token]/payments` — Payment History

**All-time payment history across all invoices.**

**Table:** Date · Invoice # · Amount · Payment Method (UPI/card/bank) · Razorpay Payment ID · Download Receipt

**Download receipt:** PDF receipt generated server-side showing: org logo, customer name, invoice number, amount paid, payment method, Razorpay payment ID, date. Stored in S3 after first generation for reuse.

---

#### Page: `/portal/[orgSlug]/[token]/statements` — Account Statement

**Purpose:** Accountant-grade statement showing all transactions for a date range.

**UI:**
- Date range selector (defaults to last 90 days)
- "Generate Statement" button
- Preview table (inline before download):

| Date | Description | Debit (Invoice) | Credit (Payment) | Balance |
|---|---|---|---|---|
| 01-Jan | Opening Balance | | | ₹0 |
| 05-Jan | Invoice INV-001 raised | ₹50,000 | | ₹50,000 |
| 10-Jan | Payment received | | ₹50,000 | ₹0 |
| 15-Jan | Invoice INV-002 raised | ₹30,000 | | ₹30,000 |
| 31-Jan | Closing Balance | | | ₹30,000 |

- "Download PDF" → generates statement PDF (Puppeteer server-render)
- "Download CSV" → raw CSV export

**Background generation:** For large date ranges (>365 days), queue as background job via Trigger.dev. Show "We'll email you when your statement is ready" toast. Store generated PDF at `CustomerStatement.fileUrl`.

---

#### Page: `/portal/[orgSlug]/[token]/tickets` — Support Tickets

**Content:**
- List of raised queries with status badges
- Per ticket: Subject, Invoice reference, Status (OPEN / IN_PROGRESS / RESOLVED), Last reply date
- "Create new ticket" button

**Create ticket modal:**
- Invoice reference (dropdown from their invoices)
- Category (Billing Query / Amount Dispute / Missing Item / Other)
- Subject
- Description (textarea)
- On submit: creates `InvoiceTicket` with `submitterEmail` from customer record

**Ticket detail:** View all `TicketReply` messages threaded.

---

#### Page: `/portal/[orgSlug]/[token]/profile` — Customer Profile

**Read-only view:**
- Name, email, phone, address (from `Customer` record)
- "To update your details, contact [org_email]"

**Communication preferences:**
- Toggle: "Receive payment reminders" (links to dunning opt-out — creates/deletes `DunningOptOut`)

---

### 5.3 Org-Side Portal Management

#### Page: `/app/pay/portal` — Portal Management

**Sections:**

1. **Portal Settings:**
   - Enable/disable customer portal (toggle → stored in `OrgDefaults.portalEnabled` — new field)
   - Portal header message (shown on all portal pages): e.g., "Pay invoices from Acme Corp"
   - Support contact shown to customers (email + phone)

2. **Customer Portal Status Table:**
   - All customers with: Name · Email · Portal Status (Active / Never Sent / Expired / Revoked) · Last Accessed · Actions
   - **Actions:** Send invite / Revoke access / View access log
   - **Bulk action:** "Send portal invites to all customers who have never received one"

3. **Access Log:**
   - Which customers accessed the portal, when, which pages viewed
   - Stored in `CustomerPortalAccessLog` (new model — lightweight append-only table)

---

### 5.4 Payment Flow from Customer Portal

**Complete end-to-end flow:**

```
1. Customer clicks "Pay Now" on invoice in portal

2. Server action: getOrCreatePaymentLink(invoiceId, customerId)
   - Check if invoice.razorpayPaymentLinkUrl is active and not expired
   - If active: return existing URL
   - If expired or null: createRazorpayPaymentLink(invoice, customer, org)
     → creates Payment Link via Razorpay API
     → stores URL + expiry on Invoice

3. Customer redirected to Razorpay hosted payment page (existing UX from Phase 12)

4. Customer completes payment on Razorpay

5. Razorpay fires webhook: payment_link.paid
   → hits: POST /api/billing/razorpay/webhook (existing)
   → handlePaymentLinkPaid() runs (existing — src/lib/payment-links.ts)
   → reconcileInvoicePayment() runs (existing — src/lib/invoice-reconciliation.ts)
   → invoice.status updated (PAID or PARTIALLY_PAID)

6. Portal polls: GET /api/portal/invoices/[id]/status (new, public + token-auth)
   → returns { status, amountPaid, remainingAmount }
   → Portal shows "Payment confirmed!" banner

7. Dunning scheduler: on next run, sees invoice.status = PAID → skips all future steps

8. Org push notification fires: "Invoice INV-XXX paid — ₹X received from [Customer Name]"
   → via existing src/lib/push.ts + notifyOrgAdmins()
```

---

### 5.5 New API Endpoints for Portal

All portal API endpoints are prefixed `/api/portal/` and authenticated by JWT token in `Authorization: Bearer <token>` header.

| Method | Route | Description |
|---|---|---|
| POST | `/api/portal/auth/magic-link` | Send magic link email to customer |
| GET | `/api/portal/invoices` | List customer's invoices (paginated, filterable) |
| GET | `/api/portal/invoices/[id]` | Get invoice detail |
| GET | `/api/portal/invoices/[id]/status` | Lightweight status poll |
| POST | `/api/portal/invoices/[id]/pay` | Get/create payment link |
| POST | `/api/portal/invoices/[id]/proof` | Upload payment proof |
| POST | `/api/portal/invoices/[id]/ticket` | Create support ticket |
| GET | `/api/portal/payments` | Payment history |
| POST | `/api/portal/statements/generate` | Generate account statement |
| GET | `/api/portal/statements/[id]/download` | Download statement PDF |
| GET | `/api/portal/profile` | Customer profile |
| POST | `/api/portal/preferences/dunning-opt-out` | Toggle dunning opt-out |

**Auth middleware for portal routes (`src/lib/portal-auth.ts`):**
```typescript
export async function validatePortalToken(request: Request): Promise<{
  customerId: string;
  orgId: string;
} | null>
```

---

## 6. Sprint 14.3 — Quote-to-Invoice Workflow + Cash Flow Intelligence + Payment Arrangements

### 6.1 Quote / Estimate Module

#### What is a Quote

A **Quote** (also called Estimate) is a pre-invoice document that a business sends to a customer **before committing to billing**. The customer reviews it, accepts or declines. If accepted, the org converts it to an Invoice in one click.

#### Quote State Machine

```
DRAFT → SENT → ACCEPTED → CONVERTED (terminal)
              ↘ DECLINED (terminal)
DRAFT/SENT → EXPIRED (if validUntil passes — auto via cron)
```

| Status | Meaning | Can Transition To |
|---|---|---|
| DRAFT | Created but not sent | SENT, EXPIRED (if past validUntil) |
| SENT | Emailed to customer | ACCEPTED, DECLINED, EXPIRED |
| ACCEPTED | Customer accepted | CONVERTED |
| DECLINED | Customer declined | (terminal) |
| EXPIRED | Past validUntil | (terminal) |
| CONVERTED | Converted to Invoice | (terminal) |

**Rules:**
- Only `ACCEPTED` quotes can be converted to Invoice
- Only `SENT` (and `DRAFT`) quotes can be accepted/declined
- Once an IRN exists on a quote's converted invoice, the quote cannot be cancelled retroactively
- Editing a `SENT` quote creates a new version (Phase 15 — Phase 14 blocks editing after SENT)

---

#### Quote Number Format

Auto-generated using `OrgDefaults`. New fields on `OrgDefaults`:
```
quotePrefix   String @default("QTE")
quoteCounter  Int    @default(1)
```
Format: `QTE-2026-0001` (same pattern as INV-XXXX-XXXX)

---

#### Quote Creation UI

**Route:** `/app/docs/quotes/new`

**Form fields (mirrors Invoice form — same layout):**
- Customer (dropdown from org's customers) — required
- Quote title (e.g., "Website development proposal") — required
- Issue date — required
- Valid until date — required (default: +14 days from today)
- Line items (same dynamic line item table as Invoice — description, qty, unit price, tax rate)
- Subtotal / Tax / Discount / Total — auto-calculated
- Terms and conditions (textarea — shown on PDF)
- Internal notes (textarea — NOT shown on PDF, internal only)
- Template selector (same 5 Invoice templates — PDF renders with "QUOTE" header instead of "INVOICE")
- Currency (defaults to INR)

---

#### Quote PDF

**Reuses Invoice template system.** The only differences:
- Header says **"QUOTE"** (or "ESTIMATE" if org prefers — configurable in OrgDefaults)
- Shows "Valid Until: DD-MM-YYYY" field
- Shows "Terms & Conditions" section at bottom
- Does NOT show "Invoice Number" — shows "Quote Number"
- Footer: "This is not a tax invoice. A tax invoice will be issued upon acceptance."

---

#### Quote List Page

**Route:** `/app/docs/quotes`

**Same structure as invoice list:**
- Table: Quote # · Customer · Date · Valid Until · Amount · Status badge · Actions
- Filters: Status (All / Draft / Sent / Accepted / Declined / Expired / Converted), Date range, Customer search
- Actions per row: View · Edit (DRAFT only) · Send · Convert (ACCEPTED only) · Archive

---

#### Quote Detail Page

**Route:** `/app/docs/quotes/[id]`

**Sections:**
1. Quote render (HTML preview of PDF)
2. Status banner (e.g., "This quote was accepted on 5 Apr 2026" or "This quote expires on 12 Apr 2026")
3. Action bar:
   - **DRAFT**: Edit, Send, Delete
   - **SENT**: Resend, Mark Accepted (manual), Mark Declined, View on customer page
   - **ACCEPTED**: Convert to Invoice, View on customer page
   - **CONVERTED**: View converted invoice
4. Timeline: Created → Sent → Accepted/Declined → Converted

---

#### Public Quote Page: `/quote/[token]`

**Token generation:** When org sends a quote, a `publicToken` (nanoid, 16 chars) is stored on the `Quote` model. Link: `https://app.slipwise.com/quote/<token>`

**Page content:**
1. Org logo + name
2. Full quote render (HTML)
3. Expiry countdown: "This quote expires in 3 days" (shown if within 72h of validUntil)
4. Accept / Decline buttons (shown only if quote is in SENT status)
   - **Accept:** Confirmation modal → `POST /api/quotes/[token]/accept` → status = ACCEPTED → email to org → page updates to "Quote Accepted!"
   - **Decline:** Decline modal with optional reason textarea → `POST /api/quotes/[token]/decline` → status = DECLINED → email to org → page updates to "Quote Declined"
5. Download PDF button
6. Expired state: "This quote has expired. Please contact [org_name] for a new quote."

**Org notification on acceptance/decline:**
- `createNotification()` for org admins
- Email via Resend: "Your quote [QTE-2026-0001] has been accepted by [Customer Name]"
- Push notification via `notifyOrgAdmins()` if push configured

---

#### Quote-to-Invoice Conversion

**Action: `convertQuoteToInvoice(quoteId, orgId, userId)`**

**Steps:**
1. Verify quote.status = ACCEPTED (throw if not)
2. Check no existing `convertedInvoiceId` (idempotency)
3. Create `Invoice` with:
   - All line items copied from `QuoteLineItem` → `InvoiceLineItem`
   - Same `customerId`, `organizationId`
   - `invoiceDate` = today
   - `dueDate` = null (user must set)
   - `status` = DRAFT
   - `notes` = quote.notes
   - `formData` = constructed from quote fields (matching invoice formData structure)
   - `totalAmount` = quote.totalAmount
4. Update `Quote.status = CONVERTED`, `Quote.convertedInvoiceId = newInvoice.id`
5. Log `ActivityLog` entry for both quote and invoice
6. Redirect user to the new invoice edit page with a toast: "Quote converted to invoice draft — please set the due date and issue."

---

### 6.2 Cash Flow Intelligence Dashboard

#### Route: `/app/intel/cash-flow`

**Purpose:** Forward-looking view of expected cash receipts and AR health. Pre-computed nightly by Trigger.dev job `cash-flow-snapshot`, served from `ReportSnapshot`.

---

#### Section 1: 90-Day Cash Flow Forecast

**Chart type:** Grouped bar chart (weekly buckets, next 13 weeks)

**Data source:** All invoices with status in (ISSUED, DUE, PARTIALLY_PAID, OVERDUE) grouped by `dueDate` week.

**Two series:**
- **Optimistic** (100% collection): full `remainingAmount` per invoice
- **Conservative** (customer payment health score adjusted): `remainingAmount * customer.paymentHealthScore / 100`

**X-axis:** Week of (e.g., "Apr 14-20", "Apr 21-27", ...)
**Y-axis:** Amount in ₹

**Colour coding per bar segment:**
- Green: Not yet due (dueDate in future)
- Orange: 1–15 days overdue
- Red: 15+ days overdue

**Hover tooltip:** "₹X from N invoices due this week — click to see list"

**Click drill-down:** Clicking a bar filters the invoice list at the bottom of the page to show those specific invoices.

---

#### Section 2: AR Aging Summary

Existing AR Aging from SW Intel Reports — enhanced with:
- **Customer-level drill-down** (click customer name → see their aging buckets)
- **Total at-risk value** highlighted in red badge if > 20% of total AR is 60+ days overdue
- **"Send bulk reminders"** shortcut button for each aging bucket

**Aging Buckets:**
| Bucket | Days | Background |
|---|---|---|
| Current | 0 days | Green |
| 1–30 days | 1-30 past due | Yellow |
| 31–60 days | 31-60 past due | Orange |
| 61–90 days | 61-90 past due | Red-light |
| 90+ days | 90+ past due | Red |

---

#### Section 3: DSO (Days Sales Outstanding) Tracker

**Formula:**
```
DSO = (Total AR Outstanding / Total Invoiced in Period) × Number of Days in Period
```

**Displayed as:**
- Current DSO: rolling 90-day
- Trend chart: monthly DSO for last 12 months
- **Health indicator:**
  - < 30 days → Excellent (green)
  - 30–45 days → Good (yellow)
  - 45–60 days → Fair (orange)
  - > 60 days → At Risk (red)

**Benchmark note:** India SMB services industry avg DSO: ~45 days (hardcoded reference)

---

#### Section 4: Customer Payment Health Scores

**Stored on Customer model as `paymentHealthScore` (new field, Int 0-100)**

**Score computation (nightly Trigger.dev job `customer-health-score`):**

```
base = 100

// Factor 1: Average days to pay (last 12 months)
avgDaysToPay = avg(paidAt - issueDate) across settled invoices
if avgDaysToPay <= 10: base -= 0
if 10 < avgDaysToPay <= 20: base -= 10
if 20 < avgDaysToPay <= 30: base -= 20
if 30 < avgDaysToPay <= 45: base -= 30
if avgDaysToPay > 45: base -= 50

// Factor 2: Partial payment frequency
partialRatio = count(PARTIALLY_PAID invoices) / count(all invoices)
base -= partialRatio * 20

// Factor 3: Disputed invoices
if hasDisputed: base -= 10

// Factor 4: Opt-out from dunning (proxy for annoyance)
if hasOptedOut: base -= 5

score = max(0, min(100, base))
```

**Score tiers:**

| Score | Label | Color |
|---|---|---|
| 80–100 | Excellent | Green |
| 60–79 | Good | Light green |
| 40–59 | Fair | Yellow |
| 20–39 | At Risk | Orange |
| 0–19 | Critical | Red |

**Displayed:** On Customer detail page (badge), on Cash Flow dashboard (column in customer table), in dunning sequence selection (suggest more aggressive sequence for low-score customers).

---

#### Section 5: Alert Panel

**Top of cash flow dashboard — collapsible:**

| Alert | Trigger |
|---|---|
| "N invoices going overdue in 48h — ₹X total" | invoices where dueDate < now + 2 days AND status != PAID |
| "High-value invoices overdue 15+ days" | totalAmount > 50000 AND status = OVERDUE AND dueDate < now - 15 days |
| "Customers at risk with open invoices" | paymentHealthScore < 40 AND has open invoices |
| "Payment arrangements due this week" | PaymentInstallment.dueDate within 7 days AND status = PENDING |

---

### 6.3 Payment Arrangements / Installment Plans

#### Business Case

A customer cannot pay an ₹1,00,000 invoice at once. The org agrees to accept payment in 5 monthly installments of ₹20,000. This formal arrangement:
1. Stops dunning (the customer isn't ignoring — they have a payment plan)
2. Creates a structured repayment schedule
3. Each installment gets its own mini-reminder (2 reminders: on due date + 3 days after)
4. If an installment is missed (30+ days), escalates back to dunning on the parent invoice

---

#### New Invoice Status: `ARRANGEMENT_MADE`

**Add to `InvoiceStatus` enum:**
```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  VIEWED
  DUE
  PARTIALLY_PAID
  PAID
  OVERDUE
  DISPUTED
  CANCELLED
  REISSUED
  ARRANGEMENT_MADE  // ← NEW
}
```

**Status semantics:**
- An invoice in `ARRANGEMENT_MADE` has an active `PaymentArrangement`
- Dunning is suspended for the parent invoice
- Each installment payment creates an `InvoicePayment` with `source = "installment"`
- `reconcileInvoicePayment()` runs after each installment payment (amountPaid / remainingAmount updated)
- When `remainingAmount = 0`, status transitions from `ARRANGEMENT_MADE` → `PAID`
- If arrangement is `DEFAULTED` (missed installment > 30 days), status reverts to `OVERDUE` and dunning resumes

---

#### Creating a Payment Arrangement

**Route:** `/app/pay/arrangements/new` or from Invoice detail → "Create payment plan" button

**Form:**
- Invoice reference (auto-filled if coming from invoice page)
- Total arranged amount (defaults to invoice.remainingAmount — cannot exceed it)
- Number of installments (2–24)
- First installment date
- Frequency: Weekly / Bi-weekly / Monthly
- System auto-computes installment dates and amounts (equal split, last installment absorbs rounding)
- Notes field

**Preview table before confirm:**
| # | Due Date | Amount |
|---|---|---|
| 1 | 15-Apr-2026 | ₹20,000 |
| 2 | 15-May-2026 | ₹20,000 |
| ... | ... | ... |

**On confirm:**
1. Create `PaymentArrangement` record
2. Create all `PaymentInstallment` records
3. Update `Invoice.status = ARRANGEMENT_MADE`
4. Log `ActivityLog` + `InvoiceStateEvent`
5. `createNotification()` for org admins
6. Optional: send customer email with payment schedule

---

#### Recording Installment Payment

**Route:** `/app/pay/arrangements/[arrangementId]/installments/[installmentId]/pay`

**UI:** Confirm the payment amount, date, method (UPI / bank transfer / cash), reference number

**On submit:**
1. Create `InvoicePayment` with `source = "installment"`, `status = "SETTLED"`
2. Update `PaymentInstallment.status = PAID`, `paidAt = now`
3. Call `reconcileInvoicePayment(invoiceId)`
4. If `remainingAmount = 0`: `PaymentArrangement.status = COMPLETED`, invoice → PAID
5. Log `ActivityLog`

**Alternatively:** Customer can pay via customer portal — each installment shows as a separate payable item on their portal dashboard.

---

#### Arrangement Management Page

**Route:** `/app/pay/arrangements`

**Table:** All active arrangements — Invoice # · Customer · Total · Paid · Remaining · Installments (X/Y paid) · Status · Next installment due

**Detail page: `/app/pay/arrangements/[id]`**
- Arrangement summary
- Installment table with status per installment
- "Record payment" action per PENDING installment
- "Mark as defaulted" action (triggers status change + dunning resumption)
- "Cancel arrangement" action (requires confirmation — reverts invoice to OVERDUE)

---

## 7. Complete Database Schema Additions

> **Important:** These are the ONLY schema changes in Phase 14. Do not modify existing models beyond what is explicitly listed.

### 7.1 New Enum: `DunningTone`

```prisma
enum DunningTone {
  FRIENDLY
  POLITE
  FIRM
  URGENT
  ESCALATE
}
```

### 7.2 New Enum: `DunningLogStatus`

```prisma
enum DunningLogStatus {
  SENT
  FAILED
  SKIPPED
}
```

### 7.3 New Enum: `QuoteStatus`

```prisma
enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
  EXPIRED
  CONVERTED
}
```

### 7.4 New Enum: `ArrangementStatus`

```prisma
enum ArrangementStatus {
  ACTIVE
  COMPLETED
  DEFAULTED
  CANCELLED
}
```

### 7.5 New Enum: `InstallmentStatus`

```prisma
enum InstallmentStatus {
  PENDING
  PAID
  OVERDUE
  WAIVED
}
```

### 7.6 Modified Enum: `InvoiceStatus` (add one value)

```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  VIEWED
  DUE
  PARTIALLY_PAID
  PAID
  OVERDUE
  DISPUTED
  CANCELLED
  REISSUED
  ARRANGEMENT_MADE  // ← ADD THIS
}
```

### 7.7 New Model: `DunningSequence`

```prisma
model DunningSequence {
  id        String   @id @default(cuid())
  orgId     String
  name      String
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org   Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  steps DunningStep[]
  logs  DunningLog[]

  @@index([orgId, isDefault])
  @@map("dunning_sequence")
}
```

### 7.8 New Model: `DunningStep`

```prisma
model DunningStep {
  id            String      @id @default(cuid())
  sequenceId    String
  stepNumber    Int
  daysOffset    Int
  channels      String[]    // e.g. ["email", "sms"]
  emailSubject  String
  emailBody     String      @db.Text
  smsBody       String?
  smsTemplateId String?     // MSG91 DLT template ID
  tone          DunningTone
  createTicket  Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  sequence DunningSequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)

  @@unique([sequenceId, stepNumber])
  @@map("dunning_step")
}
```

### 7.9 New Model: `DunningLog`

```prisma
model DunningLog {
  id           String           @id @default(cuid())
  orgId        String
  invoiceId    String
  sequenceId   String
  stepNumber   Int
  channel      String           // "email" | "sms" | "whatsapp"
  status       DunningLogStatus
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime         @default(now())

  org      Organization    @relation(fields: [orgId], references: [id])
  invoice  Invoice         @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  sequence DunningSequence @relation(fields: [sequenceId], references: [id])

  @@index([invoiceId, stepNumber])
  @@index([orgId, createdAt])
  @@map("dunning_log")
}
```

### 7.10 New Model: `DunningOptOut`

```prisma
model DunningOptOut {
  id         String   @id @default(cuid())
  orgId      String
  customerId String
  token      String   @unique  // signed HMAC token for verification
  optedOutAt DateTime @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@unique([orgId, customerId])
  @@map("dunning_opt_out")
}
```

### 7.11 New Model: `CustomerPortalToken`

```prisma
model CustomerPortalToken {
  id          String    @id @default(cuid())
  orgId       String
  customerId  String
  tokenHash   String    @unique  // SHA-256 of the JWT token
  expiresAt   DateTime
  lastUsedAt  DateTime?
  isRevoked   Boolean   @default(false)
  createdAt   DateTime  @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@index([customerId, orgId])
  @@map("customer_portal_token")
}
```

### 7.12 New Model: `CustomerPortalAccessLog`

```prisma
model CustomerPortalAccessLog {
  id         String   @id @default(cuid())
  orgId      String
  customerId String
  path       String   // e.g. "/dashboard", "/invoices/[id]"
  ip         String?
  userAgent  String?
  accessedAt DateTime @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@index([customerId, orgId])
  @@map("customer_portal_access_log")
}
```

### 7.13 New Model: `CustomerStatement`

```prisma
model CustomerStatement {
  id             String   @id @default(cuid())
  orgId          String
  customerId     String
  fromDate       DateTime
  toDate         DateTime
  openingBalance Decimal  @db.Decimal(12, 2)
  closingBalance Decimal  @db.Decimal(12, 2)
  totalInvoiced  Decimal  @db.Decimal(12, 2)
  totalReceived  Decimal  @db.Decimal(12, 2)
  fileUrl        String?  // S3/Supabase URL after generation
  generatedAt    DateTime @default(now())

  org      Organization @relation(fields: [orgId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@index([customerId, fromDate, toDate])
  @@map("customer_statement")
}
```

### 7.14 New Model: `Quote`

```prisma
model Quote {
  id                 String      @id @default(cuid())
  orgId              String
  customerId         String
  quoteNumber        String
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
  publicToken        String?     @unique  // nanoid for public page
  convertedInvoiceId String?     // FK to Invoice after conversion
  acceptedAt         DateTime?
  declinedAt         DateTime?
  declineReason      String?
  createdBy          String      @db.Uuid
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  archivedAt         DateTime?

  org       Organization    @relation(fields: [orgId], references: [id], onDelete: Cascade)
  customer  Customer        @relation(fields: [customerId], references: [id])
  creator   Profile         @relation(fields: [createdBy], references: [id])
  lineItems QuoteLineItem[]

  @@unique([orgId, quoteNumber])
  @@index([orgId, status])
  @@map("quote")
}
```

### 7.15 New Model: `QuoteLineItem`

```prisma
model QuoteLineItem {
  id          String  @id @default(cuid())
  quoteId     String
  description String
  quantity    Decimal @db.Decimal(10, 3)
  unitPrice   Decimal @db.Decimal(12, 2)
  taxRate     Decimal @db.Decimal(5, 2) @default(0)
  amount      Decimal @db.Decimal(12, 2)
  sortOrder   Int

  quote Quote @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  @@map("quote_line_item")
}
```

### 7.16 New Model: `PaymentArrangement`

```prisma
model PaymentArrangement {
  id               String            @id @default(cuid())
  orgId            String
  invoiceId        String            @unique
  customerId       String
  totalArranged    Decimal           @db.Decimal(12, 2)
  installmentCount Int
  status           ArrangementStatus @default(ACTIVE)
  notes            String?
  createdBy        String            @db.Uuid
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  org          Organization        @relation(fields: [orgId], references: [id])
  invoice      Invoice             @relation(fields: [invoiceId], references: [id])
  customer     Customer            @relation(fields: [customerId], references: [id])
  creator      Profile             @relation(fields: [createdBy], references: [id])
  installments PaymentInstallment[]

  @@index([orgId, status])
  @@map("payment_arrangement")
}
```

### 7.17 New Model: `PaymentInstallment`

```prisma
model PaymentInstallment {
  id                String            @id @default(cuid())
  arrangementId     String
  installmentNumber Int
  dueDate           DateTime
  amount            Decimal           @db.Decimal(12, 2)
  status            InstallmentStatus @default(PENDING)
  invoicePaymentId  String?           @unique
  paidAt            DateTime?
  createdAt         DateTime          @default(now())

  arrangement    PaymentArrangement @relation(fields: [arrangementId], references: [id], onDelete: Cascade)
  invoicePayment InvoicePayment?    @relation(fields: [invoicePaymentId], references: [id])

  @@unique([arrangementId, installmentNumber])
  @@map("payment_installment")
}
```

### 7.18 Modifications to Existing Models

**`Invoice` model — add fields:**
```prisma
// Phase 14 additions (append to existing Invoice model)
dunningEnabled       Boolean   @default(true)
dunningPausedUntil   DateTime?
dunningSequenceId    String?   // FK DunningSequence — null = use org default
```

**`Customer` model — add fields:**
```prisma
// Phase 14 additions
paymentHealthScore   Int       @default(100)  // 0-100, computed nightly
```

**`OrgDefaults` model — add fields:**
```prisma
// Phase 14 additions
portalEnabled         Boolean @default(false)
portalHeaderMessage   String?
portalSupportEmail    String?
portalSupportPhone    String?
quotePrefix           String  @default("QTE")
quoteCounter          Int     @default(1)
quoteValidityDays     Int     @default(14)   // default validUntil offset
quoteHeaderLabel      String  @default("QUOTE")  // "QUOTE" or "ESTIMATE"
defaultDunningSeqId   String? // FK DunningSequence
```

---

## 8. Prisma Migration Strategy

### Why Manual Migration

The codebase has schema drift from prior phases — `prisma migrate dev` will fail due to missing migration history. All Phase 14 schema changes must be applied as a manual migration SQL file.

### Migration File Location

`prisma/migrations/20260408000000_phase14_ar_automation/migration.sql`

### Migration SQL Outline

```sql
-- 1. New enums
CREATE TYPE "DunningTone" AS ENUM ('FRIENDLY', 'POLITE', 'FIRM', 'URGENT', 'ESCALATE');
CREATE TYPE "DunningLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED');
CREATE TYPE "ArrangementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- 2. Add ARRANGEMENT_MADE to InvoiceStatus enum
ALTER TYPE "InvoiceStatus" ADD VALUE 'ARRANGEMENT_MADE';

-- 3. New tables (dunning_sequence, dunning_step, dunning_log, dunning_opt_out)
-- 4. New tables (customer_portal_token, customer_portal_access_log, customer_statement)
-- 5. New tables (quote, quote_line_item)
-- 6. New tables (payment_arrangement, payment_installment)

-- 7. Modify existing tables
ALTER TABLE "invoice" 
  ADD COLUMN "dunningEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "dunningPausedUntil" TIMESTAMP,
  ADD COLUMN "dunningSequenceId" TEXT;

ALTER TABLE "customer"
  ADD COLUMN "paymentHealthScore" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "org_defaults"
  ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "portalHeaderMessage" TEXT,
  ADD COLUMN "portalSupportEmail" TEXT,
  ADD COLUMN "portalSupportPhone" TEXT,
  ADD COLUMN "quotePrefix" TEXT NOT NULL DEFAULT 'QTE',
  ADD COLUMN "quoteCounter" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "quoteValidityDays" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN "quoteHeaderLabel" TEXT NOT NULL DEFAULT 'QUOTE',
  ADD COLUMN "defaultDunningSeqId" TEXT;

-- 8. Seed default dunning sequence for all existing orgs
-- (Run as a separate seed script after migration)
```

**Post-migration seed script:** `scripts/seed-dunning-defaults.ts`
- For each existing `Organization`, create a `DunningSequence` (isDefault = true) with the 5 default steps
- Set `OrgDefaults.defaultDunningSeqId` to the new sequence ID

---

## 9. Complete Route Map

### New App Routes (internal, Supabase auth required)

| Route | File | Component Type |
|---|---|---|
| `/app/pay/dunning` | `src/app/app/pay/dunning/page.tsx` | Server component |
| `/app/pay/dunning/sequences` | `src/app/app/pay/dunning/sequences/page.tsx` | Server component |
| `/app/pay/dunning/sequences/new` | `src/app/app/pay/dunning/sequences/new/page.tsx` | Client form |
| `/app/pay/dunning/sequences/[id]/edit` | `src/app/app/pay/dunning/sequences/[id]/edit/page.tsx` | Client form |
| `/app/pay/dunning/log` | `src/app/app/pay/dunning/log/page.tsx` | Server component |
| `/app/pay/dunning/opt-outs` | `src/app/app/pay/dunning/opt-outs/page.tsx` | Server component |
| `/app/pay/portal` | `src/app/app/pay/portal/page.tsx` | Server component |
| `/app/pay/arrangements` | `src/app/app/pay/arrangements/page.tsx` | Server component |
| `/app/pay/arrangements/new` | `src/app/app/pay/arrangements/new/page.tsx` | Client form |
| `/app/pay/arrangements/[id]` | `src/app/app/pay/arrangements/[id]/page.tsx` | Server component |
| `/app/docs/quotes` | `src/app/app/docs/quotes/page.tsx` | Server component |
| `/app/docs/quotes/new` | `src/app/app/docs/quotes/new/page.tsx` | Client form |
| `/app/docs/quotes/[id]` | `src/app/app/docs/quotes/[id]/page.tsx` | Server component |
| `/app/intel/cash-flow` | `src/app/app/intel/cash-flow/page.tsx` | Server component (data from snapshot) |

### New Server Actions

| File | Exports |
|---|---|
| `src/app/app/pay/dunning/actions.ts` | `createDunningSequence`, `updateDunningSequence`, `deleteDunningSequence`, `setDefaultSequence`, `toggleInvoiceDunning`, `pauseInvoiceDunning`, `sendImmediateReminder`, `retrySendReminder` |
| `src/app/app/pay/portal/actions.ts` | `issuePortalToken`, `revokePortalToken`, `bulkSendPortalInvites`, `updatePortalSettings` |
| `src/app/app/docs/quotes/actions.ts` | `createQuote`, `updateQuote`, `sendQuote`, `markQuoteAccepted`, `markQuoteDeclined`, `convertQuoteToInvoice`, `archiveQuote`, `duplicateQuote` |
| `src/app/app/pay/arrangements/actions.ts` | `createArrangement`, `recordInstallmentPayment`, `markArrangementDefaulted`, `cancelArrangement`, `waiveInstallment` |

### New Public Routes (no Supabase auth)

| Route | File | Description |
|---|---|---|
| `/portal/[orgSlug]` | `src/app/portal/[orgSlug]/page.tsx` | Portal login (magic link) |
| `/portal/[orgSlug]/[token]/dashboard` | `src/app/portal/[orgSlug]/[token]/dashboard/page.tsx` | Customer dashboard |
| `/portal/[orgSlug]/[token]/invoices` | `src/app/portal/[orgSlug]/[token]/invoices/page.tsx` | Invoice list |
| `/portal/[orgSlug]/[token]/invoices/[id]` | `src/app/portal/[orgSlug]/[token]/invoices/[id]/page.tsx` | Invoice detail |
| `/portal/[orgSlug]/[token]/payments` | `src/app/portal/[orgSlug]/[token]/payments/page.tsx` | Payment history |
| `/portal/[orgSlug]/[token]/statements` | `src/app/portal/[orgSlug]/[token]/statements/page.tsx` | Statements |
| `/portal/[orgSlug]/[token]/tickets` | `src/app/portal/[orgSlug]/[token]/tickets/page.tsx` | Support tickets |
| `/portal/[orgSlug]/[token]/profile` | `src/app/portal/[orgSlug]/[token]/profile/page.tsx` | Customer profile |
| `/quote/[token]` | `src/app/quote/[token]/page.tsx` | Public quote view |
| `/unsubscribe/dunning` | `src/app/unsubscribe/dunning/page.tsx` | Dunning opt-out confirmation |

### New API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/portal/auth/magic-link` | None | Send magic link to customer |
| GET | `/api/portal/invoices` | Portal JWT | Customer's invoice list |
| GET | `/api/portal/invoices/[id]` | Portal JWT | Invoice detail |
| GET | `/api/portal/invoices/[id]/status` | Portal JWT | Lightweight status poll |
| POST | `/api/portal/invoices/[id]/pay` | Portal JWT | Get/create payment link |
| POST | `/api/portal/invoices/[id]/proof` | Portal JWT | Upload proof |
| POST | `/api/portal/invoices/[id]/ticket` | Portal JWT | Create ticket |
| GET | `/api/portal/payments` | Portal JWT | Payment history |
| POST | `/api/portal/statements/generate` | Portal JWT | Generate statement |
| GET | `/api/portal/statements/[id]/download` | Portal JWT | Download statement |
| GET | `/api/portal/profile` | Portal JWT | Customer profile |
| POST | `/api/portal/preferences/dunning-opt-out` | Portal JWT | Toggle opt-out |
| POST | `/api/quotes/[token]/accept` | None (token) | Accept quote |
| POST | `/api/quotes/[token]/decline` | None (token) | Decline quote |
| GET | `/api/quotes/[token]` | None (token) | Public quote data |
| GET | `/api/intel/cash-flow` | Supabase session | Cash flow data |
| GET | `/api/intel/ar-aging` | Supabase session | AR aging data |
| GET | `/api/intel/dso` | Supabase session | DSO metrics |
| POST | `/api/v1/invoices/bulk-remind` | API key | Bulk send reminders |

### New Trigger.dev Jobs

| Job ID | Schedule | File |
|---|---|---|
| `dunning-scheduler` | `*/15 * * * *` | `src/jobs/dunning-scheduler.ts` |
| `dunning-retry` | `*/5 * * * *` | `src/jobs/dunning-retry.ts` |
| `quote-expiry-checker` | `0 9 * * *` (9am IST) | `src/jobs/quote-expiry.ts` |
| `installment-overdue-checker` | `0 9 * * *` (9am IST) | `src/jobs/installment-overdue.ts` |
| `portal-token-cleanup` | `0 0 * * *` (midnight) | `src/jobs/portal-token-cleanup.ts` |
| `customer-health-score` | `0 2 * * *` (2am IST) | `src/jobs/customer-health-score.ts` |
| `cash-flow-snapshot` | `0 6 * * *` (6am IST) | `src/jobs/cash-flow-snapshot.ts` |

---

## 10. API Contracts

### `POST /api/portal/auth/magic-link`

**Request:**
```json
{
  "email": "customer@example.com",
  "orgSlug": "acme-corp"
}
```

**Response (success — always 200, even if email not found):**
```json
{ "success": true, "data": { "message": "If this email is on file, a portal link has been sent." } }
```

---

### `GET /api/portal/invoices`

**Headers:** `Authorization: Bearer <portal_jwt>`

**Query params:** `status=OVERDUE&page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "inv_abc",
        "invoiceNumber": "INV-2026-0042",
        "invoiceDate": "2026-03-01",
        "dueDate": "2026-03-31",
        "totalAmount": 118000,
        "amountPaid": 0,
        "remainingAmount": 118000,
        "status": "OVERDUE",
        "paymentLinkUrl": "https://rzp.io/i/abc123",
        "paymentLinkExpired": false
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "pages": 1 }
  }
}
```

---

### `POST /api/portal/invoices/[id]/pay`

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentLinkUrl": "https://rzp.io/i/abc123",
    "amount": 118000,
    "currency": "INR",
    "expiresAt": "2026-04-15T00:00:00Z"
  }
}
```

---

### `POST /api/quotes/[token]/accept`

**Request:**
```json
{ "customerName": "Rajesh Kumar" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quoteId": "quo_abc",
    "quoteNumber": "QTE-2026-0001",
    "status": "ACCEPTED",
    "message": "Quote accepted. The team at Acme Corp will be in touch shortly."
  }
}
```

**Error (already expired):**
```json
{
  "success": false,
  "error": { "code": "QUOTE_EXPIRED", "message": "This quote has expired. Please contact Acme Corp for a new quote." }
}
```

---

### `GET /api/intel/cash-flow`

**Query params:** `weeks=13` (default 13 = 90 days)

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "weekStart": "2026-04-14",
        "weekEnd": "2026-04-20",
        "optimistic": 250000,
        "conservative": 175000,
        "invoiceCount": 4,
        "buckets": {
          "notYetDue": 250000,
          "overdue1to15": 0,
          "overdue15plus": 0
        }
      }
    ],
    "dso": { "current": 38, "trend": [42, 40, 38], "health": "GOOD" },
    "arAging": {
      "current": 180000,
      "days1to30": 95000,
      "days31to60": 42000,
      "days61to90": 18000,
      "days90plus": 8000,
      "total": 343000
    },
    "alerts": [
      { "type": "overdue_soon", "count": 3, "amount": 75000 }
    ]
  }
}
```

---

### `POST /api/v1/invoices/bulk-remind`

**Auth:** API key header `X-API-Key: slipwise_live_...`

**Plan gate:** Pro+

**Request:**
```json
{
  "invoiceIds": ["inv_abc", "inv_def"],
  "stepOverride": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fired": 2,
    "skipped": 0,
    "failed": 0,
    "results": [
      { "invoiceId": "inv_abc", "status": "sent", "channels": ["email", "sms"] },
      { "invoiceId": "inv_def", "status": "sent", "channels": ["email"] }
    ]
  }
}
```

---

## 11. Plan Gates & Feature Access

| Feature | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Dunning sequences (default) | ✅ 1 sequence, max 3 steps | ✅ 1 sequence, max 5 steps | ✅ Unlimited sequences | ✅ Unlimited |
| Custom dunning sequences | ❌ | ❌ | ✅ | ✅ |
| SMS reminders | ❌ | ❌ | ✅ | ✅ |
| Manual "Send reminder now" | ❌ | ✅ (max 5/month) | ✅ | ✅ |
| Bulk remind API (`/api/v1/invoices/bulk-remind`) | ❌ | ❌ | ✅ | ✅ |
| Customer portal | ❌ | ✅ (view-only, no pay) | ✅ (full) | ✅ (full + custom domain) |
| Portal custom domain | ❌ | ❌ | ❌ | ✅ |
| Account statements (PDF) | ❌ | ❌ | ✅ | ✅ |
| Quotes / Estimates | ❌ | ✅ (max 10/month) | ✅ (unlimited) | ✅ |
| Quote acceptance via public page | ❌ | ✅ | ✅ | ✅ |
| Cash flow forecast | ❌ | ❌ | ✅ | ✅ |
| DSO tracker | ❌ | ❌ | ✅ | ✅ |
| Customer health scores | ❌ | ❌ | ✅ | ✅ |
| Payment arrangements | ❌ | ✅ | ✅ | ✅ |

---

## 12. Exhaustive Edge Cases

### Dunning Engine Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| D-01 | Invoice paid between dunning check and email send | Email is still sent (race condition acceptable). All subsequent steps are cancelled on next scheduler run. |
| D-02 | Invoice partially paid — Step 3 fires | Template variables `{{amount_due}}` reflects updated `remainingAmount`, not original. Always read from DB at send time. |
| D-03 | Payment link expired when dunning Step 2 fires | Auto-renew: create new Razorpay payment link, update Invoice, use new URL in email. |
| D-04 | Customer has no email on record | Skip email channel. Log `DunningLog.status = SKIPPED`, `errorMessage = "no_email_on_file"`. SMS still fires if channel configured. |
| D-05 | Customer has no phone and step includes SMS | Skip SMS. Fire email only. Both logged separately. |
| D-06 | Scheduler runs twice in same 15-minute window | Idempotency guard: second run finds existing `DunningLog(status: SENT)` for that step → skips entirely. No duplicates. |
| D-07 | Step 5 fires but InvoiceTicket already exists (ESCALATED) | Check for existing ticket with same invoiceId before creating. If found: skip ticket creation. Log step 5 as SENT (email still fires). |
| D-08 | Org deletes a dunning sequence that has active invoices | Block deletion. Show: "This sequence is assigned to N active invoices. Reassign them first." |
| D-09 | Org sets `dunningPausedUntil` to a past date | Treated as if null. Dunning resumes immediately on next scheduler run. |
| D-10 | Two dunning sequences both have `isDefault = true` | Data constraint: `@@unique([orgId, isDefault])` where `isDefault = true` enforced at DB level. API returns 409 if trying to set a second default. |
| D-11 | Invoice is DISPUTED | Dunning does NOT fire for disputed invoices. `DISPUTED` is not in the scheduler's target status list. |
| D-12 | Invoice is REISSUED | Original invoice: dunning stops. New invoice: dunning starts fresh on new invoice's due date. |
| D-13 | Resend (email) returns 429 rate limit | Log as FAILED. `dunning-retry` job picks it up within 1 hour. Max 2 retries per FAILED entry. |
| D-14 | Invalid `{{pay_now_link}}` (Razorpay API down during link renewal) | Send email with link expired notice, no pay button. Log warning in ActivityLog. Do not block email send. |
| D-15 | Org disables dunning globally (`dunningEnabled`) | New field on `OrgDefaults.dunningGloballyEnabled` — if false, scheduler skips all invoices for that org. |

### Customer Portal Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| P-01 | Token expired (>30 days old) | JWT `exp` check fails → redirect to `/portal/[orgSlug]` with message "Your session has expired. Enter your email to get a new link." |
| P-02 | Token from DB but `isRevoked = true` | Show "Access to this portal has been revoked. Contact [org_name] for assistance." |
| P-03 | Org disables portal after customer has active token | Check `OrgDefaults.portalEnabled` on every request. If false: show "This portal has been temporarily disabled by [Org Name]." |
| P-04 | Customer requests portal link but not in org's customer list | Same "check your email" response. No error. Never reveal that email isn't found. |
| P-05 | Customer pays via portal — Razorpay webhook delayed by 30s | Portal shows "Payment processing…" state. Polls `/api/portal/invoices/[id]/status` every 5 seconds. Resolves when invoice.status changes. Max wait: 60 seconds. After 60s: show "Payment submitted — we'll notify you when confirmed." |
| P-06 | Customer tries to view invoice from different org (URL manipulation) | Portal JWT contains `orgId`. Invoice lookup always filters by `orgId` AND `customerId`. Any mismatch returns 403. |
| P-07 | Statement generation for 3+ years of data times out | Queue as background Trigger.dev task. Return 202 immediately. Email customer when PDF ready. Store at `CustomerStatement.fileUrl`. |
| P-08 | Customer uploads payment proof (large file, >10MB) | Reject with 413. Max file size: 10MB. Accepted types: PDF, JPG, PNG. |
| P-09 | Customer raises ticket for already-resolved invoice | Allowed. Create `InvoiceTicket` normally. Org can close immediately. |
| P-10 | Two devices use same portal link simultaneously | Both valid. `CustomerPortalToken` supports multiple concurrent sessions (no single-use constraint). |
| P-11 | Customer requests new portal link but already has active one | Issue new token. Old token remains valid until expiry. Customer can use either. |
| P-12 | Org revokes portal access for a customer mid-session | On next API call: token check finds `isRevoked = true`. Return 401 with portal-disabled message. |
| P-13 | Org on Free plan tries to enable portal | Block with `requirePlan(orgId, "starter")` check. Show upgrade prompt. |
| P-14 | Portal custom domain not configured | Portal is accessible via `/portal/[orgSlug]` path always. Custom domain is additive (Enterprise only). |

### Quote Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| Q-01 | Customer tries to accept quote after `validUntil` | Quote status = EXPIRED (already auto-transitioned). API returns: `{ "error": { "code": "QUOTE_EXPIRED", "message": "This quote has expired..." } }` |
| Q-02 | `convertQuoteToInvoice` called twice (double-click or retry) | Check `Quote.convertedInvoiceId`. If already set: return existing invoice ID. Do NOT create duplicate invoice. |
| Q-03 | Org edits quote after it has been sent | Return 409: "Sent quotes cannot be edited. Create a new version." (Versioning is Phase 15.) |
| Q-04 | Customer declines quote without entering a reason | `declineReason` is optional. Accept empty string. Flag in org notification: "Quote declined — no reason given." |
| Q-05 | Quote total is zero (all line items removed) | Block: validation error "Quote must have at least one line item with a positive total." |
| Q-06 | Public quote page accessed after quote is CONVERTED | Show: "This quote has been processed and an invoice has been issued. Contact [Org Name] for details." |
| Q-07 | Same public token requested multiple times | Idempotent: always returns current quote state. No new token issued on re-access. |
| Q-08 | Quote number counter collision (concurrent creation) | Prisma `@@unique([orgId, quoteNumber])` + `OrgDefaults.quoteCounter` increment wrapped in DB transaction. Race condition safe. |
| Q-09 | Org archives a SENT quote | Block: "Cannot archive a sent quote. Mark it as declined first." |
| Q-10 | Converting a quote to invoice when customer has hit invoice limit | Check plan limits before creating invoice. Return 402 with upgrade prompt. |

### Payment Arrangements Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| A-01 | Total arranged ≠ invoice.remainingAmount | Block: "Arrangement total must equal the invoice balance (₹X)." Prevents partial arrangements from hiding remaining debt. |
| A-02 | `reconcileInvoicePayment()` runs mid-arrangement and detects overpayment | `OVERPAID_REVIEW` status created. Alert in org admin panel. Arrangement status unchanged. |
| A-03 | Arrangement created with 1 installment | Valid. Effectively just a deferred single payment with a due date. |
| A-04 | Customer pays all installments in one go (out of band) | Record as single `InvoicePayment` for full amount. `reconcileInvoicePayment()` detects `remainingAmount = 0`. Auto-marks arrangement `COMPLETED`. |
| A-05 | Arrangement defaulted — invoices switches back to OVERDUE | Resume dunning scheduler. Create `ActivityLog` entry. `createNotification()` for org: "Payment arrangement defaulted for [Customer Name] — Invoice INV-XXX" |
| A-06 | Cancel arrangement after 2 of 5 installments paid | Cancels remaining 3 installments. Invoice status: if `amountPaid > 0` → `PARTIALLY_PAID`, else → `OVERDUE`. Remaining balance tracked via `remainingAmount`. |
| A-07 | Waive an installment | `PaymentInstallment.status = WAIVED`. Amount considered as paid. `reconcileInvoicePayment()` does NOT include WAIVED amounts in `amountPaid`. Waive requires explicit confirmation + org note. |

---

## 13. Full Test Plan (50 Test Cases)

### Dunning Engine Tests

| TC | Title | Type | Steps | Expected Result |
|---|---|---|---|---|
| TC-D-01 | Default sequence seeds on org creation | Integration | Create new org → check `DunningSequence` | Default sequence with 5 steps exists |
| TC-D-02 | Step 1 fires on due date | Integration | Create OVERDUE invoice with dueDate = today - 0 days → run scheduler | DunningLog(stepNumber: 1, status: SENT) created |
| TC-D-03 | Step 2 fires 3 days past due | Integration | Invoice dueDate = 3 days ago → run scheduler | DunningLog(stepNumber: 2, status: SENT) created |
| TC-D-04 | Step 1 NOT fired again (idempotency) | Integration | Run scheduler twice for same invoice on same day | Only 1 DunningLog entry for stepNumber: 1 |
| TC-D-05 | PAID invoice — no step fires | Integration | Mark invoice PAID → run scheduler | Zero DunningLog entries created for this invoice |
| TC-D-06 | Customer opt-out — step SKIPPED | Integration | Create DunningOptOut for customer → run scheduler | DunningLog(status: SKIPPED, errorMessage: "customer_opted_out") |
| TC-D-07 | Opt-out link creates DunningOptOut | E2E | Click unsubscribe link in email → check DB | DunningOptOut record created, GET /unsubscribe/dunning returns 200 |
| TC-D-08 | Step 5 creates InvoiceTicket | Integration | Invoice 30+ days overdue → run scheduler | InvoiceTicket created with escalation description |
| TC-D-09 | Step 5 ticket NOT duplicated | Integration | Run scheduler twice when 30+ days overdue | Only 1 InvoiceTicket per invoice |
| TC-D-10 | SMS channel fires when phone on file | Integration | Customer with phone → Step 2 (email+sms) → run scheduler | 2 DunningLog entries (email: SENT, sms: SENT) |
| TC-D-11 | SMS skipped when no phone | Integration | Customer without phone → Step 2 (email+sms) | Email: SENT, SMS: SKIPPED(no_phone) |
| TC-D-12 | Expired payment link auto-renewed | Integration | Set paymentLinkExpiresAt = yesterday → run scheduler | New payment link created, invoice updated, old link URL replaced |
| TC-D-13 | `dunningPausedUntil` prevents firing | Integration | Set dunningPausedUntil = tomorrow → run scheduler | Zero steps fire |
| TC-D-14 | Arrangement stops dunning | Integration | Create PaymentArrangement for invoice → run scheduler | Zero new DunningLog entries |
| TC-D-15 | Manual "Send now" fires immediately | Integration | Call `sendImmediateReminder(invoiceId)` | DunningLog entry created, email sent |

### Customer Portal Tests

| TC | Title | Type | Steps | Expected Result |
|---|---|---|---|---|
| TC-P-01 | Magic link sent on email submit | Integration | POST /api/portal/auth/magic-link → check Resend | Email queued with portal link |
| TC-P-02 | Portal login with valid token | E2E | Visit portal link → dashboard loads | Dashboard shows customer name + invoice summary |
| TC-P-03 | Portal rejects expired token | E2E | Visit portal link with expired JWT | Redirect to login page with "session expired" message |
| TC-P-04 | Portal rejects revoked token | Integration | Revoke token in org panel → visit portal | 401 / portal-disabled page |
| TC-P-05 | Customer cannot see other org's invoices | Security | Modify orgSlug in URL → fetch invoice from different org | 403 response |
| TC-P-06 | Invoice list scoped to customer | Integration | Customer A has 3 invoices, Customer B has 2 → A's portal | Returns exactly 3 invoices |
| TC-P-07 | Pay Now redirects to Razorpay | E2E | Click Pay Now on portal invoice detail | Razorpay payment link page opens |
| TC-P-08 | Payment confirmed — status updates in portal | Integration | Simulate Razorpay webhook → poll /status endpoint | invoice.status = PAID reflected within 5s |
| TC-P-09 | Payment proof upload succeeds | Integration | POST /api/portal/invoices/[id]/proof with file | InvoiceProof record created, 200 response |
| TC-P-10 | Oversized proof file rejected | Integration | POST with 15MB PDF | 413 error response |
| TC-P-11 | Statement generates as PDF | Integration | POST /api/portal/statements/generate → download | PDF returned with correct opening/closing balances |
| TC-P-12 | Support ticket created via portal | Integration | POST /api/portal/invoices/[id]/ticket | InvoiceTicket created, org notified |
| TC-P-13 | Dunning opt-out via portal | Integration | POST /api/portal/preferences/dunning-opt-out | DunningOptOut created, future reminders stop |
| TC-P-14 | Token silent refresh (< 15 days remaining) | Integration | Valid token with 10 days left → any portal page | Response sets new token in cookie, DB updated |
| TC-P-15 | Org portal disabled — customer sees message | Integration | Set portalEnabled = false → visit portal | "Portal temporarily disabled" message |

### Quote Tests

| TC | Title | Type | Steps | Expected Result |
|---|---|---|---|---|
| TC-Q-01 | Create quote with line items | Integration | `createQuote(...)` → check DB | Quote record + QuoteLineItems created, status = DRAFT |
| TC-Q-02 | Quote number auto-generated | Integration | Create 3 quotes | Numbers: QTE-2026-0001, QTE-2026-0002, QTE-2026-0003 |
| TC-Q-03 | Send quote — public token generated | Integration | `sendQuote(quoteId)` | Quote.status = SENT, publicToken set, email sent |
| TC-Q-04 | Customer accepts via public page | E2E | GET /quote/[token] → click Accept | Quote.status = ACCEPTED, org notified |
| TC-Q-05 | Cannot accept expired quote | E2E | Set validUntil = yesterday → click Accept | Error: "Quote has expired" |
| TC-Q-06 | Customer declines with reason | E2E | Click Decline → enter reason → submit | Quote.status = DECLINED, declineReason stored |
| TC-Q-07 | Convert accepted quote to invoice | Integration | `convertQuoteToInvoice(quoteId)` | Invoice created with same line items, Quote.convertedInvoiceId set |
| TC-Q-08 | Conversion is idempotent | Integration | Call `convertQuoteToInvoice` twice | Second call returns same invoice ID, no duplicate |
| TC-Q-09 | Editing sent quote is blocked | Integration | Call `updateQuote` on SENT quote | 409 error |
| TC-Q-10 | Quote expiry cron runs daily | Integration | Create quote with validUntil = yesterday → run `quote-expiry-checker` | Quote.status = EXPIRED |

### Cash Flow & Arrangements Tests

| TC | Title | Type | Steps | Expected Result |
|---|---|---|---|---|
| TC-C-01 | Cash flow forecast shows future invoices | Integration | Create 3 invoices with future due dates → GET /api/intel/cash-flow | Forecast bars show correct amounts per week |
| TC-C-02 | DSO calculated correctly | Integration | 10 invoices with known issue/paid dates → GET /api/intel/dso | DSO matches manual calculation |
| TC-C-03 | Customer health score computed | Integration | Run `customer-health-score` job | Customer.paymentHealthScore updated correctly |
| TC-C-04 | Low health score triggers dashboard alert | Integration | Customer score < 40 with open invoice → GET /api/intel/cash-flow | Alert entry in `alerts[]` array |
| TC-C-05 | Create payment arrangement | Integration | `createArrangement(invoiceId, 3 installments, monthly)` | PaymentArrangement + 3 PaymentInstallment records, invoice.status = ARRANGEMENT_MADE |
| TC-C-06 | Record installment payment reconciles invoice | Integration | `recordInstallmentPayment(installmentId, amount)` | InvoicePayment created, reconcileInvoicePayment runs, amountPaid updated |
| TC-C-07 | All installments paid → invoice PAID | Integration | Record all 3 installments → check invoice | invoice.status = PAID, arrangement.status = COMPLETED |
| TC-C-08 | Arrangement defaulted → dunning resumes | Integration | `markArrangementDefaulted(arrangementId)` → run scheduler | invoice.status = OVERDUE, next dunning step fires |
| TC-C-09 | Cancel arrangement mid-way | Integration | 2/5 paid → `cancelArrangement` | Remaining 3 installments cancelled, invoice = PARTIALLY_PAID |
| TC-C-10 | Waive installment | Integration | `waiveInstallment(installmentId)` | status = WAIVED, NOT counted in amountPaid, arrangement continues |

---

## 14. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Portal page load (SSR) | < 2 seconds |
| Invoice list query (100 invoices) | < 500ms |
| Statement PDF generation (<12 months) | < 10 seconds |
| Cash flow forecast API | < 300ms (served from pre-computed `ReportSnapshot`) |
| Dunning scheduler per-run completion | < 5 minutes for 10,000 invoices |
| Payment status poll (`/api/portal/invoices/[id]/status`) | < 100ms |

### Reliability

| Concern | Approach |
|---|---|
| Dunning scheduler crash-safe | Idempotency guard on `DunningLog` — safe to re-run |
| Payment link creation failure | Retry 3 times with exponential backoff in dunning scheduler |
| Statement generation timeout | Background job with email notification |
| Portal token verification | Stateless JWT check (fast) + DB check (revocation) |
| Installment payment recording | Wrapped in Prisma transaction with `reconcileInvoicePayment()` |

### Security

| Concern | Approach |
|---|---|
| Portal token leakage | JWT signed with `CUSTOMER_PORTAL_JWT_SECRET`; hashed in DB (SHA-256) |
| Customer cross-org access | Every portal DB query filters by `orgId + customerId` from decoded JWT |
| Opt-out link forgery | HMAC-SHA256 signed with `DUNNING_OPT_OUT_SECRET` |
| Quote public token guessing | nanoid(16) = 94^16 ≈ 10^31 combinations |
| Bulk remind abuse | Rate limit: 10 req/min per org via Upstash Redis |
| Statement download IDOR | `/api/portal/statements/[id]/download` validates `customerId` in portal JWT matches statement owner |

### Accessibility

- All portal pages must pass WCAG 2.1 AA
- Status badges must not rely solely on color (use text labels + icons)
- Payment confirmation page must be screen-reader friendly

---

## 15. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | MSG91 DLT registration delays SMS sending | High | Medium | Build MSG91 provider with feature flag. If `MSG91_API_KEY` unset, SMS silently skipped. Launch email-only first. |
| R-02 | Dunning sends duplicate reminders | Low | High | Strict idempotency guard in scheduler. QA test TC-D-04. |
| R-03 | Customer portal token leaked via email forwarding | Medium | Medium | Token is 30-day expiry. Org can revoke immediately. No sensitive data in portal without fresh token validation. |
| R-04 | Razorpay link auto-renewal fails silently | Low | Medium | Log failure in `ActivityLog`. Email without pay link is better than no email. Show "Contact [org_name] to pay" in email if link missing. |
| R-05 | Quote accepted and converted simultaneously from two browsers | Low | High | `@@unique([orgId, invoiceId])` on `PaymentArrangement` + idempotent `convertQuoteToInvoice` via `convertedInvoiceId` check. |
| R-06 | Cash flow pre-computation job fails | Low | Low | Serve stale data from last successful snapshot. Show "Data as of [date]" label. |
| R-07 | Payment arrangement total ≠ invoice remaining (float precision) | Medium | Medium | Use `Decimal` type (not Float) for all monetary values in Phase 14 models. Validate at API layer using cents (no floating point). |
| R-08 | Org spams customers with dunning on old invoices | Medium | Medium | On org creation, dunning is `OFF` by default (`portalEnabled = false`). Org must explicitly enable per invoice or globally. Add "Enable dunning" as an onboarding step. |

---

## 16. Multi-Agent Execution Strategy

### Parallel Execution Lanes

The 5 lanes below can be executed fully in parallel. Each agent should work on its own branch off `feature/phase-14-ar-automation`.

| Lane | Agent Focus | Deliverables |
|---|---|---|
| **Lane A** | Dunning Engine | Schema migration for dunning models, `DunningSequence`/`DunningStep` CRUD server actions, Trigger.dev `dunning-scheduler` job, `dunning-retry` job, dunning management UI pages (`/app/pay/dunning/*`), invoice detail Dunning tab, opt-out endpoint |
| **Lane B** | Customer Portal | `CustomerPortalToken` + `CustomerStatement` schema, portal token lib (`src/lib/portal-auth.ts`), all `/portal/[orgSlug]/[token]/*` pages, all `/api/portal/*` routes, org-side portal management page (`/app/pay/portal`), `portal-token-cleanup` job |
| **Lane C** | Quotes Module | `Quote` + `QuoteLineItem` schema, all quote server actions, quote list/detail/new pages, public `/quote/[token]` page, `/api/quotes/[token]/accept|decline` routes, `quote-expiry-checker` job, quote PDF generation |
| **Lane D** | Cash Flow Intelligence | `customer-health-score` job, `cash-flow-snapshot` job, `/app/intel/cash-flow` page, `/api/intel/cash-flow|ar-aging|dso` routes, Customer health score field + computation, AR aging enhancements |
| **Lane E** | Payment Arrangements | `PaymentArrangement` + `PaymentInstallment` schema, `ARRANGEMENT_MADE` enum addition, all arrangement server actions, arrangement pages (`/app/pay/arrangements/*`), `installment-overdue-checker` job, mini-dunning per installment |

### Integration Points Between Lanes

After all lanes complete:
1. **Lane A ↔ Lane E:** Dunning scheduler must respect `ARRANGEMENT_MADE` status (check exists in stopping conditions list)
2. **Lane B ↔ Lane E:** Customer portal installment view — portal invoice detail shows installment schedule if `PaymentArrangement` exists
3. **Lane D ↔ Lane E:** Cash flow forecast must include installments as expected cash (not just raw invoice totals)

---

## 17. Environment Variables

### New Variables Required for Phase 14

```env
# ─── Dunning / SMS ──────────────────────────────────────────────────────────
MSG91_API_KEY=                    # MSG91 transactional SMS API key
MSG91_SENDER_ID=SLIPWS            # TRAI-registered 6-char sender ID
MSG91_FLOW_ID_STEP_1=             # MSG91 Flow ID for dunning step 1 SMS
MSG91_FLOW_ID_STEP_2=             # MSG91 Flow ID for dunning step 2 SMS
MSG91_FLOW_ID_STEP_3=             # MSG91 Flow ID for dunning step 3 SMS
MSG91_FLOW_ID_STEP_4=             # MSG91 Flow ID for dunning step 4 SMS
DUNNING_OPT_OUT_SECRET=           # HMAC-SHA256 secret for opt-out token signing (min 32 chars)

# ─── Customer Portal ────────────────────────────────────────────────────────
CUSTOMER_PORTAL_JWT_SECRET=       # JWT signing secret for portal tokens (min 32 chars)
CUSTOMER_PORTAL_TOKEN_EXPIRY=30d  # Token expiry (default 30 days)
CUSTOMER_PORTAL_BASE_URL=https://app.slipwise.com  # Base URL for portal links in emails

# ─── Cash Flow (optional for enhanced forecasting) ──────────────────────────
CASH_FLOW_SNAPSHOT_RETENTION_DAYS=90  # How many days of snapshots to retain (default 90)
```

### Existing Variables Used (No Change)

```env
RESEND_API_KEY=          # Email sending (already configured in Phase 11)
RAZORPAY_KEY_ID=         # Razorpay API key (already configured)
RAZORPAY_KEY_SECRET=     # Razorpay secret (already configured)
RAZORPAY_WEBHOOK_SECRET= # Webhook verification (already configured)
TRIGGER_SECRET_KEY=      # Trigger.dev (already configured)
UPSTASH_REDIS_REST_URL=  # Rate limiting (already configured)
UPSTASH_REDIS_REST_TOKEN=# Rate limiting (already configured)
```

---

## 18. Acceptance Gates per Sprint

### Sprint 14.1 — Dunning Engine (Acceptance Gate)

**All of the following must pass before Sprint 14.1 is accepted:**

- [ ] Default dunning sequence (5 steps) seeds automatically on new org creation
- [ ] Dunning scheduler fires Step 1 for an OVERDUE invoice with dueDate = today
- [ ] Dunning scheduler does NOT fire Step 1 twice for the same invoice (idempotency)
- [ ] Invoice paid → no further steps fire on next scheduler run
- [ ] Customer opts out via unsubscribe link → `DunningOptOut` created → future steps SKIPPED
- [ ] Step 5 creates `InvoiceTicket` (if not already exists)
- [ ] Step 5 does NOT create duplicate tickets on second run
- [ ] Expired Razorpay payment link auto-renewed before email sent
- [ ] Dunning log page shows all sent/failed/skipped entries per invoice
- [ ] Dunning tab on invoice detail shows timeline of sent reminders
- [ ] `sendImmediateReminder(invoiceId)` server action works (manual trigger, Pro+ only)
- [ ] `POST /api/v1/invoices/bulk-remind` works for up to 50 invoices (Pro+ API key)
- [ ] TypeScript: 0 new errors introduced
- [ ] Build passes: `npm run build` succeeds

### Sprint 14.2 — Customer Portal (Acceptance Gate)

- [ ] Magic link email sent when customer enters email on `/portal/[orgSlug]`
- [ ] Portal loads correctly with a valid JWT token in URL
- [ ] Expired JWT → redirect to login page with correct message
- [ ] Revoked token → "access revoked" message
- [ ] Customer can ONLY see their own invoices (scoped by customerId in JWT)
- [ ] "Pay Now" from portal → Razorpay redirect → payment completes → invoice status updates
- [ ] Invoice status polling resolves within 30 seconds of payment
- [ ] Statement PDF downloads with correct opening/closing balances
- [ ] Support ticket created from portal → appears in org's ticket management
- [ ] Dunning opt-out from portal preferences page stops reminders
- [ ] Org can revoke customer portal access from `/app/pay/portal`
- [ ] Portal respects org branding (logo, org name)
- [ ] Starter plan customers get view-only portal (no Pay Now button)
- [ ] TypeScript: 0 new errors; Build passes

### Sprint 14.3 — Quotes + Cash Flow + Arrangements (Acceptance Gate)

- [ ] Quote created → sent → customer accepts via `/quote/[token]` → converts to invoice with same line items
- [ ] Quote cannot be accepted after `validUntil` date
- [ ] `convertQuoteToInvoice()` is idempotent — second call returns same invoice
- [ ] `quote-expiry-checker` job marks expired quotes automatically
- [ ] Cash flow forecast API returns correct weekly totals for next 13 weeks
- [ ] DSO computed correctly (validated against manual calculation)
- [ ] Customer health score updates nightly via `customer-health-score` job
- [ ] Payment arrangement created → invoice transitions to `ARRANGEMENT_MADE`
- [ ] Dunning stops when invoice is in `ARRANGEMENT_MADE` status
- [ ] Recording 3/3 installment payments → invoice transitions to `PAID`, arrangement `COMPLETED`
- [ ] Defaulted arrangement → invoice reverts to `OVERDUE`, dunning resumes
- [ ] TypeScript: 0 new errors; Build passes

---

## Appendix A — Dunning Email Template System

### Template Engine

**File:** `src/lib/dunning-templates.ts`

**Function signature:**
```typescript
export function renderDunningTemplate(
  template: string,  // e.g., "Your invoice {{invoice_number}} is due today"
  vars: DunningTemplateVars
): string

export interface DunningTemplateVars {
  customer_name: string;
  invoice_number: string;
  invoice_amount: string;      // formatted: "₹1,18,000"
  amount_due: string;          // formatted remaining balance
  amount_paid: string;         // formatted paid amount
  due_date: string;            // formatted: "31 Mar 2026"
  days_overdue: number;
  pay_now_link: string;        // Razorpay payment link URL
  org_name: string;
  org_email: string;
  org_phone: string;
  invoice_date: string;        // formatted
  unsubscribe_url: string;     // HMAC-signed opt-out URL
}
```

**Rendering:** Simple `string.replace()` with `{{variable}}` placeholders. No external template engine needed. Sanitize output with `htmlspecialchars` equivalent to prevent XSS in email body.

### Default Email Templates per Step

**Step 1 — FRIENDLY (due today):**
```
Subject: Your invoice {{invoice_number}} from {{org_name}} is due today

Hi {{customer_name}},

A friendly reminder that invoice {{invoice_number}} for {{invoice_amount}} is due today.

Pay now to avoid late reminders:
[Pay Now — {{invoice_amount}}] → {{pay_now_link}}

Thank you,
{{org_name}}
{{org_email}} · {{org_phone}}
```

**Step 2 — POLITE (3 days overdue):**
```
Subject: Invoice {{invoice_number}} from {{org_name}} is now overdue

Hi {{customer_name}},

Your invoice {{invoice_number}} for {{invoice_amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue.

Outstanding balance: {{amount_due}}

[Pay Now] → {{pay_now_link}}

If you have any questions, reply to this email or contact us at {{org_email}}.

{{org_name}}
```

**Step 3 — FIRM (7 days overdue):**
```
Subject: Action needed: Invoice {{invoice_number}} — {{days_overdue}} days overdue

Hi {{customer_name}},

This is a firm reminder that invoice {{invoice_number}} remains unpaid. The outstanding balance is {{amount_due}}, now {{days_overdue}} days past due.

Please make payment immediately to avoid further escalation:
[Pay {{amount_due}} Now] → {{pay_now_link}}

{{org_name}} | {{org_email}}
```

**Step 4 — URGENT (14 days overdue):**
```
Subject: FINAL NOTICE: Invoice {{invoice_number}} — Immediate payment required

Hi {{customer_name}},

This is a final notice. Invoice {{invoice_number}} ({{amount_due}} outstanding) is {{days_overdue}} days overdue.

Failure to pay may result in service suspension and/or escalation.

[Pay Now — {{amount_due}}] → {{pay_now_link}}

{{org_name}} | {{org_email}} | {{org_phone}}
```

**Step 5 — ESCALATE (30 days overdue):**
```
Subject: Urgent escalation: Invoice {{invoice_number}} — 30 days overdue

Hi {{customer_name}},

Your invoice {{invoice_number}} for {{amount_due}} has been outstanding for {{days_overdue}} days and has been escalated to our accounts team.

A support ticket has been created. Our team will contact you shortly.

[Pay Now — {{amount_due}}] → {{pay_now_link}}

{{org_name}} | {{org_email}} | {{org_phone}}
```

**All templates end with:**
```html
<hr>
<p style="font-size:11px;color:#999">
  You're receiving this because {{customer_name}} has an outstanding invoice with {{org_name}}.<br>
  <a href="{{unsubscribe_url}}">Unsubscribe from payment reminders</a>
</p>
```

---

## Appendix B — Customer Portal Token Security

### Token Lifecycle

```
ISSUE:
  jwt_payload = { sub: customerId, org: orgId, type: "customer_portal", iat: now, exp: now + 30days }
  raw_token   = jwt.sign(jwt_payload, CUSTOMER_PORTAL_JWT_SECRET)
  token_hash  = sha256(raw_token)
  db.customerPortalToken.create({ tokenHash, customerId, orgId, expiresAt })
  send email with: https://app.slipwise.com/portal/[orgSlug]/[raw_token]/dashboard

VALIDATE (per request):
  1. decode jwt (verify signature + expiry) — fast, no DB hit
  2. hash token → sha256
  3. db.customerPortalToken.findUnique({ tokenHash }) — check isRevoked
  4. attach { customerId, orgId } to request context

REFRESH (silent, <15 days remaining):
  new_token = issue new token (step ISSUE above)
  Set-Cookie: slipwise-portal-token=<new_raw_token>; Secure; SameSite=Lax; Max-Age=2592000

REVOKE (org-initiated):
  db.customerPortalToken.update({ where: { customerId, orgId }, data: { isRevoked: true } })
  Any in-flight requests with old token will fail on DB check step 3

CLEANUP (daily job):
  db.customerPortalToken.deleteMany({ where: { expiresAt: { lt: now() }, isRevoked: true } })
```

### Why Not Store Raw Token

Raw JWT stored in email links and browser cookies. If the DB is breached:
- Attacker gets `token_hash` (SHA-256 of JWT)
- Cannot reverse SHA-256 to get raw JWT
- Raw token stays secure

Revocation works because we check `isRevoked` flag on the DB record — even a valid JWT is rejected if its hash is marked revoked.

---

## Appendix C — Cash Flow Computation Logic

### Pre-computation (Nightly Trigger.dev job: `cash-flow-snapshot`)

**Algorithm:**
```
FOR each active org:
  futureWeeks = next 13 ISO weeks from today
  
  FOR each week:
    invoices = db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["ISSUED", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
        dueDate: { gte: weekStart, lte: weekEnd }
      },
      select: { id, remainingAmount, dueDate, status, customerId }
    })
    
    optimistic = sum(invoice.remainingAmount)
    conservative = sum(invoice.remainingAmount * customer.paymentHealthScore / 100)
    
    store in ReportSnapshot {
      orgId,
      reportType: "cash_flow_forecast",
      data: { weekStart, weekEnd, optimistic, conservative, invoiceCount, buckets },
      generatedAt: now()
    }

DSO calculation:
  arTotal = sum(remainingAmount) for all open invoices in last 90 days
  invoicedTotal = sum(totalAmount) for all invoices issued in last 90 days
  dso = invoicedTotal > 0 ? (arTotal / invoicedTotal) * 90 : 0
```

**Reading cached data:**
- `/api/intel/cash-flow` reads from `ReportSnapshot` where `reportType = "cash_flow_forecast"` (latest per org)
- If no snapshot exists (new org): compute live and cache
- Freshness indicator: show "Data as of [generatedAt]" in UI

---

*End of Phase 14 PRD — Slipwise One*
*Version 1.0 | 2026-04-08*
*Advanced AR Automation + Customer Self-Service Portal + Cash Flow Intelligence*
*Razorpay-Only | India-First | No Stripe*
*Prepared by: Copilot Engineering Assistant | Parent Company: Zenxvio*
