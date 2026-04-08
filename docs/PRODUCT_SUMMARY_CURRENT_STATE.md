# Slipwise One — Product Summary: Current State

> **Version:** 2026-04-08 | **Product:** Slipwise One by Zenxvio
> **Purpose:** Internal team reference — onboarding, engineering, design, and ops.
> This document reflects the **actually implemented** state of the product as of the current codebase.
> Features listed under "Planned / Not Yet Shipped" exist in PRD documentation only.

---

## 1. What Is Slipwise One?

Slipwise One is a multi-product SaaS **document operations and finance workflow platform** designed for small and mid-size businesses, with a strong focus on Indian SMBs and professional service providers.

The platform allows businesses to:
- Create, brand, send, and track professional financial documents (invoices, payment vouchers, salary slips)
- Process PDF documents through a full-featured editing/utility suite
- Manage the complete accounts receivable lifecycle — from invoice creation through automated dunning, customer portal access, and payment arrangements
- Collaborate across teams with role-based access control, approval workflows, and activity tracking
- Access rich financial intelligence: dashboards, reports, cash flow analysis, and customer health scoring
- Integrate with accounting software (QuickBooks, Zoho Books), export to Tally, and receive payments via Razorpay

---

## 2. Platform Architecture Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js Server Actions + API Routes |
| Database | PostgreSQL via Prisma 7 |
| Auth | Supabase Auth (email/password, magic link, SSO SAML) |
| Payments | Razorpay (subscriptions, payment links, virtual accounts) |
| Email | Resend |
| SMS | MSG91 (optional) |
| Storage | AWS S3-compatible |
| Background Jobs | Trigger.dev / cron routes |
| Error Tracking | Sentry (optional) |
| Analytics | PostHog (optional) |
| Caching | Redis (optional) |

---

## 3. Plan Tiers

| Feature | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Invoices/month | 10 | 100 | 1,000 | Unlimited |
| Vouchers/month | 10 | 100 | 1,000 | Unlimited |
| Salary Slips/month | 5 | 50 | 500 | Unlimited |
| Quotes/month | 10 | 50 | 500 | Unlimited |
| Team Members | 1 | 5 | 25 | 100 |
| Dunning Sequences | 1 / 3 steps | 3 / 5 steps | 10 / 10 steps | Unlimited |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Approval Workflows | ❌ | ❌ | ✅ | ✅ |
| Cash Flow Intelligence | ❌ | ❌ | ✅ | ✅ |
| Customer Health Scores | ❌ | ❌ | ✅ | ✅ |
| Payment Arrangements | ❌ | ✅ | ✅ | ✅ |
| SSO / White-label / Custom Domain | ❌ | ❌ | ❌ | ✅ |

---

## 4. Roles & Permissions

Slipwise uses a **7-role RBAC system** with module-level permissions:

| Role | Description |
|---|---|
| `owner` | Full access to all settings and data |
| `admin` | Full operational access; cannot delete the org |
| `finance_manager` | Full invoice/voucher/pay access; limited HR/settings |
| `hr_manager` | Full salary slip and employee access |
| `voucher_operator` | Voucher CRUD only |
| `invoice_operator` | Invoice CRUD only |
| `viewer` | Read-only across permitted modules |

**15 permission modules** control access: invoices, vouchers, salary slips, pay proofs, recurring payments, send log, tickets, approvals, notifications, dashboard, reports, user settings, role settings, proxy grants, audit log.

---

## 5. Product Modules — Currently Shipped

---

### 5.1 Document Operations

