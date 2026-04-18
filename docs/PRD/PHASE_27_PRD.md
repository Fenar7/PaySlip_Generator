# Phase 27: SW Intel Pro — Predictive Analytics & AI Operations

**Document Version:** 1.0
**Date:** April 2026
**Phase Sequence:** Phase 27 (follows Phase 26: Enterprise ERP & Advanced Financials)
**Branch Strategy:** `feature/phase-27` (branched from `master` after Phase 26 merge)
**Sprint Sub-branches:** `feature/phase-27-sprint-27-1` through `feature/phase-27-sprint-27-5`
**All Sprint PRs target:** `feature/phase-27` (never `master` directly)
**Merge to master:** Only after all 5 sprint PRs are approved, merged, and the pre-master audit passes

**Prepared by:** Slipwise One Engineering
**Product:** Slipwise One
**Primary suites:** SW Intel (Forecasting, Audit, Executive Hub), SW Pay (Cash-Flow Optimization, Auto-Dunning v2)
**Supporting suites:** SW Auth & Access (Global Tax Config, Audit Integrity), SW Flow (Alert Routing), Developer Platform (Intel API Extensions)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context — Master Plan Alignment](#2-strategic-context--master-plan-alignment)
3. [Current Baseline — What Already Exists](#3-current-baseline--what-already-exists)
4. [Phase 27 Objectives and Non-Goals](#4-phase-27-objectives-and-non-goals)
5. [Operating Principles](#5-operating-principles)
6. [Sprint 27.1 — AI Financial Forecaster & Predictive P&L](#6-sprint-271--ai-financial-forecaster--predictive-pl)
7. [Sprint 27.2 — Global Tax Engine & Multi-Region Compliance](#7-sprint-272--global-tax-engine--multi-region-compliance)
8. [Sprint 27.3 — Forensic Audit & Legal-Grade Logging](#8-sprint-273--forensic-audit--legal-grade-logging)
9. [Sprint 27.4 — Intelligent Cash-Flow Optimizer](#9-sprint-274--intelligent-cash-flow-optimizer)
10. [Sprint 27.5 — Executive Intel Hub (Push & Mobile)](#10-sprint-275--executive-intel-hub-push--mobile)
11. [Complete Database Schema Changes](#11-complete-database-schema-changes)
12. [State Machines](#12-state-machines)
13. [Route Map](#13-route-map)
14. [API and Integration Surface](#14-api-and-integration-surface)
15. [Background Jobs and Cron Routes](#15-background-jobs-and-cron-routes)
16. [Permissions, Plan Gates, and Access Rules](#16-permissions-plan-gates-and-access-rules)
17. [Business Rules and Validation Logic](#17-business-rules-and-validation-logic)
18. [Edge Cases and Acceptance Criteria](#18-edge-cases-and-acceptance-criteria)
19. [Test Plan](#19-test-plan)
20. [Non-Functional Requirements](#20-non-functional-requirements)
21. [Environment Variables and External Dependencies](#21-environment-variables-and-external-dependencies)
22. [Security Model](#22-security-model)
23. [Risk Register](#23-risk-register)
24. [Branch Strategy and PR Workflow](#24-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 27 transforms Slipwise One's **SW Intel** suite from a descriptive reporting layer into a **predictive intelligence platform** that tells business owners not just "what happened" but "what will happen" and "what should you do now."

After 26 phases, the platform has a mature data estate: 150+ Prisma models spanning invoices, vendor bills, payroll, inventory, procurement, bank transactions, journal entries, dunning logs, customer health scores, and multi-entity financials. Phase 27 harvests this data to build five intelligence capabilities:

1. **AI Financial Forecaster** — Uses historical invoice, payment, vendor bill, and bank transaction data to generate 30/60/90-day cash-flow projections. Detects spending anomalies against rolling statistical baselines. Projects revenue run-rate from trailing MRR/ARR patterns. All forecasting is deterministic-first (moving averages, linear regression) with optional LLM-powered narrative summaries.

2. **Global Tax Engine** — Abstracts the existing India-GST tax logic into a pluggable `TaxConfig` system supporting VAT (UK/EU), Sales Tax (US nexus-based), and international GST variants (Australia, New Zealand, Singapore). Enables multi-currency tax liability estimation and consolidated tax reporting across entity groups.

3. **Forensic Audit System** — Upgrades the existing `AuditLog` into a tamper-evident chain using SHA-256 hash linking (each log entry's hash includes the previous entry's hash). Adds advanced search, regulatory export ("Audit Packages" as ZIP archives), and retention policy management.

4. **Intelligent Cash-Flow Optimizer** — AI-driven bill payment scheduling that balances early-payment discounts against liquidity targets. Automated dunning escalation with configurable aggressiveness. "Best time to collect" recommendations based on customer payment behavior patterns.

5. **Executive Intel Hub** — A mobile-first executive dashboard surfacing 8 core KPIs (MRR, Burn Rate, Runway, DSO, DPO, Collection Rate, Gross Margin, Working Capital). Real-time "Flash Reports" delivered via Push Notifications, Email digest, and WhatsApp (via approved Business API template).

### Why these five together?

Enterprise customers who adopted Phase 26's ERP modules now generate 10-50× more transactional data than document-only users. Without predictive intelligence, this data is a liability (storage cost, noise) rather than an asset. Phase 27 converts raw ERP data into actionable business intelligence — the capability that justifies enterprise pricing tiers and drives daily engagement from C-suite users who otherwise only log in to approve documents.

---

## 2. Strategic Context — Master Plan Alignment

The Master Plan (v1.1) positions SW Intel as:

> *"The metrics, reporting, and insights suite. Scope: dashboard, trends, reports, filters, KPI cards, operational summaries, insights from documents, payments, and workflows."*

And explicitly identifies as future scope (Section 17):

> *"advanced AI insights engine"*

The Master Plan also calls for:

> *"multi-region deployment"* (Section 17 — deferred items)
> *"anomaly alerts, aging analysis, customer-level insights, department spending trends"* (Section 10.6.3 — "Later")

Phase 27 activates all of these. It also extends SW Intel from a read-only reporting layer into an **operational intelligence** layer that drives action (pay this bill now, collect from this customer, escalate this dunning sequence).

### Phase Lineage

| Capability | First Introduced | Phase 27 Evolution |
|-----------|-----------------|-------------------|
| Cash Flow Snapshot | Phase 21 (`src/lib/cash-flow.ts`) | Predictive 30/60/90-day forecasting |
| Customer Health Scores | Phase 24 (`CustomerHealthSnapshot`) | Payment behavior modeling for collection timing |
| Anomaly Detection | Phase 24 (`AnomalyRule`, `AnomalyDetectionRun`) | Spending anomaly detection with statistical baselines |
| Dunning Engine | Phase 21 (`DunningSequence`, `DunningStep`, `DunningLog`) | AI-optimized escalation timing |
| GST Compliance | Phase 15/20/26 | Abstracted to multi-region tax engine |
| Audit Logging | Phase 7 (`AuditLog`) | Hash-chained forensic integrity |
| Push Notifications | Phase 25 (`PushSubscription`) | Flash Reports via Push/Email/WhatsApp |
| Intel Insights | Phase 24 (`IntelInsight`) | AI-generated narrative summaries |
| Multi-Entity Consolidation | Phase 26 (`EntityGroup`) | Consolidated tax reporting, group-level forecasts |

### Suite Module Mapping

| Sprint | Primary Suite | Secondary Suite |
|--------|--------------|----------------|
| 27.1 AI Forecaster | SW Intel | SW Pay (receivables data source) |
| 27.2 Global Tax | SW Intel (tax reporting) | SW Auth & Access (TaxConfig per org) |
| 27.3 Forensic Audit | SW Auth & Access | SW Intel (audit analytics) |
| 27.4 Cash-Flow Optimizer | SW Pay | SW Flow (dunning triggers) |
| 27.5 Executive Hub | SW Intel | SW Flow (alert routing) |

---

## 3. Current Baseline — What Already Exists

### 3.1 Schema Models Relevant to Phase 27

| Model | Phase Built | Status | Phase 27 Extension |
|-------|-----------|--------|-------------------|
| `IntelInsight` | Phase 24 | Active with 8 insight categories | Add `FORECAST_DEVIATION`, `TAX_LIABILITY`, `CASHFLOW_ALERT` categories |
| `AnomalyRule` | Phase 24 | 10+ deterministic rules | Add `spending_anomaly`, `revenue_runrate_drop`, `dso_spike` rules |
| `AnomalyDetectionRun` | Phase 24 | Cron-triggered | Extend with forecast deviation checks |
| `AuditLog` | Phase 7 | Append-only, indexed | Add `prevHash`, `entryHash` for chain integrity |
| `DunningSequence` / `DunningStep` / `DunningLog` | Phase 21 | Active | Add AI-scoring for escalation timing |
| `CustomerHealthSnapshot` | Phase 24 | Per-customer scoring | Add payment behavior pattern fields |
| `CashFlowSnapshot` (interface) | Phase 21 | In-memory only | Persist as `ForecastSnapshot` model |
| `PushSubscription` | Phase 25 | Web Push | Extend for Flash Report delivery |
| `EntityGroup` | Phase 26 | Multi-entity groups | Group-level forecasts and tax consolidation |
| `Organization` | Phase 1 | Full CRUD | Add `taxRegion`, `taxRegistrations` JSON |
| `ExchangeRate` | Phase 22 | Currency conversion | Multi-currency tax calculations |

### 3.2 Pages Already Built

| Route | State | Phase 27 Extension |
|-------|-------|-------------------|
| `/app/intel/dashboard` | KPI cards + charts | Embed predictive overlay (forecast bands) |
| `/app/intel/cash-flow` | Current snapshot | Add forecast timeline + optimizer recommendations |
| `/app/intel/anomalies` | Rule-based detection | Add spending anomaly drill-down |
| `/app/intel/customer-health` | Health scores | Add payment pattern analysis |
| `/app/intel/reports/*` | Receivables, invoices, salary, vouchers, operations | Add tax liability report |
| `/app/intel/gst-reports` | GSTR-1/3B export | Extend to multi-region tax reporting |
| `/app/intel/collections` | Collections dashboard | Add "best time to collect" recommendations |
| `/app/pay/dunning` | Dunning sequences | Add AI escalation timing overlay |
| `/app/settings/security` | 2FA, SSO | Add audit chain status indicator |

### 3.3 Libraries That Phase 27 Extends

| Library | Path | Phase 27 Extension |
|---------|------|-------------------|
| `cash-flow.ts` | `src/lib/cash-flow.ts` | New `ForecastEngine` with moving averages + regression |
| `anomalies.ts` | `src/lib/intel/anomalies.ts` | Spending anomaly rules with statistical baselines |
| `insights.ts` | `src/lib/intel/insights.ts` | Forecast-generated insights with narrative |
| `customer-health.ts` | `src/lib/intel/customer-health.ts` | Payment behavior pattern extraction |
| `dunning.ts` | `src/lib/dunning.ts` | AI-scored escalation timing |
| `audit.ts` | `src/lib/audit.ts` | Hash-chaining, export packaging |
| `gst/compute.ts` | `src/lib/gst/compute.ts` | Abstract into pluggable tax compute interface |
| `collections-intelligence.ts` | `src/lib/pay/collections-intelligence.ts` | "Best time to collect" recommendations |

---

## 4. Phase 27 Objectives and Non-Goals

### 4.1 Objectives

1. **Predictive cash-flow forecasting** — Generate reliable 30/60/90-day forward projections from historical invoice/payment/bill data using deterministic statistical methods (exponential moving average, simple linear regression). Surface forecasts in the dashboard with confidence bands and highlight deviations as `IntelInsight` alerts.

2. **Multi-region tax abstraction** — Build a `TaxConfig` model and pluggable tax engine that supports Indian GST (existing), UK/EU VAT (reverse charge, zero-rate, reduced-rate), US Sales Tax (nexus + jurisdiction), and international GST (AU/NZ/SG). Generate automated tax liability estimates per period.

3. **Forensic audit chain** — Upgrade `AuditLog` entries with SHA-256 hash chaining so any tampering is detectable by verifying the chain. Build an `AuditPackage` export (ZIP with JSON logs + integrity manifest) for regulatory audits. Add advanced search (by actor, entity, date range, action type).

4. **Intelligent cash-flow optimization** — Analyze bill payment timing to maximize early-payment discount capture while maintaining a target liquidity buffer. Auto-escalate dunning sequences based on customer payment behavior scoring. Generate "Flash Alerts" when cash position deviates from forecast.

5. **Executive intelligence hub** — Build a mobile-first dashboard with 8 core KPIs. Deliver scheduled "Flash Reports" via Web Push, Email digest (HTML), and WhatsApp Business API (template messages). All KPIs are clickable drill-downs.

### 4.2 Non-Goals (Explicitly Out of Scope)

- **Machine Learning model training** — No custom ML model training, fine-tuning, or GPU compute. All "AI" features use deterministic statistics (moving averages, regression) or pre-trained LLM APIs for narrative generation only.
- **Real-time streaming analytics** — No WebSocket/SSE live dashboards. All data refreshes via cron or on-demand action.
- **Full international tax filing** — The tax engine calculates liability and generates reports. Actual filing with HMRC (UK), IRS (US), or ATO (AU) is out of scope.
- **WhatsApp message inbox** — Outbound Flash Reports only. No two-way WhatsApp conversation support.
- **Blockchain-based audit** — Hash chaining uses SHA-256 within the application database. No distributed ledger or external notarization.
- **Multi-currency forecasting** — Forecasts are computed in the organization's base currency. FX-adjusted multi-currency forecasting is deferred.
- **Custom KPI builder** — The 8 executive KPIs are fixed. A drag-and-drop KPI designer is deferred.
- **XBRL/iXBRL reporting** — Structured regulatory reporting formats are deferred.
- **Mobile native app** — The Executive Hub is responsive web, not a React Native or Flutter app.

---

## 5. Operating Principles

### 5.1 Deterministic first, LLM-assisted second

Every forecast, anomaly, and recommendation must be explainable by a deterministic algorithm (moving average, regression line, threshold comparison). LLM-powered narratives ("Here's what this means for your business") are additive layer-on-top only and never the sole basis for a CRITICAL-severity alert. If the LLM is unavailable, the system still functions — it just shows numbers without prose.

### 5.2 Tax engines are pluggable, not polymorphic

Each tax region (IN-GST, UK-VAT, US-SALES-TAX, AU-GST, NZ-GST, SG-GST) has its own `TaxRegionEngine` implementation with explicit switch-case routing, not a class hierarchy. This is simpler to audit, test, and debug. Adding a new region means adding one file and one switch case — not touching an inheritance tree.

### 5.3 Hash chains are append-only and gap-detectable

The `AuditChainEntry` model's `prevHash` creates a Merkle-style chain. If any entry is deleted or modified, the chain breaks. A nightly cron verifies chain integrity per organization and creates a `CRITICAL` `IntelInsight` on any break. The chain is per-organization, not global — this prevents cross-tenant data leakage in integrity proofs.

### 5.4 Cash-flow optimization is advisory, not autonomous

The system recommends "pay this bill by Tuesday to capture 2% discount" but does not auto-initiate payments. The dunning escalation recommends "escalate Customer X to step 3" but the actual escalation still goes through the existing `DunningSequence` workflow. Humans remain in the loop for financial actions.

### 5.5 Flash Reports are idempotent and rate-limited

A scheduled Flash Report that fails delivery is retried (max 3 attempts). Successful delivery is recorded with a delivery ID. A second trigger for the same report period is a no-op if delivery was already successful. Rate limit: max 1 Flash Report per channel per org per hour.

### 5.6 The Executive Hub is read-derived, not a separate write path

Every KPI in the Executive Hub is computed from existing data sources (invoices, bills, payroll, bank transactions, journal entries). The Hub does not maintain its own data store beyond `ForecastSnapshot` (which is a cache of computed forecasts). If the Hub is deleted, no business data is lost.

---

## 6. Sprint 27.1 — AI Financial Forecaster & Predictive P&L

### 6.1 Objective

Build a forecasting engine that uses 6-12 months of historical financial data to project cash inflows, outflows, and net position for the next 30, 60, and 90 days. Surface forecasts in the dashboard, detect anomalies in spending patterns, and compute revenue run-rate projections.

### 6.2 Scope

#### A. Forecast Engine (`src/lib/intel/forecast.ts`)

**Core Algorithm: Exponential Moving Average (EMA) + Simple Linear Regression (SLR)**

The engine operates on monthly aggregates extracted from existing data:

```
Inflows:
  - Invoice payments received (InvoicePayment.amount WHERE status = VERIFIED, grouped by month)
  - Bank deposits (BankTransaction WHERE type = CREDIT, grouped by month)

Outflows:
  - Vendor bill payments (VendorBillPayment.amount, grouped by month)
  - Payroll runs (PayrollRun.totalNetPay, grouped by month)
  - Manual journal debits tagged as EXPENSE (JournalEntry WHERE type = EXPENSE, grouped by month)
```

**Step 1: Aggregation**
```
For each of the past 12 months:
  inflow[m] = sum(invoice payments) + sum(bank credits)
  outflow[m] = sum(vendor payments) + sum(payroll) + sum(expense journals)
  net[m] = inflow[m] - outflow[m]
```

**Step 2: EMA Projection**
```
EMA(t) = α × actual(t) + (1 - α) × EMA(t-1)
α = 2 / (N + 1), where N = smoothing window (default 3 months)

projected_inflow[t+1] = EMA of inflows
projected_outflow[t+1] = EMA of outflows
```

**Step 3: Linear Regression Overlay**
```
For the past 12 data points, fit y = mx + b
Use slope (m) to detect trend direction
If |m| > threshold (configurable), apply trend adjustment to EMA:
  adjusted[t+1] = EMA[t+1] + m × 1
  adjusted[t+2] = EMA[t+2] + m × 2
  adjusted[t+3] = EMA[t+3] + m × 3
```

**Step 4: Confidence Bands**
```
σ = standard deviation of residuals (actual - predicted) over training window
upper[t+n] = adjusted[t+n] + 1.96σ  (95% confidence)
lower[t+n] = adjusted[t+n] - 1.96σ
```

**Step 5: Known Commitments Override**
```
If there are scheduled payments (RecurringInvoiceRule, approved PurchaseOrders, upcoming PayrollRun):
  Add known amounts to the relevant month's projection
  Remove the EMA estimate for that category to avoid double-counting
```

**Output: `ForecastSnapshot`**

```typescript
interface ForecastResult {
  generatedAt: Date;
  orgId: string;
  baseCurrency: string;
  historicalMonths: MonthlyAggregate[];
  projections: ForecastMonth[];    // 3 entries (30/60/90 days)
  revenueRunRate: RunRateMetrics;
  anomalies: SpendingAnomaly[];
}

interface ForecastMonth {
  month: string;                   // "2026-05"
  projectedInflow: number;
  projectedOutflow: number;
  projectedNet: number;
  confidenceUpper: number;
  confidenceLower: number;
  knownCommitments: number;        // Override from scheduled items
  isOverridden: boolean;
}

interface RunRateMetrics {
  trailingMRR: number;             // Average monthly recurring revenue (last 3 months)
  annualizedRunRate: number;       // MRR × 12
  growthRatePct: number;           // Month-over-month growth percentage
  trend: "accelerating" | "stable" | "decelerating" | "declining";
}

interface SpendingAnomaly {
  category: string;                // "vendor_payments" | "payroll" | "expense_journals"
  month: string;
  actualAmount: number;
  expectedAmount: number;          // From EMA baseline
  deviationPct: number;
  severity: "INFO" | "MEDIUM" | "HIGH" | "CRITICAL";
}
```

#### B. Spending Anomaly Detection

**Logic:** For each expense category, if the current month's spending exceeds the EMA baseline by more than 2 standard deviations, flag as anomaly.

```
Severity mapping:
  deviation > 3σ → CRITICAL
  deviation > 2σ → HIGH
  deviation > 1.5σ → MEDIUM
  deviation > 1σ → INFO (logged but not alerted)
```

Anomalies are persisted as `IntelInsight` records with category `SPENDING_ANOMALY` and linked to the `ForecastSnapshot` that detected them.

#### C. Revenue Run-Rate Projections

**MRR Calculation:**
```
MRR = (Total recurring revenue in last 3 months) / 3
- "Recurring" = Invoices linked to a RecurringInvoiceRule
- Non-recurring (one-time) invoices are excluded from MRR but included in total revenue forecast
```

**Growth Rate:**
```
growth = (MRR_current_month - MRR_previous_month) / MRR_previous_month
trend:
  growth > 5% for 2+ consecutive months → "accelerating"
  growth between -2% and 5% → "stable"
  growth between -5% and -2% → "decelerating"
  growth < -5% → "declining"
```

#### D. Forecast Dashboard UI (`/app/intel/forecast`)

- **30/60/90 Day Projection Chart:** Area chart with EMA line, confidence bands (shaded), and actual data points for past months
- **Revenue Run-Rate Card:** MRR, ARR, growth %, trend indicator (arrow icon + color)
- **Spending Anomaly Feed:** List of flagged anomalies with category, deviation %, and drill-down to underlying transactions
- **Forecast vs Actual:** When a forecasted month becomes actual, show variance overlay
- **Regenerate Button:** Trigger on-demand forecast refresh (plan-gated to prevent abuse)

#### E. Forecast Persistence

Forecasts are stored in `ForecastSnapshot` to enable historical comparison (were our forecasts accurate?). A nightly cron generates fresh forecasts. Users can also trigger on-demand via the dashboard.

**Forecast Accuracy Tracking:**
```
When month M becomes actual:
  accuracyPct = 1 - |actual - projected| / actual
  Store in ForecastSnapshot.actualValues JSON
```

### 6.3 Authorization

- **View forecast:** `requireRole("admin")` — forecasts contain sensitive financial projections
- **Regenerate forecast:** `requireRole("admin")` — triggers computation
- **View anomalies:** `requireRole("admin")` — anomaly details expose spending patterns
- **Plan gate:** `forecastPro` feature flag — not available on free/starter plans

### 6.4 Acceptance Criteria

1. Forecast engine produces 30/60/90-day projections from 6+ months of historical data
2. Confidence bands narrow with more historical data and widen with fewer data points
3. Known commitments (recurring invoices, approved POs, scheduled payroll) are incorporated
4. Spending anomalies > 2σ create `IntelInsight` records automatically
5. Revenue run-rate correctly excludes one-time invoices
6. Forecast accuracy is tracked retroactively when projected months become actual
7. Dashboard chart renders correctly with 0 data (empty state), partial data (< 6 months), and full data

---

## 7. Sprint 27.2 — Global Tax Engine & Multi-Region Compliance

### 7.1 Objective

Abstract the existing India-GST tax calculation logic into a pluggable multi-region tax engine. Support UK/EU VAT, US Sales Tax (nexus-based), and international GST variants (AU, NZ, SG). Enable automated tax liability estimation and multi-region tax reporting.

### 7.2 Scope

#### A. Tax Configuration Model

Each organization configures one or more tax registrations. An organization may operate in multiple tax jurisdictions (e.g., an Indian company with a UK subsidiary in the same EntityGroup).

**TaxRegion enum:**
```
IN_GST      — India Goods & Services Tax
UK_VAT      — United Kingdom Value Added Tax
EU_VAT      — European Union VAT (country-specific rates)
US_SALES    — United States Sales Tax (state/jurisdiction nexus)
AU_GST      — Australia GST
NZ_GST      — New Zealand GST
SG_GST      — Singapore GST
EXEMPT      — Tax-exempt entity
```

**TaxConfig fields:**
```
id, orgId, region (TaxRegion), registrationNumber, registrationName,
isDefault (Boolean), config (JSON — region-specific settings),
thresholdAmount (Decimal? — registration threshold),
filingFrequency (MONTHLY | QUARTERLY | ANNUAL),
isActive, createdAt, updatedAt
```

**Region-specific config JSON schemas:**

```
IN_GST: {
  gstin: string,
  placeOfSupply: string,
  compositionScheme: boolean,
  reverseChargeLiable: boolean,
  eInvoiceEnabled: boolean,
  eInvoiceThreshold: number
}

UK_VAT: {
  vatNumber: string,
  flatRateScheme: boolean,
  flatRatePct: number?,
  standardRatePct: number,   // 20%
  reducedRatePct: number,    // 5%
  zeroRatePct: number,       // 0%
  reverseChargeApplicable: boolean,
  mtdEnabled: boolean        // Making Tax Digital
}

US_SALES: {
  nexusStates: string[],     // ["CA", "NY", "TX"]
  originBased: boolean,      // true = charge seller's rate; false = buyer's rate
  taxRates: { state: string, rate: number, county?: string, city?: string }[]
}

AU_GST: {
  abn: string,               // Australian Business Number
  standardRate: number,       // 10%
  gstFreeCategories: string[]
}

NZ_GST: {
  irdNumber: string,
  standardRate: number,       // 15%
  zeroRatedCategories: string[]
}

SG_GST: {
  gstRegNumber: string,
  standardRate: number,       // 9% (from 2024)
  isRegistered: boolean
}
```

#### B. Tax Compute Engine (`src/lib/tax/engine.ts`)

**Interface:**

```typescript
interface TaxComputeInput {
  orgId: string;
  taxRegion: TaxRegion;
  lineItems: TaxLineItem[];
  customerRegion?: string;       // For cross-border transactions
  transactionDate: Date;
  transactionType: "SALE" | "PURCHASE";
  reverseCharge?: boolean;
}

interface TaxLineItem {
  description: string;
  amount: number;
  hsnSacCode?: string;          // Used for IN_GST rate lookup
  taxCategory?: string;         // "STANDARD" | "REDUCED" | "ZERO" | "EXEMPT"
  quantity: number;
  unitPrice: number;
}

interface TaxComputeResult {
  subtotal: number;
  taxBreakdown: TaxBreakdownLine[];
  totalTax: number;
  grandTotal: number;
  reverseChargeAmount: number;
  metadata: Record<string, unknown>;
}

interface TaxBreakdownLine {
  taxType: string;              // "CGST" | "SGST" | "IGST" | "VAT" | "SALES_TAX" | "GST"
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  jurisdiction?: string;        // State/county for US Sales Tax
}
```

**Engine dispatch:**

```typescript
function computeTax(input: TaxComputeInput): TaxComputeResult {
  switch (input.taxRegion) {
    case "IN_GST":  return computeIndianGst(input);
    case "UK_VAT":  return computeUkVat(input);
    case "EU_VAT":  return computeEuVat(input);
    case "US_SALES": return computeUsSalesTax(input);
    case "AU_GST":  return computeAuGst(input);
    case "NZ_GST":  return computeNzGst(input);
    case "SG_GST":  return computeSgGst(input);
    case "EXEMPT":  return exemptResult(input);
  }
}
```

**India GST compute (existing logic, refactored):**
- Intra-state: CGST (rate/2) + SGST (rate/2)
- Inter-state: IGST (full rate)
- Rates from HSN/SAC master (`HsnSacCode.gstRate`)
- Rounding: `roundMoney()` (2 decimal places, half-up)

**UK VAT compute:**
- Standard rate: 20%, Reduced: 5%, Zero-rated: 0%
- Reverse charge for B2B cross-border (EU → UK post-Brexit)
- Flat Rate Scheme: if enabled, apply flat rate % to gross turnover, not per-line
- Rounding: 2 decimal places, half-down (HMRC standard)

**US Sales Tax compute:**
- Nexus check: is the transaction in a nexus state?
- If origin-based: apply seller's state rate
- If destination-based: apply buyer's state + county + city rates (combined)
- Tax-exempt certificates: check `customer.taxExemptCertificateId`
- Rounding: state-specific (most use half-up, some use special rounding)

**AU/NZ/SG GST compute:**
- Single flat rate (AU: 10%, NZ: 15%, SG: 9%)
- GST-free/zero-rated categories excluded
- Rounding: 2 decimal places, standard half-up

#### C. Tax Liability Estimator

**Logic:** For each tax period (month/quarter), aggregate:
```
Output Tax = sum of tax collected on sales invoices
Input Tax = sum of tax paid on vendor bills (reclaimable)
Net Liability = Output Tax - Input Tax

If Net Liability > 0: amount owed to government
If Net Liability < 0: refund claimable
```

Persisted as `TaxLiabilityEstimate` records with period, region, breakdown.

#### D. Tax Reporting UI (`/app/intel/tax`)

- **Tax Configuration Page** (`/app/intel/tax/config`): CRUD for `TaxConfig` records per org
- **Tax Liability Dashboard** (`/app/intel/tax`): Period selector, region filter, output/input/net liability cards, breakdown table
- **Tax Report Export:** CSV/PDF export of liability computation with line-by-line detail
- **Multi-Entity Tax Consolidation:** If org is in an `EntityGroup`, show consolidated tax position across all entities (with entity-level drill-down)

#### E. Migration: Refactor Existing GST Compute

The existing `src/lib/gst/compute.ts` is refactored into the new `src/lib/tax/regions/in-gst.ts` module. The public API (`computeTax`) remains backward-compatible — existing callers that pass `IN_GST` region get identical results. No behavioral change for Indian GST users.

### 7.3 Authorization

- **Configure tax:** `requireRole("admin")` — tax registration is a sensitive business setting
- **View tax liability:** `requireRole("admin")` — liability amounts are confidential
- **Export tax report:** `requireRole("admin")` — regulatory data
- **Plan gate:** `globalTax` feature — free plans get only IN_GST; paid plans unlock other regions

### 7.4 Acceptance Criteria

1. `TaxConfig` supports all 7 tax regions with validated region-specific config JSON
2. Indian GST compute produces identical results to existing `src/lib/gst/compute.ts` for all test cases
3. UK VAT correctly handles standard/reduced/zero rates and flat-rate scheme
4. US Sales Tax correctly applies nexus rules and combined state+county+city rates
5. Tax Liability Estimator matches manual spreadsheet calculations within ₹1 / $0.01 / £0.01
6. Multi-entity tax consolidation correctly sums across entities within an EntityGroup
7. Existing invoice/bill creation flows work unchanged (backward compatible)
8. Tax config page validates registration numbers (GSTIN format, UK VAT format, EIN format)

---

## 8. Sprint 27.3 — Forensic Audit & Legal-Grade Logging

### 8.1 Objective

Upgrade the existing `AuditLog` into a tamper-evident forensic audit system. Each log entry is hash-chained to its predecessor, enabling detection of any insertion, deletion, or modification. Build regulatory-grade export capabilities ("Audit Packages") and advanced search.

### 8.2 Scope

#### A. Hash-Chained Audit Entries

**Upgrade `AuditLog` model with chain fields:**

```
New fields:
  sequenceNum    BigInt          — Monotonically increasing per org (gap = deletion detected)
  entryHash      String          — SHA-256 hash of this entry's canonical form
  prevHash       String          — Hash of the previous entry (first entry uses "GENESIS")
  chainId        String          — Organization chain identifier (orgId-based)
  chainStatus    ChainStatus     — VALID | BROKEN | UNVERIFIED
```

**Hash computation:**

```
canonicalForm = JSON.stringify({
  sequenceNum,
  orgId,
  actorId,
  representedId,
  proxyGrantId,
  action,
  entityType,
  entityId,
  metadata,        // Sorted keys for determinism
  createdAt,       // ISO 8601
  prevHash
})

entryHash = SHA-256(canonicalForm)
```

**Chain rules:**
1. First entry per org: `prevHash = "GENESIS"`, `sequenceNum = 1`
2. Each subsequent entry: `prevHash = previous_entry.entryHash`, `sequenceNum = prev + 1`
3. Entries are never updated or deleted (append-only)
4. `sequenceNum` gaps indicate deletion (forensic evidence)
5. `entryHash ≠ recomputed hash` indicates modification (forensic evidence)

**Implementation detail:** The hash chain is maintained in a database transaction:
```
BEGIN TRANSACTION
  SELECT MAX(sequenceNum), entryHash FROM AuditLog WHERE orgId = $orgId FOR UPDATE
  INSERT INTO AuditLog (..., sequenceNum = prev + 1, prevHash = prev.entryHash, entryHash = computed)
COMMIT
```

The `FOR UPDATE` lock prevents concurrent chain corruption.

#### B. Chain Integrity Verification

**Verification service (`src/lib/audit/chain-verifier.ts`):**

```typescript
interface ChainVerificationResult {
  orgId: string;
  totalEntries: number;
  verified: number;
  status: "INTACT" | "BROKEN" | "EMPTY";
  firstBreakAt?: {
    sequenceNum: number;
    expectedHash: string;
    actualHash: string;
    entryId: string;
  };
  gapsDetected: number[];        // Missing sequence numbers
  verifiedAt: Date;
  durationMs: number;
}
```

**Algorithm:**
```
1. Stream all AuditLog entries for orgId ordered by sequenceNum ASC
2. For each entry:
   a. Verify sequenceNum = prev + 1 (detect gaps)
   b. Verify prevHash = previous entry's entryHash (detect modifications)
   c. Recompute entryHash from canonical form (detect content tampering)
3. Return first break point (if any) and gap list
```

**Nightly cron (`/api/cron/audit-chain-verify`):** Verifies all organizations with `chainVerification: true` in settings. Creates `CRITICAL` `IntelInsight` on any chain break.

#### C. Audit Package Export

**Export format:** ZIP archive containing:
```
audit-package-{orgId}-{dateRange}/
├── manifest.json        — Package metadata, chain verification result, generated by/at
├── entries.jsonl         — One JSON object per line (JSONL for streaming parsers)
├── chain-proof.json      — First and last entry hashes, total count, verification status
├── actors.json           — Deduplicated list of actors referenced in entries
└── README.txt            — Human-readable explanation of the package format
```

**Export action:** `exportAuditPackage(orgId, dateRange, filters)` generates the ZIP as a Blob and stores it in the organization's storage bucket. Returns a signed download URL (expires in 24 hours).

#### D. Advanced Audit Search (`/app/admin/audit`)

**Search capabilities:**
- **By actor:** Filter by user ID or name
- **By action:** Filter by action type (CREATE, UPDATE, DELETE, LOGIN, APPROVE, EXPORT, etc.)
- **By entity:** Filter by entityType (Invoice, VendorBill, Employee, etc.) and entityId
- **By date range:** From/to with timezone awareness
- **By proxy:** Show only proxy-delegated actions
- **Full-text on metadata:** Search within the metadata JSON (using PostgreSQL `@>` containment or GIN index)
- **Chain status:** Filter for entries where chain status is BROKEN

**Pagination:** Cursor-based (keyset pagination on `sequenceNum`) for consistent ordering during search.

#### E. Retention Policy

**Model: `AuditRetentionPolicy`**

```
orgId, retentionMonths (default: 84 = 7 years), archiveAfterMonths (default: 24),
archiveStorage (S3 path), isActive, createdAt, updatedAt
```

- Entries older than `archiveAfterMonths` are exported to cold storage (S3 archive tier) and marked `archived: true` in the database
- Entries are never deleted before `retentionMonths` (regulatory minimum)
- Indian Companies Act requires 8-year retention; 7-year default with admin override

### 8.3 Authorization

- **View audit log:** `requireRole("admin")` — audit entries contain sensitive operation details
- **Export audit package:** `requireRole("owner")` — regulatory export is owner-only
- **Configure retention:** `requireRole("owner")` — retention policy affects compliance
- **Verify chain:** `requireRole("admin")` — can trigger on-demand verification
- **Plan gate:** `forensicAudit` feature — basic audit log available to all; chain verification + export on paid plans

### 8.4 Acceptance Criteria

1. Every new `AuditLog` entry includes a valid `entryHash` and `prevHash`
2. `sequenceNum` is monotonically increasing per org with no gaps in normal operation
3. Chain verification detects:
   a. Deleted entries (gap in `sequenceNum`)
   b. Modified entries (`entryHash` mismatch on recomputation)
   c. Reordered entries (`prevHash` mismatch)
4. Audit Package ZIP contains valid JSONL, correct chain-proof, and is downloadable
5. Advanced search returns results in < 2 seconds for organizations with up to 1M audit entries
6. Nightly chain verification cron runs within 5 minutes for organizations with up to 500K entries
7. Retention policy correctly archives and preserves entries per configured thresholds
8. Hash computation is deterministic — same input always produces same hash

---

## 9. Sprint 27.4 — Intelligent Cash-Flow Optimizer

### 9.1 Objective

Build an AI-driven advisory system that optimizes bill payment timing (maximize early-payment discounts while maintaining liquidity), automates dunning escalation based on customer payment behavior, and generates proactive cash-flow alerts.

### 9.2 Scope

#### A. Bill Payment Optimizer (`src/lib/pay/payment-optimizer.ts`)

**Input data:**
```
- All unpaid VendorBills with due dates and discount terms
- Current bank balance (from latest BankStatementImport or manual entry)
- Projected inflows from ForecastSnapshot (Sprint 27.1)
- Minimum liquidity target (configurable per org, default: 20% of monthly outflow EMA)
```

**Algorithm: Greedy Discount Capture with Liquidity Constraint**

```
1. Collect all unpaid bills with early-payment discount terms:
   - Discount percentage (e.g., 2%)
   - Discount deadline (e.g., "Net 10")
   - Full amount due
   - Discounted amount = full × (1 - discount%)

2. Sort by discount value (descending) — pay highest-value discounts first

3. For each bill in sorted order:
   a. Compute available_funds = current_balance + projected_inflows_before_due - reserved_liquidity
   b. If discounted_amount <= available_funds AND today < discount_deadline:
      → Recommend: "Pay now to save $X"
      → Deduct from available_funds
   c. Else if full_amount <= available_funds AND today < due_date:
      → Recommend: "Pay by due date"
   d. Else:
      → Recommend: "Defer — insufficient funds, consider partial payment"

4. Calculate total discount captured vs total discount available
```

**Output:**

```typescript
interface PaymentOptimizationPlan {
  generatedAt: Date;
  orgId: string;
  currentBalance: number;
  projectedInflows30d: number;
  liquidityTarget: number;
  recommendations: BillPaymentRecommendation[];
  totalDiscountCapturable: number;
  totalDiscountRecommended: number;
  discountCaptureRate: number;  // percentage
}

interface BillPaymentRecommendation {
  vendorBillId: string;
  vendorName: string;
  amountDue: number;
  discountAmount: number;
  discountDeadline: Date | null;
  dueDate: Date;
  recommendedAction: "PAY_NOW_DISCOUNT" | "PAY_BY_DUE" | "DEFER" | "PARTIAL";
  recommendedPayDate: Date;
  savingsIfFollowed: number;
  reasoning: string;
}
```

#### B. Dunning Intelligence (`src/lib/pay/dunning-intelligence.ts`)

**Enhancement to existing dunning engine:**

The current `DunningSequence` → `DunningStep` → `DunningLog` pipeline fires steps at fixed intervals. The intelligence layer adds a **customer payment behavior score** to optimize timing.

**Customer Payment Behavior Score:**

```
For each customer, compute from last 12 months:

paymentVelocity = median(days_to_pay) across all invoices
consistencyScore = 1 - (stddev(days_to_pay) / mean(days_to_pay))
responseToReminders = count(payments_within_3_days_of_reminder) / count(reminders_sent)
escalationSensitivity = count(payments_after_escalation) / count(escalations)

behaviorScore = weighted combination:
  0.3 × normalize(paymentVelocity, lower_is_better)
  0.3 × consistencyScore
  0.2 × responseToReminders
  0.2 × escalationSensitivity

Classification:
  score > 0.8 → RELIABLE (light-touch reminders)
  score 0.5-0.8 → MODERATE (standard dunning)
  score 0.2-0.5 → AT_RISK (aggressive dunning)
  score < 0.2 → CHRONIC (escalate to collections/legal)
```

**Intelligent Escalation Logic:**

```
Standard behavior (existing): fire DunningStep at fixed intervals
Intelligent behavior (new):
  - For RELIABLE customers: delay escalation by 50% (they usually pay, just slowly)
  - For MODERATE: standard intervals
  - For AT_RISK: accelerate escalation by 25%
  - For CHRONIC: immediately suggest "escalate to collections" action
  
  Additionally:
  - If customer historically responds to email but not SMS: prefer email channel
  - If customer pays faster on month-end: schedule reminders for 25th-28th
  - If customer is in an active InvoiceTicket (dispute): pause dunning
```

**Dunning score is stored in `CustomerHealthSnapshot`** (extended with new fields).

#### C. Cash-Flow Alert Engine (`src/lib/intel/cashflow-alerts.ts`)

**Flash Alert triggers:**

| Alert | Condition | Severity |
|-------|-----------|----------|
| `CASH_BELOW_TARGET` | Actual balance < liquidity target | CRITICAL |
| `FORECAST_DEVIATION` | Actual inflow < 80% of 30-day forecast | HIGH |
| `LARGE_OUTFLOW_PENDING` | Single bill > 20% of current balance due within 7 days | HIGH |
| `DISCOUNT_EXPIRING` | Vendor bill discount deadline within 48 hours, bill unpaid | MEDIUM |
| `DSO_SPIKE` | Days Sales Outstanding increased > 15% month-over-month | MEDIUM |
| `COLLECTION_STALL` | No payments received in 7+ business days (unusual for org) | MEDIUM |

Alerts are persisted as `IntelInsight` records with category `CASHFLOW_ALERT` and delivered via the Flash Report system (Sprint 27.5).

#### D. Optimizer Dashboard UI (`/app/intel/cash-flow`)

Extends the existing cash-flow page with:

- **Payment Schedule:** Timeline view of recommended payment dates, color-coded by action type
- **Discount Capture Rate:** Gauge showing % of available discounts being captured
- **Dunning Intelligence Panel:** Customer behavior classification distribution (pie chart) and per-customer score details
- **Alert Feed:** Active cash-flow alerts with acknowledge/snooze actions
- **Liquidity Target Config:** Slider to set the minimum liquidity buffer (% of monthly outflow)

### 9.3 State Machines

#### Dunning Intelligence State Machine

```
Standard Dunning Path:
  PENDING → REMINDER_1 → REMINDER_2 → ESCALATION → COLLECTIONS → WRITE_OFF

Intelligent Dunning Path:
  PENDING → [behavior_score evaluation]
    → RELIABLE: REMINDER_1 (delayed 50%) → REMINDER_2 (delayed 50%) → ESCALATION
    → MODERATE: REMINDER_1 → REMINDER_2 → ESCALATION → COLLECTIONS
    → AT_RISK: REMINDER_1 (accelerated 25%) → ESCALATION (accelerated 25%) → COLLECTIONS
    → CHRONIC: ESCALATION (immediate) → COLLECTIONS → WRITE_OFF

Pause conditions (any classification):
  - Active InvoiceTicket → PAUSED (resume on ticket resolution)
  - PaymentArrangement active → PAUSED (resume on missed installment)
  - Manual hold by admin → PAUSED
```

### 9.4 Authorization

- **View optimizer:** `requireRole("admin")` — contains bill payment strategy
- **Apply recommendation:** `requireRole("admin")` — creates payment run items
- **Configure liquidity target:** `requireRole("admin")`
- **View dunning intelligence:** `requireRole("admin")`
- **Plan gate:** `cashflowOptimizer` feature

### 9.5 Acceptance Criteria

1. Payment optimizer correctly identifies bills with capturable early-payment discounts
2. Optimizer respects liquidity target — never recommends payments that would breach the minimum
3. Discount capture rate calculation is accurate against manual verification
4. Customer behavior score correctly classifies based on 12-month payment history
5. Intelligent dunning delays/accelerates escalation per behavior classification
6. Dunning pauses when customer has active dispute ticket or payment arrangement
7. Cash-flow alerts fire correctly for all 6 trigger conditions
8. Optimizer produces valid results with 0 unpaid bills (empty state)

---

## 10. Sprint 27.5 — Executive Intel Hub (Push & Mobile)

### 10.1 Objective

Build a mobile-first executive dashboard that surfaces 8 core business KPIs with drill-down capability. Deliver scheduled "Flash Reports" via Web Push, Email digest, and WhatsApp Business API.

### 10.2 Scope

#### A. Executive KPI Engine (`src/lib/intel/executive-kpis.ts`)

**8 Core KPIs:**

| KPI | Computation | Source Data |
|-----|------------|-------------|
| **MRR** (Monthly Recurring Revenue) | Sum of recurring invoice amounts in current month | `RecurringInvoiceRule` → `Invoice` |
| **Burn Rate** | Average monthly outflow over last 3 months | `VendorBillPayment` + `PayrollRun` |
| **Runway** | Current cash balance / Burn Rate (months) | Bank balance + Burn Rate |
| **DSO** (Days Sales Outstanding) | (Accounts Receivable / Revenue) × Days in Period | `Invoice` WHERE status IN (ISSUED, OVERDUE) |
| **DPO** (Days Payable Outstanding) | (Accounts Payable / COGS) × Days in Period | `VendorBill` WHERE status IN (APPROVED, OVERDUE) |
| **Collection Rate** | Payments received / Invoices issued (amount) in period | `InvoicePayment` / `Invoice` |
| **Gross Margin** | (Revenue - COGS) / Revenue × 100 | `Invoice` revenue - `VendorBill` COGS |
| **Working Capital** | Current Assets - Current Liabilities | AR + Cash - AP - Short-term obligations |

**Computation notes:**
- All KPIs are computed on-demand with aggressive caching (5-minute TTL in Redis)
- Each KPI includes: current value, previous period value, change %, trend arrow (↑↓→)
- Period is configurable: MTD (default), QTD, YTD, Custom range

```typescript
interface ExecutiveKPI {
  key: string;
  label: string;
  currentValue: number;
  previousValue: number;
  changePct: number;
  trend: "up" | "down" | "flat";
  trendIsPositive: boolean;  // "up" is good for MRR, bad for Burn Rate
  unit: "currency" | "days" | "percentage" | "months";
  sparkline: number[];       // Last 6 data points for mini chart
  drillDownUrl: string;
}
```

#### B. Executive Dashboard UI (`/app/intel/executive`)

**Layout (mobile-first):**
```
┌──────────────────────────────┐
│  ☰ SW Intel Pro              │
│  Flash Report: Today, 9 AM   │
├──────────────────────────────┤
│ ┌────────┐  ┌────────┐      │
│ │  MRR   │  │  Burn  │      │
│ │ ₹12.4L │  │ ₹8.2L  │      │
│ │  ↑ 8%  │  │  ↓ 3%  │      │
│ └────────┘  └────────┘      │
│ ┌────────┐  ┌────────┐      │
│ │Runway  │  │  DSO   │      │
│ │ 18 mo  │  │ 34 days│      │
│ │  ↑ 2mo │  │  ↑ 2d  │      │
│ └────────┘  └────────┘      │
│ ┌────────┐  ┌────────┐      │
│ │  DPO   │  │Collect │      │
│ │ 28 days│  │  87%   │      │
│ │  → 0d  │  │  ↑ 3%  │      │
│ └────────┘  └────────┘      │
│ ┌────────┐  ┌────────┐      │
│ │Margin  │  │WorkCap │      │
│ │  42%   │  │ ₹24.5L │      │
│ │  ↑ 1%  │  │  ↑ 5%  │      │
│ └────────┘  └────────┘      │
├──────────────────────────────┤
│ 🔔 Active Alerts (3)        │
│ • Cash below target          │
│ • DSO spike (+15%)           │
│ • Discount expiring (2 bills)│
├──────────────────────────────┤
│ 📊 30-Day Forecast           │
│ [Area chart with bands]      │
└──────────────────────────────┘
```

- **Tap any KPI card** → Drill-down to detailed page (e.g., MRR → recurring invoice list, DSO → aging report)
- **Pull-to-refresh** on mobile → Triggers KPI recomputation
- **Period toggle** → MTD / QTD / YTD / Custom
- **Entity filter** → If multi-entity, filter by subsidiary or view consolidated

#### C. Flash Report System (`src/lib/intel/flash-reports.ts`)

**Flash Report = Scheduled snapshot of Executive KPIs + Active Alerts**

**Delivery channels:**

1. **Web Push** — Via existing `PushSubscription` infrastructure (Phase 25). Payload: title + top 3 KPI changes.

2. **Email Digest** — HTML email rendered via `@react-email` (existing email template system). Contains:
   - 8 KPI cards with sparklines (inline SVG)
   - Top 3 active alerts
   - 30-day forecast summary
   - "View full dashboard" CTA button

3. **WhatsApp Business API** — Template message via approved Meta Business template. Payload (plain text, per Meta policy):
   ```
   📊 Slipwise Flash Report — {OrgName}
   Date: {date}
   
   MRR: ₹{mrr} ({mrrChange})
   Burn: ₹{burn} ({burnChange})
   Runway: {runway} months
   DSO: {dso} days ({dsoChange})
   Collection Rate: {rate}%
   
   ⚠️ {alertCount} active alerts
   
   View: {dashboardUrl}
   ```

**Schedule configuration (`FlashReportSchedule`):**
```
orgId, userId (recipient), channel (PUSH | EMAIL | WHATSAPP),
schedule (DAILY_9AM | WEEKLY_MONDAY | MONTHLY_1ST | CUSTOM_CRON),
timezone, isActive, lastDeliveredAt, lastDeliveryStatus,
whatsappNumber (for WHATSAPP channel), createdAt, updatedAt
```

**Delivery flow:**
```
1. Cron fires at scheduled time for each active FlashReportSchedule
2. Compute KPIs for the org (cache hit if computed within 5 min)
3. Render payload for the channel
4. Dispatch:
   - PUSH: web-push library → PushSubscription endpoint
   - EMAIL: Resend API → recipient email
   - WHATSAPP: WhatsApp Business API → approved template message
5. Record delivery in FlashReportDelivery (status, channel, deliveredAt, error)
6. On failure: retry up to 3 times with exponential backoff (1min, 5min, 15min)
7. On 3rd failure: create IntelInsight with severity MEDIUM
```

#### D. Flash Report Configuration UI (`/app/intel/executive/settings`)

- **Channel toggles:** Enable/disable Push, Email, WhatsApp per user
- **Schedule selector:** Daily/Weekly/Monthly with time picker and timezone
- **WhatsApp number input:** With verification (send test message)
- **Preview button:** Generate and display a sample Flash Report
- **Delivery history:** Table of past deliveries with status, channel, and retry count

### 10.3 Authorization

- **View executive dashboard:** `requireRole("admin")` — KPIs contain sensitive financial data
- **Configure flash reports:** Owner of the schedule (self-service for admin+ users)
- **View delivery history:** `requireRole("admin")`
- **WhatsApp delivery:** Requires org-level WhatsApp Business API configuration in settings
- **Plan gate:** `executiveHub` feature — dashboard available on business+ plans; Flash Reports on enterprise

### 10.4 Acceptance Criteria

1. All 8 KPIs compute correctly against manual spreadsheet verification
2. KPI cards show correct trend arrows and change percentages
3. Sparklines render with 6 data points (monthly) and are visually accurate
4. Email digest renders correctly in Gmail, Outlook, and Apple Mail
5. Web Push notification displays title and top 3 KPI changes
6. WhatsApp template message is sent successfully and received
7. Flash Report delivery is idempotent — second trigger in same period is no-op
8. Delivery failures retry 3 times with correct backoff intervals
9. Dashboard is fully responsive at 375px, 768px, and 1440px viewports
10. Multi-entity filter shows consolidated and per-entity views

---

## 11. Complete Database Schema Changes

### 11.1 New Models

```prisma
// ─── Sprint 27.1: Forecast ──────────────────────────────────────────────────

model ForecastSnapshot {
  id                String   @id @default(cuid())
  orgId             String
  generatedAt       DateTime @default(now())
  baseCurrency      String   @default("INR")
  /// Smoothing factor alpha (default 0.5 for 3-month EMA)
  smoothingAlpha    Float    @default(0.5)
  /// JSON: MonthlyAggregate[] — historical data used
  historicalData    Json
  /// JSON: ForecastMonth[] — 30/60/90-day projections
  projections       Json
  /// JSON: RunRateMetrics
  revenueRunRate    Json
  /// JSON: SpendingAnomaly[]
  anomalies         Json?
  /// JSON: { [month]: { actualInflow, actualOutflow, accuracyPct } }
  actualValues      Json?
  /// Whether this was auto-generated (cron) or user-triggered
  triggerType       ForecastTrigger @default(SCHEDULED)
  createdAt         DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, generatedAt(sort: Desc)])
  @@map("forecast_snapshot")
}

enum ForecastTrigger {
  SCHEDULED
  MANUAL
}

// ─── Sprint 27.2: Global Tax ────────────────────────────────────────────────

model TaxConfig {
  id                 String    @id @default(cuid())
  orgId              String
  region             TaxRegion
  registrationNumber String
  registrationName   String?
  isDefault          Boolean   @default(false)
  /// JSON: Region-specific config (gstin, vatNumber, nexusStates, etc.)
  config             Json
  thresholdAmount    Decimal?  @db.Decimal(15, 2)
  filingFrequency    TaxFilingFrequency @default(MONTHLY)
  isActive           Boolean   @default(true)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  organization       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  liabilityEstimates TaxLiabilityEstimate[]

  @@unique([orgId, region, registrationNumber])
  @@index([orgId, isActive])
  @@map("tax_config")
}

enum TaxRegion {
  IN_GST
  UK_VAT
  EU_VAT
  US_SALES
  AU_GST
  NZ_GST
  SG_GST
  EXEMPT
}

enum TaxFilingFrequency {
  MONTHLY
  QUARTERLY
  ANNUAL
}

model TaxLiabilityEstimate {
  id              String   @id @default(cuid())
  orgId           String
  taxConfigId     String
  periodStart     DateTime
  periodEnd       DateTime
  /// JSON: TaxBreakdownLine[]
  outputTax       Json
  outputTaxTotal  Decimal  @db.Decimal(15, 2)
  /// JSON: TaxBreakdownLine[]
  inputTax        Json
  inputTaxTotal   Decimal  @db.Decimal(15, 2)
  netLiability    Decimal  @db.Decimal(15, 2)
  currency        String   @default("INR")
  generatedAt     DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  taxConfig    TaxConfig    @relation(fields: [taxConfigId], references: [id], onDelete: Cascade)

  @@index([orgId, periodStart, periodEnd])
  @@index([taxConfigId])
  @@map("tax_liability_estimate")
}

// ─── Sprint 27.3: Forensic Audit ────────────────────────────────────────────

model AuditChainVerification {
  id              String   @id @default(cuid())
  orgId           String
  totalEntries    Int
  verifiedEntries Int
  status          ChainVerificationStatus
  firstBreakSeq   BigInt?
  firstBreakHash  String?
  gapsDetected    Json?    /// JSON: number[] — missing sequence numbers
  durationMs      Int
  triggeredBy     String   @default("CRON") /// "CRON" | "MANUAL" | userId
  verifiedAt      DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, verifiedAt(sort: Desc)])
  @@map("audit_chain_verification")
}

enum ChainVerificationStatus {
  INTACT
  BROKEN
  EMPTY
}

model AuditRetentionPolicy {
  id                String   @id @default(cuid())
  orgId             String   @unique
  retentionMonths   Int      @default(84)    /// 7 years default (Indian Companies Act)
  archiveAfterMonths Int     @default(24)    /// Move to cold storage after 2 years
  archiveStoragePath String?                  /// S3 path for archived entries
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("audit_retention_policy")
}

model AuditPackageExport {
  id              String   @id @default(cuid())
  orgId           String
  dateRangeStart  DateTime
  dateRangeEnd    DateTime
  entryCount      Int
  fileSizeBytes   BigInt?
  storageKey      String?               /// S3 key for the exported ZIP
  downloadUrl     String?               /// Signed URL (expires in 24h)
  downloadExpiry  DateTime?
  exportedByUserId String  @db.Uuid
  status          AuditExportStatus @default(GENERATING)
  errorMessage    String?
  createdAt       DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, createdAt(sort: Desc)])
  @@map("audit_package_export")
}

enum AuditExportStatus {
  GENERATING
  COMPLETED
  FAILED
}

// ─── Sprint 27.4: Cash-Flow Optimizer ───────────────────────────────────────

model PaymentOptimizationRun {
  id                    String   @id @default(cuid())
  orgId                 String
  currentBalance        Decimal  @db.Decimal(15, 2)
  projectedInflows30d   Decimal  @db.Decimal(15, 2)
  liquidityTarget       Decimal  @db.Decimal(15, 2)
  totalDiscountCapturable Decimal @db.Decimal(15, 2)
  totalDiscountRecommended Decimal @db.Decimal(15, 2)
  discountCaptureRate   Float
  /// JSON: BillPaymentRecommendation[]
  recommendations       Json
  generatedAt           DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, generatedAt(sort: Desc)])
  @@map("payment_optimization_run")
}

model CashFlowAlertConfig {
  id                    String   @id @default(cuid())
  orgId                 String   @unique
  liquidityTargetPct    Float    @default(20)    /// % of monthly outflow EMA
  forecastDeviationPct  Float    @default(20)    /// Alert if actual < (100 - this)% of forecast
  largeOutflowPct       Float    @default(20)    /// Bill > this % of balance triggers alert
  discountExpiryHours   Int      @default(48)    /// Hours before discount deadline to alert
  dsoSpikePct           Float    @default(15)    /// DSO increase % to trigger alert
  collectionStallDays   Int      @default(7)     /// Business days with no payments
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("cashflow_alert_config")
}

// ─── Sprint 27.5: Executive Hub ─────────────────────────────────────────────

model FlashReportSchedule {
  id              String    @id @default(cuid())
  orgId           String
  userId          String    @db.Uuid
  channel         FlashReportChannel
  schedule        FlashReportFrequency
  /// IANA timezone (e.g. "Asia/Kolkata")
  timezone        String    @default("Asia/Kolkata")
  /// For CUSTOM_CRON, the cron expression
  customCron      String?
  /// For WHATSAPP channel
  whatsappNumber  String?
  isActive        Boolean   @default(true)
  lastDeliveredAt DateTime?
  lastDeliveryStatus FlashDeliveryStatus?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user         Profile      @relation(fields: [userId], references: [id])
  deliveries   FlashReportDelivery[]

  @@unique([orgId, userId, channel])
  @@index([isActive, schedule])
  @@map("flash_report_schedule")
}

enum FlashReportChannel {
  PUSH
  EMAIL
  WHATSAPP
}

enum FlashReportFrequency {
  DAILY_9AM
  WEEKLY_MONDAY
  MONTHLY_1ST
  CUSTOM_CRON
}

enum FlashDeliveryStatus {
  DELIVERED
  FAILED
  PENDING
}

model FlashReportDelivery {
  id              String   @id @default(cuid())
  scheduleId      String
  orgId           String
  channel         FlashReportChannel
  /// JSON: The KPI snapshot that was delivered
  payload         Json
  status          FlashDeliveryStatus @default(PENDING)
  deliveredAt     DateTime?
  errorMessage    String?
  retryCount      Int      @default(0)
  /// Idempotency key: orgId + channel + period
  idempotencyKey  String   @unique
  createdAt       DateTime @default(now())

  schedule FlashReportSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)

  @@index([orgId, createdAt(sort: Desc)])
  @@index([status, retryCount])
  @@map("flash_report_delivery")
}

model ExecutiveKpiCache {
  id          String   @id @default(cuid())
  orgId       String
  period      String               /// "MTD" | "QTD" | "YTD" | custom range key
  /// JSON: ExecutiveKPI[]
  kpis        Json
  computedAt  DateTime @default(now())
  expiresAt   DateTime

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, period])
  @@map("executive_kpi_cache")
}
```

### 11.2 Modifications to Existing Models

```prisma
// ─── AuditLog: Add chain fields ──────────────────────────────────────────────

model AuditLog {
  // ... existing fields ...

  // New chain fields (Sprint 27.3)
  sequenceNum    BigInt?              /// Monotonic per org; null for pre-chain entries
  entryHash      String?              /// SHA-256 of canonical form
  prevHash       String?              /// Hash of previous entry; "GENESIS" for first
  chainId        String?              /// "{orgId}" — identifies the chain
  archived       Boolean  @default(false)

  @@index([orgId, sequenceNum(sort: Desc)])  // New index for chain queries
}

// ─── CustomerHealthSnapshot: Add behavior fields ─────────────────────────────

model CustomerHealthSnapshot {
  // ... existing fields ...

  // New behavior scoring fields (Sprint 27.4)
  medianDaysToPay      Float?
  paymentConsistency   Float?          /// 0.0 - 1.0
  reminderResponseRate Float?          /// 0.0 - 1.0
  escalationSensitivity Float?         /// 0.0 - 1.0
  behaviorScore        Float?          /// 0.0 - 1.0 composite
  behaviorClass        String?         /// "RELIABLE" | "MODERATE" | "AT_RISK" | "CHRONIC"
}

// ─── Organization: Add tax region ────────────────────────────────────────────

model Organization {
  // ... existing fields ...

  // New fields (Sprint 27.2)
  primaryTaxRegion     String?         /// Default TaxRegion for this org
  
  // New relations
  taxConfigs           TaxConfig[]
  taxLiabilityEstimates TaxLiabilityEstimate[]
  forecastSnapshots    ForecastSnapshot[]
  auditChainVerifications AuditChainVerification[]
  auditRetentionPolicy AuditRetentionPolicy?
  auditPackageExports  AuditPackageExport[]
  paymentOptimizationRuns PaymentOptimizationRun[]
  cashFlowAlertConfig  CashFlowAlertConfig?
  flashReportSchedules FlashReportSchedule[]
  executiveKpiCache    ExecutiveKpiCache[]
}

// ─── IntelInsight: Add new categories ────────────────────────────────────────

enum IntelInsightCategory {
  // ... existing values ...
  SPENDING_ANOMALY
  FORECAST_DEVIATION
  TAX_LIABILITY
  CASHFLOW_ALERT
  AUDIT_CHAIN_BREAK
  DSO_SPIKE
  DISCOUNT_EXPIRING
  COLLECTION_STALL
}
```

### 11.3 Indexes and Performance

| Table | Index | Rationale |
|-------|-------|-----------|
| `forecast_snapshot` | `(orgId, generatedAt DESC)` | Latest forecast lookup |
| `tax_config` | `(orgId, isActive)` | Active tax configs per org |
| `tax_liability_estimate` | `(orgId, periodStart, periodEnd)` | Period-based liability lookup |
| `audit_log` | `(orgId, sequenceNum DESC)` | Chain traversal |
| `audit_chain_verification` | `(orgId, verifiedAt DESC)` | Latest verification result |
| `payment_optimization_run` | `(orgId, generatedAt DESC)` | Latest optimization |
| `flash_report_delivery` | `(status, retryCount)` | Retry queue processing |
| `flash_report_delivery` | `(orgId, createdAt DESC)` | Delivery history |
| `executive_kpi_cache` | `(orgId, period)` UNIQUE | Cache lookup |

---

## 12. State Machines

### 12.1 Forecast Lifecycle

```
IDLE → GENERATING → COMPLETED → STALE

Transitions:
  IDLE → GENERATING: Cron trigger or manual "Regenerate" action
  GENERATING → COMPLETED: Forecast computation finishes successfully
  GENERATING → FAILED: Insufficient data or computation error
  COMPLETED → STALE: When a new snapshot replaces it (auto on next generation)
```

### 12.2 Audit Package Export Lifecycle

```
GENERATING → COMPLETED
GENERATING → FAILED

Transitions:
  Button click → GENERATING: Starts async ZIP generation
  GENERATING → COMPLETED: ZIP uploaded to S3, signed URL generated
  GENERATING → FAILED: S3 upload error or data error (stores errorMessage)
```

### 12.3 Flash Report Delivery Lifecycle

```
PENDING → DELIVERED
PENDING → FAILED (with retries)

Transitions:
  Cron trigger → PENDING: Creates delivery record with idempotencyKey
  PENDING → DELIVERED: Channel confirms delivery
  PENDING → FAILED: Channel reports error
  FAILED → PENDING: Retry (if retryCount < 3)
  FAILED (retryCount >= 3) → FAILED (terminal): Creates IntelInsight
```

### 12.4 Intelligent Dunning State Machine

```
Extends existing DunningSequence with behavior-aware timing:

PENDING → SCORING → SCHEDULED → REMINDER_N → ESCALATION → COLLECTIONS → WRITE_OFF

New transitions:
  PENDING → SCORING: Compute customer behavior score
  SCORING → SCHEDULED: Apply timing adjustment based on behavior class
  Any → PAUSED: Active ticket, payment arrangement, or manual hold
  PAUSED → SCHEDULED: Trigger condition resolved
```

### 12.5 Tax Liability Estimation Lifecycle

```
PENDING → COMPUTING → ESTIMATED → FILED

Transitions:
  Period end → PENDING: New estimation period starts
  PENDING → COMPUTING: Aggregation begins
  COMPUTING → ESTIMATED: Computation completes
  ESTIMATED → FILED: Admin marks as filed (manual, since actual filing is out of scope)
```

---

## 13. Route Map

### 13.1 New Pages

| Route | Sprint | Purpose |
|-------|--------|---------|
| `/app/intel/forecast` | 27.1 | Forecast dashboard with 30/60/90-day projections |
| `/app/intel/forecast/anomalies` | 27.1 | Spending anomaly drill-down |
| `/app/intel/tax` | 27.2 | Tax liability dashboard |
| `/app/intel/tax/config` | 27.2 | Tax configuration CRUD |
| `/app/intel/tax/reports` | 27.2 | Tax report export |
| `/app/admin/audit` | 27.3 | Advanced audit search |
| `/app/admin/audit/export` | 27.3 | Audit package export management |
| `/app/admin/audit/chain` | 27.3 | Chain integrity status and verification |
| `/app/admin/audit/retention` | 27.3 | Retention policy configuration |
| `/app/intel/cash-flow/optimizer` | 27.4 | Payment optimization recommendations |
| `/app/intel/cash-flow/dunning` | 27.4 | Dunning intelligence panel |
| `/app/intel/cash-flow/alerts` | 27.4 | Cash-flow alert configuration |
| `/app/intel/executive` | 27.5 | Executive KPI dashboard (mobile-first) |
| `/app/intel/executive/settings` | 27.5 | Flash Report schedule configuration |
| `/app/intel/executive/history` | 27.5 | Flash Report delivery history |

### 13.2 Modified Pages

| Route | Sprint | Modification |
|-------|--------|-------------|
| `/app/intel/dashboard` | 27.1 | Add forecast overlay to existing charts |
| `/app/intel/cash-flow` | 27.4 | Add optimizer recommendations panel |
| `/app/intel/anomalies` | 27.1 | Add spending anomaly rules |
| `/app/intel/customer-health` | 27.4 | Add behavior score and classification |
| `/app/pay/dunning` | 27.4 | Add intelligent escalation indicators |
| `/app/settings/organization` | 27.2 | Add primary tax region selector |

---

## 14. API and Integration Surface

### 14.1 REST API Extensions (`/api/v1/intel/*`)

| Method | Endpoint | Sprint | Purpose |
|--------|----------|--------|---------|
| GET | `/api/v1/intel/forecast` | 27.1 | Latest forecast snapshot |
| POST | `/api/v1/intel/forecast/generate` | 27.1 | Trigger forecast regeneration |
| GET | `/api/v1/intel/forecast/accuracy` | 27.1 | Historical forecast accuracy |
| GET | `/api/v1/intel/tax/liability` | 27.2 | Tax liability for a period |
| GET | `/api/v1/intel/tax/config` | 27.2 | Active tax configurations |
| GET | `/api/v1/intel/audit/search` | 27.3 | Audit log search (paginated) |
| POST | `/api/v1/intel/audit/verify` | 27.3 | Trigger chain verification |
| POST | `/api/v1/intel/audit/export` | 27.3 | Request audit package export |
| GET | `/api/v1/intel/cashflow/optimize` | 27.4 | Latest optimization plan |
| GET | `/api/v1/intel/executive/kpis` | 27.5 | All 8 executive KPIs |
| GET | `/api/v1/intel/executive/kpi/:key` | 27.5 | Single KPI with drill-down data |

### 14.2 Webhook Events

| Event | Sprint | Payload |
|-------|--------|---------|
| `forecast.generated` | 27.1 | Forecast summary (projections, anomaly count) |
| `forecast.anomaly_detected` | 27.1 | Anomaly details (category, deviation, severity) |
| `tax.liability_estimated` | 27.2 | Period, region, net liability |
| `audit.chain_break_detected` | 27.3 | OrgId, break point, gap count |
| `audit.package_exported` | 27.3 | Package ID, entry count, download URL |
| `cashflow.alert_triggered` | 27.4 | Alert type, severity, value |
| `executive.flash_report_delivered` | 27.5 | Channel, KPI summary |

---

## 15. Background Jobs and Cron Routes

| Cron Route | Schedule | Sprint | Purpose |
|-----------|----------|--------|---------|
| `/api/cron/forecast-generate` | Daily 2:00 AM org-timezone | 27.1 | Generate fresh ForecastSnapshot for all orgs with forecast enabled |
| `/api/cron/forecast-accuracy` | 1st of each month, 3:00 AM | 27.1 | Backfill `actualValues` on previous month's forecasts |
| `/api/cron/tax-liability-estimate` | 1st of each month, 4:00 AM | 27.2 | Compute tax liability for previous period |
| `/api/cron/audit-chain-verify` | Daily 3:00 AM | 27.3 | Verify audit chain integrity per org |
| `/api/cron/audit-archive` | Weekly Sunday 1:00 AM | 27.3 | Archive old audit entries per retention policy |
| `/api/cron/payment-optimize` | Daily 6:00 AM org-timezone | 27.4 | Generate payment optimization recommendations |
| `/api/cron/dunning-score` | Weekly Monday 2:00 AM | 27.4 | Recompute customer behavior scores |
| `/api/cron/cashflow-alerts` | Every 4 hours | 27.4 | Evaluate cash-flow alert conditions |
| `/api/cron/flash-reports` | Every 15 minutes | 27.5 | Dispatch pending Flash Report deliveries |

All cron routes follow the existing pattern:
- `validateCronSecret(request)` → 401 if invalid
- `crypto.randomUUID()` for jobId
- `db.jobLog` with `triggeredAt`, `completedAt`, `error` fields
- Idempotent: safe to re-run within the same period

---

## 16. Permissions, Plan Gates, and Access Rules

### 16.1 Role Requirements

| Action | Required Role | Rationale |
|--------|--------------|-----------|
| View forecast | `admin` | Financial projections are sensitive |
| Regenerate forecast | `admin` | Triggers computation resources |
| Configure tax | `admin` | Tax registration is business-critical |
| View tax liability | `admin` | Liability amounts are confidential |
| Export tax report | `admin` | Regulatory data |
| View audit log | `admin` | Audit entries contain operation details |
| Export audit package | `owner` | Regulatory export is highest privilege |
| Configure retention | `owner` | Retention affects compliance posture |
| Verify chain | `admin` | On-demand verification |
| View optimizer | `admin` | Bill payment strategy |
| Configure alerts | `admin` | Alert thresholds |
| View executive dashboard | `admin` | KPIs contain financial data |
| Configure flash reports | Self (admin+) | Users configure their own delivery |
| View all flash report history | `admin` | Cross-user delivery audit |

### 16.2 Plan Gates

| Feature | Plan Gate Key | Free | Starter | Business | Enterprise |
|---------|--------------|------|---------|----------|------------|
| Forecast (30-day only) | `forecastBasic` | ❌ | ✅ | ✅ | ✅ |
| Forecast (60/90-day + anomalies) | `forecastPro` | ❌ | ❌ | ✅ | ✅ |
| Indian GST tax engine | `taxInGst` | ✅ | ✅ | ✅ | ✅ |
| Global tax engine (VAT/Sales Tax) | `globalTax` | ❌ | ❌ | ✅ | ✅ |
| Basic audit log | `auditBasic` | ✅ | ✅ | ✅ | ✅ |
| Chain verification + export | `forensicAudit` | ❌ | ❌ | ❌ | ✅ |
| Cash-flow optimizer | `cashflowOptimizer` | ❌ | ❌ | ✅ | ✅ |
| Dunning intelligence | `dunningIntel` | ❌ | ❌ | ✅ | ✅ |
| Executive dashboard | `executiveHub` | ❌ | ❌ | ✅ | ✅ |
| Flash Reports | `flashReports` | ❌ | ❌ | ❌ | ✅ |

### 16.3 Multi-Entity Access Rules

- Forecast, tax, and KPI computations respect entity boundaries
- If a user has group-admin access (Phase 26), they can view consolidated forecasts across entities
- Subsidiary users can only see their own entity's data
- Audit chain is per-organization, not per-entity-group (preserves isolation)

---

## 17. Business Rules and Validation Logic

### 17.1 Forecasting Rules

| Rule | Logic |
|------|-------|
| Minimum data requirement | At least 3 months of historical data required; 6 months for confidence bands |
| Smoothing alpha range | 0.1 ≤ α ≤ 0.9 (configurable per org, default 0.5) |
| Known commitment override | Scheduled items override EMA only for their specific category |
| Anomaly threshold | 2σ minimum for alert; configurable per org (1σ–3σ) |
| Forecast staleness | Snapshot older than 48 hours triggers regeneration on next dashboard view |

### 17.2 Tax Computation Rules

| Rule | Logic |
|------|-------|
| Rounding: India | `roundMoney()` — 2 decimal places, half-up |
| Rounding: UK | 2 decimal places, half-down (HMRC standard) |
| Rounding: US | State-specific; default half-up |
| Rounding: AU/NZ/SG | 2 decimal places, half-up |
| Reverse charge (UK) | If supplier is non-UK and buyer is UK-registered: buyer accounts for VAT |
| Nexus (US) | No nexus = no tax obligation; nexus list maintained per org in TaxConfig |
| Composition scheme (IN) | If enabled, flat rate applies; no input tax credit |
| Registration number format | GSTIN: 15-char regex; UK VAT: GB + 9 digits; ABN: 11 digits |

### 17.3 Audit Chain Rules

| Rule | Logic |
|------|-------|
| Append-only | AuditLog entries cannot be updated or deleted via application code |
| Hash determinism | JSON.stringify with sorted keys ensures identical hash for identical data |
| Sequence continuity | sequenceNum must increment by exactly 1; gaps = evidence of deletion |
| Genesis entry | First entry per org uses prevHash = "GENESIS" |
| Concurrent safety | SELECT ... FOR UPDATE on max sequenceNum prevents race conditions |
| Retention minimum | 84 months (7 years) per Indian Companies Act; configurable upward only |

### 17.4 Optimizer Rules

| Rule | Logic |
|------|-------|
| Liquidity floor | Never recommend payments that would bring balance below target |
| Discount priority | Higher discount value (absolute $) is prioritized over higher % |
| Forecast dependency | Optimizer requires a valid ForecastSnapshot < 48 hours old |
| Dunning pause | Intelligent dunning pauses for customers with active tickets or arrangements |
| Behavior score window | Computed from last 12 months; orgs with < 3 months history get MODERATE default |

### 17.5 Flash Report Rules

| Rule | Logic |
|------|-------|
| Idempotency | `idempotencyKey = orgId + channel + period` — prevents duplicate deliveries |
| Rate limit | Max 1 delivery per channel per org per hour |
| Retry policy | 3 retries with exponential backoff (1m, 5m, 15m) |
| WhatsApp compliance | Only pre-approved Meta Business API templates; no free-form messages |
| Timezone awareness | Schedule fires relative to org timezone, not UTC |

---

## 18. Edge Cases and Acceptance Criteria

### 18.1 Forecast Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Org with 0 months of data | Show "Insufficient data" message; no forecast generated |
| Org with 1-2 months of data | Generate naive projection (last month repeated); no confidence bands |
| Org with exactly 3 months | Generate EMA forecast; wide confidence bands; disable anomaly detection |
| Extremely volatile revenue | Confidence bands widen proportionally; trend shows "decelerating" or "declining" |
| All revenue is one-time (no recurring) | MRR = 0; ARR = 0; total revenue forecast uses EMA of all invoices |
| Forecast month becomes actual | Accuracy is computed and stored in `actualValues` JSON |

### 18.2 Tax Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Cross-border B2B sale (UK) | Apply reverse charge; buyer's VAT number verified |
| US sale to non-nexus state | No tax applied; clearly documented in breakdown |
| Mixed-rate invoice (UK) | Each line item taxed at its own rate; total aggregated |
| Zero-rated vs exempt (UK) | Zero-rated: 0% VAT but reclaimable; Exempt: no VAT, not reclaimable |
| India composition scheme | Flat rate applied; no input credit; flagged in report |
| Org switches tax region | New TaxConfig created; old deactivated; historical calculations preserved |
| Multi-entity with different regions | Each entity uses its own TaxConfig; consolidated view shows per-region totals |

### 18.3 Audit Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Concurrent audit log writes | FOR UPDATE lock serializes; no duplicate sequenceNums |
| Pre-existing entries (no chain) | `sequenceNum = null` for old entries; chain starts from first new entry |
| Database restore from backup | Chain may break at restore point; verification detects and flags |
| Massive org (1M+ entries) | Verification streams entries; does not load all into memory |
| Export of 100K+ entries | Async generation; user notified when ready; signed URL for download |

### 18.4 Optimizer Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| No unpaid bills | Empty recommendation list; "All bills paid" message |
| No bills with discount terms | Skip discount optimization; show standard "pay by due date" recommendations |
| Insufficient funds for any bills | All recommendations are "DEFER"; alert: "Cash below target" |
| Customer with no payment history | Default behavior class: MODERATE |
| Active dispute + overdue invoice | Dunning paused; alert shown to admin: "Invoice #X has active dispute" |

### 18.5 Executive Hub Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| No invoices (new org) | All KPIs show ₹0 / 0 days / N/A; sparklines are flat |
| Push subscription expired | Delivery fails; marked as FAILED; no retry (user must re-subscribe) |
| WhatsApp API rate-limited | Retry with backoff; after 3 failures, create IntelInsight |
| Email bounced | Record bounce; after 3 bounces, deactivate schedule |
| Multi-entity consolidated KPIs | Sum across entities; ICT eliminated (same as consolidation engine) |

---

## 19. Test Plan

### 19.1 Sprint 27.1 — Forecast Tests (Vitest)

| # | Test Case | Type |
|---|-----------|------|
| 1 | EMA computation with 3 data points produces valid forecast | Unit |
| 2 | EMA computation with 12 data points matches manual calculation | Unit |
| 3 | Linear regression detects upward trend correctly | Unit |
| 4 | Linear regression detects downward trend correctly | Unit |
| 5 | Confidence bands widen with higher variance data | Unit |
| 6 | Known commitments override EMA for their category | Unit |
| 7 | Spending anomaly fires at > 2σ deviation | Unit |
| 8 | Spending anomaly does not fire at 1.5σ deviation | Unit |
| 9 | MRR excludes one-time invoices | Unit |
| 10 | Revenue growth trend classification (accelerating/stable/decelerating/declining) | Unit |
| 11 | Forecast with 0 data returns error result | Unit |
| 12 | Forecast with 1-2 months returns naive projection | Unit |
| 13 | Forecast accuracy tracking computes correct percentage | Unit |
| 14 | Forecast cron job is idempotent | Integration |

### 19.2 Sprint 27.2 — Tax Engine Tests (Vitest)

| # | Test Case | Type |
|---|-----------|------|
| 15 | Indian GST intra-state computes CGST + SGST correctly | Unit |
| 16 | Indian GST inter-state computes IGST correctly | Unit |
| 17 | UK VAT standard rate (20%) on single line item | Unit |
| 18 | UK VAT mixed rates (standard + reduced + zero) on multi-line invoice | Unit |
| 19 | UK VAT flat-rate scheme applies gross-level rate | Unit |
| 20 | UK VAT reverse charge for EU → UK B2B | Unit |
| 21 | US Sales Tax with nexus in CA (origin-based) | Unit |
| 22 | US Sales Tax with nexus in NY (destination-based, county+city rates) | Unit |
| 23 | US Sales Tax with no nexus returns zero tax | Unit |
| 24 | AU GST at 10% with GST-free exclusion | Unit |
| 25 | NZ GST at 15% with zero-rated categories | Unit |
| 26 | SG GST at 9% standard rate | Unit |
| 27 | EXEMPT region returns zero tax for all items | Unit |
| 28 | Rounding: UK half-down vs India half-up produce different results for .005 edge | Unit |
| 29 | Tax liability estimation for a period matches manual calculation | Unit |
| 30 | Multi-entity tax consolidation sums per-entity liabilities | Integration |
| 31 | GSTIN format validation passes valid, rejects invalid | Unit |
| 32 | UK VAT number format validation | Unit |
| 33 | Backward compatibility: existing Indian invoice tax calculation unchanged | Integration |

### 19.3 Sprint 27.3 — Forensic Audit Tests (Vitest)

| # | Test Case | Type |
|---|-----------|------|
| 34 | Hash computation is deterministic (same input → same hash) | Unit |
| 35 | Sequential entries have correct prevHash linkage | Unit |
| 36 | Genesis entry has prevHash = "GENESIS" | Unit |
| 37 | Chain verification detects deleted entry (sequence gap) | Unit |
| 38 | Chain verification detects modified entry (hash mismatch) | Unit |
| 39 | Chain verification passes for intact chain | Unit |
| 40 | Concurrent writes produce sequential sequenceNums (no duplicates) | Integration |
| 41 | Audit package export contains valid JSONL | Unit |
| 42 | Chain proof in audit package matches live verification | Unit |
| 43 | Retention policy correctly identifies entries for archival | Unit |
| 44 | Advanced search filters by actor, action, entity, date range | Integration |
| 45 | Pre-chain entries (sequenceNum = null) are excluded from verification | Unit |

### 19.4 Sprint 27.4 — Cash-Flow Optimizer Tests (Vitest)

| # | Test Case | Type |
|---|-----------|------|
| 46 | Optimizer recommends PAY_NOW_DISCOUNT for bill within discount deadline | Unit |
| 47 | Optimizer recommends DEFER when funds insufficient | Unit |
| 48 | Optimizer never recommends payment that breaches liquidity target | Unit |
| 49 | Discount priority is by absolute value, not percentage | Unit |
| 50 | Customer behavior score computation with 12 months data | Unit |
| 51 | Behavior score defaults to MODERATE for < 3 months history | Unit |
| 52 | Intelligent dunning delays RELIABLE customer escalation by 50% | Unit |
| 53 | Intelligent dunning accelerates AT_RISK customer escalation by 25% | Unit |
| 54 | Dunning pauses when customer has active ticket | Integration |
| 55 | Cash-flow alert fires for CASH_BELOW_TARGET condition | Unit |
| 56 | Cash-flow alert fires for FORECAST_DEVIATION condition | Unit |
| 57 | Cash-flow alert fires for DISCOUNT_EXPIRING condition | Unit |
| 58 | Optimizer produces empty result with no unpaid bills | Unit |

### 19.5 Sprint 27.5 — Executive Hub Tests (Vitest + Playwright)

| # | Test Case | Type |
|---|-----------|------|
| 59 | MRR computation correctly excludes one-time invoices | Unit |
| 60 | Burn rate averages last 3 months of outflows | Unit |
| 61 | Runway = balance / burn rate (months) | Unit |
| 62 | DSO computation matches formula: (AR / Revenue) × Days | Unit |
| 63 | DPO computation matches formula: (AP / COGS) × Days | Unit |
| 64 | Collection rate = received / issued (amounts) | Unit |
| 65 | Gross margin = (Revenue - COGS) / Revenue × 100 | Unit |
| 66 | Working capital = Current Assets - Current Liabilities | Unit |
| 67 | KPI sparklines contain 6 data points | Unit |
| 68 | Flash report idempotency prevents duplicate delivery | Integration |
| 69 | Flash report retry fires 3 times with exponential backoff | Integration |
| 70 | Email digest renders valid HTML | Unit |
| 71 | Executive dashboard is responsive at 375px viewport | E2E (Playwright) |
| 72 | KPI card tap navigates to drill-down page | E2E (Playwright) |
| 73 | Flash report settings page saves schedule correctly | E2E (Playwright) |

---

## 20. Non-Functional Requirements

### 20.1 Performance

| Requirement | Target |
|-------------|--------|
| Forecast generation (12-month history, single org) | < 5 seconds |
| Tax computation (single invoice, any region) | < 100ms |
| Audit chain verification (500K entries) | < 5 minutes |
| Audit search (1M entries, filtered) | < 2 seconds |
| Executive KPI computation (all 8 KPIs) | < 3 seconds |
| Flash report dispatch (single delivery) | < 2 seconds |
| Executive dashboard render (mobile) | < 1.5 seconds (LCP) |

### 20.2 Reliability

| Requirement | Target |
|-------------|--------|
| Forecast cron success rate | > 99% (failures create IntelInsight) |
| Flash report delivery rate | > 95% (after retries) |
| Audit chain integrity | 100% for chains created after Phase 27 |
| Tax computation accuracy | ±₹1 / ±$0.01 / ±£0.01 vs manual |

### 20.3 Data Volume Targets

| Metric | Supported Scale |
|--------|----------------|
| Audit entries per org | Up to 5M entries |
| Forecast snapshots per org | Up to 1,000 (daily for ~3 years) |
| Flash report deliveries per org | Up to 10,000 (daily for ~3 years) |
| Tax configs per org | Up to 50 (multi-region, multi-subsidiary) |

---

## 21. Environment Variables and External Dependencies

### 21.1 New Environment Variables

| Variable | Sprint | Purpose |
|----------|--------|---------|
| `FORECAST_SMOOTHING_ALPHA` | 27.1 | Default EMA smoothing factor (0.5) |
| `FORECAST_MIN_MONTHS` | 27.1 | Minimum months for forecast generation (3) |
| `TAX_ENGINE_DEFAULT_REGION` | 27.2 | Default tax region for new orgs ("IN_GST") |
| `AUDIT_CHAIN_ENABLED` | 27.3 | Enable hash chaining on new audit entries (true) |
| `AUDIT_RETENTION_MIN_MONTHS` | 27.3 | Minimum retention period in months (84) |
| `WHATSAPP_BUSINESS_API_URL` | 27.5 | WhatsApp Business API base URL |
| `WHATSAPP_BUSINESS_API_TOKEN` | 27.5 | WhatsApp Business API authentication token |
| `WHATSAPP_TEMPLATE_NAMESPACE` | 27.5 | Approved template namespace for Flash Reports |
| `FLASH_REPORT_MAX_RETRIES` | 27.5 | Maximum delivery retry count (3) |

### 21.2 External Dependencies

| Dependency | Sprint | Purpose |
|-----------|--------|---------|
| `crypto` (Node.js built-in) | 27.3 | SHA-256 hash computation |
| `archiver` (npm) | 27.3 | ZIP archive generation for audit packages |
| `simple-statistics` (npm) | 27.1 | Linear regression, standard deviation, EMA |
| WhatsApp Business API | 27.5 | Flash Report delivery via WhatsApp |
| Existing: `web-push` | 27.5 | Push notification delivery (already installed) |
| Existing: Resend | 27.5 | Email digest delivery (already integrated) |
| Existing: Redis/Upstash | 27.5 | KPI cache (5-minute TTL) |

---

## 22. Security Model

### 22.1 Data Access Boundaries

| Boundary | Rule |
|----------|------|
| Forecast data | Scoped to `orgId`; multi-entity forecasts require group-admin access |
| Tax configurations | Scoped to `orgId`; registration numbers are sensitive (PII adjacent) |
| Audit entries | Scoped to `orgId`; never cross-tenant in chain verification |
| Optimizer recommendations | Scoped to `orgId`; vendor bill details visible only to admins |
| Flash Reports | Scoped to `orgId` + `userId`; delivery content is per-recipient |
| Executive KPIs | Scoped to `orgId`; cached per org, not per user |

### 22.2 PII Protection in AI/Analytics

| Data Type | Treatment |
|-----------|-----------|
| Customer names in behavior scoring | Used for computation only; not exposed in API responses or exports without admin role |
| Actor identity in audit logs | Stored as userId (UUID); resolved to name only in UI with active session |
| Tax registration numbers | Masked in UI lists (show last 4 digits); full number only in detail view for admin+ |
| WhatsApp phone numbers | Stored encrypted; shown masked in UI |
| Audit package exports | Downloaded over signed URL (24h expiry); stored encrypted at rest in S3 |

### 22.3 Forensic Integrity

| Control | Implementation |
|---------|---------------|
| Append-only audit log | Application-level constraint; no UPDATE/DELETE queries on AuditLog |
| Hash chain tamper detection | SHA-256 chaining with nightly verification cron |
| Chain break alerting | CRITICAL IntelInsight on any chain break |
| Export integrity | Audit package includes chain-proof.json for independent verification |
| Database-level protection | Consider PostgreSQL row-level security (RLS) for AuditLog table in production |

### 22.4 IDOR Prevention

Every new endpoint must include `organizationId` in its WHERE clause:

```typescript
// CORRECT: Always scope to org
const forecast = await db.forecastSnapshot.findFirst({
  where: { id: snapshotId, orgId },
});

// WRONG: Never query without org scope
const forecast = await db.forecastSnapshot.findUnique({
  where: { id: snapshotId },
});
```

This pattern is enforced across all Phase 27 queries. Multi-entity queries use `entityGroupId` with `requireGroupAdminAccess()` from Phase 26.

---

## 23. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| 1 | Forecast accuracy is low for volatile businesses | MEDIUM | Wide confidence bands + clear "this is an estimate" disclaimer; track accuracy retroactively |
| 2 | Tax computation error causes incorrect liability | HIGH | Comprehensive test suite (19 tax-specific tests); manual verification against spreadsheets; "beta" label on non-IN regions |
| 3 | Audit chain breaks due to concurrent writes | HIGH | FOR UPDATE lock in transaction; integration test for concurrent writes; nightly verification |
| 4 | WhatsApp Business API approval delays | MEDIUM | WhatsApp is optional; Push and Email work independently; degrade gracefully |
| 5 | KPI computation is expensive for large orgs | MEDIUM | Redis caching (5-min TTL); materialized views for high-volume aggregations |
| 6 | Hash chaining slows down audit log writes | LOW | SHA-256 is ~1μs per entry; the FOR UPDATE lock adds ~1ms; acceptable for audit frequency |
| 7 | Tax region config complexity confuses users | MEDIUM | Guided setup wizard; sane defaults; only show regions relevant to org's registered country |
| 8 | Flash Report spam annoys executives | LOW | Max 1 per channel per hour; user self-service disable; no data = no report |
| 9 | Payment optimizer recommends sub-optimal strategy | MEDIUM | Advisory only (human approval required); show reasoning for each recommendation |
| 10 | Dunning intelligence incorrectly classifies customer | MEDIUM | Default to MODERATE for insufficient data; admin override available; re-score weekly |

---

## 24. Branch Strategy and PR Workflow

### 24.1 Branch Hierarchy

```
master
└── feature/phase-27
    ├── feature/phase-27-sprint-27-1  → PR → feature/phase-27
    ├── feature/phase-27-sprint-27-2  → PR → feature/phase-27
    ├── feature/phase-27-sprint-27-3  → PR → feature/phase-27
    ├── feature/phase-27-sprint-27-4  → PR → feature/phase-27
    └── feature/phase-27-sprint-27-5  → PR → feature/phase-27
```

### 24.2 Rules

1. `feature/phase-27` is branched from `master` after Phase 26 merge
2. Each sprint branch is created from `feature/phase-27` (or the latest merged sprint if sequential)
3. **All sprint PRs target `feature/phase-27`**, never `master`
4. Merge to `master` only after:
   - All 5 sprint PRs are approved and merged into `feature/phase-27`
   - Pre-master audit passes (`npm run lint && npm run build && npm run test`)
   - Security review of all new endpoints confirms IDOR-safe queries
5. Sprint branches may depend on previous sprints:
   - 27.2 (Tax) can be built independently of 27.1 (Forecast)
   - 27.3 (Audit) can be built independently
   - 27.4 (Optimizer) depends on 27.1 (uses ForecastSnapshot)
   - 27.5 (Executive Hub) depends on 27.1 (uses forecast data) and 27.4 (uses optimizer data)

### 24.3 Recommended Execution Order

```
Phase 1 (parallel): Sprint 27.1 + Sprint 27.2 + Sprint 27.3
Phase 2 (sequential): Sprint 27.4 (after 27.1 merged)
Phase 3 (sequential): Sprint 27.5 (after 27.1 + 27.4 merged)
```

### 24.4 Commit Convention

Each sprint uses a single descriptive commit:
```
feat: implement AI financial forecaster and predictive P&L (27.1)
feat: implement global tax engine and multi-region compliance (27.2)
feat: implement forensic audit with SHA-256 chain integrity (27.3)
feat: implement intelligent cash-flow optimizer (27.4)
feat: implement executive intel hub with flash reports (27.5)
```

---

*End of Phase 27 PRD — SW Intel Pro: Predictive Analytics & AI Operations*
