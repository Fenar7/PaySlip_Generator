# Phase 16 PRD — Slipwise One
## Accounting Core + Bank Reconciliation + Financial Close

**Version:** 1.0  
**Date:** 2026-04-11  
**Prepared by:** Copilot Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Post Phase 15](#2-current-state-post-phase-15)
3. [Phase 16 Objectives and Non-Goals](#3-phase-16-objectives-and-non-goals)
4. [Sprint 16.1 — Accounting Foundation](#4-sprint-161--accounting-foundation)
5. [Sprint 16.2 — Banking and Reconciliation](#5-sprint-162--banking-and-reconciliation)
6. [Sprint 16.3 — Accounts Payable, Financial Close, and Finance Reports](#6-sprint-163--accounts-payable-financial-close-and-finance-reports)
7. [Database Schema Additions](#7-database-schema-additions)
8. [Route Map](#8-route-map)
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

Phase 16 turns Slipwise One from a strong document, receivables, compliance, and ecosystem platform into a true finance operations system by introducing the missing accounting backbone.

The phase adds a new finance suite, **SW Books**, with three tightly connected pillars:

1. **Accounting Foundation** — chart of accounts, journal engine, posting rules, fiscal periods, trial balance, and general ledger.
2. **Banking and Reconciliation** — bank accounts, statement imports, transaction normalization, matching engine, clearing/suspense handling, and reconciliation workbench.
3. **Accounts Payable + Financial Close** — vendor bills, payment runs, close checklists, financial statements, audit exports, and period controls.

This phase is deliberately cohesive. It does **not** attempt to add inventory, procurement, fixed assets, budgeting, or direct bank API feeds. Instead, it makes the existing Slipwise modules financially authoritative and auditable.

### Business value

| Problem today | Phase 16 outcome |
| --- | --- |
| Invoices, payments, vouchers, and salary flows are operational but not ledger-driven | Every financial event posts into a canonical double-entry system |
| No bank reconciliation or cashbook truth | Organizations can import statements, match transactions, and explain cash movement |
| Vendors exist only as master data, not a real AP workflow | Vendor bills, partial payments, and overdue payables become first-class |
| Reports are operational, not accounting statements | Trial balance, P&L, balance sheet, cash flow, and aging reports become available |
| Period close and audit readiness are manual/off-platform | Month-end close, lock controls, and audit exports become part of the product |

### Strategic outcome

By the end of Phase 16, Slipwise One should be able to support the following workflow:

1. A business issues invoices, receives payments, pays vendors, and runs payroll in existing product surfaces.
2. All of those events flow into a canonical journal/ledger model.
3. Bank statements are imported and matched against internal transactions.
4. The finance team completes period close inside the app.
5. P&L, balance sheet, cash flow, AR aging, AP aging, and tax tie-outs can be generated from the same dataset.

---

## 2. Current State Post Phase 15

Phase 15 and the follow-up remediation work delivered a broad multi-module SaaS platform with:

- document operations: invoices, vouchers, salary slips, quotes, templates, PDF tooling
- receivables and payment flows: payment links, proofs, dunning, payment arrangements, customer statements
- billing and subscriptions: Razorpay-backed plan lifecycle
- compliance and global expansion: GST, IRN/e-Way Bill, TDS, GSTR, i18n, multi-currency
- ecosystem surfaces: API v1, OAuth, webhook v2, marketplace, partner program

### What is already in the schema/product

Existing core models and surfaces Phase 16 should extend instead of bypassing:

- `Organization`
- `OrgDefaults`
- `Customer`
- `Vendor`
- `Employee`
- `Invoice`
- `InvoicePayment`
- `Voucher`
- `SalarySlip`
- `ReportSnapshot`
- `ApprovalRequest`
- `AuditLog`
- `JobLog`

### Current finance gap

Slipwise currently has strong operational records but lacks a unified accounting source of truth.

| Existing surface | Current gap |
| --- | --- |
| `Invoice` + `InvoicePayment` | payment state exists, but not full ledger posting or bank settlement accounting |
| `Voucher` | supports business documents, but not a formal journal/ledger engine |
| `Vendor` | exists as master data only; no vendor bill lifecycle, AP aging, or payment run workflow |
| `SalarySlip` | supports payroll outputs, but not payroll payable posting and payout clearing |
| `ReportSnapshot` | operational reporting exists, but not trial balance / P&L / balance sheet / cash flow |
| `OrgDefaults` | contains fiscal year and base currency data, but no accounting setup or account mapping |

### Engineering constraints from the current repo

Phase 16 must stay consistent with the working architecture:

- Next.js App Router
- server actions in `actions.ts`
- Prisma models imported from `@/generated/prisma/client`
- auth pattern: `requireOrgContext()` for reads and `requireRole("admin")` for privileged writes
- plan gates stored in `src/lib/plans/config.ts`
- cron/job pattern based on `CRON_SECRET` and `JobLog`
- action result pattern: `{ success: true, data } | { success: false, error }`

---

## 3. Phase 16 Objectives and Non-Goals

### Objectives

| # | Objective | Sprint |
| --- | --- | --- |
| O1 | Introduce a new **SW Books** suite for accounting and close workflows | 16.1 |
| O2 | Create a country-aware chart of accounts template seeded from `OrgDefaults.country` and `baseCurrency` | 16.1 |
| O3 | Add a canonical double-entry journal engine and immutable posted entries | 16.1 |
| O4 | Auto-post accounting events from invoices, invoice payments, vouchers, salary slips, GST, and TDS flows | 16.1 |
| O5 | Add fiscal periods, posting locks, and reopening controls | 16.1 |
| O6 | Provide trial balance and general ledger reports | 16.1 |
| O7 | Add bank account registry and cashbook surfaces | 16.2 |
| O8 | Support CSV-based bank statement import with saved mapping and dedupe | 16.2 |
| O9 | Introduce a reconciliation engine with suggestions, partial matching, and suspense handling | 16.2 |
| O10 | Connect existing invoice payment flows to bank settlement accounting through clearing accounts | 16.2 |
| O11 | Introduce structured vendor bills as a real AP workflow | 16.3 |
| O12 | Add payment runs and approval-ready payout operations | 16.3 |
| O13 | Add period close workspace and close checklist with blockers | 16.3 |
| O14 | Generate P&L, balance sheet, cash flow, AP aging, and AR aging from the ledger | 16.3 |
| O15 | Provide audit exports and tax tie-out reports for finance/admin teams | 16.3 |

### Non-goals

Phase 16 intentionally does **not** include:

1. inventory, stock valuation, or warehouse management
2. purchase order / goods receipt / procurement sourcing workflows
3. fixed asset register and depreciation engine
4. direct bank feeds or open-banking APIs
5. full multi-entity consolidation across separate orgs
6. budgeting, forecasting, or FP&A scenario planning
7. tax filing submission to government portals beyond report/tie-out generation

---

## 4. Sprint 16.1 — Accounting Foundation

**Goal:** Make Slipwise financially authoritative by introducing the chart of accounts, journal engine, posting service, fiscal periods, and accounting reports.

**Migration:** `20260412000001_phase16_sprint1_books_foundation`

---

### 4.1 New Suite: SW Books

Add a new suite in the main app navigation:

- `Books`
  - Overview
  - Chart of Accounts
  - Journals
  - Ledger
  - Trial Balance
  - Banks
  - Reconciliation
  - Vendor Bills
  - Payment Runs
  - Close
  - Finance Reports

This suite should become the accounting home for accountants, admins, and owners.

### 4.2 Canonical accounting rules

Phase 16 must enforce the following rules:

1. **The general ledger becomes the accounting source of truth.**
2. **Every posted financial event must create balanced debit/credit lines.**
3. **Posted journal entries are immutable.** Corrections happen via reversal or adjusting entries, never in-place edits.
4. **Draft operational records do not post.** Posting happens only on explicit accounting events such as issue, settlement, approval, payout, or close.
5. **Closed periods cannot be posted into** unless reopened through a privileged audited flow.
6. **Operational status and accounting status are separate concerns.**
7. **Bank and payment clearing are not the same thing.** External payment confirmation may hit a clearing account before final bank reconciliation.

### 4.3 Chart of Accounts

#### Required behavior

- Every org gets a default COA template on Phase 16 enablement.
- Template chosen from `OrgDefaults.country` and `baseCurrency`.
- Support top-level types:
  - Assets
  - Liabilities
  - Equity
  - Income
  - Expenses
  - Contra accounts
- Support parent-child hierarchy.
- Support system-protected accounts and user-defined accounts.
- Support manual archiving only when the account has no blocking balances/usages.

#### Mandatory system accounts

At minimum, seed these:

- accounts receivable
- accounts payable
- cash on hand
- primary bank
- payment gateway clearing
- suspense / unmatched reconciliation
- sales revenue
- service revenue
- discounts / write-offs
- GST output tax
- GST input tax
- TDS receivable / TDS payable
- payroll expense
- payroll payable
- bank charges / finance fees

#### UX surfaces

- COA tree + list toggle
- create account modal
- parent account picker
- account usage summary
- archive/disable action with safety checks
- default posting mappings in accounting settings

### 4.4 Journal Engine

#### Journal entry capabilities

- draft journal creation
- balanced line validation
- post journal action
- reverse journal action
- attachment support using existing file-attachment patterns
- filtered journal list by date, source, account, and status

#### Journal rules

- unbalanced journals are blocked
- zero-total journals are blocked
- reversing a journal creates a new linked journal entry
- posted journals cannot be edited; only draft journals can be edited

#### Journal entry states

- `DRAFT`
- `POSTED`
- `REVERSED`

### 4.5 Posting Service and Module Integrations

Introduce a single accounting posting service that maps business events to journal entries.

#### Initial posting matrix

| Event | Debit | Credit |
| --- | --- | --- |
| Invoice issued | Accounts Receivable | Revenue + output tax accounts |
| Invoice payment settled before bank rec | Clearing / gateway account | Accounts Receivable |
| Bank statement matched to receipt | Bank account | Clearing / gateway account |
| Payment proof rejected after pending staging | no posted entry | no posted entry |
| Voucher payment expense | Expense / target account | Cash or bank |
| Voucher receipt | Cash or bank | Revenue / liability / target account |
| Salary slip finalized | Payroll Expense | Payroll Payable |
| Salary payout | Payroll Payable | Bank |
| Vendor bill approved | Expense / asset + input tax | Accounts Payable |
| Vendor bill payment | Accounts Payable | Bank |
| Manual adjustment | User-selected debit account(s) | User-selected credit account(s) |

#### Module-by-module integration requirements

- **Invoices**
  - draft invoice: no journal
  - issued invoice: AR posting
  - cancel/reissue: reversal + replacement logic
- **Invoice payments**
  - operational payment rows stay in `InvoicePayment`
  - accounting service posts AR settlement into clearing or bank depending on source
- **Vouchers**
  - payment/receipt/journal/contra vouchers post according to voucher type
- **Salary slips**
  - finalization posts payroll expense and payable
  - payout clears payable
- **GST/TDS**
  - tax components must post to the correct control accounts
- **Quotes**
  - no journal entries until conversion to invoice

### 4.6 Fiscal Periods and Posting Locks

Every org needs a fiscal-period structure derived from:

- `OrgDefaults.fiscalYearStart`
- `OrgDefaults.timezone`

#### Required capabilities

- generate monthly periods for the fiscal year
- show period status
- soft lock a period
- hard lock / close a period
- reopen with privileged action + reason + audit entry

#### Access rules

- Owner/Admin can configure periods and reopen locked periods
- Accountant can post to open periods and initiate close tasks
- Manager can approve where explicitly assigned
- Viewer has read-only access to reports

### 4.7 Trial Balance and General Ledger

Phase 16.1 must ship with these reports:

- Chart of Accounts balances
- General Ledger by account and period
- Trial Balance by period
- Journal register

#### Output requirements

- on-screen table + downloadable CSV
- snapshot support through `ReportSnapshot`
- date/period/account filters
- totals that always balance for the trial balance view

---

## 5. Sprint 16.2 — Banking and Reconciliation

**Goal:** Turn imported bank activity into explainable, matched, and auditable cash movement using the new accounting foundation.

**Migration:** `20260412000002_phase16_sprint2_banking_reconciliation`

---

### 5.1 Bank Accounts and Cashbook

Add structured bank account support:

- multiple bank accounts per org
- cash and petty-cash account support
- default primary bank
- opening balance wizard
- linked GL account per bank account
- optional payment-gateway clearing accounts

#### Bank account fields

- account name
- bank name
- masked account number
- IFSC / SWIFT
- currency
- opening balance
- opening balance date
- import mapping profile
- active/inactive status

### 5.2 Statement Import

#### Supported format in Phase 16

- **CSV is mandatory**

Direct bank feeds are explicitly excluded from Phase 16.

#### Import flow

1. User selects bank account.
2. User uploads CSV statement.
3. User maps columns on first import for that bank account.
4. Importer normalizes rows into bank transactions.
5. Duplicate rows are blocked using a fingerprint strategy.
6. Reconciliation suggestions are generated automatically.

#### Import validations

- file type must be CSV
- max rows and file size must be enforced
- duplicate import checksum must be detected
- malformed date/amount rows must be reported back clearly

### 5.3 Reconciliation Engine

The reconciliation engine must consider:

- `InvoicePayment`
- vendor bill payments
- vouchers
- manual journals
- internal transfers between own bank accounts
- bank fees / charges

#### Match statuses

- `UNMATCHED`
- `SUGGESTED`
- `PARTIALLY_MATCHED`
- `MATCHED`
- `IGNORED`

#### Matching rules

- date window tolerance
- amount tolerance
- reference matching
- customer/vendor/payee string similarity
- payment source heuristics for Razorpay settlement lines

### 5.4 Clearing, Settlement, and Fees

To avoid false cash accounting:

- customer payments can initially hit a clearing account
- final bank receipt moves from clearing to bank on statement match
- Razorpay settlement fees create fee entries
- net settlements must be decomposed into:
  - gross receipt
  - gateway fee
  - bank movement

### 5.5 Exceptions and Suspense Handling

The product must support:

- unmatched bank lines parked in suspense
- split matching one bank line to multiple internal events
- partial matching
- bank transfer between own accounts
- manual write-off or reclassification via adjusting journal

### 5.6 Reconciliation Workspace

Required UI capabilities:

- import history
- bank line table
- suggested matches side panel
- confirm / reject / ignore actions
- create adjusting journal from unmatched bank line
- create vendor bill from bank debit when needed
- filter by status, date, amount, and bank account

---

## 6. Sprint 16.3 — Accounts Payable, Financial Close, and Finance Reports

**Goal:** Complete the finance workflow with structured payables, payment runs, close controls, and accounting statements.

**Migration:** `20260412000003_phase16_sprint3_ap_close_reporting`

---

### 6.1 Vendor Bills

Current `Vendor` records should become part of a full AP workflow.

#### Vendor bill capabilities

- create draft bill
- add line items with account mapping
- capture tax and due date
- attachment support
- approval flow
- partial and full payments
- overdue state

#### Vendor bill states

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `CANCELLED`

#### Important product decision

`Voucher` is **not** removed in Phase 16.

- `Voucher` remains the flexible payment/receipt/journal document surface.
- `VendorBill` becomes the structured payables workflow for due dates, aging, approvals, and payment runs.

### 6.2 Payment Runs

Add payment-run support for batching approved unpaid bills.

#### Required behavior

- select bills by due date/vendor/bank account
- create draft payment run
- optional approval before release
- generate payment references
- mark individual lines as paid / failed
- produce exportable payout file (CSV) for bank ops teams

#### Payment run states

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

### 6.3 Financial Close Workspace

The finance team needs a dedicated close center for each period.

#### Close checklist minimum items

- all journals posted
- bank reconciliation complete
- AR aging reviewed
- AP aging reviewed
- payroll posted
- GST tie-out reviewed
- TDS tie-out reviewed
- approval exceptions resolved

#### Close rules

- a period cannot close if mandatory blockers remain open
- closing a period hard-locks posting into that period
- reopening requires admin action, audit log, and reason

### 6.4 Financial Statements and Snapshots

Required reports:

- Profit & Loss
- Balance Sheet
- Cash Flow
- AR Aging
- AP Aging
- GST tie-out
- TDS tie-out

#### Report behavior

- generated from posted ledger data
- filter by month, quarter, FY, custom date range
- comparison periods
- export CSV and PDF
- save snapshots using `ReportSnapshot`

### 6.5 Audit, Approvals, and Finance Controls

Extend existing `ApprovalRequest` and `AuditLog` patterns to support:

- journal approvals where configured
- vendor bill approval
- payment-run approval
- period reopen approval
- audit event capture for every finance-critical state transition

#### Audit package export

The audit package should include:

- journal register
- trial balance
- GL detail
- AP aging
- AR aging
- list of reopened periods
- attachment index for bills/journals

---

## 7. Database Schema Additions

### 7.1 New enums

```prisma
enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
  CONTRA
}

enum NormalBalance {
  DEBIT
  CREDIT
}

enum JournalStatus {
  DRAFT
  POSTED
  REVERSED
}

enum JournalSource {
  MANUAL
  INVOICE
  INVOICE_PAYMENT
  VOUCHER
  SALARY_SLIP
  VENDOR_BILL
  VENDOR_PAYMENT
  GST
  TDS
  BANK_RECONCILIATION
  ADJUSTMENT
  OPENING_BALANCE
}

enum FiscalPeriodStatus {
  OPEN
  SOFT_LOCKED
  HARD_LOCKED
  CLOSED
}

enum BankAccountType {
  BANK
  CASH
  PETTY_CASH
  GATEWAY_CLEARING
}

enum BankImportStatus {
  UPLOADED
  PROCESSING
  PROCESSED
  FAILED
}

enum BankTxnDirection {
  CREDIT
  DEBIT
}

enum BankTxnStatus {
  UNMATCHED
  SUGGESTED
  PARTIALLY_MATCHED
  MATCHED
  IGNORED
}

enum MatchEntityType {
  INVOICE_PAYMENT
  VENDOR_BILL_PAYMENT
  VOUCHER
  JOURNAL_ENTRY
  INTERNAL_TRANSFER
  BANK_FEE
}

enum VendorBillStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentRunStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum CloseRunStatus {
  DRAFT
  IN_PROGRESS
  BLOCKED
  COMPLETED
  REOPENED
}

enum CloseTaskStatus {
  PENDING
  DONE
  BLOCKED
  WAIVED
}
```

### 7.2 New models

```prisma
model GlAccount {
  id              String        @id @default(cuid())
  orgId           String
  code            String
  name            String
  type            AccountType
  subtype         String?
  normalBalance   NormalBalance
  parentId        String?
  systemKey       String?
  isSystem        Boolean       @default(false)
  allowManualPost Boolean       @default(true)
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  parent          GlAccount?    @relation("GlAccountTree", fields: [parentId], references: [id])
  children        GlAccount[]   @relation("GlAccountTree")
  journalLines    JournalLine[]

  @@unique([orgId, code])
  @@index([orgId, type, isActive])
}

model JournalEntry {
  id                String        @id @default(cuid())
  orgId             String
  journalNumber     String
  entryDate         DateTime
  fiscalPeriodId    String
  sourceType        JournalSource
  sourceId          String?
  sourceRef         String?
  status            JournalStatus @default(DRAFT)
  memo              String?
  currency          String        @default("INR")
  exchangeRate      Float?
  totalDebit        Float         @default(0)
  totalCredit       Float         @default(0)
  createdByUserId   String?       @db.Uuid
  postedByUserId    String?       @db.Uuid
  postedAt          DateTime?
  reversalOfId      String?
  reversedById      String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  lines             JournalLine[]
  fiscalPeriod      FiscalPeriod  @relation(fields: [fiscalPeriodId], references: [id], onDelete: Cascade)
  reversalOf        JournalEntry? @relation("JournalReversal", fields: [reversalOfId], references: [id])
  reversedBy        JournalEntry? @relation("JournalReversal", fields: [reversedById], references: [id])

  @@unique([orgId, journalNumber])
  @@index([orgId, entryDate, status])
  @@index([sourceType, sourceId])
}

model JournalLine {
  id              String       @id @default(cuid())
  journalEntryId  String
  accountId       String
  description     String?
  debit           Float        @default(0)
  credit          Float        @default(0)
  entityType      String?
  entityId        String?
  customerId      String?
  vendorId        String?
  bankTxnId       String?
  createdAt       DateTime     @default(now())

  journalEntry    JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account         GlAccount    @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@index([journalEntryId])
  @@index([accountId])
  @@index([entityType, entityId])
}

model FiscalPeriod {
  id               String            @id @default(cuid())
  orgId            String
  label            String
  fiscalYear       Int
  fiscalMonth      Int
  startDate        DateTime
  endDate          DateTime
  status           FiscalPeriodStatus @default(OPEN)
  lockedAt         DateTime?
  lockedByUserId   String?           @db.Uuid
  closedAt         DateTime?
  reopenedAt       DateTime?
  reopenReason     String?
  createdAt        DateTime          @default(now())

  journalEntries   JournalEntry[]
  closeRuns        CloseRun[]

  @@unique([orgId, fiscalYear, fiscalMonth])
  @@index([orgId, status])
}

model BankAccount {
  id                 String          @id @default(cuid())
  orgId              String
  glAccountId        String
  type               BankAccountType @default(BANK)
  name               String
  bankName           String?
  maskedAccountNo    String?
  ifscOrSwift        String?
  currency           String          @default("INR")
  openingBalance     Float           @default(0)
  openingBalanceDate DateTime?
  mappingProfile     Json?
  isPrimary          Boolean         @default(false)
  isActive           Boolean         @default(true)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  bankTransactions   BankTransaction[]
  statementImports   BankStatementImport[]

  @@index([orgId, isActive])
}

model BankStatementImport {
  id               String          @id @default(cuid())
  orgId            String
  bankAccountId    String
  fileName         String
  storageKey       String
  checksum         String
  sourceFormat     String          @default("csv")
  status           BankImportStatus @default(UPLOADED)
  importedRows     Int             @default(0)
  failedRows       Int             @default(0)
  statementStart   DateTime?
  statementEnd     DateTime?
  uploadedByUserId String?         @db.Uuid
  createdAt        DateTime        @default(now())
  completedAt      DateTime?

  bankAccount      BankAccount     @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  transactions     BankTransaction[]

  @@unique([bankAccountId, checksum])
  @@index([orgId, status])
}

model BankTransaction {
  id                  String           @id @default(cuid())
  orgId               String
  bankAccountId       String
  importId            String
  txnDate             DateTime
  valueDate           DateTime?
  direction           BankTxnDirection
  amount              Float
  runningBalance      Float?
  reference           String?
  description         String
  normalizedPayee     String?
  normalizedType      String?
  fingerprint         String
  rawPayload          Json?
  status              BankTxnStatus    @default(UNMATCHED)
  createdAt           DateTime         @default(now())

  bankAccount         BankAccount      @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  import              BankStatementImport @relation(fields: [importId], references: [id], onDelete: Cascade)
  matches             BankTransactionMatch[]

  @@unique([bankAccountId, fingerprint])
  @@index([orgId, status, txnDate])
}

model BankTransactionMatch {
  id                String          @id @default(cuid())
  orgId             String
  bankTxnId         String
  entityType        MatchEntityType
  entityId          String
  matchedAmount     Float
  confidenceScore   Float?
  status            String          @default("confirmed")
  createdByUserId   String?         @db.Uuid
  confirmedAt       DateTime?
  createdAt         DateTime        @default(now())

  bankTransaction   BankTransaction @relation(fields: [bankTxnId], references: [id], onDelete: Cascade)

  @@index([bankTxnId])
  @@index([entityType, entityId])
}

model VendorBill {
  id                 String           @id @default(cuid())
  orgId              String
  vendorId           String
  billNumber         String
  billDate           DateTime
  dueDate            DateTime?
  status             VendorBillStatus @default(DRAFT)
  currency           String           @default("INR")
  exchangeRate       Float?
  subtotal           Float            @default(0)
  taxTotal           Float            @default(0)
  totalAmount        Float            @default(0)
  amountPaid         Float            @default(0)
  remainingAmount    Float            @default(0)
  note               String?
  approvedByUserId   String?          @db.Uuid
  approvedAt         DateTime?
  journalEntryId     String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  lines              VendorBillLine[]
  payments           VendorBillPayment[]

  @@unique([orgId, billNumber])
  @@index([orgId, status, dueDate])
}

model VendorBillLine {
  id              String     @id @default(cuid())
  vendorBillId    String
  accountId       String
  description     String
  quantity        Float      @default(1)
  unitAmount      Float      @default(0)
  taxRate         Float      @default(0)
  taxAmount       Float      @default(0)
  lineTotal       Float      @default(0)

  vendorBill      VendorBill @relation(fields: [vendorBillId], references: [id], onDelete: Cascade)

  @@index([vendorBillId])
}

model VendorBillPayment {
  id                String    @id @default(cuid())
  vendorBillId      String
  orgId             String
  bankAccountId     String?
  journalEntryId    String?
  amount            Float
  paidAt            DateTime  @default(now())
  method            String?
  reference         String?
  note              String?
  createdByUserId   String?   @db.Uuid
  createdAt         DateTime  @default(now())

  vendorBill        VendorBill @relation(fields: [vendorBillId], references: [id], onDelete: Cascade)

  @@index([vendorBillId])
}

model CloseRun {
  id                String         @id @default(cuid())
  orgId             String
  fiscalPeriodId    String
  status            CloseRunStatus @default(DRAFT)
  startedByUserId   String?        @db.Uuid
  approvedByUserId  String?        @db.Uuid
  startedAt         DateTime?
  completedAt       DateTime?
  reopenedAt        DateTime?
  reopenReason      String?
  createdAt         DateTime       @default(now())

  fiscalPeriod      FiscalPeriod   @relation(fields: [fiscalPeriodId], references: [id], onDelete: Cascade)
  tasks             CloseTask[]

  @@unique([orgId, fiscalPeriodId])
  @@index([orgId, status])
}

model CloseTask {
  id                String         @id @default(cuid())
  closeRunId        String
  taskKey           String
  title             String
  status            CloseTaskStatus @default(PENDING)
  assigneeId        String?        @db.Uuid
  blockerReason     String?
  completedAt       DateTime?
  createdAt         DateTime       @default(now())

  closeRun          CloseRun       @relation(fields: [closeRunId], references: [id], onDelete: Cascade)

  @@unique([closeRunId, taskKey])
  @@index([status])
}
```

### 7.3 Existing model extensions

#### `OrgDefaults`

Add:

- `coaTemplate String?`
- `defaultReceivableAccountId String?`
- `defaultPayableAccountId String?`
- `defaultBankAccountId String?`
- `booksEnabled Boolean @default(false)`

#### `Invoice`

Add:

- `postedJournalEntryId String?`
- `accountingPostedAt DateTime?`
- `revenueRecognitionStatus String?`

#### `InvoicePayment`

Add:

- `journalEntryId String?`
- `bankMatchId String?`
- `clearingAccountId String?`

#### `Voucher`

Add:

- `journalEntryId String?`
- `accountingStatus String?`
- `postedAt DateTime?`

#### `SalarySlip`

Add:

- `journalEntryId String?`
- `payoutJournalEntryId String?`

#### `Vendor`

Add:

- `defaultExpenseAccountId String?`
- `paymentTermsDays Int?`

#### `ReportSnapshot`

Allow additional `reportType` values:

- `trial_balance`
- `general_ledger`
- `profit_loss`
- `balance_sheet`
- `cash_flow`
- `ap_aging`
- `ar_aging`
- `gst_tieout`
- `tds_tieout`

#### `ApprovalRequest`

Allow additional `docType` values:

- `journal_entry`
- `vendor_bill`
- `payment_run`
- `close_run`

#### `AuditLog`

Add new finance event families:

- `books.account.created`
- `books.journal.posted`
- `books.journal.reversed`
- `books.bank.imported`
- `books.reconciliation.confirmed`
- `books.vendor_bill.approved`
- `books.payment_run.completed`
- `books.close.completed`
- `books.period.reopened`

---

## 8. Route Map

### App pages

| Path | Surface | Purpose |
| --- | --- | --- |
| `/app/books` | Overview | finance dashboard with balances, exceptions, and close status |
| `/app/books/chart-of-accounts` | Chart of Accounts | account hierarchy and configuration |
| `/app/books/journals` | Journal register | list, filter, reverse, export |
| `/app/books/journals/new` | Manual journal | create balanced journal entry |
| `/app/books/ledger` | General ledger | account drill-down |
| `/app/books/trial-balance` | Trial balance | balanced account view by period |
| `/app/books/banks` | Bank accounts | manage banks and opening balances |
| `/app/books/reconciliation` | Reconciliation workbench | imports, suggestions, manual matching |
| `/app/books/reconciliation/imports/[id]` | Import detail | imported statement rows + errors |
| `/app/books/vendor-bills` | Vendor bills list | bill workflow and aging |
| `/app/books/vendor-bills/new` | New vendor bill | bill creation |
| `/app/books/vendor-bills/[id]` | Vendor bill detail | bill, approvals, payments, ledger links |
| `/app/books/payment-runs` | Payment runs | batch payouts and approvals |
| `/app/books/close` | Close center | close checklist and blocker tracking |
| `/app/books/reports/profit-loss` | P&L report | accounting statement |
| `/app/books/reports/balance-sheet` | Balance sheet | accounting statement |
| `/app/books/reports/cash-flow` | Cash flow | indirect cash flow report |
| `/app/books/reports/ar-aging` | AR aging | receivable aging from ledger + subledger |
| `/app/books/reports/ap-aging` | AP aging | payable aging from vendor bills |
| `/app/books/settings` | Accounting settings | mappings, templates, locks, defaults |

### API routes and export endpoints

| Path | Purpose |
| --- | --- |
| `POST /api/books/bank-imports` | upload and enqueue statement import |
| `GET /api/books/bank-imports/:id/errors` | inspect failed rows |
| `GET /api/books/reconciliation/suggestions` | fetch suggestions for a bank account/import |
| `POST /api/books/reconciliation/confirm` | confirm a match |
| `POST /api/books/reconciliation/ignore` | ignore a bank transaction |
| `POST /api/books/reports/export` | CSV/PDF export for accounting reports |
| `GET /api/books/trial-balance` | API surface for report data / partner integrations |
| `GET /api/books/general-ledger` | API surface for ledger data |

### Background/cron routes

| Path | Purpose |
| --- | --- |
| `POST /api/cron/books/report-snapshots` | generate nightly snapshots |
| `POST /api/cron/books/reconciliation-suggestions` | rebuild match suggestions |
| `POST /api/cron/books/close-reminders` | remind about close tasks and overdue blockers |
| `POST /api/cron/books/vendor-aging-refresh` | refresh overdue/AP aging snapshots |

---

## 9. Background Jobs

| Job | Schedule | Purpose |
| --- | --- | --- |
| `books-report-snapshots` | Daily at 01:00 org-local time | precompute trial balance and finance statement snapshots |
| `books-reconciliation-suggestions` | On statement import completion + nightly sweep | generate/refresh auto-match suggestions |
| `books-vendor-aging-refresh` | Every 6 hours | update overdue payables state and AP aging caches |
| `books-close-reminders` | Daily at 09:00 org-local time | notify accountants/admins of open close blockers |

All jobs should use the existing cron/job-log pattern:

- validate `CRON_SECRET`
- create `JobLog`
- record success/failure
- keep retries explicit

---

## 10. Plan Gates

### New plan-limit flags

Add to `PlanLimits`:

- `accountingCore: boolean`
- `bankReconciliation: boolean`
- `vendorBills: boolean`
- `financialStatements: boolean`
- `closeWorkflow: boolean`
- `auditPackExports: boolean`
- `bankAccounts: number`
- `statementImportsPerMonth: number`
- `vendorBillsPerMonth: number`

### Proposed plan matrix

| Capability | Free | Starter | Pro | Enterprise |
| --- | --- | --- | --- | --- |
| Accounting core | ❌ | ✅ | ✅ | ✅ |
| Chart of accounts edits | ❌ | ✅ | ✅ | ✅ |
| Manual journals | ❌ | ✅ | ✅ | ✅ |
| Trial balance / GL | ❌ | ✅ | ✅ | ✅ |
| Bank accounts | 0 | 1 | 5 | Unlimited |
| Statement imports / month | 0 | 5 | 50 | Unlimited |
| Bank reconciliation | ❌ | ❌ | ✅ | ✅ |
| Vendor bills | ❌ | ✅ | ✅ | ✅ |
| Vendor bills / month | 0 | 100 | 1000 | Unlimited |
| Payment runs | ❌ | ❌ | ✅ | ✅ |
| Financial statements | ❌ | Basic | Full | Full |
| Close workflow | ❌ | ❌ | ✅ | ✅ |
| Audit package export | ❌ | ❌ | ❌ | ✅ |

### Role gating

| Role | Capabilities |
| --- | --- |
| Owner/Admin | full accounting settings, periods, bank accounts, reopen, close approval |
| Accountant | journals, reconciliation, vendor bills, reports, close execution |
| Manager | approvals where explicitly assigned |
| Viewer | read-only reports |
| Staff/HR | no books admin access by default |

---

## 11. Edge Cases and Acceptance Criteria

1. **Unbalanced journal blocked** — user cannot post if total debit != total credit.
2. **Posted journal immutable** — only reversal or adjustment entries allowed.
3. **Closed period posting blocked** — attempts fail with explicit error and audit trail.
4. **Duplicate statement import blocked** — same checksum for the same bank account cannot create duplicate transactions.
5. **Same bank line overmatched blocked** — one bank transaction cannot be matched beyond its amount.
6. **Partial match supported** — one bank line can match multiple internal entries up to the line total.
7. **Operational payment vs bank receipt distinction preserved** — payment confirmation can settle AR without pretending money already landed in bank.
8. **Razorpay settlement fee split supported** — net bank credit can be decomposed into gross settlement plus fees.
9. **Vendor bill partial payment computed correctly** — status becomes `PARTIALLY_PAID` until remaining is zero.
10. **Overpayment review path present** — vendor or customer overpayments do not silently distort balances.
11. **Reopen period audited** — reopen requires reason, actor, and audit event.
12. **Financial statements tie to ledger** — P&L, balance sheet, and cash flow derive from posted entries only.
13. **AR/AP aging aligns with source records** — aging reports must reconcile to invoice/vendor balances.
14. **Multi-currency uses stored rates** — historical postings must not change when later FX rates refresh.
15. **Close blocked by unresolved exceptions** — unmatched bank lines, pending approvals, or incomplete checklist items block final close.

---

## 12. Test Plan

### Sprint 16.1

| ID | Scenario | Expected |
| --- | --- | --- |
| TC-16-001 | Seed org accounting template from country/base currency | default accounts created correctly |
| TC-16-002 | Create custom account under parent | account appears in hierarchy and respects unique code |
| TC-16-003 | Post balanced manual journal | journal posts and lines balance |
| TC-16-004 | Attempt unbalanced manual journal | validation error returned |
| TC-16-005 | Issue invoice with GST | AR/revenue/tax journals created correctly |
| TC-16-006 | Post invoice payment before bank matching | clearing account used instead of direct bank |
| TC-16-007 | Reverse posted journal | reversal journal created and linked |
| TC-16-008 | Post into hard-locked period | blocked with clear error and audit event |

### Sprint 16.2

| ID | Scenario | Expected |
| --- | --- | --- |
| TC-16-009 | Import valid CSV statement | rows normalized and transactions created |
| TC-16-010 | Re-import same statement checksum | duplicate import blocked |
| TC-16-011 | Auto-match exact invoice receipt | suggestion generated with high confidence |
| TC-16-012 | Partial-match one bank line to two invoice payments | partial match succeeds without overmatching |
| TC-16-013 | Match Razorpay settlement with bank fees | fee split and bank movement post correctly |
| TC-16-014 | Leave line unmatched | moved to unmatched state, not forced into a wrong match |
| TC-16-015 | Internal transfer between own bank accounts | transfer recognized without double-counting income/expense |
| TC-16-016 | Ignore noisy statement line | line leaves the active suggestion queue but remains auditable |

### Sprint 16.3

| ID | Scenario | Expected |
| --- | --- | --- |
| TC-16-017 | Create and approve vendor bill | AP journal posts and bill status becomes approved |
| TC-16-018 | Pay part of a vendor bill | remaining balance and aging update correctly |
| TC-16-019 | Create payment run for multiple bills | batch created and references generated |
| TC-16-020 | Payment run approval denied | run cannot execute |
| TC-16-021 | Close period with unresolved bank exceptions | close remains blocked |
| TC-16-022 | Complete close checklist and close period | period locks successfully |
| TC-16-023 | Generate P&L / balance sheet / cash flow | statements derive from ledger totals |
| TC-16-024 | Export audit package | journals, reports, and evidence index included |

### Regression focus

Phase 16 must also preserve current behavior for:

- invoice issue/send/pay flows
- voucher creation/export
- salary slip generation
- GST and TDS calculations
- Razorpay payment-link workflows
- customer portal payment visibility

---

## 13. Non-Functional Requirements

1. **Correctness first**
   - accounting outputs must prioritize correctness over UI convenience
   - all posting services must be deterministic and idempotent
2. **Auditability**
   - all finance-critical mutations must emit audit events
   - posted journals and closed periods must be tamper-resistant
3. **Performance**
   - manual journal posting target: under 2 seconds for normal org data sizes
   - statement import target: 10,000 rows processed within 60 seconds in background
   - finance report page load target: under 5 seconds using snapshots where applicable
4. **Concurrency safety**
   - duplicate imports, webhook retries, and simultaneous posting attempts must not double-post entries
5. **Security**
   - privileged actions require org membership and role checks
   - reopen/close/payment-run approvals must never trust client-only state
6. **Localization**
   - books UI follows existing i18n patterns, but finance reports may launch English-first if labels remain consistent and translatable
7. **Traceability**
   - every posted journal must be traceable back to its source document/event

---

## 14. Environment Variables

Phase 16 should avoid new third-party provider dependencies. Reuse existing storage, auth, DB, and cron infrastructure.

### Reused existing variables

- `DATABASE_URL`
- `DIRECT_URL`
- `CRON_SECRET`
- storage-related variables already in `.env.example`

### New optional tunables

| Variable | Required | Purpose |
| --- | --- | --- |
| `BANK_IMPORT_MAX_ROWS` | Optional | guardrail for statement import row count |
| `BANK_IMPORT_MAX_FILE_SIZE_MB` | Optional | import upload size limit |
| `RECON_MATCH_DATE_WINDOW_DAYS` | Optional | auto-match date tolerance |
| `RECON_MATCH_TOLERANCE_PAISE` | Optional | amount tolerance for fuzzy matches |
| `BOOKS_SNAPSHOT_RETENTION_DAYS` | Optional | retention for generated finance snapshots |
| `CLOSE_REMINDER_HOUR_UTC` | Optional | default close-reminder schedule fallback |

---

## 15. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Accounting posting bugs create incorrect books | Critical | deterministic posting service, reversal-only corrections, deep test coverage |
| Bank statement formats vary widely | High | CSV-only Phase 16 scope, saved mapping profiles, clear row-level error reporting |
| Scope creep into full ERP | High | explicit non-goals: no inventory, procurement, fixed assets, or bank feeds |
| Performance issues on large reports | Medium | snapshot strategy and indexed journal/account tables |
| Users confuse vouchers with vendor bills | Medium | clear product positioning and UI copy; vouchers remain flexible, vendor bills are structured AP |
| Reopen/close misuse | Medium | role restrictions, required reasons, approval hooks, audit logs |
| Multi-currency accounting complexity | Medium | use existing base currency + stored historical exchange rate model, not current-rate recalculation |

---

## 16. Branch Strategy and PR Workflow

### Branch strategy

```text
master
  └── feature/phase-16-finance-backbone
        ├── feature/phase-16-sprint-16-1
        ├── feature/phase-16-sprint-16-2
        └── feature/phase-16-sprint-16-3
```

### Rules

1. Create the phase branch from updated `master`.
2. Never commit directly to `master`.
3. Sprint PRs target `feature/phase-16-finance-backbone`.
4. Final phase PR targets `master`.
5. Do not start Sprint 16.2 until Sprint 16.1 is review-ready and integrated into the phase branch.
6. Do not start Sprint 16.3 until Sprint 16.2 is review-ready and integrated into the phase branch.

### Verification before each sprint PR

- `npm run test`
- `npm run lint`
- `npm run build`

### Expected PR breakdown

- **Sprint 16.1 PR** — accounting foundation
- **Sprint 16.2 PR** — banking and reconciliation
- **Sprint 16.3 PR** — AP, close, and finance reports
- **Final Phase 16 PR** — `feature/phase-16-finance-backbone -> master`

### Definition of done for Phase 16

Phase 16 is complete when:

1. documents and payment flows post into a balanced general ledger
2. trial balance, ledger, P&L, balance sheet, and cash flow can be generated
3. bank statements can be imported and reconciled
4. vendor bills and payment runs work end to end
5. periods can be closed and reopened through controlled audited flows
6. finance teams can export audit-ready data from inside Slipwise One