#### Invoices (`/app/docs/invoices/`)
- **Create / Edit / Duplicate** invoices with rich data: line items, tax rates, discounts, extra charges, bank details, shipping address, place of supply, GSTIN fields
- **5 invoice templates:** Minimal, Professional, Bold Brand, Classic Bordered, Modern Edge — all selectable via Template Store
- **Document canvas** with inline editable fields per template
- **Preview, print, PDF export, PNG export**
- **Send by email** (direct Resend delivery with branded design)
- **Public share link** with read-only shareable URL
- **Public payment link** at `/invoice/[token]` — customers can view invoice and pay via Razorpay
- **Payment recording:** mark as paid, record partial payments, upload payment proof
- **Invoice states:** draft → sent → partially_paid → paid → overdue → void → cancelled
- **Recurring invoice rules:** auto-generate invoices on a schedule (daily/weekly/monthly/quarterly/annually)
- **Scheduled sends:** send invoice at a future date/time
- **Approval workflows** (Pro+): route invoices through org-defined approval chains
- **Overdue detection** via cron job
- **GSTR-1 export** for Indian GST compliance — generates structured GSTR-1 JSON report
- **Tally XML export** for accountants using Tally

#### Payment Vouchers (`/app/docs/vouchers/`)
- **Create / Edit / Duplicate** vouchers: payment voucher (debit), receipt voucher, contra, journal, credit note
- **5 voucher templates:** Compact Receipt, Formal Bordered, Minimal Office, Modern Card, Traditional Ledger
- Same canvas / template / export system as invoices
- AI-powered **expense categorization** (auto-categorize voucher entries)

#### Salary Slips (`/app/docs/salary-slips/`)
- **Create / Edit / Duplicate** salary slips per employee
- **Earnings + Deductions** component system; net pay computed automatically
- **5 salary slip templates:** Classic Formal, Compact Payslip, Corporate Clean, Detailed Breakdown, Modern Premium
- **Salary presets** — define reusable earnings/deductions packages per role
- **Bulk generation** — create salary slips for all employees in one action
- **AI salary insights** — TDS calculations and recommendations
- PDF export, print, share link

#### Template Store (`/app/docs/templates/`)
- Browse all 15 templates (5 per doc type) with preview
- **Set default template** per doc type per org
- **Use Once** — start a new document with a specific template without changing the default

---

### 5.2 PDF Studio (`/app/docs/pdf-studio/`)

A fully-featured browser-based PDF processing suite. All tools are implemented.

| Tool | What It Does |
|---|---|
| **Merge PDFs** | Combine multiple PDFs into a single document |
| **Split PDF** | Extract page ranges into separate PDFs |
| **Delete Pages** | Remove specific pages from a PDF |
| **Organize Pages** | Reorder, rotate, and rearrange pages visually |
| **Resize Pages** | Change page dimensions (A4, Letter, custom) |
| **Create PDF** | Build a PDF from scratch (images, text) |
| **Fill & Sign** | Fill form fields and add signatures to PDFs |
| **Header & Footer** | Add custom headers and footers to all pages |
| **Protect & Unlock** | Add/remove PDF password protection |
| **Repair PDF** | Attempt to recover/fix corrupted PDFs |
| **PDF to Image** | Convert PDF pages to PNG/JPG images |

---

### 5.3 Pixel Studio (`/app/pixel/`)

Image processing tools for business document photography and branding:

| Tool | What It Does |
|---|---|
| **Adjust** | Brightness, contrast, saturation, sharpness corrections |
| **Label** | Add text overlays and watermarks to images |
| **Passport** | Crop photos to passport/ID specifications |
| **Resize** | Resize images to specific dimensions |
| **Print Layout** | Arrange multiple images on print sheets |

---

### 5.4 Pay (Accounts Receivable) — `/app/pay/`

#### Receivables Dashboard (`/app/pay/receivables/`)
- Outstanding invoice summary: by status, aging, customer
- Total receivables, overdue amounts, collection rate metrics

#### Recurring Payments (`/app/pay/recurring/`)
- Manage recurring invoice rules (create, pause, resume, cancel)
- View auto-generated invoice history per rule

#### Send Log (`/app/pay/send-log/`)
- Full history of all document sends, with delivery status, timestamps, recipient

#### Payment Proofs (`/app/pay/proofs/`)
- Review and verify uploaded payment proof images
- Approve or reject proof submissions from customers

