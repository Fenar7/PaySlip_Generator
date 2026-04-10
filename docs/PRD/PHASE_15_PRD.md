# Phase 15 PRD — Slipwise One
## India Tax Compliance + Global Expansion + Template Marketplace + Developer Ecosystem v2

**Version:** 1.0  
**Date:** 2026-04-10  
**Prepared by:** Copilot Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Post Phase 14](#2-current-state-post-phase-14)
3. [Phase 15 Objectives](#3-phase-15-objectives)
4. [Sprint 15.1 — India GST & Tax Compliance Engine](#4-sprint-151)
5. [Sprint 15.2 — Global Expansion: Multi-Language + Multi-Currency](#5-sprint-152)
6. [Sprint 15.3 — Template Marketplace + Developer Ecosystem v2](#6-sprint-153)
7. [Full Database Schema Additions](#7-database-schema-additions)
8. [Complete Route Map](#8-route-map)
9. [Background Jobs](#9-background-jobs)
10. [Plan Gates](#10-plan-gates)
11. [Edge Cases and Acceptance Criteria](#11-edge-cases-and-acceptance-criteria)
12. [Test Plan](#12-test-plan)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Environment Variables](#14-environment-variables)
15. [Risk Register](#15-risk-register)
16. [Branch Strategy and PR Workflow](#16-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 15 makes Slipwise One the most compliant, globally-ready, and developer-friendly document operations platform for India-origin SMBs expanding globally. It delivers four major pillars:

1. **India GST & Tax Compliance** — Full GST computation engine, e-Invoicing (IRN via NIC/IRP portal), e-Way Bill, TDS/TCS tracking, GSTR-1/GSTR-3B data export. This is critical for enterprise Indian businesses.
2. **Global Expansion** — Multi-language UI and document generation (6 languages including Arabic RTL), multi-currency invoicing with daily exchange rate refresh, country-specific invoice formats (India, UAE, UK, US, Germany/EU).
3. **Template Marketplace** — Community-driven template economy where Slipwise curates official templates, orgs can publish custom templates for revenue sharing (70/30 split), and all orgs can browse, preview, and install.
4. **Developer Ecosystem v2** — OAuth 2.0 Authorization Code Flow for third-party integrations, Webhook v2 with HMAC-SHA256 signatures and exponential-backoff retry, Partner/Reseller program for accountant firms and agencies.

**Business value:** Unlocks enterprise Indian accounts (GST compliance is a hard requirement), expands TAM to global users, creates network effects via marketplace, and enables an integration partner ecosystem.

**Pre-Phase 15 prerequisite fix (must ship before Sprint 15.1 begins):**  
Add Billing link to the main sidebar nav. The billing module is fully implemented but inaccessible — users cannot discover their plan status or upgrade without typing the URL manually. This is a 1-line fix in `suite-nav-items.ts` that should be shipped as a hotfix before Phase 15 sprint work begins.

---

## 2. Current State Post Phase 14

Phase 14 delivered the Advanced AR Automation suite (131 tests, 69 files, ~12,300 LOC):

| Module | Status |
|---|---|
| Dunning Engine (multi-step email/SMS sequences) | ✅ Complete |
| Customer Self-Service Portal (magic link auth, invoice view, Pay Now) | ✅ Complete |
| Quote lifecycle (create → send → accept → convert to invoice) | ✅ Complete |
| Cash Flow Intelligence (DSO, AR aging, forecast, health alerts) | ✅ Complete |
| Payment Arrangements (installment plans, reconciliation, mini-dunning) | ✅ Complete |
| Database: 20260408000000_phase14_ar_automation | ✅ Applied |
| Razorpay subscription billing backend | ✅ Complete |
| API v1 (10 endpoints, API key auth) | ✅ Complete |
| Developer portal (API key management, webhook v1, event logs) | ✅ Complete |

**Known gap:** Billing sidebar link missing — users cannot discover `/app/billing` without knowing the URL.

**What Phase 15 builds on:**
- `src/lib/razorpay.ts` — Razorpay wrapper (lazy-init)
- `src/lib/plans/enforcement.ts` — `requirePlan()`, `getOrgPlan()`, `checkLimit()`
- `src/lib/plans/config.ts` — Free/Starter/Pro/Enterprise definitions
- `src/lib/permissions.ts` — 7 roles, 15 modules, 7 actions RBAC system
- `src/app/api/v1/_helpers.ts` — `validateApiKey()`, envelope helpers
- `src/lib/db.ts` — PrismaClient singleton

---

## 3. Phase 15 Objectives

| # | Objective | Sprint |
|---|---|---|
| O1 | Full India GST computation (CGST/SGST/IGST split) on invoices | 15.1 |
| O2 | e-Invoicing: IRN generation via NIC IRP portal, QR code on PDF | 15.1 |
| O3 | e-Way Bill generation for goods invoices | 15.1 |
| O4 | TDS/TCS tracking: 7 sections, certificate management, quarterly reports | 15.1 |
| O5 | GSTR-1 / GSTR-3B data export in GST portal-compatible format | 15.1 |
| O6 | HSN/SAC code master (500 seed codes) with autocomplete on line items | 15.1 |
| O7 | 6-language app UI via next-intl (en, hi, ar, es, fr, de) | 15.2 |
| O8 | Per-invoice document language (independent of app UI language) | 15.2 |
| O9 | Arabic RTL PDF support | 15.2 |
| O10 | Multi-currency invoicing (display in USD/EUR/AED etc., store in INR) | 15.2 |
| O11 | Daily exchange rate refresh via Trigger.dev | 15.2 |
| O12 | Country-specific invoice formats (India, UAE, UK, US, Germany/EU) | 15.2 |
| O13 | Template marketplace: browse, preview, install, purchase | 15.3 |
| O14 | Publisher flow: Pro+ orgs can submit templates for review | 15.3 |
| O15 | Revenue sharing: 70% publisher / 30% Slipwise (tracked, manual payout in Phase 15) | 15.3 |
| O16 | OAuth 2.0 Authorization Code Flow for third-party app developers | 15.3 |
| O17 | Webhook v2: HMAC-SHA256 signatures, exponential-backoff retry, dead-letter queue | 15.3 |
| O18 | Partner/Reseller program: Accountant, Technology, Reseller partner types | 15.3 |

---

## 4. Sprint 15.1 — India GST & Tax Compliance Engine

**Goal:** Make Slipwise One fully compliant with India GST regulations, enabling enterprise Indian businesses to use it as their primary invoicing tool. Covers GST computation, e-invoicing (IRN), e-Way Bill, TDS/TCS management, and GSTR data export.

---

### 4.1 Prerequisite Fix: Billing Sidebar Link

**File:** `src/components/layout/suite-nav-items.ts`  
**Change:** Add one nav item entry for `/app/billing` (label: "Billing", icon: CreditCard)  
This must ship as the very first commit of Sprint 15.1, as billing plan upgrades are gated behind this.

---

### 4.2 GST Computation Engine

**Current gap:** Invoices have GSTIN fields but no structured GST computation engine, no CGST/SGST/IGST split, no HSN/SAC code management.

#### GST Computation Rules

| Condition | Tax Type | Calculation |
|---|---|---|
| Supplier state == Customer state (intrastate) | CGST + SGST | Each = gstRate / 2 |
| Supplier state != Customer state (interstate) | IGST | Full gstRate |
| Exempt goods/services | None | gstRate = 0% |
| Composition scheme | Flat rate | 1%, 2%, or 5% |

**GST Rate Slabs:** 0%, 5%, 12%, 18%, 28%

**GST computation location:** `src/lib/gst/compute.ts`  
- Input: lineItems[], supplierStateCode, customerStateCode  
- Output: per-line CGST/SGST or IGST amounts + totals  
- Called on every invoice save and on `calculateGst(invoiceId)` server action

#### New Fields on InvoiceLineItem

```prisma
hsnCode     String?            // HSN (goods) or SAC (services) code
gstRate     Decimal?           @db.Decimal(5, 2)   // 0, 5, 12, 18, 28
gstType     String?            // "CGST_SGST" | "IGST" | "EXEMPT"
cgstAmount  Decimal?           @db.Decimal(10, 2)
sgstAmount  Decimal?           @db.Decimal(10, 2)
igstAmount  Decimal?           @db.Decimal(10, 2)
cessAmount  Decimal?           @db.Decimal(10, 2)  // cess on 28% items
```

#### New Fields on Invoice

```prisma
supplierGstin    String?
customerGstin    String?
placeOfSupply    String?        // state code, e.g., "29" for Karnataka
reverseCharge    Boolean        @default(false)
exportType       String?        // "REGULAR" | "SEZ" | "EXPORT" | "DEEMED_EXPORT"
gstTotalCgst     Decimal?       @db.Decimal(10, 2)
gstTotalSgst     Decimal?       @db.Decimal(10, 2)
gstTotalIgst     Decimal?       @db.Decimal(10, 2)
gstTotalCess     Decimal?       @db.Decimal(10, 2)
irnNumber        String?        // Invoice Reference Number from NIC portal
irnAckNumber     String?
irnAckDate       DateTime?
irnQrCode        String?        // Base64 QR code data
eWayBillNumber   String?
eWayBillDate     DateTime?
eWayBillExpiry   DateTime?
```

#### HSN/SAC Master

```prisma
model HsnSacCode {
  id          String   @id @default(cuid())
  code        String   @unique
  type        String   // "HSN" | "SAC"
  description String
  gstRate     Decimal  @db.Decimal(5, 2)
  cessRate    Decimal  @db.Decimal(5, 2) @default(0)

  @@map("hsn_sac_codes")
}
```

- Seed: 500 top HSN/SAC codes at migration time via seed script
- UI: searchable autocomplete on InvoiceLineItem entry form
- Search: by code or description (debounced, server-side)
- Route: `GET /api/gst/hsn-sac/search?q=...` — returns top 10 matches

---

### 4.3 e-Invoicing (IRN Generation via NIC IRP Portal)

#### What Is e-Invoicing

India mandates e-invoicing for businesses with annual turnover > ₹5 crore. Invoices must be uploaded to the Invoice Registration Portal (IRP), which returns a signed QR code and IRN (Invoice Reference Number). The invoice is only legally valid once IRN is issued.

#### e-Invoicing Flow

```
User creates invoice in Slipwise → status DRAFT
         ↓
User clicks "Generate IRN" (or auto-generate on finalize if org has irpEnabled: true)
         ↓
src/lib/irp-client.ts prepares JSON payload per GST e-invoice schema v1.1
         ↓
POST to IRP: POST https://einvoice1.gst.gov.in/eicore/v1.03/Invoice
         ↓
IRP returns: AckNo, AckDt, Irn, SignedQRCode, SignedInvoice
         ↓
Store in Invoice: irnNumber, irnAckNumber, irnAckDate, irnQrCode
         ↓
PDF updated to show QR code (mandatory for legal compliance)
         ↓
Invoice is now legally valid
```

#### IRP Client Library

Location: `src/lib/irp-client.ts`

Responsibilities:
- Session management: `POST /eivital/v1.04/auth` with GSTIN + clientId + clientSecret → session token (valid 6 hours)
- Token stored in Redis with 5.5-hour TTL; refreshed by `irn-session-refresh` Trigger.dev job
- IRN generation: `POST /eicore/v1.03/Invoice`
- IRN cancel: `POST /eicore/v1.03/Invoice/Cancel`
- IRN fetch: `GET /eicore/v1.03/Invoice/irn/{irn}` (for duplicate error recovery)
- Sandbox vs Production: controlled by `IRP_MODE` env var

#### IRP Error Handling

| Code | Meaning | Action |
|---|---|---|
| 2000 | Success | Store IRN, AckNo, QR code; mark invoice irn-generated |
| 2150 | Duplicate IRN (already registered) | Fetch existing IRN via GET and store — treat as success |
| 2130 | Supplier GSTIN inactive | Show "Your GSTIN is inactive on GST portal" — block IRN until fixed |
| 2176 | Buyer GSTIN inactive | Show "Customer GSTIN is inactive" |
| 2283 | HSN code invalid | Show inline error on affected line item |
| 4000 | Auth failure | Re-fetch session token and retry once |
| Network error | Timeout / unreachable | Retry 3× with exponential backoff; keep invoice in DRAFT; show "IRP unavailable — try again later" |

#### IRN UI

- Invoice detail page: "Generate IRN" button (shown only for finalized invoices with valid GSTIN)
- Button disabled if: invoice is DRAFT, invoice already has IRN, invoice is cancelled
- Plan gate: Pro and Enterprise only — Free/Starter see "Upgrade to Pro for e-Invoicing"
- After IRN generated: show IRN number, AckNo, AckDate on invoice detail page
- PDF: QR code printed in top-right corner (mandatory per GST regulation)

---

### 4.4 e-Way Bill Integration

#### What Is e-Way Bill

Required for movement of goods worth > ₹50,000. Generated on the NIC e-Way Bill portal. Applies to goods invoices (service invoices are exempt).

#### Additional Invoice Fields for e-Way Bill

```prisma
ewbTransportMode     String?   // "ROAD" | "RAIL" | "AIR" | "SHIP"
ewbVehicleNumber     String?
ewbTransporterGstin  String?
ewbTransportDocNo    String?
ewbDistanceKm        Int?
ewbFromPincode       String?
ewbToPincode         String?
```

#### Flow

1. After IRN generated, "Generate e-Way Bill" button appears (for goods invoices only)
2. User fills transport details (vehicle number, transporter GSTIN, distance)
3. POST to NIC e-Way Bill API
4. Response: `eWayBillNumber`, `eWayBillDate`, `eWayBillExpiry` stored on Invoice
5. e-Way Bill number printed on invoice PDF alongside IRN QR code

**Show/hide logic:** e-Way Bill section hidden if invoice type is services-only (all line items have SAC codes, no HSN codes).

---

### 4.5 TDS / TCS Management

#### TDS (Tax Deducted at Source)

Buyer deducts TDS from payment and must report to Income Tax dept via quarterly TDS returns. Slipwise tracks TDS records per invoice so orgs can reconcile and hand over to their CA.

#### TDS Record Model

```prisma
enum TdsSection {
  SECTION_194A   // Interest
  SECTION_194C   // Contractors
  SECTION_194J   // Professional services
  SECTION_194H   // Commission
  SECTION_194I   // Rent
  SECTION_194Q   // Purchase of goods
  OTHER
}

model TdsRecord {
  id            String     @id @default(cuid())
  orgId         String
  invoiceId     String
  customerId    String
  section       TdsSection
  tdsRate       Decimal    @db.Decimal(5, 2)
  tdsAmount     Decimal    @db.Decimal(10, 2)
  netPayable    Decimal    @db.Decimal(10, 2)   // invoice total - tdsAmount
  certificateNo String?    // TDS certificate number received from customer
  quarter       String     // e.g. "Q1-FY2026-27"
  status        String     @default("PENDING_CERT")  // PENDING_CERT | CERT_RECEIVED | INCLUDED_IN_RETURN
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  org      Organization @relation(fields: [orgId], references: [id])
  invoice  Invoice      @relation(fields: [invoiceId], references: [id])
  customer Customer     @relation(fields: [customerId], references: [id])

  @@map("tds_records")
}
```

#### TDS UI

- **On invoice creation:** Optional "TDS Deduction" section
  - Dropdown: select TDS section (194A, 194C, 194J, etc.)
  - Auto-compute: TDS amount = invoiceTotal × tdsRate
  - Net payable = invoiceTotal − tdsAmount
  - Saved as TdsRecord linked to invoice

- **TDS Dashboard at `/app/pay/tds`:**
  - Per-customer TDS summary: total deducted YTD, certificates pending
  - Quarter selector (Q1 through Q4)
  - Certificate tracking: mark certificate received, enter certificate number
  - Form 26AS reconciliation: upload 26AS PDF → AI/OCR extracts and matches to TDS records
  - Quarterly TDS report: export CSV for CA/tax consultant (format compatible with TDS filing tools)

---

### 4.6 GSTR Data Export

#### GSTR-1 Export

B2B invoices with GSTIN — structured Excel/CSV per GST portal specification.

**Sections covered:**
- B2B: Supply to registered dealers (with customer GSTIN)
- B2C Large: Supply > ₹2.5L to unregistered buyers
- B2C Small: Supplies < ₹2.5L
- Nil/Exempt: Zero-rated supplies
- HSN Summary: HSN-wise supply summary (mandatory for turnover > ₹5Cr)

#### GSTR-3B Summary

Monthly summary for self-assessment:
- Outward taxable supplies (CGST/SGST/IGST totals)
- Inward supplies liable to reverse charge
- ITC available (not computed by Slipwise — shown as blank for CA to fill)

#### Route: `/app/intel/gst-reports`

Features:
- Month/quarter selector
- Reconciliation health check: flag invoices with missing GSTIN or invalid HSN codes
- Download GSTR-1 B2B CSV
- Download GSTR-1 B2C CSV
- Download GSTR-3B summary CSV
- Export JSON (for direct upload to GST portal via API — Phase 16 automation)

**Plan gate:** GST reports available on Pro and Enterprise plans only.

---

## 5. Sprint 15.2 — Global Expansion: Multi-Language + Multi-Currency + Localization

**Goal:** Support Slipwise One users outside India and Indian businesses with international clients.

---

### 5.1 Multi-Language Support

#### Two Independent Language Settings

| Setting | What It Controls | Where Set |
|---|---|---|
| App UI Language | Dashboard, forms, menus, error messages | User profile settings |
| Document Language | PDF content sent to customers | Per-invoice or per-customer default |

These are independent. An org can run the app in English but send invoices in Arabic to Gulf customers.

#### Phase 15 Supported Languages

| Language | Code | App UI | Documents | RTL |
|---|---|---|---|---|
| English | `en` | ✅ Current | ✅ Current | No |
| Hindi | `hi` | ✅ New | ✅ New | No |
| Arabic | `ar` | ✅ New | ✅ New | **Yes** |
| Spanish | `es` | ✅ New | ✅ New | No |
| French | `fr` | ✅ New | ✅ New | No |
| German | `de` | ✅ New | ✅ New | No |

#### App UI i18n Implementation

- Library: `next-intl`
- URL structure: `/[locale]/app/...` (e.g., `/hi/app/docs/invoices`)
- Translation files: `src/locales/[lang]/common.json`, `invoices.json`, `vouchers.json`, `salary-slips.json`, `quotes.json`
- Locale detection: browser Accept-Language header → fallback to org default language → fallback to `en`
- Language switcher: in user profile dropdown (top-right)
- Middleware: `src/middleware.ts` updated to handle locale prefix routing

#### Document Language Implementation

- PDF generation templates updated to accept `locale` parameter
- Label strings (Invoice, Date, Amount Due, Bill To, etc.) pulled from translation map keyed by locale
- Arabic PDF: `pdf-lib` with Noto Sans Arabic font; text direction RTL; number layout LTR per Unicode BiDi standard
- Template: each document type (invoice, voucher, salary slip, quote) gets locale-aware label rendering

#### New Schema Fields

```prisma
// Add to OrgDefaults:
defaultLanguage     String  @default("en")      // app UI language for all users in org
defaultDocLanguage  String  @default("en")      // default PDF language for new documents

// Add to Customer:
preferredLanguage   String?  // if set, PDFs to this customer use this language

// Add to Invoice / Quote / Voucher / SalarySlip:
documentLanguage    String  @default("en")      // actual language of the generated PDF
```

#### RTL Support Details

- Arabic PDFs: all layout flipped (title right-aligned, columns right-to-left)
- Numbers and amounts remain LTR within RTL context (Unicode BiDi)
- Font: Noto Sans Arabic (bundled in `public/fonts/`)
- Tables: column order reversed for Arabic
- Logo: moved to left side for Arabic PDFs (standard Arabic business doc convention)

---

### 5.2 Multi-Currency Invoice Display

#### Multi-Currency Rules

| Rule | Detail |
|---|---|
| Accounting currency | Always org's base currency (default: INR) |
| Storage | All amounts stored in INR in database |
| Display currency | Can differ — shows foreign amount with exchange rate footnote |
| Tax computation | Always in INR (base currency) |
| Payment processing | Always in INR (Razorpay) — display currency is cosmetic |

#### New Invoice Fields

```prisma
displayCurrency     String?             // ISO 4217 e.g., "USD", "EUR", "AED"
exchangeRate        Decimal?            @db.Decimal(14, 6)   // displayCurrency per INR at invoice creation
displayTotalAmount  Decimal?            @db.Decimal(12, 2)   // totalAmount / exchangeRate
exchangeRateDate    DateTime?           // when rate was fetched
```

#### PDF Display (when displayCurrency set)

```
Invoice Total: USD 1,200.00
(Equivalent: ₹99,960 at USD 1 = ₹83.30 on 08-Apr-2026)
```

Exchange rate date shown so customer and org both know the rate is locked at invoice creation.

#### ExchangeRate Model

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

- Daily job fetches: USD, EUR, GBP, AED, SGD, AUD, SAR (7 currencies vs INR)
- API source: Open Exchange Rates (free tier)
- Fallback: use last cached rate; display "Rate as of [date]" footnote; alert if rate > 7 days old

---

### 5.3 Country-Specific Invoice Formats

#### Supported Country Formats

| Region | Specific Requirements |
|---|---|
| India | GSTIN fields, HSN/SAC, CGST/SGST/IGST columns, IRN QR code, "Tax Invoice" header |
| UAE / GCC | TRN (Tax Registration Number), VAT 5%, Arabic + English bilingual optional |
| UK | VAT registration number, "VAT Invoice" header, GBP, reverse charge note |
| US | No VAT, optional state tax field, USD default, plain "Invoice" |
| Germany / EU | USt-IdNr. (VAT ID), EUR, "Rechnung" header, EU invoice directive compliance note |

#### Implementation

- `InvoiceTemplate.countryFormat` field: `"IN" | "AE" | "GB" | "US" | "DE"` (ISO 3166-1 alpha-2)
- Auto-detected from `OrgDefaults.country` if not overridden per invoice
- Each format variant is a render configuration, not a full separate template
- Switching format shows/hides relevant tax fields on the invoice creation form

#### Org Country and Tax Registration Fields

```prisma
// Add to OrgDefaults:
country           String  @default("IN")           // ISO 3166-1 alpha-2
baseCurrency      String  @default("INR")           // ISO 4217
timezone          String  @default("Asia/Kolkata")
vatRegNumber      String?   // UAE TRN, UK VAT, EU VAT number
vatRate           Decimal?  @db.Decimal(5, 2)       // e.g., 5 for UAE, 20 for UK
fiscalYearStart   Int     @default(4)               // month number (4 = April for India)
```

---

## 6. Sprint 15.3 — Template Marketplace + Developer Ecosystem v2

**Goal:** Build a self-sustaining template economy and a hardened developer platform.

---

### 6.1 Template Marketplace

#### Vision

| Role | Capability |
|---|---|
| Slipwise (platform) | Curates official premium templates; approves community submissions |
| Org Admin (publisher) | Submits custom templates for marketplace listing; sets price; receives revenue share |
| All Orgs (consumers) | Browses templates; installs free ones immediately; purchases paid ones via Razorpay |

#### Marketplace Models

```prisma
enum MarketplaceTemplateStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  REJECTED
  ARCHIVED
}

model MarketplaceTemplate {
  id              String                     @id @default(cuid())
  templateType    String                     // "INVOICE" | "VOUCHER" | "SALARY_SLIP"
  name            String
  description     String
  previewImageUrl String                     // S3 URL
  previewPdfUrl   String?                    // S3 URL — full PDF preview
  category        String[]                   // ["modern", "minimalist", "gst-compliant", "international"]
  tags            String[]
  price           Decimal                    @db.Decimal(8, 2)    // 0 = free
  currency        String                     @default("INR")
  publisherOrgId  String?                    // null = Slipwise official template
  publisherName   String                     // "Slipwise" or org name
  isOfficial      Boolean                    @default(false)
  isApproved      Boolean                    @default(false)
  status          MarketplaceTemplateStatus  @default(DRAFT)
  downloadCount   Int                        @default(0)
  rating          Decimal?                   @db.Decimal(3, 2)
  ratingCount     Int                        @default(0)
  templateData    Json                       // actual template config JSON
  version         String                     @default("1.0.0")
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt

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
  rating     Int      // 1–5
  review     String?
  createdAt  DateTime @default(now())

  org      Organization        @relation(fields: [orgId], references: [id])
  template MarketplaceTemplate @relation(fields: [templateId], references: [id])

  @@unique([orgId, templateId])
  @@map("marketplace_reviews")
}
```

#### Marketplace Pages

**1. `/app/docs/templates/marketplace` — Browse Templates**
- Header: search bar, category tabs (All / Invoice / Voucher / Salary Slip)
- Filters: tags (modern, GST-compliant, minimalist, bilingual, RTL), price (Free / Paid / All), sort (Popular / Newest / Top-rated / Free first)
- Template card: preview image, name, publisher badge (Official or publisher name), price or FREE badge, rating stars, install count
- Click card: full-screen preview modal
  - Left panel: preview image gallery (cover + 2 variants)
  - Right panel: full PDF preview (iframe), description, tags, rating breakdown
  - Footer: "Install for Free" (free) or "Purchase for ₹999" (paid, Razorpay checkout)
- Installed templates: "Installed" badge + checkmark instead of button

**2. `/app/docs/templates/my-templates` — Installed + Custom Templates**
- Tabs: "Installed from Marketplace" / "Custom (created in-app)"
- Each template: name, type, source, "Set as Default" button, "Remove" button
- Default template: used for new documents of that type

**3. `/app/docs/templates/publish` — Publish to Marketplace**
- Plan gate: Pro+ orgs only
- Form: template name, description, type, category tags, price (0 for free)
- Upload: preview image (JPEG/PNG, max 2MB), preview PDF (max 5MB)
- Template picker: select from the org's custom templates to publish
- Submit: status → PENDING_REVIEW; email notification to marketplace@slipwise.com
- Org can view submission status and reviewer feedback

**4. `/(marketing)/marketplace` — Public Marketing Page**
- SEO-optimized: "free GST invoice template India", "invoice template for UAE business", etc.
- Showcases top 12 official templates
- CTA: "Install free" → if not logged in, redirect to signup with `?returnTo=/app/docs/templates/marketplace`
- No auth required to browse

#### Revenue Sharing

| Party | Share |
|---|---|
| Publisher Org | 70% of paid template price |
| Slipwise Platform | 30% of paid template price |

- Phase 15: Revenue tracked in `MarketplaceRevenue` model; payouts manual (Slipwise transfers to publisher org's bank account)
- Phase 16: Automated via RazorpayX payout API
- `MarketplaceRevenue` model:
  ```prisma
  model MarketplaceRevenue {
    id             String   @id @default(cuid())
    purchaseId     String   @unique
    publisherOrgId String
    totalAmount    Decimal  @db.Decimal(8, 2)
    publisherShare Decimal  @db.Decimal(8, 2)
    platformShare  Decimal  @db.Decimal(8, 2)
    status         String   @default("PENDING_PAYOUT")  // PENDING_PAYOUT | PAID_OUT
    paidOutAt      DateTime?
    createdAt      DateTime @default(now())

    purchase     MarketplacePurchase @relation(fields: [purchaseId], references: [id])
    publisherOrg Organization       @relation(fields: [publisherOrgId], references: [id])

    @@map("marketplace_revenue")
  }
  ```

---

### 6.2 OAuth 2.0 Authorization Code Flow

#### Why OAuth 2.0

Phase 12 implemented API key auth (static keys). OAuth 2.0 allows third-party developers to build apps that connect to any Slipwise org's account with user consent — without the org sharing their API key. This is the standard for marketplace integrations (Zapier, QuickBooks, etc.).

#### OAuth Models

```prisma
model OAuthApp {
  id           String   @id @default(cuid())
  orgId        String   // the developer's org
  name         String
  description  String
  websiteUrl   String
  redirectUris String[]
  logoUrl      String?
  clientId     String   @unique   // auto-generated UUID
  clientSecret String            // bcrypt-hashed; shown only once on creation
  scopes       String[]           // allowed scopes this app can request
  isPublic     Boolean  @default(false)   // listed in developer marketplace
  isApproved   Boolean  @default(false)   // Slipwise review for public apps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  org            Organization         @relation(fields: [orgId], references: [id])
  authorizations OAuthAuthorization[]

  @@map("oauth_apps")
}

model OAuthAuthorization {
  id               String   @id @default(cuid())
  appId            String
  orgId            String   // the resource owner org (who authorized)
  grantedBy        String   // Profile.id of user who clicked "Authorize"
  scopes           String[]
  authCode         String?  @unique   // short-lived code (10min TTL); nulled after exchange
  accessToken      String   @unique   // hashed with bcrypt
  refreshToken     String   @unique   // hashed with bcrypt
  accessExpiresAt  DateTime
  refreshExpiresAt DateTime
  isRevoked        Boolean  @default(false)
  createdAt        DateTime @default(now())

  app            OAuthApp     @relation(fields: [appId], references: [id])
  org            Organization @relation(fields: [orgId], references: [id])
  grantedByUser  Profile      @relation(fields: [grantedBy], references: [id])

  @@map("oauth_authorizations")
}
```

#### OAuth Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/oauth/authorize` | Show authorization consent page to resource owner |
| POST | `/oauth/authorize` | Submit consent (approve/deny); redirect with auth code |
| POST | `/oauth/token` | Exchange auth code for access + refresh tokens |
| POST | `/oauth/token/refresh` | Refresh expired access token using refresh token |
| POST | `/oauth/revoke` | Revoke a token (access or refresh) |
| GET | `/api/v1/me` | Token introspection: which org, which scopes, expiry |

#### OAuth Flow (Standard Authorization Code)

```
1. Developer registers OAuthApp at /app/settings/developer/oauth-apps
2. Third-party app redirects user to:
   GET /oauth/authorize?client_id=abc&redirect_uri=https://app.example.com/callback
                       &scope=invoices:read customers:read&state=xyz&response_type=code
3. Slipwise shows consent page: "App X wants to access: Read invoices, Read customers"
4. User clicks Approve → POST /oauth/authorize (form submission)
5. Slipwise creates OAuthAuthorization with authCode (10-min TTL)
6. Redirect to redirect_uri?code=<authCode>&state=xyz
7. Third-party app POSTs to /oauth/token:
   { grant_type: "authorization_code", code: <authCode>, client_id, client_secret }
8. Slipwise exchanges code → returns access_token (1h TTL), refresh_token (30d TTL)
9. Third-party app calls: GET /api/v1/invoices
   Authorization: Bearer <access_token>
10. Slipwise looks up OAuthAuthorization by hashed token; verifies scopes; serves data
```

#### Scopes

| Scope | Description |
|---|---|
| `invoices:read` | List and view invoices |
| `invoices:write` | Create and update invoices |
| `customers:read` | List and view customers |
| `customers:write` | Create and update customers |
| `vouchers:read` | List and view vouchers |
| `quotes:read` | List and view quotes |
| `reports:read` | Access financial reports |
| `webhooks:read` | View webhook configuration |
| `webhooks:write` | Create and manage webhooks |

---

### 6.3 Webhook v2 — Reliable Delivery

#### Current Gaps (Phase 12 Webhook v1)

- No retry on failure
- No HMAC signature verification
- No delivery log visible to user
- No dead-letter queue

#### Webhook v2 Schema Additions

```prisma
// Add to ApiWebhookEndpoint:
apiVersion        String    @default("v2")
signingSecret     String    // HMAC-SHA256 key (generated per endpoint, shown once)
maxRetries        Int       @default(5)
retryBackoff      String    @default("exponential")  // "exponential" | "linear"
isActive          Boolean   @default(true)
consecutiveFails  Int       @default(0)
autoDisableAt     Int       @default(10)   // auto-disable after N consecutive failures
lastDeliveryAt    DateTime?
lastSuccessAt     DateTime?

// Add to ApiWebhookDelivery:
attempt           Int       @default(1)
nextRetryAt       DateTime?
requestBody       Json
responseStatus    Int?
responseBody      String?   @db.Text
durationMs        Int?
deliveredAt       DateTime?
```

#### Webhook v2 Signature

Every delivery includes:

```
X-Slipwise-Signature: sha256=<HMAC-SHA256(signingSecret, rawBody)>
X-Slipwise-Delivery: <delivery_id>
X-Slipwise-Event: invoice.paid
X-Slipwise-Timestamp: <unix_timestamp_seconds>
```

Recipients verify: `sha256=HMAC-SHA256(signingSecret, rawBody)` matches header.

#### Retry Schedule (Trigger.dev `webhook-retry-v2` job)

| Attempt | Delay after previous failure |
|---|---|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 15 minutes |
| 5 | 1 hour |
| 6 (max) | 4 hours |

After 5 retries exhausted: `status = "dead_lettered"`. Org can manually replay from the developer portal.

**Auto-disable:** If `consecutiveFails >= autoDisableAt`, endpoint is automatically disabled; org notified via email.

#### Developer Portal Enhancements

New pages:
- **`/app/settings/developer/webhooks/v2`** — Webhook v2 management
  - List all v2 endpoints with status (active/disabled/dead-letter count)
  - Per-endpoint: events subscribed, last delivery time, success rate badge
  - "Rotate signing secret" button
  - "View delivery log" link
- **`/app/settings/developer/webhooks/[id]/deliveries`** — Per-endpoint delivery timeline
  - Chronological list of deliveries
  - Each delivery: event type, timestamp, HTTP status, duration, attempt number
  - Expand: full request body + response body
  - Dead-lettered deliveries: "Replay" button
- **`/app/settings/developer/oauth-apps`** — OAuth app management
  - List of apps created by this org (developer role)
  - Create new app: name, description, redirect URIs, scopes
  - After creation: show clientId + clientSecret once (then secret is hidden forever)
  - "Rotate secret" button
  - View authorizations granted by other orgs to this app

---

### 6.4 Partner / Reseller Program

#### Partner Types

| Type | Description |
|---|---|
| Accountant | CA firm or accounting firm managing multiple client orgs on Slipwise |
| Technology | SaaS tool integrating with Slipwise via API/OAuth |
| Reseller | Agency reselling Slipwise subscriptions to their clients |

#### Partner Models

```prisma
enum PartnerType {
  ACCOUNTANT
  TECHNOLOGY
  RESELLER
}

enum PartnerStatus {
  PENDING
  APPROVED
  SUSPENDED
}

model PartnerProfile {
  id              String        @id @default(cuid())
  orgId           String        @unique
  type            PartnerType
  companyName     String
  website         String?
  description     String?
  logoUrl         String?
  status          PartnerStatus @default(PENDING)
  partnerCode     String        @unique   // auto-generated; used in referral links
  revenueShare    Decimal       @db.Decimal(5, 2)   // e.g., 20.00 for 20%
  managedOrgCount Int           @default(0)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  org         Organization        @relation(fields: [orgId], references: [id])
  managedOrgs PartnerManagedOrg[]

  @@map("partner_profiles")
}

model PartnerManagedOrg {
  id        String   @id @default(cuid())
  partnerId String
  orgId     String   // client org that authorized this partner
  addedAt   DateTime @default(now())

  partner PartnerProfile @relation(fields: [partnerId], references: [id])
  org     Organization   @relation(fields: [orgId], references: [id])

  @@unique([partnerId, orgId])
  @@map("partner_managed_orgs")
}
```

#### Partner Portal at `/app/partner`

Pages:
- **`/app/partner`** — Partner dashboard
  - Managed client count
  - Revenue: total revenue from managed clients' subscriptions
  - Earned revenue share (Phase 15: display only; payout in Phase 16)
  - Referral link with `?ref=<partnerCode>` for new signups
- **`/app/partner/clients`** — Managed client list
  - Client name, plan, MRR, last active
  - "Quick-switch" button: impersonate client org context (with their permission)
  - Add client: send invitation email → client accepts → PartnerManagedOrg created
  - Remove client: revoke access
- **`/app/partner/apply`** — Apply for partner status
  - Available to any logged-in org
  - Form: partner type, company name, website, description
  - On submit: PartnerProfile created with status PENDING; email to partners@slipwise.com

#### Accountant Partner Use Case (Key)

1. CA firm signs up → applies at `/app/partner/apply` as Accountant type
2. Slipwise approves → PartnerProfile.status = APPROVED
3. CA sends invite to client org → client org admin approves → PartnerManagedOrg created
4. CA can now:
   - View client's invoices, generate GST reports, reconcile TDS
   - Download GSTR-1/3B for client (using CA's Slipwise session, scoped to client orgId)
   - Export TDS reports for all managed clients in one go
5. CA cannot: change client billing plan, delete client data, access settings

---

## 7. Database Schema Additions

All additions are in a single migration: `20260410000000_phase15_compliance_expansion`

### New Enums

```prisma
enum TdsSection {
  SECTION_194A
  SECTION_194C
  SECTION_194J
  SECTION_194H
  SECTION_194I
  SECTION_194Q
  OTHER
}

enum MarketplaceTemplateStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  REJECTED
  ARCHIVED
}

enum PartnerType {
  ACCOUNTANT
  TECHNOLOGY
  RESELLER
}

enum PartnerStatus {
  PENDING
  APPROVED
  SUSPENDED
}
```

### New Models

- `HsnSacCode` — HSN/SAC master codes
- `TdsRecord` — TDS/TCS records per invoice
- `ExchangeRate` — Daily exchange rates cache
- `MarketplaceTemplate` — Marketplace template listings
- `MarketplacePurchase` — Template purchase records
- `MarketplaceReview` — Template ratings and reviews
- `MarketplaceRevenue` — Revenue share tracking
- `OAuthApp` — OAuth application registrations
- `OAuthAuthorization` — OAuth grants (access + refresh tokens)
- `PartnerProfile` — Partner org registrations
- `PartnerManagedOrg` — Partner ↔ client org relationships

### Field Additions to Existing Models

**InvoiceLineItem:** hsnCode, gstRate, gstType, cgstAmount, sgstAmount, igstAmount, cessAmount

**Invoice:** supplierGstin, customerGstin, placeOfSupply, reverseCharge, exportType, gstTotalCgst, gstTotalSgst, gstTotalIgst, gstTotalCess, irnNumber, irnAckNumber, irnAckDate, irnQrCode, eWayBillNumber, eWayBillDate, eWayBillExpiry, ewbTransportMode, ewbVehicleNumber, ewbTransporterGstin, ewbTransportDocNo, ewbDistanceKm, ewbFromPincode, ewbToPincode, displayCurrency, exchangeRate, displayTotalAmount, exchangeRateDate, documentLanguage

**OrgDefaults:** defaultLanguage, defaultDocLanguage, country, baseCurrency, timezone, vatRegNumber, vatRate, fiscalYearStart

**Customer:** preferredLanguage

**ApiWebhookEndpoint:** apiVersion, signingSecret, maxRetries, retryBackoff, isActive, consecutiveFails, autoDisableAt, lastDeliveryAt, lastSuccessAt

**ApiWebhookDelivery:** attempt, nextRetryAt, requestBody, responseStatus, responseBody, durationMs, deliveredAt

---

## 8. Route Map

### App Routes

| Route | Description | Plan Gate |
|---|---|---|
| `/app/pay/tds` | TDS management dashboard | Starter+ |
| `/app/pay/tds/[invoiceId]` | TDS record for invoice | Starter+ |
| `/app/intel/gst-reports` | GSTR-1 / GSTR-3B data export | Pro+ |
| `/app/docs/invoices/[id]/irn` | IRN generation page | Pro+ |
| `/app/docs/templates/marketplace` | Template marketplace browse | Free (install requires login) |
| `/app/docs/templates/my-templates` | Installed + custom templates | Free |
| `/app/docs/templates/publish` | Publish template to marketplace | Pro+ |
| `/app/settings/developer/oauth-apps` | OAuth app management | Starter+ |
| `/app/settings/developer/webhooks/v2` | Webhook v2 management | Starter+ |
| `/app/settings/developer/webhooks/[id]/deliveries` | Delivery timeline + replay | Starter+ |
| `/app/partner` | Partner dashboard | Approved partners only |
| `/app/partner/clients` | Managed client list | Approved partners only |
| `/app/partner/apply` | Apply for partner status | Any logged-in org |
| `/(marketing)/marketplace` | Public template marketplace page | Public |

### API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/gst/hsn-sac/search` | Session | HSN/SAC autocomplete search |
| POST | `/api/gst/irn/generate` | Session | Generate IRN for invoice |
| POST | `/api/gst/irn/cancel` | Session | Cancel IRN |
| POST | `/api/gst/eway-bill` | Session | Generate e-Way Bill |
| GET | `/api/gst/reports/gstr1` | Session | GSTR-1 export data |
| GET | `/api/gst/reports/gstr3b` | Session | GSTR-3B summary |
| GET | `/api/exchange-rates` | Session | Get current exchange rates |
| GET | `/api/marketplace/templates` | Public | Browse marketplace templates |
| GET | `/api/marketplace/templates/[id]` | Public | Template detail |
| POST | `/api/marketplace/templates/[id]/install` | Session | Install free template |
| POST | `/api/marketplace/purchase` | Session | Purchase paid template (Razorpay) |
| GET/POST | `/oauth/authorize` | Session (resource owner) | OAuth consent flow |
| POST | `/oauth/token` | Client credentials | Exchange code for tokens |
| POST | `/oauth/token/refresh` | Client credentials | Refresh access token |
| POST | `/oauth/revoke` | Client credentials | Revoke token |
| GET | `/api/v1/me` | Bearer token | Token introspection |

---

## 9. Background Jobs

All jobs run via Trigger.dev.

| Job ID | Schedule | Description |
|---|---|---|
| `exchange-rate-refresh` | Daily 7:00am IST | Fetch USD/EUR/GBP/AED/SGD/AUD/SAR rates from Open Exchange Rates |
| `irn-session-refresh` | Every 5.5 hours | Refresh IRP NIC session token before expiry |
| `webhook-retry-v2` | Every 1 minute | Process webhook delivery retry queue |
| `marketplace-stats-rollup` | Daily midnight IST | Update downloadCount and rating averages on MarketplaceTemplate |
| `partner-org-sync` | Hourly | Sync managedOrgCount on PartnerProfile |
| `gst-report-prefetch` | Daily 6:00am IST | Pre-compute GSTR-1 data for previous month (for Pro+ orgs with high invoice volume) |

---

## 10. Plan Gates

| Feature | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| GST computation (CGST/SGST/IGST) on invoices | ✅ | ✅ | ✅ | ✅ |
| HSN/SAC code autocomplete | ✅ | ✅ | ✅ | ✅ |
| TDS tracking | ❌ | ✅ | ✅ | ✅ |
| GSTR-1 / GSTR-3B export | ❌ | ❌ | ✅ | ✅ |
| e-Invoicing (IRN generation) | ❌ | ❌ | ✅ | ✅ |
| e-Way Bill | ❌ | ❌ | ✅ | ✅ |
| Multi-language app UI | ✅ | ✅ | ✅ | ✅ |
| Multi-language document PDFs | ✅ | ✅ | ✅ | ✅ |
| Multi-currency invoice display | ❌ | ✅ | ✅ | ✅ |
| Country-specific invoice formats | ✅ | ✅ | ✅ | ✅ |
| Template marketplace browse + install free | ✅ | ✅ | ✅ | ✅ |
| Template marketplace purchase paid templates | ❌ | ✅ | ✅ | ✅ |
| Template marketplace publish | ❌ | ❌ | ✅ | ✅ |
| OAuth app creation | ❌ | ✅ | ✅ | ✅ |
| Webhook v2 | ❌ | ✅ | ✅ | ✅ |
| Partner program | ❌ | ❌ | ✅ | ✅ |

**Plan config additions needed in `src/lib/plans/config.ts`:**
- `gstEInvoicing: boolean`
- `tdsTracking: boolean`
- `gstrExport: boolean`
- `multiCurrency: boolean`
- `templatePublish: boolean`
- `oauthApps: boolean`
- `webhookV2: boolean`
- `partnerProgram: boolean`

---

## 11. Edge Cases and Acceptance Criteria

### Sprint 15.1 — GST / e-Invoicing

| Edge Case | Expected Behavior |
|---|---|
| IRP API down or timeout | Retry 3× with exponential backoff; keep invoice in DRAFT; show "IRP unavailable — try again" with retry button |
| Duplicate IRN (IRP error 2150) | Fetch existing IRN via GET and save — treat as success; no duplicate creation |
| GSTIN format validation fails | Show inline error before calling IRP API at all |
| Invoice modified after IRN generated | Block all edits; show "Invoice with IRN cannot be modified. Cancel and re-issue required." |
| e-Way Bill optional for services | Hide e-Way Bill section entirely when all line items use SAC codes |
| TDS rate changes mid-year | TdsRecord.tdsRate stored at time of recording; never retroactively changed |
| GSTR-1 export with missing GSTIN | Flag affected invoices in report; exclude from B2B table, include in B2C table with note |
| HSN code invalid (IRP error 2283) | Show inline error on specific line item; block IRN until corrected |
| IRN session token expired during generation | Attempt token refresh; retry IRN call once; fail gracefully if refresh also fails |
| Org not on Pro plan clicks Generate IRN | Show UpgradeGate component with "Upgrade to Pro" CTA |

### Sprint 15.2 — Multi-Language / Multi-Currency

| Edge Case | Expected Behavior |
|---|---|
| Arabic RTL invoice with LTR numbers | Numbers remain LTR within RTL context (Unicode BiDi standard) |
| Exchange rate API unavailable | Use last cached rate from DB; show "Rate as of [date]" footnote; show warning banner if rate > 7 days old |
| Customer preferred language different from org default | Customer preferredLanguage takes precedence for PDF documents |
| Currency mismatch on Razorpay payment | Payment always in INR; display currency is cosmetic; amount on payment page shows both (₹99,960 / ~USD 1,200) |
| Font missing for language | Bundle fonts in public/fonts; throw hard error at build time if font file missing |
| Org switches country mid-use | Old invoices retain their format; only new invoices use new country format |

### Sprint 15.3 — Template Marketplace

| Edge Case | Expected Behavior |
|---|---|
| Org installs already-installed template | Idempotent: skip re-install; show "Already installed" badge |
| Paid template Razorpay payment fails | No installation; redirect to payment failure page with retry; MarketplacePurchase not created |
| Publisher org deletes published template | Mark ARCHIVED; all installed copies are unaffected (stored locally) |
| Org reviews template before installing | Block: "You must install this template before reviewing" |
| Template review rejected by Slipwise QA | status = REJECTED; publisher org receives email with rejection reason |
| Template data contains XSS payload | Sanitize all templateData JSON before save; sanitize again at render time |
| Marketplace purchase webhook not received | Razorpay webhook retry mechanism; idempotent by razorpayPaymentId |

### Sprint 15.3 — OAuth 2.0

| Edge Case | Expected Behavior |
|---|---|
| Access token expired | Return 401 `{ error: "token_expired" }`; client must use refresh token |
| Refresh token expired | Return 401 `{ error: "refresh_token_expired" }`; user must re-authorize |
| App requests more scopes than granted | Silently exclude extra scopes from token; no error |
| Same app authorized twice by same org | Update existing authorization (merge scopes); no duplicate OAuthAuthorization created |
| App revoked but token still presented | Immediate 401; no grace period |
| Invalid redirect_uri (not in allowed list) | Return 400 `{ error: "invalid_redirect_uri" }`; no redirect |
| state parameter mismatch (CSRF protection) | Return 400 `{ error: "state_mismatch" }`; deny authorization |

### Sprint 15.3 — Webhook v2

| Edge Case | Expected Behavior |
|---|---|
| Endpoint returns 500 | Increment attempt; schedule retry per backoff table |
| Endpoint returns 200 but with wrong body | Count as success (HTTP 2xx = delivered) |
| Endpoint times out (>30s) | Count as failure; schedule retry |
| consecutiveFails >= autoDisableAt | Auto-disable endpoint; send email to org owner |
| Dead-lettered delivery replayed successfully | Reset consecutiveFails; re-enable endpoint if disabled due to this batch |
| Signing secret rotation | Old secret valid for 10 minutes after rotation (grace window); then invalid |
| Delivery storm (1000 events in 1 minute) | Per-endpoint rate limit: max 100 deliveries/minute; excess queued |

---

## 12. Test Plan

### Sprint 15.1 Test Cases

| ID | Description | Type |
|---|---|---|
| TC-15-001 | Intrastate invoice: CGST + SGST split = gstRate | Unit |
| TC-15-002 | Interstate invoice: IGST = full gstRate | Unit |
| TC-15-003 | GST-exempt line item: no tax computed | Unit |
| TC-15-004 | HSN/SAC search returns top 10 by code match | Unit |
| TC-15-005 | IRN generation — IRP sandbox success path: AckNo stored | Integration |
| TC-15-006 | IRN generation — duplicate error 2150 → idempotent fetch | Integration |
| TC-15-007 | IRN generation — GSTIN validation fails before API call | Unit |
| TC-15-008 | Invoice with IRN blocks edit | Unit |
| TC-15-009 | IRP session refresh job resets token | Integration |
| TC-15-010 | e-Way Bill fields hidden for services invoice | Unit |
| TC-15-011 | TDS amount = invoice total × tdsRate | Unit |
| TC-15-012 | TDS record status transitions: PENDING_CERT → CERT_RECEIVED | Unit |
| TC-15-013 | GSTR-1 CSV export: B2B section includes correct GSTIN | Integration |
| TC-15-014 | GSTR-1 export: invoice with missing GSTIN excluded from B2B | Unit |
| TC-15-015 | GST report plan gate: Free org gets 403 | Unit |

### Sprint 15.2 Test Cases

| ID | Description | Type |
|---|---|---|
| TC-15-016 | Hindi invoice PDF: "Invoice" label renders as "चालान" | Integration |
| TC-15-017 | Arabic invoice PDF: text direction RTL, numbers LTR | Integration |
| TC-15-018 | Customer preferredLanguage overrides org defaultDocLanguage | Unit |
| TC-15-019 | USD display currency: exchange rate footnote on PDF | Integration |
| TC-15-020 | Exchange rate API down: uses last cached rate | Unit |
| TC-15-021 | Exchange rate > 7 days old: warning shown | Unit |
| TC-15-022 | Country format "AE": TRN field shown, GSTIN hidden | Unit |
| TC-15-023 | Country format "IN": GSTIN, HSN columns shown | Unit |
| TC-15-024 | Exchange rate refresh job updates DB daily | Integration |
| TC-15-025 | App UI language switch: next-intl renders Hindi labels | Integration |

### Sprint 15.3 Test Cases

| ID | Description | Type |
|---|---|---|
| TC-15-026 | Free template installs immediately: MarketplacePurchase.amount = 0 | Integration |
| TC-15-027 | Paid template requires Razorpay checkout before install | Integration |
| TC-15-028 | Re-installing already-installed template: idempotent | Unit |
| TC-15-029 | Publisher submits template: status = PENDING_REVIEW | Integration |
| TC-15-030 | Template review before install: blocked with error | Unit |
| TC-15-031 | Revenue split: 70% publisherShare, 30% platformShare | Unit |
| TC-15-032 | OAuth authorize: auth code generated with 10-min TTL | Integration |
| TC-15-033 | OAuth token exchange: access + refresh tokens returned | Integration |
| TC-15-034 | OAuth token: access token expires → 401 token_expired | Unit |
| TC-15-035 | OAuth token: refresh token → new access token | Integration |
| TC-15-036 | OAuth: same app auth twice → existing record updated | Unit |
| TC-15-037 | OAuth: invalid redirect_uri → 400 error | Unit |
| TC-15-038 | Webhook v2 delivery: HMAC signature correct | Unit |
| TC-15-039 | Webhook v2 delivery fails → retry scheduled | Integration |
| TC-15-040 | Webhook v2: after 5 retries → status = dead_lettered | Integration |
| TC-15-041 | Webhook v2: manual replay from portal | Integration |
| TC-15-042 | Webhook v2: consecutiveFails >= 10 → endpoint auto-disabled | Unit |
| TC-15-043 | Partner applies: PartnerProfile.status = PENDING | Integration |
| TC-15-044 | Partner invite accepted: PartnerManagedOrg created | Integration |
| TC-15-045 | Partner can view managed client invoices | Integration |

---

## 13. Non-Functional Requirements

### Performance

| Requirement | Target |
|---|---|
| IRN generation response time | < 3 seconds (IRP API SLA) |
| Marketplace browse page load | < 1.5 seconds (CDN-cached, 15-min TTL) |
| GST computation on invoice save | < 100ms (in-memory computation) |
| Exchange rate data freshness | Max 1 day old (daily job at 7am IST) |
| GSTR-1 export generation | < 5 seconds for up to 500 invoices |
| OAuth token validation | < 20ms (Redis cache lookup) |

### Reliability

| Requirement | Detail |
|---|---|
| IRN generation | Retry-safe: always check for existing IRN before calling IRP |
| Webhook v2 | Guaranteed at-least-once delivery; dead-letter after 5 retries |
| Exchange rate job | Fail-safe: use cached data if API fails; never block invoice creation |
| Marketplace purchase | Verified via Razorpay webhook before template is installed |
| Partner org sync | Idempotent: safe to re-run on restart |

### Security

| Requirement | Detail |
|---|---|
| OAuth client secrets | bcrypt-hashed in DB; shown only once on creation |
| Webhook signing secrets | Generated per endpoint; shown only once; bcrypt-hashed |
| IRN/IRP credentials | Stored in AWS Secrets Manager (not .env); loaded via `src/lib/secrets.ts` |
| Template data | Sanitized before save and at render time (no XSS) |
| OAuth state parameter | CSRF protection: state must match |
| Partner access | Client org must explicitly authorize each partner; no passive grants |

### Scalability

| Requirement | Detail |
|---|---|
| Marketplace template files | Preview images and PDFs stored in S3, served via CloudFront CDN |
| OAuth token validation | Redis-backed token cache for high-frequency API calls |
| Webhook v2 delivery queue | Trigger.dev with per-endpoint concurrency limit (max 10 in-flight per endpoint) |
| Exchange rates | Single daily fetch, cached in DB; no per-request API calls |

---

## 14. Environment Variables

### Sprint 15.1 (GST / e-Invoicing)

```env
# GST e-Invoicing (NIC IRP)
IRP_CLIENT_ID=                     # NIC IRP client ID
IRP_CLIENT_SECRET=                 # NIC IRP client secret
IRP_API_BASE_URL=https://einvoice1.gst.gov.in/eicore/v1.03
IRP_SANDBOX_URL=https://einv-apisandbox.nic.in
IRP_MODE=sandbox                   # "sandbox" | "production"

# e-Way Bill (NIC EWB)
EWB_CLIENT_ID=                     # NIC EWB client ID
EWB_CLIENT_SECRET=                 # NIC EWB client secret
EWB_API_BASE_URL=https://developer.gst.gov.in/devapi/api/ewb
```

### Sprint 15.2 (Multi-Currency)

```env
# Open Exchange Rates
OPEN_EXCHANGE_RATES_APP_ID=        # Free tier app ID
```

### Sprint 15.3 (OAuth + Marketplace + Webhooks)

```env
# OAuth 2.0
OAUTH_AUTHORIZATION_CODE_EXPIRY=10m
OAUTH_ACCESS_TOKEN_EXPIRY=1h
OAUTH_REFRESH_TOKEN_EXPIRY=30d

# Marketplace
MARKETPLACE_REVIEW_NOTIFY_EMAIL=marketplace@slipwise.com

# Partner Program
PARTNER_REVENUE_SHARE_DEFAULT=20   # default 20% revenue share for new partners

# Webhook v2
WEBHOOK_SIGNING_KEY_LENGTH=32      # bytes for HMAC key generation
```

---

## 15. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | IRP API (e-invoicing) breaks or changes schema | Medium | High | Maintain adapter layer `src/lib/irp-client.ts`; monitor GST council bulletins; IRP_MODE=sandbox until fully tested |
| R2 | Arabic RTL PDF rendering quality | High | Medium | Thorough QA of each language × template combination before launch; Arabic RTL test suite in CI |
| R3 | Marketplace template abuse (malicious templateData) | Low | High | Sanitize templateData JSON on save; sandbox preview rendering; Slipwise QA review before PUBLISHED status |
| R4 | OAuth client credentials compromise | Low | Critical | Client secrets bcrypt-hashed; rotation UI available; revoke-all endpoint; audit log on authorization events |
| R5 | Exchange rate stale data causes billing confusion | Medium | Medium | Always show exchange rate date on invoice; allow manual override; show warning if rate > 7 days old |
| R6 | Webhook v2 delivery storm on high-volume events | Medium | Medium | Per-endpoint rate limit (100/min); Trigger.dev concurrency control; delivery queue |
| R7 | Partner program unauthorized org access | Low | Critical | Client org must explicitly authorize partner; no passive access; all partner actions logged in ActivityLog |
| R8 | IRN generated for incorrect invoice (immutable) | Low | High | Confirmation modal with clear warning about immutability before IRN generation; "Cancel and re-issue" guide in UI |
| R9 | IRP sandbox vs production credential confusion | Medium | High | IRP_MODE env var mandatory; startup validation: if IRP_MODE=production, require IRP credentials in Secrets Manager |
| R10 | Multi-language PDF font load failure | Low | High | Bundle fonts in repo (not CDN); hard build error if font file missing |

---

## 16. Branch Strategy and PR Workflow

### Branch Hierarchy

```
master
  └── feature/phase-15-compliance-expansion     ← parent phase branch
        ├── feature/phase-15-sprint-15-1         ← GST + e-Invoicing + TDS
        ├── feature/phase-15-sprint-15-2         ← Multi-language + Multi-currency
        └── feature/phase-15-sprint-15-3         ← Marketplace + OAuth + Webhooks + Partner
```

### PR Workflow

1. Engineer creates sprint branch from phase branch
2. Engineer implements sprint scope completely (all features + tests)
3. Engineer runs full test suite — all tests must pass before PR
4. Engineer opens PR: `feature/phase-15-sprint-15-X → feature/phase-15-compliance-expansion`
5. PR description must include:
   - What was built (feature list)
   - DB schema changes (new models, field additions, migration name)
   - New routes (app + API)
   - Test results (# passing, # skipped)
   - Env vars required
   - How to manually verify (step-by-step)
6. Product owner reviews and approves sprint PR
7. Sprint branch merged to phase branch
8. Repeat for each sprint
9. After all 3 sprints merged: open final PR `feature/phase-15-compliance-expansion → master`
10. Product owner reviews final PR and approves
11. Phase branch merged to master

### Coding Standards

All code must follow existing patterns:
- `ActionResult<T>` return type for server actions (defined per file)
- Import Prisma client from `@/generated/prisma/client`
- Auth: `requireRole('admin')` for write ops, `requireOrgContext()` for reads
- Plan gates: `requirePlan(orgId, "pro")` from `@/lib/plans/enforcement`
- API response envelope: `{ success: true, data, meta }` / `{ success: false, error: { code, message } }`
- All Razorpay calls through `src/lib/razorpay.ts`
- Nullable Prisma JSON fields: `Prisma.DbNull` not `null`

---

*End of Phase 15 PRD — Slipwise One*  
*Version 1.0 | 2026-04-10 | India Tax Compliance + Global Expansion + Template Marketplace + Developer Ecosystem v2*  
*Prepared by: Copilot Engineering Assistant | Parent Company: Zenxvio*
