# Phase 26: Enterprise ERP & Advanced Financials

**Document Version:** 1.0
**Date:** April 2026
**Phase Sequence:** Phase 26 (follows Phase 25: SW Flow Automation Intelligence, Developer Platform & Payroll Operations)
**Branch Strategy:** `feature/phase-26` (branched from `master` after Phase 25 merge)
**Sprint Sub-branches:** `feature/phase-26-sprint-26-1` through `feature/phase-26-sprint-26-5`
**All Sprint PRs target:** `feature/phase-26` (never `master` directly)
**Merge to master:** Only after all 5 sprint PRs are approved, merged, and the pre-master audit passes

**Prepared by:** Slipwise One Engineering
**Product:** Slipwise One
**Primary suites:** SW Docs (Inventory & Procurement), SW Pay (AP/AR Consolidation), SW Intel (Compliance & Reporting), SW Auth & Access (Multi-Entity)
**Supporting suites:** SW Flow (Approval Chains, Workflow Triggers), Developer Platform (REST API Extensions)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context — Master Plan Alignment](#2-strategic-context--master-plan-alignment)
3. [Current Baseline — What Already Exists](#3-current-baseline--what-already-exists)
4. [Phase 26 Objectives and Non-Goals](#4-phase-26-objectives-and-non-goals)
5. [Operating Principles](#5-operating-principles)
6. [Sprint 26.1 — Multi-Entity Operations & Global Consolidation](#6-sprint-261--multi-entity-operations--global-consolidation)
7. [Sprint 26.2 — Item Master & Intelligent Inventory (WMS)](#7-sprint-262--item-master--intelligent-inventory-wms)
8. [Sprint 26.3 — Procurement & Accounts Payable (AP) OS](#8-sprint-263--procurement--accounts-payable-ap-os)
9. [Sprint 26.4 — Advanced Compliance & E-Invoicing v2](#9-sprint-264--advanced-compliance--e-invoicing-v2)
10. [Sprint 26.5 — Enterprise CRM & SOP Knowledge Base](#10-sprint-265--enterprise-crm--sop-knowledge-base)
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

Phase 26 transforms Slipwise One from a document-and-workflow platform into a **lightweight enterprise ERP** by delivering five foundational enterprise modules:

1. **Multi-Entity Operations** — Organizations can model holding companies, subsidiaries, and branches as an `EntityGroup` hierarchy. Every financial report (P&L, Balance Sheet, Trial Balance) can be consolidated across entities or drilled into per-entity, with automated inter-company transfer elimination.

2. **Item Master & Intelligent Inventory** — A full `InventoryItem` master with SKU/HSN/SAC linkage, multi-warehouse stock tracking with FIFO/LIFO valuation, stock adjustments, inter-warehouse transfers, and automated low-stock alerts that feed into the Phase 25 Workflow Engine.

3. **Procurement & Accounts Payable OS** — A complete Purchase Order (PO) lifecycle, Goods Receipt Note (GRN) workflow, and the industry-standard **3-Way Match** (PO vs GRN vs Vendor Bill) engine that gates payment approval. This extends the existing `VendorBill` and `PaymentRun` models from Phase 16.

4. **Advanced Compliance & E-Invoicing v2** — Real-time GSTR-2B JSON import and automated reconciliation against purchase records, plus production-ready E-Invoice (IRN/QR) and E-Way Bill generation via the NIC/IRP sandbox API. This extends the existing `GstFilingRun` infrastructure from Phase 15.

5. **Enterprise CRM & SOP Knowledge Base** — A transactional CRM that aggregates every touchpoint (invoices, payments, tickets, quotes, emails) per Customer/Vendor into a unified timeline, plus an organizational SOP Builder for internal process documentation.

### Why these five together?

After 25 phases, Slipwise One has mature document creation, payment workflows, automation, and a developer platform. But enterprise customers—the segment that drives 80% of SaaS revenue—require:

- **Multi-entity** — Any business with >1 legal entity or branch cannot use Slipwise One today without creating separate isolated organizations
- **Inventory** — Manufacturing, trading, and retail SMEs cannot operate without stock tracking tied to their invoicing and procurement
- **Procurement** — The existing Vendor Bill model has no upstream PO linkage, making AP reconciliation manual and error-prone
- **Compliance** — Indian GST law mandates IRN for businesses above the e-invoicing threshold; GSTR-2B reconciliation is a monthly pain point for every GST-registered entity
- **CRM** — Customer/vendor records exist but contain no interaction history, making relationship management opaque

Phase 26 closes these five critical enterprise gaps and positions Slipwise One for its first enterprise-tier sales motion.

---

## 2. Strategic Context — Master Plan Alignment

The Slipwise One Master PRD v1.1 explicitly identifies several capabilities as "out of scope initially" but clearly marks them as the natural enterprise evolution:

> Section 17: *"Out of scope initially: full accounting ledger, tax filing system, payroll compliance engine, payment gateway processing, advanced CRM, procurement, inventory, multi-region deployment, enterprise SSO, microservices architecture"*

Phases 14-25 have systematically activated these "initially deferred" capabilities:

| Master Plan "Out of Scope" Item | Phase Delivered | Status |
|--------------------------------|----------------|--------|
| Full accounting ledger | Phase 16 (Books & Close) | Live |
| Tax filing system (GST) | Phase 15 + Phase 20 | Live (GSTR-1/3B) |
| Payroll compliance engine | Phase 25 (Payroll) | Live (PF/ESI/TDS/PT) |
| Payment gateway | Phase 24 (Razorpay) | Live |
| Enterprise SSO | Phase 17 (SAML 2.0) | Live |
| **Advanced CRM** | **Phase 26** | This phase |
| **Procurement** | **Phase 26** | This phase |
| **Inventory** | **Phase 26** | This phase |

Phase 26 addresses the three remaining enterprise items from the Master Plan's deferred list, plus adds Multi-Entity (the most-requested enterprise feature) and deepens GST compliance (the most legally urgent).

### Suite Module Mapping

| Sprint | Primary Suite | Secondary Suite |
|--------|--------------|----------------|
| 26.1 Multi-Entity | SW Auth & Access | SW Intel (consolidation) |
| 26.2 Inventory | SW Docs | SW Pay (cost of goods) |
| 26.3 Procurement | SW Pay | SW Flow (approval triggers) |
| 26.4 Compliance | SW Intel | SW Docs (e-invoicing fields) |
| 26.5 CRM & SOP | SW Docs | SW Intel (relationship analytics) |

---

## 3. Current Baseline — What Already Exists

### 3.1 Schema Models Relevant to Phase 26

| Model | Phase Built | Status | Phase 26 Extension |
|-------|-----------|--------|-------------------|
| `Organization` | Phase 1 | Full CRUD | Add `parentOrgId`, `entityType`, `consolidationCurrency` |
| `Customer` | Phase 2 | Full CRUD | Add CRM fields: `industry`, `segment`, `lifecycleStage` |
| `Vendor` | Phase 2 | Full CRUD | Add CRM fields: `category`, `paymentTerms`, `rating` |
| `VendorBill` | Phase 16 | Full lifecycle | Add `purchaseOrderId`, `grnId` for 3-way match |
| `VendorBillLine` | Phase 16 | Line items | Add `inventoryItemId`, `receivedQty` |
| `GlAccount` | Phase 16 | Chart of Accounts | Add inventory-specific accounts |
| `GstFilingRun` | Phase 15 | GSTR-1/3B filing | Extend for GSTR-2B reconciliation |
| `GstFilingReconciliation` | Phase 15 | Basic recon | Add line-level matching |
| `Invoice` | Phase 2 | Full lifecycle | Add `irnStatus`, `eWayBillStatus` enums |
| `InvoiceLineItem` | Phase 2 | Line items | Add `inventoryItemId` for stock deduction |
| `HsnSacCode` | Phase 15 | HSN/SAC master | Shared with InventoryItem |
| `ApprovalPolicy` | Phase 25 | Multi-step chains | Add PO approval triggers |
| `WorkflowDefinition` | Phase 25 | Automation engine | Add inventory/procurement triggers |
| `PaymentRun` | Phase 16 | Vendor payment batches | Extend for PO-linked payments |

### 3.2 Pages Already Built

| Route | State | Phase 26 Extension |
|-------|-------|-------------------|
| `/app/docs/invoices` | Full CRUD + export | Add IRN generation button, inventory deduction |
| `/app/books/vendor-bills` | Full lifecycle | Link to PO, show match status |
| `/app/books/general-ledger` | Journal entries | Add consolidation view |
| `/app/books/reports` | P&L, BS, TB | Add consolidated and per-entity filters |
| `/app/intel/gst-reports` | GSTR-1/3B export | Add GSTR-2B import and reconciliation |
| `/app/settings/integrations` | Zapier/Tally hub | Add NIC/IRP E-Invoice settings |
| `/app/flow/approvals` | Approval list | PO approval integration |

### 3.3 Infrastructure That Enables Phase 26

- **General Ledger** — `GlAccount`, `JournalEntry`, `JournalLine` provide double-entry accounting. Inventory valuation and COGS entries will post through this.
- **Vendor Bills + Payment Runs** — The AP pipeline already handles bill processing and batch payments. POs and GRNs slot in upstream.
- **GST Filing Engine** — `GstFilingRun`, `GstFilingValidationIssue`, `GstFilingSubmission`, `GstFilingReconciliation` provide the filing lifecycle. GSTR-2B reconciliation extends `GstFilingReconciliation`.
- **Approval Engine** — Phase 25's `ApprovalPolicy` with multi-step chains and threshold routing supports PO approvals out of the box.
- **Workflow Automation** — Phase 25's trigger/action engine can fire on new inventory/procurement events.
- **REST API v1** — Phase 25's API layer can be extended with inventory and procurement endpoints.
- **HSN/SAC Master** — The `HsnSacCode` table (seeded with 20,000+ codes) provides tax classification for inventory items.

---

## 4. Phase 26 Objectives and Non-Goals

### 4.1 Objectives

1. **Multi-Entity hierarchy** — Let organizations model parent-subsidiary relationships, configure entity-level settings, and generate consolidated financial statements with automated inter-company elimination.

2. **Item Master with inventory tracking** — Build a complete `InventoryItem` registry with SKU codes, HSN/SAC linkage, multi-warehouse stock levels, FIFO/LIFO valuation, stock adjustment journals, and inter-warehouse transfer workflows.

3. **Procurement lifecycle** — Implement Purchase Orders with approval gates, Goods Receipt Notes tied to POs, and the **3-Way Match** engine that validates PO vs GRN vs Vendor Bill before allowing payment.

4. **GSTR-2B reconciliation and E-Invoice v2** — Import GSTR-2B JSON returns from the GST portal, auto-match against purchase records, surface discrepancies, and generate production-ready IRN/QR codes and E-Way Bills via the NIC Sandbox API.

5. **Enterprise CRM** — Aggregate all entity interactions (invoices, payments, tickets, quotes, emails, notes) into per-customer and per-vendor timelines. Build an internal SOP wiki for business process documentation.

### 4.2 Non-Goals (Explicitly Out of Scope)

- **Manufacturing / BOM** — Bill of Materials, production planning, and work-order management are deferred.
- **Multi-region tax engines** — Only Indian GST, PF, ESI, TDS. No VAT, Sales Tax, or international compliance.
- **Real-time inventory sync** — No barcode scanner integration, RFID, or POS terminal integration.
- **Full ERP accounting** — No depreciation schedules, fixed asset registers, or statutory audit workflows.
- **AI-powered demand forecasting** — Inventory reorder suggestions based on ML are deferred.
- **Multi-currency consolidation** — Inter-entity transfers assume same-currency (INR) in this phase. Multi-currency FX elimination is deferred.
- **Production-grade IRP API** — Phase 26 integrates with the NIC **Sandbox** environment. Production IRP credentials and live filing require government registration that is handled operationally, not in code.
- **Payroll statutory filing** — PF ECR, ESI challans, TDS returns (Form 24Q) are deferred.
- **Vendor onboarding portal** — Self-service vendor registration portal is deferred.
- **Advanced SOP features** — Version control, approval workflows for SOPs, and external SOP sharing are deferred.

---

## 5. Operating Principles

### 5.1 Multi-entity isolation is a security boundary, not a UI convenience

Entity hierarchy introduces a new trust boundary. A subsidiary must never see the parent's financial data unless the parent explicitly grants consolidation access. Every query in a multi-entity context must include `entityId` filtering. The consolidation engine runs with elevated read access scoped to the entity group—never with org-level bypass.

### 5.2 Inventory is a ledger, not a counter

Every stock change must produce an immutable `StockEvent` record (analogous to a journal entry in accounting). The current stock level is a **derived value** computed from the sum of stock events, not a mutable counter. This ensures auditability and prevents phantom stock discrepancies.

### 5.3 The 3-Way Match is a financial control, not a workflow step

The PO-GRN-Vendor Bill match is not optional. If a VendorBill references a PurchaseOrder, the match engine must validate quantities and amounts before the bill can transition to `APPROVED`. Tolerance thresholds (e.g., +/-2% on amounts, +/-5% on quantities) are configurable per organization.

### 5.4 E-Invoicing is government-protocol, not Slipwise-protocol

IRN generation follows the NIC IRP API specification exactly. The request/response payloads are structured per the government's JSON schema (version 1.03). No creative interpretation. Error codes are propagated verbatim. The QR code contains the signed JWT from NIC, not a Slipwise-generated QR.

### 5.5 CRM is a timeline, not a database

The CRM does not duplicate data from invoices, tickets, or payments. It is a **unified view** that aggregates existing records by entity (Customer/Vendor) with an overlay of CRM-specific data (notes, tags, lifecycle stage, next action). The timeline is read-derived, not a separate write path.

### 5.6 SOPs are internal knowledge, not public documentation

The SOP Builder creates organization-scoped documents visible only to members. SOPs are Markdown-based, categorized, and searchable—but never exposed publicly. They are operational runbooks, not marketing content.

---

## 6. Sprint 26.1 — Multi-Entity Operations & Global Consolidation

### 6.1 Objective

Allow organizations to model a holding company structure with subsidiaries and branches. Enable consolidated financial reporting across entities while maintaining strict data isolation between entities for day-to-day operations.

### 6.2 Scope

#### A. Entity Group Hierarchy

**Data Model: `EntityGroup`**

An `EntityGroup` represents a holding company or business group that owns multiple `Organization` records (subsidiaries/branches).

```
EntityGroup
  |-- Organization A (Holding - HQ)
  |   |-- Organization B (Subsidiary - Manufacturing)
  |   +-- Organization C (Subsidiary - Retail)
  +-- Organization D (Branch - Regional Office)
```

- **EntityGroup** is created by the admin of the parent org
- Each Organization can have at most **one** `parentOrgId` (the holding org within the group)
- An Organization can belong to at most **one** EntityGroup
- The creator of the EntityGroup is automatically the `groupAdmin`
- EntityGroup has a `consolidationCurrency` (default: `INR`)

**Fields added to `Organization`:**

```prisma
model Organization {
  // ... existing fields ...
  entityGroupId         String?
  parentOrgId           String?
  entityType            EntityType    @default(STANDALONE)
  consolidationCurrency String        @default("INR")

  entityGroup EntityGroup? @relation("GroupOrgs", fields: [entityGroupId], references: [id])
  parentOrg   Organization? @relation("OrgHierarchy", fields: [parentOrgId], references: [id])
  childOrgs   Organization[] @relation("OrgHierarchy")
}

enum EntityType {
  STANDALONE
  HOLDING
  SUBSIDIARY
  BRANCH
}
```

**`EntityGroup` Model:**

```prisma
model EntityGroup {
  id                    String   @id @default(cuid())
  name                  String
  slug                  String   @unique
  consolidationCurrency String   @default("INR")
  createdByUserId       String   @db.Uuid
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  organizations Organization[] @relation("GroupOrgs")
  transfers     InterCompanyTransfer[]

  @@map("entity_group")
}
```

#### B. Entity Management UI (`/app/settings/entities`)

- **Entity Dashboard:** List all organizations in the group with their type, active status, and member count
- **Add Entity:** Create a new subsidiary/branch org within the group (inherits the group's `consolidationCurrency`)
- **Entity Settings:** Configure per-entity overrides (fiscal year, tax settings, default accounts)
- **Remove Entity:** Detach an org from the group (does not delete the org; reverts to `STANDALONE`)

**Authorization:** Only users with `admin` role in the **holding** organization can manage the entity group. Subsidiary admins can manage their own org but cannot modify the group structure.

#### C. Inter-Company Transfers

When one entity within a group transacts with another (e.g., holding company lends money to subsidiary), the system creates a paired `InterCompanyTransfer` record:

```prisma
model InterCompanyTransfer {
  id              String   @id @default(cuid())
  entityGroupId   String
  fromOrgId       String
  toOrgId         String
  amount          Decimal
  currency        String   @default("INR")
  description     String
  journalEntryId  String?  @unique
  counterEntryId  String?  @unique
  status          InterCompanyTransferStatus @default(PENDING)
  approvedByUserId String? @db.Uuid
  approvedAt       DateTime?
  createdByUserId  String  @db.Uuid
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  entityGroup  EntityGroup  @relation(fields: [entityGroupId], references: [id])
  journalEntry JournalEntry? @relation("ICTJournal", fields: [journalEntryId], references: [id])
  counterEntry JournalEntry? @relation("ICTCounterJournal", fields: [counterEntryId], references: [id])

  @@index([entityGroupId, status])
  @@index([fromOrgId])
  @@index([toOrgId])
  @@map("inter_company_transfer")
}

enum InterCompanyTransferStatus {
  PENDING
  APPROVED
  POSTED
  CANCELLED
}
```

**Mechanics:**

1. Admin creates an ICT from Org A to Org B for amount X
2. System creates a `JournalEntry` in Org A (Debit: Intercompany Receivable, Credit: Bank/Cash) and a counter `JournalEntry` in Org B (Debit: Bank/Cash, Credit: Intercompany Payable)
3. Transfer requires approval from both org admins (via Phase 25 approval chain)
4. On `POSTED`, both journal entries become immutable
5. During consolidation, these paired entries are **eliminated** (netted to zero)

#### D. Consolidated Financial Statements

**Consolidation Engine (`src/lib/books/consolidation.ts`):**

The consolidation engine produces three consolidated reports:

1. **Consolidated P&L** — Sum of all entity P&L accounts, minus inter-company revenue/expense elimination
2. **Consolidated Balance Sheet** — Sum of all entity BS accounts, minus inter-company receivable/payable elimination
3. **Consolidated Trial Balance** — Combined TB with elimination entries shown as a separate column

**Algorithm:**

```
For each entity in EntityGroup:
  1. Fetch the entity's Trial Balance for the period
  2. Add all account balances to the consolidated total
  3. Identify InterCompanyTransfer records between entities
  4. Generate elimination entries:
     - ICT Receivable vs ICT Payable -> net to zero
     - ICT Revenue vs ICT Expense -> net to zero
  5. Output: Consolidated TB + Elimination Column + Net Column
```

**UI:** New tab on `/app/books/reports` with "Consolidated" view (visible only to entity group admins). Allows drill-down by entity.

#### E. Entity-Scoped Data Access

**Critical Security Rule:** In a multi-entity setup, all queries must be scoped to the user's **active entity** (the org they are currently "in"). The entity switcher in the nav bar sets the `activeOrgId` in the session. Cross-entity reads are only permitted for:

1. Consolidation reports (holding admin only)
2. Inter-company transfer creation (both org admins)
3. Entity group management (group admin only)

All other operations (invoices, bills, payroll, etc.) remain strictly org-scoped. This is enforced at the `requireOrgContext()` layer—no code change needed in downstream routes.

### 6.3 Acceptance Criteria

1. An admin can create an EntityGroup and add up to 10 subsidiaries
2. Each subsidiary's data is completely isolated from other subsidiaries in the group
3. A holding admin can view consolidated P&L, BS, and TB across all entities
4. Inter-company transfers create paired, balanced journal entries in both entities
5. Consolidation correctly eliminates inter-company balances
6. Removing an entity from the group does not delete its data
7. Entity type changes (STANDALONE to SUBSIDIARY) are audited
8. Plan gating: `multiEntity` feature flag required (Enterprise plan only)

---

## 7. Sprint 26.2 — Item Master & Intelligent Inventory (WMS)

### 7.1 Objective

Build a complete inventory management system with an Item Master registry, multi-warehouse stock tracking, FIFO/LIFO valuation, stock adjustment workflows, and automated low-stock alerts.

### 7.2 Scope

#### A. Item Master (`/app/inventory/items`)

**Data Model: `InventoryItem`**

```prisma
model InventoryItem {
  id               String   @id @default(cuid())
  orgId            String
  sku              String
  name             String
  description      String?
  category         String?
  unit             String   @default("PCS") // PCS, KG, LTR, MTR, BOX, etc.
  hsnSacCodeId     String?
  gstRate          Float    @default(0)
  costPrice        Decimal  @default(0)
  sellingPrice     Decimal  @default(0)
  reorderLevel     Int      @default(0)
  reorderQuantity  Int      @default(0)
  valuationMethod  InventoryValuationMethod @default(FIFO)
  trackInventory   Boolean  @default(true)
  isActive         Boolean  @default(true)
  imageUrl         String?
  metadata         Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  archivedAt       DateTime?

  organization     Organization     @relation(fields: [orgId], references: [id], onDelete: Cascade)
  hsnSacCode       HsnSacCode?      @relation(fields: [hsnSacCodeId], references: [id])
  stockLevels      StockLevel[]
  stockEvents      StockEvent[]
  invoiceLineItems InvoiceLineItem[] @relation("LineItemInventory")
  purchaseOrderLines PurchaseOrderLine[]

  @@unique([orgId, sku])
  @@index([orgId, isActive])
  @@index([orgId, category])
  @@map("inventory_item")
}

enum InventoryValuationMethod {
  FIFO
  LIFO
  WEIGHTED_AVERAGE
}
```

**UI Features:**

- **Item List:** Searchable, filterable table with SKU, name, category, stock level, cost, selling price
- **Item Form:** Create/edit with HSN/SAC lookup (autocomplete from `HsnSacCode` table), unit selection, pricing, reorder configuration
- **Bulk Import:** CSV upload for batch item creation (columns: SKU, Name, Category, Unit, HSN, CostPrice, SellingPrice, ReorderLevel)
- **Item Detail:** Stock history, linked invoices, linked POs, valuation breakdown

#### B. Warehouse Management (`/app/inventory/warehouses`)

**Data Model: `Warehouse`**

```prisma
model Warehouse {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  code        String
  address     String?
  city        String?
  state       String?
  pincode     String?
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  organization Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  stockLevels  StockLevel[]
  stockEvents  StockEvent[]

  @@unique([orgId, code])
  @@index([orgId, isActive])
  @@map("warehouse")
}
```

- **Default warehouse** is auto-created when inventory module is enabled
- Maximum warehouses per plan: Free=1, Starter=2, Pro=5, Enterprise=unlimited

#### C. Stock Level (Derived Materialized View)

**Data Model: `StockLevel`**

```prisma
model StockLevel {
  id             String   @id @default(cuid())
  orgId          String
  inventoryItemId String
  warehouseId    String
  quantity       Int      @default(0)
  reservedQty    Int      @default(0)
  availableQty   Int      @default(0) // quantity - reservedQty
  valuationAmount Decimal @default(0)
  lastEventAt    DateTime?
  updatedAt      DateTime @updatedAt

  organization  Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])
  warehouse     Warehouse     @relation(fields: [warehouseId], references: [id])

  @@unique([inventoryItemId, warehouseId])
  @@index([orgId, warehouseId])
  @@map("stock_level")
}
```

**Important:** `StockLevel.quantity` is a **materialized cache** computed from the sum of `StockEvent.quantity` for that item+warehouse pair. It is updated transactionally alongside every `StockEvent` write. The authoritative source of truth is always the `StockEvent` ledger.

#### D. Stock Events (Immutable Ledger)

**Data Model: `StockEvent`**

```prisma
model StockEvent {
  id               String         @id @default(cuid())
  orgId            String
  inventoryItemId  String
  warehouseId      String
  eventType        StockEventType
  quantity         Int            // positive = stock in, negative = stock out
  unitCost         Decimal        @default(0)
  totalCost        Decimal        @default(0)
  referenceType    String?        // "invoice", "purchase_order", "grn", "adjustment", "transfer"
  referenceId      String?
  note             String?
  createdByUserId  String         @db.Uuid
  createdAt        DateTime       @default(now())

  organization  Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])
  warehouse     Warehouse     @relation(fields: [warehouseId], references: [id])

  @@index([inventoryItemId, warehouseId, createdAt])
  @@index([orgId, eventType, createdAt])
  @@index([referenceType, referenceId])
  @@map("stock_event")
}

enum StockEventType {
  PURCHASE_RECEIPT   // GRN received - stock in
  SALES_DISPATCH     // Invoice finalized - stock out
  ADJUSTMENT_IN      // Manual stock increase
  ADJUSTMENT_OUT     // Manual stock decrease
  TRANSFER_IN        // Inter-warehouse transfer destination
  TRANSFER_OUT       // Inter-warehouse transfer source
  RETURN_IN          // Customer return - stock in
  RETURN_OUT         // Vendor return - stock out
  OPENING_BALANCE    // Initial stock setup
}
```

**Immutability Rule:** StockEvents are **append-only**. To correct a stock error, create a compensating event (e.g., `ADJUSTMENT_IN` to fix an incorrect `ADJUSTMENT_OUT`). Never delete or update a StockEvent.

#### E. Stock Adjustments (`/app/inventory/adjustments`)

**Data Model: `StockAdjustment`**

```prisma
model StockAdjustment {
  id               String                @id @default(cuid())
  orgId            String
  adjustmentNumber String
  warehouseId      String
  reason           StockAdjustmentReason
  notes            String?
  status           StockAdjustmentStatus @default(DRAFT)
  journalEntryId   String?               @unique
  approvedByUserId String?               @db.Uuid
  approvedAt       DateTime?
  createdByUserId  String                @db.Uuid
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  organization Organization          @relation(fields: [orgId], references: [id], onDelete: Cascade)
  warehouse    Warehouse             @relation(fields: [warehouseId], references: [id])
  lines        StockAdjustmentLine[]
  journalEntry JournalEntry?         @relation("StockAdjJournal", fields: [journalEntryId], references: [id])

  @@unique([orgId, adjustmentNumber])
  @@index([orgId, status])
  @@map("stock_adjustment")
}

model StockAdjustmentLine {
  id               String @id @default(cuid())
  adjustmentId     String
  inventoryItemId  String
  quantityChange   Int    // positive = add, negative = remove
  unitCost         Decimal @default(0)
  reason           String?

  adjustment    StockAdjustment @relation(fields: [adjustmentId], references: [id], onDelete: Cascade)
  inventoryItem InventoryItem   @relation(fields: [inventoryItemId], references: [id])

  @@map("stock_adjustment_line")
}

enum StockAdjustmentReason {
  PHYSICAL_COUNT
  DAMAGE
  THEFT
  EXPIRED
  FOUND
  CORRECTION
  OTHER
}

enum StockAdjustmentStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  POSTED
  CANCELLED
}
```

**Workflow:**

1. User creates a stock adjustment with line items (item + quantity change + reason)
2. If org has approval policies for inventory adjustments, routes to approval
3. On approval: Creates `StockEvent` records for each line, updates `StockLevel`, posts `JournalEntry` (Debit: Inventory Adjustment Expense, Credit: Inventory Asset — or vice versa)
4. The adjustment is marked `POSTED` and becomes immutable

#### F. Stock Transfers (`/app/inventory/transfers`)

**Data Model: `StockTransfer`**

```prisma
model StockTransfer {
  id                 String              @id @default(cuid())
  orgId              String
  transferNumber     String
  fromWarehouseId    String
  toWarehouseId      String
  status             StockTransferStatus @default(DRAFT)
  notes              String?
  initiatedByUserId  String              @db.Uuid
  approvedByUserId   String?             @db.Uuid
  approvedAt         DateTime?
  completedAt        DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  organization   Organization        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  fromWarehouse  Warehouse           @relation("TransferFrom", fields: [fromWarehouseId], references: [id])
  toWarehouse    Warehouse           @relation("TransferTo", fields: [toWarehouseId], references: [id])
  lines          StockTransferLine[]

  @@unique([orgId, transferNumber])
  @@index([orgId, status])
  @@map("stock_transfer")
}

model StockTransferLine {
  id               String @id @default(cuid())
  transferId       String
  inventoryItemId  String
  quantity         Int

  transfer      StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])

  @@map("stock_transfer_line")
}

enum StockTransferStatus {
  DRAFT
  IN_TRANSIT
  COMPLETED
  CANCELLED
}
```

**Workflow:**

1. User initiates transfer from Warehouse A to Warehouse B with line items
2. On approval: Status becomes `IN_TRANSIT`, creates `TRANSFER_OUT` events in source warehouse
3. On receipt confirmation: Status becomes `COMPLETED`, creates `TRANSFER_IN` events in destination warehouse, updates both `StockLevel` records

#### G. FIFO/LIFO/Weighted Average Valuation Engine

**Implementation: `src/lib/inventory/valuation.ts`**

The valuation engine determines the cost of goods sold (COGS) when stock is dispatched:

**FIFO (First In, First Out):**
- Consume the oldest `PURCHASE_RECEIPT` events first
- Track remaining quantity per receipt batch
- COGS = sum of (consumed qty x unit cost) across batches

**LIFO (Last In, First Out):**
- Consume the newest `PURCHASE_RECEIPT` events first
- Same batch tracking, reverse order

**Weighted Average:**
- `avgCost = totalValueInStock / totalQuantityInStock`
- COGS = dispatched qty x avgCost
- Recalculated on every stock-in event

**Valuation is computed per item per warehouse** and stored on `StockLevel.valuationAmount`.

#### H. Low-Stock Alerts

**Logic: `src/lib/inventory/alerts.ts`**

A cron job runs daily (or on every stock event if real-time):

```
For each InventoryItem where trackInventory = true:
  totalAvailable = SUM(StockLevel.availableQty) across all warehouses
  if totalAvailable <= reorderLevel:
    1. Create Notification for org admins
    2. If a "Low Stock" WorkflowDefinition trigger exists, fire it
    3. Log in ActivityLog
```

**Workflow Integration:** Register `INVENTORY_LOW_STOCK` as a new trigger in the Phase 25 Workflow Catalog so users can automate responses (e.g., auto-create PO, send email to procurement team).

### 7.3 Acceptance Criteria

1. User can create inventory items with SKU, HSN linkage, pricing, and reorder levels
2. Multiple warehouses can be created with unique codes
3. Stock events are immutable and produce an auditable ledger
4. `StockLevel` is always consistent with the sum of `StockEvent` records
5. Stock adjustments require approval when org has inventory approval policies
6. Stock adjustments post correct journal entries (inventory asset <-> adjustment expense)
7. Inter-warehouse transfers correctly debit source and credit destination
8. FIFO valuation correctly consumes oldest batches first
9. LIFO valuation correctly consumes newest batches first
10. Weighted average recalculates on every stock-in event
11. Low-stock alerts fire when `availableQty <= reorderLevel`
12. Low-stock triggers integrate with the Workflow Automation engine
13. CSV bulk import creates items and validates SKU uniqueness
14. Plan gating: `inventoryManagement` feature flag, warehouse count limited by plan

---

## 8. Sprint 26.3 — Procurement & Accounts Payable (AP) OS

### 8.1 Objective

Implement the full Purchase Order lifecycle, Goods Receipt Notes, and the 3-Way Match engine that ensures financial controls between what was ordered, what was received, and what is billed.

### 8.2 Scope

#### A. Purchase Orders (`/app/procurement/orders`)

**Data Model: `PurchaseOrder`**

```prisma
model PurchaseOrder {
  id                String              @id @default(cuid())
  orgId             String
  vendorId          String
  poNumber          String
  poDate            String
  expectedDelivery  String?
  status            PurchaseOrderStatus @default(DRAFT)
  formData          Json?
  subtotalAmount    Decimal             @default(0)
  taxAmount         Decimal             @default(0)
  totalAmount       Decimal             @default(0)
  currency          String              @default("INR")
  warehouseId       String?
  notes             String?
  termsAndConditions String?
  // GST fields
  supplierGstin     String?
  placeOfSupply     String?
  gstTotalCgst      Decimal             @default(0)
  gstTotalSgst      Decimal             @default(0)
  gstTotalIgst      Decimal             @default(0)
  // Approval
  approvedByUserId  String?             @db.Uuid
  approvedAt        DateTime?
  rejectedByUserId  String?             @db.Uuid
  rejectedAt        DateTime?
  rejectionReason   String?
  // Audit
  createdByUserId   String              @db.Uuid
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  archivedAt        DateTime?

  organization     Organization          @relation(fields: [orgId], references: [id], onDelete: Cascade)
  vendor           Vendor                @relation(fields: [vendorId], references: [id])
  warehouse        Warehouse?            @relation(fields: [warehouseId], references: [id])
  lines            PurchaseOrderLine[]
  goodsReceipts    GoodsReceiptNote[]
  vendorBills      VendorBill[]          @relation("POVendorBills")
  approvalRequests ApprovalRequest[]     @relation("PurchaseOrderApprovals")
  matchResults     ThreeWayMatchResult[]
  attachments      FileAttachment[]      @relation("POAttachments")

  @@unique([orgId, poNumber])
  @@index([orgId, status])
  @@index([vendorId])
  @@map("purchase_order")
}

model PurchaseOrderLine {
  id               String  @id @default(cuid())
  purchaseOrderId  String
  inventoryItemId  String?
  description      String
  quantity         Decimal @default(1)
  unitPrice        Decimal @default(0)
  taxRate          Float   @default(0)
  discount         Decimal @default(0)
  lineTotal        Decimal @default(0)
  sortOrder        Int     @default(0)
  // GST
  hsnCode          String?
  gstRate          Float   @default(0)
  cgstAmount       Decimal @default(0)
  sgstAmount       Decimal @default(0)
  igstAmount       Decimal @default(0)
  // Receipt tracking
  receivedQty      Decimal @default(0)
  billedQty        Decimal @default(0)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  inventoryItem InventoryItem? @relation(fields: [inventoryItemId], references: [id])
  grnLines      GoodsReceiptNoteLine[]

  @@map("purchase_order_line")
}

enum PurchaseOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PARTIALLY_RECEIVED
  FULLY_RECEIVED
  CLOSED
  CANCELLED
}
```

**UI Features:**

- **PO List:** Filterable by status, vendor, date range. Columns: PO#, Vendor, Date, Amount, Status, Received%, Billed%
- **PO Form:** Vendor selector, line items with inventory item lookup (auto-populates HSN, unit price), delivery date, warehouse destination, notes
- **PO PDF Export:** Printable PO document with organization branding (reuses the existing PDF export pipeline)
- **PO Approval:** Integrates with Phase 25 ApprovalPolicy—POs above threshold require multi-step approval

#### B. Goods Receipt Notes (`/app/procurement/receipts`)

**Data Model: `GoodsReceiptNote`**

```prisma
model GoodsReceiptNote {
  id                String          @id @default(cuid())
  orgId             String
  purchaseOrderId   String
  grnNumber         String
  receiptDate       String
  warehouseId       String
  status            GrnStatus       @default(DRAFT)
  notes             String?
  inspectionNotes   String?
  receivedByUserId  String          @db.Uuid
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  organization  Organization          @relation(fields: [orgId], references: [id], onDelete: Cascade)
  purchaseOrder PurchaseOrder         @relation(fields: [purchaseOrderId], references: [id])
  warehouse     Warehouse             @relation(fields: [warehouseId], references: [id])
  lines         GoodsReceiptNoteLine[]

  @@unique([orgId, grnNumber])
  @@index([orgId, status])
  @@index([purchaseOrderId])
  @@map("goods_receipt_note")
}

model GoodsReceiptNoteLine {
  id                String  @id @default(cuid())
  grnId             String
  poLineId          String
  receivedQty       Decimal
  acceptedQty       Decimal @default(0)
  rejectedQty       Decimal @default(0)
  rejectionReason   String?

  grn    GoodsReceiptNote   @relation(fields: [grnId], references: [id], onDelete: Cascade)
  poLine PurchaseOrderLine  @relation(fields: [poLineId], references: [id])

  @@map("goods_receipt_note_line")
}

enum GrnStatus {
  DRAFT
  CONFIRMED
  CANCELLED
}
```

**Workflow:**

1. User creates GRN against a PO — system pre-fills lines from PO with ordered qty
2. User enters `receivedQty` and optionally `rejectedQty` per line with rejection reasons
3. On `CONFIRMED`:
   - Creates `PURCHASE_RECEIPT` StockEvents for each accepted line item
   - Updates `StockLevel` for the destination warehouse
   - Updates `PurchaseOrderLine.receivedQty` (sum of all GRN lines for that PO line)
   - If all PO lines are fully received -> PO status becomes `FULLY_RECEIVED`
   - If partially received -> PO status becomes `PARTIALLY_RECEIVED`

#### C. 3-Way Match Engine (`src/lib/procurement/three-way-match.ts`)

**Data Model: `ThreeWayMatchResult`**

```prisma
model ThreeWayMatchResult {
  id               String          @id @default(cuid())
  orgId            String
  purchaseOrderId  String
  vendorBillId     String
  matchStatus      MatchStatus     @default(PENDING)
  qtyMatchScore    Float           @default(0) // 0.0 to 1.0
  amountMatchScore Float           @default(0) // 0.0 to 1.0
  overallScore     Float           @default(0) // 0.0 to 1.0
  discrepancies    Json?           // Array of { lineId, field, expected, actual, variance }
  resolvedByUserId String?         @db.Uuid
  resolvedAt       DateTime?
  resolutionNote   String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  organization  Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  vendorBill    VendorBill    @relation(fields: [vendorBillId], references: [id])

  @@unique([purchaseOrderId, vendorBillId])
  @@index([orgId, matchStatus])
  @@map("three_way_match_result")
}

enum MatchStatus {
  PENDING
  MATCHED         // All within tolerance
  PARTIAL_MATCH   // Some lines matched, some have variance
  MISMATCH        // Significant discrepancies
  RESOLVED        // Manually resolved by user
  WAIVED          // Approved despite mismatch
}
```

**Match Algorithm:**

For each VendorBill linked to a PurchaseOrder:

```
For each VendorBillLine:
  1. Find the corresponding PurchaseOrderLine (by inventoryItemId or description match)
  2. Find all GRN lines for that PO line
  3. Compare:
     a. Quantity: billedQty vs totalReceivedQty (from GRNs)
        - Within +/-5% tolerance -> PASS
        - Outside tolerance -> VARIANCE
     b. Unit Price: billUnitPrice vs poUnitPrice
        - Within +/-2% tolerance -> PASS
        - Outside tolerance -> VARIANCE
     c. Line Total: billLineTotal vs (receivedQty x poUnitPrice)
        - Within +/-2% tolerance -> PASS
        - Outside tolerance -> VARIANCE

  qtyMatchScore = matchedLines / totalLines
  amountMatchScore = matchedAmount / totalAmount
  overallScore = (qtyMatchScore + amountMatchScore) / 2

  If overallScore >= 0.95 -> MATCHED
  If overallScore >= 0.80 -> PARTIAL_MATCH
  Else -> MISMATCH
```

**Tolerance Configuration:**

```prisma
// Added to OrgDefaults
model OrgDefaults {
  // ... existing fields ...
  matchQtyTolerancePct    Float @default(5.0)  // +/-5%
  matchAmountTolerancePct Float @default(2.0)  // +/-2%
}
```

**Business Rule:** A VendorBill with `matchStatus = MISMATCH` cannot transition to `APPROVED` without manual resolution or explicit waiver by an admin.

#### D. Vendor Bill Enhancement

**Changes to existing `VendorBill` model:**

```prisma
model VendorBill {
  // ... existing fields ...
  purchaseOrderId  String?
  matchStatus      MatchStatus?

  purchaseOrder    PurchaseOrder?       @relation("POVendorBills", fields: [purchaseOrderId], references: [id])
  matchResults     ThreeWayMatchResult[]
}
```

**Updated VendorBill Workflow:**

1. User creates VendorBill and optionally links to a PO
2. If linked to PO then 3-Way Match engine runs automatically
3. Match result shown on VendorBill detail page
4. If `MATCHED` then bill can proceed to approval normally
5. If `MISMATCH` then bill is blocked. User must:
   - Resolve discrepancies (edit bill to match PO/GRN)
   - Or waive the match requirement (requires admin + audit log)
6. Match status is visible in the VendorBill list view

#### E. AP Dashboard (`/app/pay/accounts-payable`)

A new dashboard summarizing the payables position:

- **Outstanding Bills:** Total amount of unpaid bills by aging bucket (Current, 1-30, 31-60, 61-90, 90+)
- **PO Commitments:** Total value of approved but not-yet-received POs
- **Payment Run Summary:** Upcoming scheduled payment runs
- **Match Status:** Count of bills by match status (Matched, Partial, Mismatch, Pending)
- **Vendor Concentration:** Top 10 vendors by outstanding amount

### 8.3 Acceptance Criteria

1. User can create POs with vendor selection, line items with inventory item linkage, and GST calculation
2. POs above configurable threshold route through approval chains
3. PO PDF export generates a branded, printable document
4. GRN can be created against a PO; receiving updates PO line `receivedQty`
5. GRN confirmation creates `PURCHASE_RECEIPT` stock events and updates `StockLevel`
6. When a VendorBill is linked to a PO, the 3-Way Match engine runs automatically
7. Match tolerances are configurable per org (default: +/-5% qty, +/-2% amount)
8. Bills with `MISMATCH` status cannot be approved without explicit waiver
9. Waiver requires admin role and creates an AuditLog entry
10. AP Dashboard correctly calculates aging buckets
11. Auto-numbering for POs (`PO-001`, `PO-002`) and GRNs (`GRN-001`, `GRN-002`)
12. Plan gating: `procurementModule` feature flag, PO count limited by plan

---

## 9. Sprint 26.4 — Advanced Compliance & E-Invoicing v2

### 9.1 Objective

Implement real-time GSTR-2B JSON reconciliation for purchase-side GST matching, and upgrade the E-Invoice/E-Way Bill generation from stub to production-ready NIC Sandbox API integration.

### 9.2 Scope

#### A. GSTR-2B Import & Reconciliation (`/app/intel/gst-reports/gstr-2b`)

**Background:** GSTR-2B is an auto-drafted Input Tax Credit (ITC) statement generated by the GST portal based on the supplier's GSTR-1 filings. Businesses must reconcile their purchase records against GSTR-2B to claim correct ITC.

**Data Model: `Gstr2bImport`**

```prisma
model Gstr2bImport {
  id              String          @id @default(cuid())
  orgId           String
  periodMonth     String          // "YYYY-MM"
  fileName        String
  fileHash        String          // SHA-256 of uploaded file for dedup
  importedByUserId String         @db.Uuid
  supplierCount   Int             @default(0)
  invoiceCount    Int             @default(0)
  totalTaxableValue Decimal       @default(0)
  totalIgst       Decimal         @default(0)
  totalCgst       Decimal         @default(0)
  totalSgst       Decimal         @default(0)
  totalCess       Decimal         @default(0)
  status          Gstr2bImportStatus @default(UPLOADED)
  errorMessage    String?
  createdAt       DateTime        @default(now())

  organization Organization       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  entries      Gstr2bEntry[]

  @@unique([orgId, periodMonth, fileHash])
  @@index([orgId, periodMonth])
  @@map("gstr_2b_import")
}

model Gstr2bEntry {
  id                 String   @id @default(cuid())
  importId           String
  supplierGstin      String
  supplierName       String?
  invoiceNumber      String
  invoiceDate        String
  invoiceType        String   // "B2B", "CDNR", "ISD", etc.
  taxableValue       Decimal  @default(0)
  igstAmount         Decimal  @default(0)
  cgstAmount         Decimal  @default(0)
  sgstAmount         Decimal  @default(0)
  cessAmount         Decimal  @default(0)
  placeOfSupply      String?
  reverseCharge      Boolean  @default(false)
  itcAvailability    String?  // "Y", "N", "T" (temporary)
  reason             String?
  // Reconciliation link
  matchedVendorBillId String?
  matchConfidence     Float?  // 0.0 to 1.0
  matchStatus         Gstr2bMatchStatus @default(UNMATCHED)

  import     Gstr2bImport @relation(fields: [importId], references: [id], onDelete: Cascade)

  @@index([importId])
  @@index([supplierGstin, invoiceNumber])
  @@map("gstr_2b_entry")
}

enum Gstr2bImportStatus {
  UPLOADED
  PARSING
  PARSED
  RECONCILING
  RECONCILED
  FAILED
}

enum Gstr2bMatchStatus {
  UNMATCHED
  AUTO_MATCHED     // System found exact match
  SUGGESTED        // System found probable match (>80% confidence)
  MANUALLY_MATCHED // User confirmed match
  MISMATCH         // Matched but values differ
  NOT_IN_BOOKS     // Present in GSTR-2B but no corresponding purchase record
  NOT_IN_GSTR2B    // Present in books but missing from GSTR-2B
}
```

**Reconciliation Engine (`src/lib/compliance/gstr2b-reconciliation.ts`):**

```
Input: Gstr2bImport with parsed entries
Output: Match results for each Gstr2bEntry

Algorithm:
  For each Gstr2bEntry:
    1. Exact Match: Find VendorBill WHERE
       - vendor.gstin = entry.supplierGstin
       - billNumber = entry.invoiceNumber (normalized)
       - billDate matches (+/-3 days tolerance for date format differences)
       - totalAmount within +/-1 rupee tolerance
       -> If found: AUTO_MATCHED (confidence = 1.0)

    2. Fuzzy Match: Find VendorBill WHERE
       - vendor.gstin = entry.supplierGstin
       - billNumber similar (Levenshtein distance <= 2)
       - totalAmount within +/-5% tolerance
       -> If found: SUGGESTED (confidence = 0.8-0.95)

    3. GSTIN-only Match: Find VendorBills WHERE
       - vendor.gstin = entry.supplierGstin
       - period = entry.invoiceDate month
       -> List as candidates for manual matching

    4. No Match: -> NOT_IN_BOOKS

  Also identify:
    All VendorBills in the period that have NO corresponding Gstr2bEntry
    -> NOT_IN_GSTR2B
```

**UI:**

- **Import:** File upload for GSTR-2B JSON (downloaded from GST portal)
- **Reconciliation View:** Table with columns: Supplier GSTIN, Invoice#, Taxable Value, Tax Amounts, Match Status, Matched Bill
- **Filters:** By match status, supplier, amount range
- **Actions:** Confirm suggested match, manually match, mark as accepted mismatch
- **Summary:** Total ITC available, ITC matched, ITC unmatched, ITC with discrepancy

#### B. E-Invoice (IRN/QR) Generation via NIC Sandbox

**Background:** E-Invoicing in India requires businesses above the threshold (currently Rs 5 Cr turnover) to generate an Invoice Registration Number (IRN) from the National Informatics Centre (NIC) Invoice Registration Portal (IRP) before issuing invoices.

**Data Model: `EInvoiceRequest`**

```prisma
model EInvoiceRequest {
  id                String              @id @default(cuid())
  orgId             String
  invoiceId         String
  requestType       EInvoiceRequestType
  status            EInvoiceStatus      @default(PENDING)
  requestPayload    Json                // Full NIC API request body
  responsePayload   Json?               // Full NIC API response
  irpEnvironment    String              @default("sandbox") // "sandbox" | "production"
  irpEndpoint       String?
  irnNumber         String?
  ackNumber         String?
  ackDate           DateTime?
  signedQrCode      String?             @db.Text
  signedInvoice     String?             @db.Text
  cancelReason      String?
  errorCode         String?
  errorMessage      String?
  retryCount        Int                 @default(0)
  lastAttemptAt     DateTime?
  createdByUserId   String              @db.Uuid
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  invoice      Invoice      @relation(fields: [invoiceId], references: [id])

  @@index([orgId, status])
  @@index([invoiceId])
  @@index([irnNumber])
  @@map("e_invoice_request")
}

enum EInvoiceRequestType {
  GENERATE_IRN
  CANCEL_IRN
  GENERATE_EWAY_BILL
  CANCEL_EWAY_BILL
}

enum EInvoiceStatus {
  PENDING
  SUBMITTED
  SUCCESS
  FAILED
  CANCELLED
}
```

**NIC IRP API Integration (`src/lib/compliance/einvoice-irp.ts`):**

```typescript
// NIC IRP Sandbox Base URL
const IRP_SANDBOX_URL = "https://einv-apisandbox.nic.in";

// API Endpoints:
// 1. Auth: POST /eivital/v1.04/auth (GSTIN + credentials -> token)
// 2. Generate IRN: POST /eicore/v1.03/Invoice
// 3. Cancel IRN: POST /eicore/v1.03/Invoice/Cancel
// 4. Get IRN by DocType: GET /eicore/v1.03/Invoice/irn/<irn>
// 5. Generate E-Way Bill: POST /eiewb/v1.03/ewaybill
```

**Request Payload Structure (NIC v1.03):**

```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2B",
    "RegRev": "N",
    "EcmGstin": null,
    "IgstOnIntra": "N"
  },
  "DocDtls": {
    "Typ": "INV",
    "No": "INV-001",
    "Dt": "18/04/2026"
  },
  "SellerDtls": { "...org details..." },
  "BuyerDtls": { "...customer details..." },
  "ItemList": [
    {
      "SlNo": "1",
      "PrdDesc": "Widget",
      "IsServc": "N",
      "HsnCd": "8471",
      "Qty": 10,
      "Unit": "PCS",
      "UnitPrice": 1000.00,
      "TotAmt": 10000.00,
      "Discount": 0,
      "AssAmt": 10000.00,
      "GstRt": 18.00,
      "IgstAmt": 0,
      "CgstAmt": 900.00,
      "SgstAmt": 900.00,
      "CesRt": 0,
      "CesAmt": 0,
      "TotItemVal": 11800.00
    }
  ],
  "ValDtls": {
    "AssVal": 10000.00,
    "CgstVal": 900.00,
    "SgstVal": 900.00,
    "IgstVal": 0,
    "CesVal": 0,
    "Discount": 0,
    "OthChrg": 0,
    "TotInvVal": 11800.00
  }
}
```

**E-Invoice Workflow:**

1. User creates/edits invoice with GST details (GSTIN, HSN codes, tax amounts)
2. User clicks "Generate IRN" on the invoice detail page
3. System validates:
   - Organization has `einvoiceEnabled = true` in settings
   - All required fields are present (GSTIN, HSN, tax amounts)
   - Invoice is in `ISSUED` status
4. System builds the NIC request payload from invoice data
5. Calls NIC IRP API -> receives IRN, signed QR code, acknowledgement
6. Updates Invoice with `irnNumber`, `irnAckNumber`, `irnAckDate`, `irnQrCode`
7. Stores full request/response in `EInvoiceRequest`
8. IRN cancellation available within 24 hours (NIC rule)

**E-Invoice Settings (`/app/settings/compliance/einvoice`):**

```prisma
model EInvoiceConfig {
  id               String   @id @default(cuid())
  orgId            String   @unique
  enabled          Boolean  @default(false)
  irpEnvironment   String   @default("sandbox") // "sandbox" | "production"
  gstin            String?
  // Credentials are AES-256-CBC encrypted (same pattern as Razorpay keys in Phase 24)
  encryptedUsername String?
  encryptedPassword String?
  authTokenCache   String?  @db.Text
  tokenExpiresAt   DateTime?
  autoGenerateIrn  Boolean  @default(false) // Auto-generate on invoice ISSUED transition
  autoGenerateEwb  Boolean  @default(false) // Auto-generate E-Way Bill if distance > 0
  ewbDefaultTransportMode String? // "Road", "Rail", "Air", "Ship"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("e_invoice_config")
}
```

#### C. E-Way Bill Generation

**Uses the same `EInvoiceRequest` model** with `requestType = GENERATE_EWAY_BILL`.

**Additional E-Way Bill fields in the request:**

```json
{
  "TransId": "29AABCT1332L000",
  "TransName": "ABC Transport",
  "TransMode": "1",
  "Distance": 100,
  "TransDocNo": "GR-001",
  "TransDocDt": "18/04/2026",
  "VehNo": "KA01AB1234",
  "VehType": "R"
}
```

**Auto-generation Rule:** If `autoGenerateEwb = true` and the invoice's `ewbDistanceKm > 0`, automatically generate E-Way Bill after successful IRN generation.

#### D. Compliance Dashboard (`/app/intel/compliance`)

- **E-Invoice Status:** Count of invoices by IRN status (Pending, Submitted, Generated, Failed)
- **GSTR-2B Reconciliation:** Match summary for current period
- **ITC Summary:** Total ITC available, matched, unmatched, under dispute
- **E-Way Bill Expiry:** List of E-Way Bills expiring in next 24/48/72 hours
- **Compliance Alerts:** Missing HSN codes, GSTIN validation failures, filing deadlines

### 9.3 Acceptance Criteria

1. User can upload GSTR-2B JSON file and system parses all B2B, CDNR, ISD sections
2. Reconciliation engine correctly identifies exact matches (100% confidence)
3. Reconciliation engine suggests fuzzy matches (80-95% confidence) for minor discrepancies
4. "Not in books" entries are flagged for vendor follow-up
5. "Not in GSTR-2B" entries are flagged as potential ITC risk
6. User can manually confirm/reject suggested matches
7. Reconciliation summary shows ITC totals broken down by match status
8. E-Invoice request payload conforms to NIC v1.03 JSON schema
9. Successful IRN generation updates invoice fields and stores signed QR code
10. IRN cancellation works within the 24-hour NIC window
11. E-Way Bill generation uses correct transport mode codes
12. E-Invoice credentials are AES-256-CBC encrypted at rest
13. Auto-IRN generation fires on invoice `ISSUED` state transition (if enabled)
14. Failed IRN attempts store error codes/messages for debugging
15. Compliance dashboard shows accurate counts and totals
16. Plan gating: `gstEInvoicing` feature flag required; enhanced `gstr2bReconciliation` flag for import

---

## 10. Sprint 26.5 — Enterprise CRM & SOP Knowledge Base

### 10.1 Objective

Build a transactional CRM that aggregates every interaction with a Customer or Vendor into a unified timeline, and an internal SOP Builder for organizational process documentation.

### 10.2 Scope

#### A. Customer/Vendor CRM Timeline (`/app/crm/customers/[id]` and `/app/crm/vendors/[id]`)

**No New Data Storage for Timeline Events.** The CRM timeline is a **read-derived aggregation** from existing tables:

```typescript
// src/lib/crm/timeline.ts
interface TimelineEvent {
  id: string;
  entityType: 'customer' | 'vendor';
  entityId: string;
  eventType: TimelineEventType;
  title: string;
  description?: string;
  amount?: number;
  status?: string;
  referenceType: string;
  referenceId: string;
  actorName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

type TimelineEventType =
  | 'INVOICE_CREATED' | 'INVOICE_SENT' | 'INVOICE_PAID' | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED' | 'PAYMENT_PROOF_UPLOADED'
  | 'TICKET_OPENED' | 'TICKET_RESOLVED'
  | 'QUOTE_SENT' | 'QUOTE_ACCEPTED' | 'QUOTE_DECLINED'
  | 'EMAIL_SENT' | 'EMAIL_BOUNCED'
  | 'NOTE_ADDED'
  | 'VOUCHER_CREATED' | 'VENDOR_BILL_CREATED' | 'VENDOR_BILL_PAID'
  | 'TAG_ADDED' | 'TAG_REMOVED'
  | 'LIFECYCLE_CHANGED';
```

**Timeline Assembly:** Union query across invoices, payments, tickets, quotes, send logs, and CRM notes for the given entity, ordered by timestamp descending with cursor-based pagination.

#### B. CRM Entity Enhancements

**Fields added to `Customer`:**

```prisma
model Customer {
  // ... existing fields ...
  industry          String?
  segment           String?    // "enterprise", "mid-market", "smb", "startup"
  lifecycleStage    CustomerLifecycleStage @default(PROSPECT)
  source            String?    // "website", "referral", "cold-outreach", "partner"
  assignedToUserId  String?    @db.Uuid
  nextFollowUpAt    DateTime?
  lifetimeValue     Decimal    @default(0)
  totalInvoiced     Decimal    @default(0)
  totalPaid         Decimal    @default(0)
  lastInteractionAt DateTime?
  tags              String[]   @default([])

  crmNotes CrmNote[] @relation("CustomerNotes")
}

enum CustomerLifecycleStage {
  PROSPECT
  QUALIFIED
  NEGOTIATION
  WON
  ACTIVE
  AT_RISK
  CHURNED
}
```

**Fields added to `Vendor`:**

```prisma
model Vendor {
  // ... existing fields ...
  category          String?    // "raw-material", "services", "utilities", "logistics"
  paymentTermsDays  Int        @default(30)
  rating            Int?       // 1-5 star rating
  complianceStatus  VendorComplianceStatus @default(PENDING)
  totalBilled       Decimal    @default(0)
  totalPaid         Decimal    @default(0)
  lastOrderAt       DateTime?
  tags              String[]   @default([])

  crmNotes     CrmNote[] @relation("VendorNotes")
  purchaseOrders PurchaseOrder[]
}

enum VendorComplianceStatus {
  PENDING
  VERIFIED
  SUSPENDED
  BLOCKED
}
```

#### C. CRM Notes

**Data Model: `CrmNote`**

```prisma
model CrmNote {
  id            String   @id @default(cuid())
  orgId         String
  entityType    String   // "customer" | "vendor"
  entityId      String
  content       String   @db.Text
  isPinned      Boolean  @default(false)
  createdByUserId String @db.Uuid
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, entityType, entityId])
  @@index([entityId, createdAt])
  @@map("crm_note")
}
```

#### D. CRM List & Dashboard (`/app/crm`)

- **Customer List:** Enhanced view with lifecycle stage filter, assigned user filter, last interaction date, lifetime value
- **Vendor List:** Enhanced view with category filter, compliance status, rating, last order date
- **CRM Dashboard:**
  - Active customers by lifecycle stage (funnel)
  - Revenue by customer segment (pie chart)
  - Top 10 customers by lifetime value
  - Vendors by compliance status
  - Upcoming follow-ups (next 7 days)
  - Recent activity timeline (all entities)

#### E. SOP Knowledge Base (`/app/sop`)

**Data Model: `SopDocument`**

```prisma
model SopDocument {
  id              String          @id @default(cuid())
  orgId           String
  title           String
  slug            String
  category        String?
  content         String          @db.Text  // Markdown content
  excerpt         String?
  status          SopDocumentStatus @default(DRAFT)
  sortOrder       Int             @default(0)
  publishedAt     DateTime?
  publishedByUserId String?       @db.Uuid
  createdByUserId String          @db.Uuid
  lastEditedByUserId String?      @db.Uuid
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  archivedAt      DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, slug])
  @@index([orgId, status, category])
  @@map("sop_document")
}

enum SopDocumentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

**SOP Features:**

- **SOP List:** Filterable by category, status. Searchable by title and content.
- **SOP Editor:** Rich Markdown editor with preview. Support for headings, lists, code blocks, tables, and images.
- **Categories:** User-defined (e.g., "Finance", "HR", "Operations", "IT"). Flat list, not hierarchical.
- **Publishing:** Draft SOPs are visible only to the creator. Published SOPs are visible to all org members.
- **Search:** Full-text search across SOP titles and content using database `ILIKE` patterns.
- **Pinning:** Pin important SOPs to the top of the list.

**SOP UI Pages:**

| Route | Purpose |
|-------|---------|
| `/app/sop` | SOP list with categories sidebar |
| `/app/sop/new` | Create new SOP |
| `/app/sop/[id]/edit` | Edit existing SOP |
| `/app/sop/[id]` | Read view with Markdown rendering |

### 10.3 Acceptance Criteria

1. Customer detail page shows a unified timeline of all interactions (invoices, payments, tickets, quotes, emails, notes) in reverse chronological order
2. Vendor detail page shows the same timeline pattern (bills, POs, payments, notes)
3. CRM notes can be added, edited, and pinned
4. Customer lifecycle stage can be updated; changes appear in the timeline
5. Vendor compliance status changes are tracked and visible
6. CRM dashboard shows lifecycle funnel, revenue by segment, and upcoming follow-ups
7. SOP documents can be created, edited, published, and archived
8. Published SOPs are visible to all org members; drafts only to the creator
9. SOP search returns results matching title and content
10. SOP categories are user-definable and filterable
11. Timeline query performs within 500ms for entities with up to 1,000 interactions
12. Plan gating: `crmModule` for advanced CRM fields; SOP available on all paid plans

---

## 11. Complete Database Schema Changes

### 11.1 New Models (Phase 26)

| Model | Sprint | Purpose |
|-------|--------|---------|
| `EntityGroup` | 26.1 | Holding company / business group |
| `InterCompanyTransfer` | 26.1 | ICT between entities with paired journals |
| `InventoryItem` | 26.2 | Item master with SKU/HSN/pricing |
| `Warehouse` | 26.2 | Physical stock locations |
| `StockLevel` | 26.2 | Materialized stock position per item/warehouse |
| `StockEvent` | 26.2 | Immutable stock ledger entries |
| `StockAdjustment` | 26.2 | Stock correction documents |
| `StockAdjustmentLine` | 26.2 | Line items within adjustments |
| `StockTransfer` | 26.2 | Inter-warehouse transfer documents |
| `StockTransferLine` | 26.2 | Line items within transfers |
| `PurchaseOrder` | 26.3 | Purchase order header |
| `PurchaseOrderLine` | 26.3 | Purchase order line items |
| `GoodsReceiptNote` | 26.3 | GRN header |
| `GoodsReceiptNoteLine` | 26.3 | GRN line items |
| `ThreeWayMatchResult` | 26.3 | PO-GRN-Bill match outcomes |
| `Gstr2bImport` | 26.4 | GSTR-2B file import records |
| `Gstr2bEntry` | 26.4 | Individual entries from GSTR-2B |
| `EInvoiceRequest` | 26.4 | IRN/E-Way Bill API request/response log |
| `EInvoiceConfig` | 26.4 | Per-org E-Invoice settings (encrypted) |
| `CrmNote` | 26.5 | Customer/vendor interaction notes |
| `SopDocument` | 26.5 | Internal process documentation |

### 11.2 Modified Models

| Model | Fields Added | Sprint |
|-------|-------------|--------|
| `Organization` | `entityGroupId`, `parentOrgId`, `entityType`, `consolidationCurrency` | 26.1 |
| `Customer` | `industry`, `segment`, `lifecycleStage`, `source`, `assignedToUserId`, `nextFollowUpAt`, `lifetimeValue`, `totalInvoiced`, `totalPaid`, `lastInteractionAt`, `tags` | 26.5 |
| `Vendor` | `category`, `paymentTermsDays`, `rating`, `complianceStatus`, `totalBilled`, `totalPaid`, `lastOrderAt`, `tags` | 26.5 |
| `VendorBill` | `purchaseOrderId`, `matchStatus` | 26.3 |
| `VendorBillLine` | `inventoryItemId`, `receivedQty` | 26.3 |
| `InvoiceLineItem` | `inventoryItemId` | 26.2 |
| `OrgDefaults` | `matchQtyTolerancePct`, `matchAmountTolerancePct` | 26.3 |
| `Invoice` | Back-relation to `EInvoiceRequest[]` | 26.4 |

### 11.3 New Enums

| Enum | Values | Sprint |
|------|--------|--------|
| `EntityType` | STANDALONE, HOLDING, SUBSIDIARY, BRANCH | 26.1 |
| `InterCompanyTransferStatus` | PENDING, APPROVED, POSTED, CANCELLED | 26.1 |
| `InventoryValuationMethod` | FIFO, LIFO, WEIGHTED_AVERAGE | 26.2 |
| `StockEventType` | PURCHASE_RECEIPT, SALES_DISPATCH, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN, RETURN_OUT, OPENING_BALANCE | 26.2 |
| `StockAdjustmentReason` | PHYSICAL_COUNT, DAMAGE, THEFT, EXPIRED, FOUND, CORRECTION, OTHER | 26.2 |
| `StockAdjustmentStatus` | DRAFT, PENDING_APPROVAL, APPROVED, POSTED, CANCELLED | 26.2 |
| `StockTransferStatus` | DRAFT, IN_TRANSIT, COMPLETED, CANCELLED | 26.2 |
| `PurchaseOrderStatus` | DRAFT, PENDING_APPROVAL, APPROVED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CLOSED, CANCELLED | 26.3 |
| `GrnStatus` | DRAFT, CONFIRMED, CANCELLED | 26.3 |
| `MatchStatus` | PENDING, MATCHED, PARTIAL_MATCH, MISMATCH, RESOLVED, WAIVED | 26.3 |
| `Gstr2bImportStatus` | UPLOADED, PARSING, PARSED, RECONCILING, RECONCILED, FAILED | 26.4 |
| `Gstr2bMatchStatus` | UNMATCHED, AUTO_MATCHED, SUGGESTED, MANUALLY_MATCHED, MISMATCH, NOT_IN_BOOKS, NOT_IN_GSTR2B | 26.4 |
| `EInvoiceRequestType` | GENERATE_IRN, CANCEL_IRN, GENERATE_EWAY_BILL, CANCEL_EWAY_BILL | 26.4 |
| `EInvoiceStatus` | PENDING, SUBMITTED, SUCCESS, FAILED, CANCELLED | 26.4 |
| `CustomerLifecycleStage` | PROSPECT, QUALIFIED, NEGOTIATION, WON, ACTIVE, AT_RISK, CHURNED | 26.5 |
| `VendorComplianceStatus` | PENDING, VERIFIED, SUSPENDED, BLOCKED | 26.5 |
| `SopDocumentStatus` | DRAFT, PUBLISHED, ARCHIVED | 26.5 |

### 11.4 Migration Safety

- All new fields on existing models use `@default()` values — zero-downtime migration
- No columns are dropped — backward compatible
- New models are additive — no schema conflicts with existing tables
- `Organization.parentOrgId` self-relation is nullable — no backfill required
- `Customer.lifecycleStage` defaults to `PROSPECT` — safe for existing records
- `Vendor.complianceStatus` defaults to `PENDING` — safe for existing records

---

## 12. State Machines

### 12.1 Purchase Order Lifecycle

```
DRAFT -> PENDING_APPROVAL -> APPROVED -> PARTIALLY_RECEIVED -> FULLY_RECEIVED -> CLOSED
                          \-> CANCELLED                     /-> CLOSED
```

| From | To | Trigger | Guard |
|------|----|---------|-------|
| DRAFT | PENDING_APPROVAL | Submit for approval | All lines have qty > 0 |
| DRAFT | CANCELLED | Cancel | User is creator or admin |
| PENDING_APPROVAL | APPROVED | Approval chain complete | All required approvers signed off |
| PENDING_APPROVAL | CANCELLED | Rejected | Approver rejects |
| APPROVED | PARTIALLY_RECEIVED | GRN confirmed | Any GRN line receivedQty > 0 |
| APPROVED | FULLY_RECEIVED | GRN confirmed | All lines receivedQty >= orderedQty |
| APPROVED | CANCELLED | Cancel | Admin only; no GRN exists |
| PARTIALLY_RECEIVED | FULLY_RECEIVED | GRN confirmed | All lines fully received |
| PARTIALLY_RECEIVED | CLOSED | Force close | Admin + reason required |
| FULLY_RECEIVED | CLOSED | Close | Auto or manual |

### 12.2 Stock Adjustment Lifecycle

```
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED
      \-> CANCELLED          \-> CANCELLED
```

### 12.3 Stock Transfer Lifecycle

```
DRAFT -> IN_TRANSIT -> COMPLETED
      \-> CANCELLED  \-> CANCELLED
```

### 12.4 Inter-Company Transfer Lifecycle

```
PENDING -> APPROVED -> POSTED
        \-> CANCELLED
```

### 12.5 E-Invoice Request Lifecycle

```
PENDING -> SUBMITTED -> SUCCESS
                     \-> FAILED -> PENDING (retry)
SUCCESS -> CANCELLED (within 24h only)
```

### 12.6 GSTR-2B Import Lifecycle

```
UPLOADED -> PARSING -> PARSED -> RECONCILING -> RECONCILED
                    \-> FAILED
```

---

## 13. Route Map

### New Routes — Sprint 26.1 (Multi-Entity)

| Route | Type | Purpose |
|-------|------|---------|
| `/app/settings/entities` | Page | Entity group management |
| `/app/settings/entities/new` | Page | Add subsidiary/branch |
| `/app/settings/entities/[orgId]` | Page | Entity settings |
| `/app/books/reports?view=consolidated` | Query param | Consolidated financial reports |
| `/app/books/inter-company` | Page | Inter-company transfers |
| `/app/books/inter-company/new` | Page | Create ICT |

### New Routes — Sprint 26.2 (Inventory)

| Route | Type | Purpose |
|-------|------|---------|
| `/app/inventory/items` | Page | Item master list |
| `/app/inventory/items/new` | Page | Create item |
| `/app/inventory/items/[id]` | Page | Item detail with stock history |
| `/app/inventory/items/[id]/edit` | Page | Edit item |
| `/app/inventory/items/import` | Page | CSV bulk import |
| `/app/inventory/warehouses` | Page | Warehouse list and management |
| `/app/inventory/adjustments` | Page | Stock adjustment list |
| `/app/inventory/adjustments/new` | Page | Create adjustment |
| `/app/inventory/transfers` | Page | Stock transfer list |
| `/app/inventory/transfers/new` | Page | Create transfer |
| `/app/inventory/dashboard` | Page | Inventory overview dashboard |

### New Routes — Sprint 26.3 (Procurement)

| Route | Type | Purpose |
|-------|------|---------|
| `/app/procurement/orders` | Page | Purchase order list |
| `/app/procurement/orders/new` | Page | Create PO |
| `/app/procurement/orders/[id]` | Page | PO detail |
| `/app/procurement/orders/[id]/edit` | Page | Edit PO |
| `/app/procurement/receipts` | Page | GRN list |
| `/app/procurement/receipts/new` | Page | Create GRN against PO |
| `/app/procurement/match` | Page | 3-Way match workbench |
| `/app/pay/accounts-payable` | Page | AP dashboard |

### New Routes — Sprint 26.4 (Compliance)

| Route | Type | Purpose |
|-------|------|---------|
| `/app/intel/gst-reports/gstr-2b` | Page | GSTR-2B import and reconciliation |
| `/app/intel/compliance` | Page | Compliance dashboard |
| `/app/settings/compliance/einvoice` | Page | E-Invoice configuration |
| `/api/compliance/einvoice/generate` | API | Generate IRN |
| `/api/compliance/einvoice/cancel` | API | Cancel IRN |
| `/api/compliance/eway-bill/generate` | API | Generate E-Way Bill |

### New Routes — Sprint 26.5 (CRM & SOP)

| Route | Type | Purpose |
|-------|------|---------|
| `/app/crm` | Page | CRM dashboard |
| `/app/crm/customers` | Page | Enhanced customer list |
| `/app/crm/customers/[id]` | Page | Customer detail + timeline |
| `/app/crm/vendors` | Page | Enhanced vendor list |
| `/app/crm/vendors/[id]` | Page | Vendor detail + timeline |
| `/app/sop` | Page | SOP document list |
| `/app/sop/new` | Page | Create SOP |
| `/app/sop/[id]` | Page | View SOP |
| `/app/sop/[id]/edit` | Page | Edit SOP |

---

## 14. API and Integration Surface

### 14.1 REST API v1 Extensions

All endpoints require `Authorization: Bearer <token>` with appropriate scopes.

#### Inventory API

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/inventory/items` | `inventory:read` | List items with filters |
| POST | `/api/v1/inventory/items` | `inventory:write` | Create item |
| GET | `/api/v1/inventory/items/:id` | `inventory:read` | Get item detail |
| PUT | `/api/v1/inventory/items/:id` | `inventory:write` | Update item |
| GET | `/api/v1/inventory/items/:id/stock` | `inventory:read` | Stock levels per warehouse |
| GET | `/api/v1/inventory/warehouses` | `inventory:read` | List warehouses |
| POST | `/api/v1/inventory/stock-events` | `inventory:write` | Record stock event |

#### Procurement API

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/procurement/orders` | `procurement:read` | List POs |
| POST | `/api/v1/procurement/orders` | `procurement:write` | Create PO |
| GET | `/api/v1/procurement/orders/:id` | `procurement:read` | Get PO detail |
| POST | `/api/v1/procurement/orders/:id/approve` | `procurement:approve` | Approve PO |
| POST | `/api/v1/procurement/receipts` | `procurement:write` | Create GRN |
| GET | `/api/v1/procurement/match/:billId` | `procurement:read` | Get match result |

#### CRM API

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/crm/customers/:id/timeline` | `crm:read` | Customer timeline |
| GET | `/api/v1/crm/vendors/:id/timeline` | `crm:read` | Vendor timeline |
| POST | `/api/v1/crm/notes` | `crm:write` | Add CRM note |

### 14.2 New Webhook Events

| Event | Payload Summary |
|-------|----------------|
| `inventory.low_stock` | itemId, sku, name, currentQty, reorderLevel |
| `purchase_order.created` | poId, poNumber, vendorId, totalAmount |
| `purchase_order.approved` | poId, poNumber, approvedBy |
| `grn.confirmed` | grnId, poId, warehouseId, items[] |
| `three_way_match.completed` | matchId, poId, billId, status, score |
| `einvoice.irn_generated` | invoiceId, irnNumber, ackDate |
| `einvoice.irn_failed` | invoiceId, errorCode, errorMessage |
| `gstr2b.reconciliation_complete` | importId, period, matchedCount, unmatchedCount |
| `customer.lifecycle_changed` | customerId, from, to |

### 14.3 Workflow Trigger Extensions

New triggers registered in the Phase 25 Workflow Automation catalog:

| Trigger | Fires When |
|---------|-----------|
| `INVENTORY_LOW_STOCK` | Item stock drops below reorder level |
| `PO_APPROVED` | Purchase order approved |
| `PO_FULLY_RECEIVED` | All PO lines fully received |
| `THREE_WAY_MATCH_MISMATCH` | 3-way match finds discrepancies |
| `IRN_GENERATED` | E-Invoice IRN successfully generated |
| `IRN_FAILED` | E-Invoice IRN generation failed |
| `GSTR2B_RECONCILED` | GSTR-2B reconciliation complete |
| `CUSTOMER_LIFECYCLE_CHANGED` | Customer lifecycle stage updated |
| `VENDOR_COMPLIANCE_CHANGED` | Vendor compliance status changed |

---

## 15. Background Jobs and Cron Routes

### 15.1 New Cron Routes

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/inventory-alerts` | Daily 08:00 IST | Check low-stock and generate alerts |
| `/api/cron/einvoice-token-refresh` | Every 6 hours | Refresh NIC IRP auth tokens |
| `/api/cron/gstr2b-reconciliation` | On-demand (triggered by import) | Run GSTR-2B reconciliation engine |
| `/api/cron/crm-metrics-refresh` | Daily 02:00 IST | Recompute customer lifetime value, vendor totals |
| `/api/cron/eway-bill-expiry-alerts` | Daily 06:00 IST | Alert on E-Way Bills expiring within 24h |
| `/api/cron/stock-valuation-refresh` | Weekly Sunday 01:00 IST | Recompute all stock valuations |

### 15.2 Job Safety Requirements

- All cron jobs use `validateCronSecret(request)` authentication
- All jobs are idempotent — safe to re-run
- All jobs create `JobLog` entries with `triggeredAt`, `completedAt`, `error`
- All jobs have a maximum execution time of 30 seconds (Vercel function limit)

---

## 16. Permissions, Plan Gates, and Access Rules

### 16.1 New Plan Limits

```typescript
interface PlanLimits {
  // ... existing limits ...

  // Phase 26: Multi-Entity
  multiEntity: boolean;
  maxEntitiesPerGroup: number;     // Free=0, Starter=0, Pro=0, Enterprise=10

  // Phase 26: Inventory
  inventoryManagement: boolean;
  maxWarehouses: number;           // Free=1, Starter=2, Pro=5, Enterprise=-1
  inventoryItemsPerMonth: number;  // Free=50, Starter=500, Pro=5000, Enterprise=-1

  // Phase 26: Procurement
  procurementModule: boolean;
  purchaseOrdersPerMonth: number;  // Free=0, Starter=20, Pro=200, Enterprise=-1

  // Phase 26: Compliance
  gstr2bReconciliation: boolean;
  eInvoiceGeneration: boolean;

  // Phase 26: CRM
  crmModule: boolean;

  // Phase 26: SOP
  sopDocuments: number;            // Free=5, Starter=20, Pro=100, Enterprise=-1
}
```

### 16.2 Role-Based Access

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Manage Entity Group | Yes | Yes | No | No |
| Create Inventory Item | Yes | Yes | Yes | No |
| Create Stock Adjustment | Yes | Yes | Yes | No |
| Approve Stock Adjustment | Yes | Yes | No | No |
| Create Purchase Order | Yes | Yes | Yes | No |
| Approve Purchase Order | Yes | Yes | No | No |
| Create GRN | Yes | Yes | Yes | No |
| Waive 3-Way Match | Yes | Yes | No | No |
| Import GSTR-2B | Yes | Yes | No | No |
| Generate IRN | Yes | Yes | Yes | No |
| Configure E-Invoice | Yes | Yes | No | No |
| Manage CRM Notes | Yes | Yes | Yes | No |
| Update Lifecycle Stage | Yes | Yes | Yes | No |
| Create SOP | Yes | Yes | Yes | No |
| Publish SOP | Yes | Yes | No | No |
| View Published SOP | Yes | Yes | Yes | Yes |

### 16.3 IDOR Prevention Rules

Every query and mutation MUST include `orgId` filtering:

```typescript
// CORRECT: Always scope to org
const item = await db.inventoryItem.findFirst({
  where: { id: itemId, orgId: auth.orgId }
});

// WRONG: Never trust client-supplied orgId
const item = await db.inventoryItem.findUnique({
  where: { id: itemId } // IDOR vulnerability
});
```

**Multi-Entity Additional Rule:** Entity group queries must verify that the requesting user has admin access to the **parent** org in the group. A subsidiary user cannot read other subsidiaries' data even within the same group.

---

## 17. Business Rules and Validation Logic

### 17.1 Inventory Valuation Rounding

- All monetary values in inventory are stored as `Decimal` (Prisma) which maps to `numeric` in PostgreSQL
- FIFO/LIFO unit cost: round to 2 decimal places after computation
- Weighted average: round to 4 decimal places (to prevent compounding rounding errors), then round to 2 for COGS postings
- Journal entry amounts: always balanced to the paisa (Rs 0.01)

### 17.2 Tax Calculation in Purchase Orders

- GST on PO lines follows the same logic as Invoice line items:
  - Intrastate: CGST (rate/2) + SGST (rate/2)
  - Interstate: IGST (full rate)
  - Determined by comparing `organization.defaults.placeOfSupply` with vendor's state

### 17.3 3-Way Match Tolerance Defaults

| Parameter | Default | Min | Max | Unit |
|-----------|---------|-----|-----|------|
| Quantity tolerance | 5.0 | 0.0 | 20.0 | % |
| Amount tolerance | 2.0 | 0.0 | 10.0 | % |

### 17.4 E-Invoice Date Constraints

- IRN must be generated within 30 days of invoice date (NIC rule, enforced client-side)
- IRN cancellation: within 24 hours of generation only
- E-Way Bill: valid for 1 day per 200 km for regular cargo (Part B not enforced in v1, informational only)

### 17.5 Stock Level Consistency

After every `StockEvent` write, the system MUST atomically update the corresponding `StockLevel`:

```typescript
await db.$transaction([
  db.stockEvent.create({ data: eventData }),
  db.stockLevel.upsert({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
    create: { orgId, inventoryItemId, warehouseId, quantity: qty, availableQty: qty },
    update: { quantity: { increment: qty }, availableQty: { increment: qty } }
  })
]);
```

---

## 18. Edge Cases and Acceptance Criteria

### 18.1 Multi-Entity Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|------------------|
| ME-1 | User belongs to 2 subsidiaries in same group | Session tracks activeOrgId; user can switch via org switcher |
| ME-2 | Subsidiary is removed from group while ICT is PENDING | ICT is cancelled automatically |
| ME-3 | Holding admin views consolidated report but one subsidiary has no data | Empty subsidiary contributes zero to all accounts |
| ME-4 | Circular parent reference attempted | Validate: parentOrgId != id and no cycles in hierarchy |

### 18.2 Inventory Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|------------------|
| INV-1 | Stock dispatch for more than available qty | Reject with error: "Insufficient stock" |
| INV-2 | Transfer where source warehouse has 0 stock | Reject with error: "Cannot transfer from empty stock" |
| INV-3 | FIFO valuation with only one purchase batch | Use that batch's unit cost for all dispatches |
| INV-4 | Stock adjustment for item that doesn't track inventory | Reject: trackInventory must be true |
| INV-5 | Weighted average with zero total quantity | Set avgCost = last known cost; prevent division by zero |
| INV-6 | Concurrent stock events for same item | Database transaction isolation prevents race conditions |
| INV-7 | CSV import with duplicate SKU | Reject duplicate row with specific error message |
| INV-8 | Item archival with positive stock | Warn user; require zero stock or force archive |

### 18.3 Procurement Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|------------------|
| PO-1 | GRN exceeds PO quantity | Allow with warning (over-receipt); flag in match result |
| PO-2 | Multiple GRNs for same PO | Each GRN adds to cumulative receivedQty; PO status updates accordingly |
| PO-3 | Vendor Bill references PO that is CANCELLED | Reject PO linkage; bill can proceed without PO |
| PO-4 | 3-Way Match on bill with no linked PO | Skip match; bill follows normal approval flow |
| PO-5 | PO approved then vendor is archived | PO remains valid; vendor archival shows warning |
| PO-6 | PO amount exceeds approval threshold mid-edit | Re-trigger approval chain on save |

### 18.4 Compliance Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|------------------|
| EI-1 | NIC API returns 500 error | Retry up to 3 times with exponential backoff; mark FAILED after 3 |
| EI-2 | IRN generation for invoice without HSN codes | Block with validation error |
| EI-3 | IRN cancellation after 24 hours | Reject with NIC error code display |
| EI-4 | GSTR-2B duplicate file upload (same hash) | Reject with "Already imported" message |
| EI-5 | GSTR-2B entry matches multiple vendor bills | Show all candidates; user must manually select |
| EI-6 | NIC auth token expired mid-request | Auto-refresh token and retry once |

### 18.5 CRM Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|------------------|
| CRM-1 | Timeline for customer with 10,000+ interactions | Paginate; load most recent 50 first, lazy-load on scroll |
| CRM-2 | Customer deleted but has CRM notes | Cascade delete notes; timeline returns empty |
| CRM-3 | Vendor compliance set to BLOCKED | Block new PO creation for this vendor |
| CRM-4 | SOP with same slug as existing | Auto-append counter: my-process-2 |

---

## 19. Test Plan

### 19.1 Vitest Unit Tests (Minimum 55 Tests)

#### Multi-Entity Tests (8)

| ID | Test Case |
|----|-----------|
| ME-T1 | consolidateTrialBalance correctly sums balances across 3 entities |
| ME-T2 | consolidateTrialBalance eliminates inter-company receivable/payable |
| ME-T3 | createInterCompanyTransfer creates paired journal entries in both orgs |
| ME-T4 | Entity hierarchy validation rejects circular parent reference |
| ME-T5 | Entity removal cancels pending ICTs |
| ME-T6 | Consolidated P&L excludes inter-company revenue/expense |
| ME-T7 | requireOrgContext scopes queries to active entity only |
| ME-T8 | Group admin can read all entities; subsidiary admin cannot |

#### Inventory Tests (12)

| ID | Test Case |
|----|-----------|
| INV-T1 | computeFifoValuation consumes oldest batches first |
| INV-T2 | computeLifoValuation consumes newest batches first |
| INV-T3 | computeWeightedAverage recalculates on stock-in event |
| INV-T4 | StockEvent creation atomically updates StockLevel |
| INV-T5 | Stock dispatch rejected when availableQty < requested |
| INV-T6 | Stock adjustment posts correct journal entries (debit/credit) |
| INV-T7 | Stock transfer creates TRANSFER_OUT and TRANSFER_IN event pair |
| INV-T8 | Low-stock alert fires when availableQty <= reorderLevel |
| INV-T9 | CSV import validates SKU uniqueness and rejects duplicates |
| INV-T10 | Weighted average handles zero-quantity edge case |
| INV-T11 | FIFO with multiple batches, partial consumption across two dispatches |
| INV-T12 | Reserved quantity reduces availableQty but not total quantity |

#### Procurement Tests (10)

| ID | Test Case |
|----|-----------|
| PO-T1 | PO creation with line items calculates correct totals |
| PO-T2 | PO approval routing for amounts above threshold |
| PO-T3 | GRN confirmation creates PURCHASE_RECEIPT stock events |
| PO-T4 | GRN updates PO line receivedQty correctly for partial receipt |
| PO-T5 | Full receipt transitions PO to FULLY_RECEIVED |
| PO-T6 | 3-Way Match returns MATCHED for quantities within tolerance |
| PO-T7 | 3-Way Match returns MISMATCH for 20% quantity variance |
| PO-T8 | 3-Way Match returns PARTIAL_MATCH for mixed line results |
| PO-T9 | Mismatched bill cannot transition to APPROVED |
| PO-T10 | Match waiver requires admin role and creates audit log |

#### Compliance Tests (10)

| ID | Test Case |
|----|-----------|
| EI-T1 | buildEInvoicePayload generates valid NIC v1.03 JSON |
| EI-T2 | buildEInvoicePayload includes correct GSTIN for buyer/seller |
| EI-T3 | buildEInvoicePayload calculates item-level tax amounts correctly |
| EI-T4 | E-Invoice credentials are encrypted with AES-256-CBC |
| EI-T5 | parseGstr2bJson extracts all B2B entries correctly |
| EI-T6 | reconcileGstr2b finds exact match by GSTIN + invoice number |
| EI-T7 | reconcileGstr2b suggests fuzzy match for similar invoice numbers |
| EI-T8 | reconcileGstr2b identifies NOT_IN_BOOKS entries |
| EI-T9 | reconcileGstr2b identifies NOT_IN_GSTR2B entries |
| EI-T10 | Duplicate GSTR-2B import (same file hash) is rejected |

#### CRM & SOP Tests (10)

| ID | Test Case |
|----|-----------|
| CRM-T1 | Customer timeline aggregates invoices, payments, and tickets in order |
| CRM-T2 | Vendor timeline includes POs, bills, and payments |
| CRM-T3 | CRM note creation is org-scoped |
| CRM-T4 | Customer lifecycle stage update fires workflow trigger |
| CRM-T5 | Vendor compliance BLOCKED prevents new PO creation |
| CRM-T6 | Timeline pagination returns correct page for large datasets |
| SOP-T1 | SOP creation with markdown content and category |
| SOP-T2 | SOP slug auto-generation and uniqueness |
| SOP-T3 | Published SOPs visible to all members; drafts only to creator |
| SOP-T4 | SOP search matches both title and content |

#### Additional Cross-Cutting Tests (5)

| ID | Test Case |
|----|-----------|
| XC-T1 | IDOR: inventory item read scoped to orgId |
| XC-T2 | IDOR: PO creation rejects vendorId from different org |
| XC-T3 | Plan gate: inventoryManagement=false blocks item creation |
| XC-T4 | Plan gate: multiEntity=false blocks entity group creation |
| XC-T5 | Auto-numbering: PO and GRN numbers increment correctly |

### 19.2 Playwright E2E Tests (Minimum 5)

| ID | Test Case |
|----|-----------|
| E2E-1 | Create inventory item, create PO, create GRN, verify stock level |
| E2E-2 | Upload GSTR-2B JSON, verify reconciliation results displayed |
| E2E-3 | Create PO, submit for approval, approve, verify status change |
| E2E-4 | Create SOP, publish, verify visible to other team member |
| E2E-5 | Create customer, add CRM note, verify in timeline |

---

## 20. Non-Functional Requirements

### 20.1 Performance

- Inventory item list: <500ms for up to 10,000 items with search/filter
- Stock level query: <100ms for single item across all warehouses
- GSTR-2B reconciliation: <30s for 500 entries (runs as background job)
- CRM timeline: <500ms for first page (50 events) with up to 10,000 total events
- Consolidated report: <5s for up to 10 entities

### 20.2 Data Integrity

- Stock events are immutable (no UPDATE/DELETE)
- Stock levels are transactionally consistent with stock events
- 3-Way Match results cannot be edited directly — only through resolution workflow
- ICT journal entries are always paired and balanced
- E-Invoice request/response payloads are stored verbatim for audit

### 20.3 Scalability

- Inventory module: support up to 50,000 items per org
- Stock events: support up to 1M events per org (with proper indexing)
- GSTR-2B: support up to 10,000 entries per import
- SOP documents: no practical limit (stored as text)

---

## 21. Environment Variables and External Dependencies

### 21.1 New Environment Variables

| Variable | Purpose | Required For |
|----------|---------|-------------|
| `NIC_IRP_SANDBOX_URL` | NIC E-Invoice Sandbox API base URL | Sprint 26.4 |
| `NIC_IRP_CLIENT_ID` | NIC API client ID (if using ASP/GSP model) | Sprint 26.4 |
| `NIC_IRP_CLIENT_SECRET` | NIC API client secret | Sprint 26.4 |
| `EINVOICE_ENCRYPTION_KEY` | AES-256 key for encrypting org-level IRP credentials | Sprint 26.4 |

### 21.2 External Dependencies

| Service | Purpose | Sprint |
|---------|---------|--------|
| NIC IRP Sandbox API | E-Invoice IRN generation | 26.4 |
| GST Portal (manual download) | GSTR-2B JSON files | 26.4 |

### 21.3 No New NPM Dependencies Required

The existing stack provides everything needed:
- `crypto` (Node.js built-in) for AES-256-CBC encryption
- `@prisma/client` for all database operations
- `zod` for payload validation
- `resend` for email notifications (existing)
- Markdown rendering: existing component library or `react-markdown` (already in dependency tree)

---

## 22. Security Model

### 22.1 Multi-Entity Data Isolation

The multi-entity model introduces a **hierarchy-aware** trust boundary:

```
EntityGroup
  |-- Org A (Holding) <- Admin can see consolidated data
  |   |-- Org B (Subsidiary) <- Admin can see ONLY Org B data
  |   +-- Org C (Subsidiary) <- Admin can see ONLY Org C data
```

**Enforcement:** The `requireOrgContext()` function returns `{ orgId, userId, role }`. All queries filter by `orgId`. Consolidation queries execute N separate org-scoped queries and merge results in application code—never with a single cross-org database query.

### 22.2 E-Invoice Credential Security

- Org-level NIC IRP credentials are AES-256-CBC encrypted before storage
- The encryption key is from environment variable `EINVOICE_ENCRYPTION_KEY`
- Same encryption pattern used for Razorpay credentials in Phase 24
- Credentials are decrypted only at the moment of API call, never cached in plaintext
- Auth tokens are cached with expiry tracking (`tokenExpiresAt`) and refreshed proactively

### 22.3 Procurement Financial Controls

- PO amounts above configurable thresholds require multi-step approval
- 3-Way Match mismatch blocks bill approval (cannot be bypassed without admin waiver + audit log)
- Match waiver creates an `AuditLog` entry with: actor, bill ID, PO ID, mismatch details, waiver reason
- VendorBill payment cannot be executed for bills with `matchStatus = MISMATCH` unless waived

### 22.4 API IDOR Prevention Checklist

Every new API endpoint and server action MUST:

1. Call `requireOrgContext()` or `requireRole()` as the first operation
2. Include `orgId` in every database query `where` clause
3. Never accept `orgId` as a client-supplied parameter
4. Use `findFirst({ where: { id, orgId } })` instead of `findUnique({ where: { id } })` for entity lookups
5. For multi-entity operations, verify the user has group-level admin access

---

## 23. Risk Register

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| R1 | NIC IRP Sandbox API instability or breaking changes | E-Invoice feature blocked | Implement mock mode for testing; abstract API calls behind an adapter |
| R2 | GSTR-2B JSON format changes across GST portal updates | Parser breaks silently | Version the parser; validate schema on upload; reject unknown formats |
| R3 | Stock level inconsistency due to concurrent operations | Financial misstatement | Use database transactions with serializable isolation for stock mutations |
| R4 | Multi-entity consolidation performance on large entity groups | Slow reports | Cap entity group size; implement result caching with TTL |
| R5 | 3-Way Match false positives due to loose tolerances | Incorrect payments approved | Default to strict tolerances (2%/5%); surface all variances in UI |
| R6 | FIFO/LIFO valuation complexity for high-volume items | Computational overhead | Batch valuation recalculation; run weekly as cron job |
| R7 | Inter-company transfer elimination in consolidated reports | Incorrect consolidation | Strict paired-entry model; validation job to detect orphaned ICTs |
| R8 | SOP content becomes stale without review reminders | Operational risk for users | Deferred to future sprint (review reminders, version tracking) |
| R9 | CRM timeline query performance degrades over time | UX degradation | Pagination, indexed queries, consider materialized view if needed |
| R10 | Entity group misuse (adding non-related orgs) | Data governance | Admin-only creation; cannot self-add; requires invitation workflow |

---

## 24. Branch Strategy and PR Workflow

### 24.1 Branch Hierarchy

```
master
  +-- feature/phase-26
      |-- feature/phase-26-sprint-26-1  (Multi-Entity)      -> PR -> feature/phase-26
      |-- feature/phase-26-sprint-26-2  (Inventory)          -> PR -> feature/phase-26
      |-- feature/phase-26-sprint-26-3  (Procurement)        -> PR -> feature/phase-26
      |-- feature/phase-26-sprint-26-4  (Compliance)         -> PR -> feature/phase-26
      +-- feature/phase-26-sprint-26-5  (CRM & SOP)          -> PR -> feature/phase-26
```

### 24.2 Sprint Execution Order

Sprints MUST be executed in order due to dependencies:

| Sprint | Depends On | Reason |
|--------|-----------|--------|
| 26.1 | None | Multi-entity is foundational |
| 26.2 | 26.1 (soft) | Inventory items are entity-scoped |
| 26.3 | 26.2 | PO lines reference InventoryItem; GRN creates stock events |
| 26.4 | None (independent) | GSTR-2B recon and E-Invoice are standalone modules |
| 26.5 | 26.3 (soft) | CRM vendor timeline includes POs; PO creation blocked for BLOCKED vendors |

**Recommended parallel execution:** Sprint 26.4 can be developed in parallel with 26.2/26.3 since it has no hard dependencies.

### 24.3 Merge Rules

1. Each sprint branch is created from the **merged state** of all prior sprints on `feature/phase-26`
2. Sprint PRs target `feature/phase-26` only — never `master`
3. After all 5 sprint PRs are merged into `feature/phase-26`, a pre-master audit is conducted
4. Only after the audit passes is `feature/phase-26` merged into `master`
5. The merge to `master` uses `--no-ff` to preserve the merge commit

### 24.4 Quality Gates Per Sprint

Before opening each sprint PR:

- `npm run lint` passes with 0 errors
- `npm run build` succeeds
- `npx vitest run` — all tests pass
- `npx tsc --noEmit` — 0 production type errors
- No `TODO`, `FIXME`, or placeholder stubs in committed code
- All server actions use `requireOrgContext()` or `requireRole()`
- All database queries include `orgId` in `where` clause

---

*End of Phase 26 PRD — Enterprise ERP & Advanced Financials*