#### Dunning Engine (`/app/pay/dunning/`) ← *Phase 14 — Shipped*
- **Dunning Sequences:** create multi-step automated follow-up sequences for overdue invoices
- Each step: configurable delay (days after overdue/previous step), channel (email/SMS), message template with dynamic variables
- **Scheduling:** cron-driven engine processes overdue invoices nightly; assigns them to matching dunning sequences; fires steps at the right time
- **Stop conditions:** stops automatically when invoice is paid; stops when a payment arrangement is active; continues on partial payment
- **Idempotency:** every step fire is logged; duplicate execution is safe
- **Retry engine:** failed deliveries retry automatically via separate cron job
- **Opt-out:** customers can unsubscribe from dunning via signed opt-out link (`/unsubscribe/dunning/`)
- **Payment link auto-renewal:** dunning steps can include a fresh payment link; links auto-renew if expired
- **Bulk Remind API:** `POST /api/v1/invoices/bulk-remind` for programmatic dunning triggers
- **Plan gating:** 1 sequence (free), 3 (starter), 10 (pro), unlimited (enterprise)
- **Default seed sequences** for easy getting-started

#### Payment Arrangements (`/app/pay/arrangements/`) ← *Phase 14 — Shipped*
- Create installment payment plans for overdue invoices
- Configurable number of installments, dates, amounts
- Each installment tracked: pending → paid → overdue
- Payments auto-reconcile against the parent invoice
- Overdue installment cron (`/api/cron/installments-overdue/`) marks missed installments and can resume dunning
- Plan gating: arrangements available on Starter+ plans

---

### 5.5 Quotes (`/app/app/docs/quotes/`) ← *Phase 14 — Shipped*

- **Create / Edit / Duplicate** quotes with line items, validity period, notes, terms
- **Quote states:** draft → sent → accepted → declined → expired → converted
- **Send to customer** by email
- **Public acceptance page** at `/quote/[token]` — customer can view, accept with e-signature/note, or decline
- **Convert to invoice** — one-click idempotent conversion from accepted quote to invoice (preserves all line items)
- Quotes expire automatically via cron when validity date passes
- Plan gating: 10/mo (free), 50 (starter), 500 (pro), unlimited (enterprise)
- Document numbering: `QUO-001`, `QUO-002`, ...

---

### 5.6 Customer Self-Service Portal ← *Phase 14 — Shipped*

**Customer-facing portal** at `portal.[orgSlug].slipwise.app` or `/portal/[orgSlug]/`

- **Magic link auth:** customer enters email → receives login link → no password required
- **Anti-enumeration:** identical response whether email exists or not (no user enumeration)
- **JWT session** with configurable expiry; stored in secure HTTP-only cookie
- **Token hashing:** portal tokens stored hashed (never plaintext)
- **Token revocation:** admin can revoke all active sessions for a customer
- **Portal pages:**
  - **Dashboard:** open invoices, recent payments, account summary
  - **Invoices:** filterable list of all their invoices with status, amounts
  - **Invoice detail:** view invoice, pay via Razorpay, download PDF
  - **Account statement:** running statement of account with date-range filter
  - **Profile:** update contact details
- **Admin portal settings** (`/app/settings/portal/`): enable/disable portal, customize branding
- **Customer health score** (Pro+): 5-factor weighted score (payment speed, overdue count, dispute rate, communication response, lifetime value) — visible in admin views

---

### 5.7 Cash Flow Intelligence (`/app/intel/cash-flow/`) ← *Phase 14 — Shipped*

Available on Pro+ plans.

- **DSO (Days Sales Outstanding):** rolling 30/60/90-day calculation
- **AR Aging:** buckets for current, 1–30, 31–60, 61–90, 90+ days overdue
- **Cash flow forecast:** expected inflows based on due dates and payment history
- **Customer health summary:** portfolio-level health scoring
- **Alerts:** automatic detection of high DSO, large overdue clusters, concentration risk

---

### 5.8 Flow (Workflow Tools) — `/app/flow/`

#### Activity Feed (`/app/flow/activity/`)
- Real-time log of all organizational events: document creates, sends, payments, approvals, logins, settings changes

#### Approval Workflows (`/app/flow/approvals/`) — *Pro+*
- Define multi-level approval chains for invoices
- Approvers notified by email; approve or reject with comment
- Invoice blocked from sending until approved

#### Jobs (`/app/flow/jobs/`)
- View background job status (OCR, exports, scheduled sends, recurring generation)
- Useful for debugging and ops monitoring

---

### 5.9 Intel (Reporting & Analytics) — `/app/intel/`

#### Dashboard (`/app/intel/dashboard/`)
- KPIs: revenue, invoices issued, amount collected, outstanding AR
- Charts: revenue over time, invoice status breakdown, top customers by revenue
- Quick-access: recent invoices, overdue alerts

#### Reports (`/app/intel/reports/`)
- **Invoice report:** filter by date, status, customer; sortable tabular view; CSV export
- **Receivables aging report:** AR aging breakdown per customer
- **Salary report:** payroll summary by period
- **Voucher report:** expense summary by period and category

#### Insights (`/app/intel/insights/`) — *Beta*
- AI-powered spending insights and cashflow observations (beta, limited functionality)

---

### 5.10 Data Management — `/app/data/`

#### Customers (`/app/data/customers/`)
- Full customer directory: name, email, phone, address, GSTIN, tax ID
- Per-customer invoice history, payment history, health score (Pro+)
- Customer statement generation

#### Vendors (`/app/data/vendors/`)
- Vendor directory for voucher/expense management

#### Employees (`/app/data/employees/`)
- Employee records for payroll: name, ID, department, designation, salary components

#### Salary Presets (`/app/data/salary-presets/`)
- Reusable salary templates (earnings + deduction component sets)

---

### 5.11 Settings — `/app/settings/`

| Setting Area | What It Controls |
|---|---|
| Organization | Name, logo, address, branding, business details, GSTIN |
| Users | Invite team members, manage seats |
| Roles | Assign roles to members |
| Access Control | Proxy grants (delegate access to another org member) |
| Profile | Personal name, avatar, notification preferences |
| Security / SSO | Password change; SAML SSO configuration (Enterprise only) |
| API Keys | Create/revoke API keys with scope-based access |
| Webhooks | Configure webhook endpoints for event delivery |
| Audit Log | Full org-level action audit trail |
| Integrations | Connect QuickBooks, Zoho Books; manage Tally export |
| Enterprise | White-label domain, custom email domain, email domain verification |
| Portal | Customer portal enable/disable, branding customization |

---

### 5.12 Billing — `/app/billing/`

- **Plan overview:** current plan, usage metrics, upgrade prompts
- **Upgrade flow:** Razorpay-powered subscription checkout
- **Plan change:** upgrade/downgrade between tiers
- **Cancellation flow** with confirmation
- **Billing history:** past invoices from Slipwise's own billing
- **Payment failure handling:** subscription webhook-driven state updates

---

### 5.13 Public-Facing Routes

| Route | Purpose |
|---|---|
| `/invoice/[token]` | Customer-facing invoice payment page (Razorpay integration) |
| `/quote/[token]` | Customer-facing quote accept/decline page |
| `/portal/[orgSlug]/` | Customer self-service portal |
| `/share/[docType]/[token]` | Read-only document share links |
| `/unsubscribe/dunning/` | Dunning email opt-out |

---

### 5.14 API (`/api/v1/`)

A documented REST API available on Pro+ plans, authenticated via API keys.

**Available endpoints:**
- `GET/POST /api/v1/customers`
- `GET/PUT/DELETE /api/v1/customers/[id]`
- `GET/POST /api/v1/vendors`
- `GET/POST /api/v1/employees`
- `GET/POST /api/v1/invoices`
- `GET/PUT /api/v1/invoices/[id]`
- `POST /api/v1/invoices/bulk-remind` — trigger dunning for selected invoices
- `GET/POST /api/v1/salary-slips`
- `GET/POST /api/v1/vouchers`
- `GET /api/v1/reports/[type]`

API uses consistent response envelope: `{ success, data, meta }` / `{ success, error: { code, message } }`.

---

### 5.15 Integrations

| Integration | Status | Notes |
|---|---|---|
| **Razorpay** | ✅ Shipped | Subscriptions, payment links, virtual accounts, webhooks |
| **Resend** | ✅ Shipped | All transactional email delivery |
| **QuickBooks** | ✅ Shipped | OAuth 2.0 connect; bi-directional sync |
| **Zoho Books** | ✅ Shipped | OAuth 2.0 connect; bi-directional sync |
| **Tally** | ✅ Shipped | XML export (no live API; file-based) |
| **Supabase Auth** | ✅ Shipped | SSO SAML (Enterprise), email/password, magic link |
| **MSG91** | ✅ Shipped | SMS delivery for dunning (optional; requires API key) |
| **AWS S3** | ✅ Shipped | File/attachment storage |
| **Sentry** | ✅ Shipped | Error tracking (optional) |
| **PostHog** | ✅ Shipped | Product analytics (optional) |
| **Redis** | ✅ Shipped | Caching layer (optional) |

---

### 5.16 AI Features

| Feature | Location | Status |
|---|---|---|
| Voucher/expense categorization | Voucher create flow | ✅ Shipped |
| OCR document extraction | `/api/ai/extract-document` | ✅ Shipped |
| Late payment risk prediction | `/api/ai/payment-risk` | ✅ Shipped |
| Salary TDS insights | `/api/ai/salary-insights` | ✅ Shipped |
| General AI insights (beta) | `/app/intel/insights` | ⚠️ Beta |

---

## 6. Authentication

- **Email + password** sign-up/sign-in (with email verification)
- **Magic link** auth for customer portal
- **SAML SSO** (Enterprise): configure SAML provider; members auto-provisioned on first login
- **Multi-org** support: users can belong to multiple organizations
- **Invite system:** org owners/admins invite members by email with role assignment
- **Onboarding flow:** new orgs go through a guided setup (org details, branding, first document)

---

## 7. Key Architectural Strengths

1. **Single payment gateway** (Razorpay) with full reconciliation — invoice state transitions are driven by a single `reconcileInvoicePayment()` function; no inconsistent state.
2. **Audit-safe event log** — invoice state events, payment events, and actions are append-only, with actor attribution.
3. **Plan enforcement at service layer** — plan limits enforced in server actions/services, not just UI.
4. **Org-scoped multi-tenant** — every DB query is scoped to `orgId`; no cross-org data leaks.
5. **RBAC at action layer** — `requireRole()` / `requirePermission()` used consistently in server actions.
6. **Manual Prisma migrations** — SQL migrations are explicit and reviewable; not auto-generated.
7. **Modular codebase** — features are organized under `src/features/` with clean separation from app routes.

---

## 8. Planned / Not Yet Shipped

> The following are from the Phase 15 PRD and have **not been implemented** in the codebase.

### Phase 15: India Tax Compliance + Global Expansion + Template Marketplace + Developer Ecosystem v2

- **Full GST compliance engine:** CGST/SGST/IGST split per line item, HSN/SAC codes, e-invoicing (IRN generation via IRP), e-way bill generation
- **TDS/TCS tracking:** TDS rates per vendor/category, Form 16A/27A generation
- **GSTR-2A/2B reconciliation:** match purchase invoices against GST portal data
- **Multi-currency invoicing:** foreign currency support with exchange rates
- **Multi-language support:** UI and document output in regional languages
- **Community template marketplace:** org-submitted templates for the Template Store
- **Developer Ecosystem v2:** OAuth 2.0 for third-party app authorization, webhook v2 (per-event subscriptions, delivery guarantees), partner program
- **RazorpayX Payouts:** automated vendor payment disbursements
- **WhatsApp delivery channel:** full WhatsApp integration for dunning and document delivery (Phase 14 included a partial stub)

---

## 9. Recommended Use of This Document

- **Engineering onboarding:** understand what's built, how it's organized, which services are reused
- **Design:** understand all current user-facing routes and states before redesigning
- **Operations:** understand the plan tiers, integrations, and env var dependencies
- **Product planning:** clearly separate shipped vs. planned scope before roadmap reviews
- **QA:** use the module map in this document as the basis for test coverage planning (see also `QA_TESTING_HANDOVER_CURRENT_STATE.md`)
