-- Migration: Phase 26 Sprint 26.2 & 26.3 — Item Master, Inventory WMS, Procurement & AP OS
-- Created: 2026-05-01

-- ────────────────────────────────────────────────────────────────────────────────
-- New enums
-- ────────────────────────────────────────────────────────────────────────────────

CREATE TYPE "InventoryValuationMethod" AS ENUM ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE');

CREATE TYPE "StockEventType" AS ENUM (
  'PURCHASE_RECEIPT', 'SALES_DISPATCH', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
  'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN_IN', 'RETURN_OUT', 'OPENING_BALANCE'
);

CREATE TYPE "StockAdjustmentReason" AS ENUM (
  'PHYSICAL_COUNT', 'DAMAGE', 'THEFT', 'EXPIRED', 'FOUND', 'CORRECTION', 'OTHER'
);

CREATE TYPE "StockAdjustmentStatus" AS ENUM (
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'CANCELLED'
);

CREATE TYPE "StockTransferStatus" AS ENUM (
  'DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "PurchaseOrderStatus" AS ENUM (
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "GrnStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TYPE "MatchStatus" AS ENUM (
  'PENDING', 'MATCHED', 'PARTIAL_MATCH', 'MISMATCH', 'RESOLVED', 'WAIVED'
);

-- ────────────────────────────────────────────────────────────────────────────────
-- Alter existing tables
-- ────────────────────────────────────────────────────────────────────────────────

-- OrgDefaults: PO/GRN numbering + match tolerances
ALTER TABLE "org_defaults"
  ADD COLUMN IF NOT EXISTS "poPrefix"               TEXT    NOT NULL DEFAULT 'PO',
  ADD COLUMN IF NOT EXISTS "poCounter"              INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "grnPrefix"              TEXT    NOT NULL DEFAULT 'GRN',
  ADD COLUMN IF NOT EXISTS "grnCounter"             INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "matchQtyTolerancePct"   DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS "matchAmountTolerancePct" DOUBLE PRECISION NOT NULL DEFAULT 2.0;

-- InvoiceLineItem: link to InventoryItem
ALTER TABLE "invoice_line_item"
  ADD COLUMN IF NOT EXISTS "inventoryItemId" TEXT;

-- VendorBill: procurement linkage
ALTER TABLE "vendor_bill"
  ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "matchStatus"     "MatchStatus" NOT NULL DEFAULT 'PENDING';

-- ────────────────────────────────────────────────────────────────────────────────
-- Sprint 26.2: Item Master & Warehouse Management
-- ────────────────────────────────────────────────────────────────────────────────

CREATE TABLE "inventory_item" (
  "id"              TEXT    NOT NULL,
  "orgId"           TEXT    NOT NULL,
  "sku"             TEXT    NOT NULL,
  "name"            TEXT    NOT NULL,
  "description"     TEXT,
  "category"        TEXT,
  "unit"            TEXT    NOT NULL DEFAULT 'PCS',
  "hsnSacCodeId"    TEXT,
  "gstRate"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPrice"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "sellingPrice"    DECIMAL(65,30) NOT NULL DEFAULT 0,
  "reorderLevel"    INTEGER NOT NULL DEFAULT 0,
  "reorderQuantity" INTEGER NOT NULL DEFAULT 0,
  "valuationMethod" "InventoryValuationMethod" NOT NULL DEFAULT 'FIFO',
  "trackInventory"  BOOLEAN NOT NULL DEFAULT true,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "imageUrl"        TEXT,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"      TIMESTAMP(3),
  CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_item_orgId_sku_key" ON "inventory_item"("orgId", "sku");
CREATE INDEX "inventory_item_orgId_isActive_idx" ON "inventory_item"("orgId", "isActive");
CREATE INDEX "inventory_item_orgId_category_idx" ON "inventory_item"("orgId", "category");
CREATE INDEX "invoice_line_item_inventoryItemId_idx" ON "invoice_line_item"("inventoryItemId");

CREATE TABLE "warehouse" (
  "id"        TEXT    NOT NULL,
  "orgId"     TEXT    NOT NULL,
  "name"      TEXT    NOT NULL,
  "code"      TEXT    NOT NULL,
  "address"   TEXT,
  "city"      TEXT,
  "state"     TEXT,
  "pincode"   TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouse_orgId_code_key" ON "warehouse"("orgId", "code");
CREATE INDEX "warehouse_orgId_isActive_idx" ON "warehouse"("orgId", "isActive");

CREATE TABLE "stock_level" (
  "id"              TEXT    NOT NULL,
  "orgId"           TEXT    NOT NULL,
  "inventoryItemId" TEXT    NOT NULL,
  "warehouseId"     TEXT    NOT NULL,
  "quantity"        INTEGER NOT NULL DEFAULT 0,
  "reservedQty"     INTEGER NOT NULL DEFAULT 0,
  "availableQty"    INTEGER NOT NULL DEFAULT 0,
  "valuationAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "lastEventAt"     TIMESTAMP(3),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_level_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_level_inventoryItemId_warehouseId_key" ON "stock_level"("inventoryItemId", "warehouseId");
CREATE INDEX "stock_level_orgId_warehouseId_idx" ON "stock_level"("orgId", "warehouseId");

CREATE TABLE "stock_event" (
  "id"              TEXT    NOT NULL,
  "orgId"           TEXT    NOT NULL,
  "inventoryItemId" TEXT    NOT NULL,
  "warehouseId"     TEXT    NOT NULL,
  "eventType"       "StockEventType" NOT NULL,
  "quantity"        INTEGER NOT NULL,
  "unitCost"        DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalCost"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "referenceType"   TEXT,
  "referenceId"     TEXT,
  "note"            TEXT,
  "createdByUserId" UUID    NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_event_inventoryItemId_warehouseId_createdAt_idx" ON "stock_event"("inventoryItemId", "warehouseId", "createdAt");
CREATE INDEX "stock_event_orgId_eventType_createdAt_idx" ON "stock_event"("orgId", "eventType", "createdAt");
CREATE INDEX "stock_event_referenceType_referenceId_idx" ON "stock_event"("referenceType", "referenceId");

CREATE TABLE "stock_adjustment" (
  "id"               TEXT    NOT NULL,
  "orgId"            TEXT    NOT NULL,
  "adjustmentNumber" TEXT    NOT NULL,
  "warehouseId"      TEXT    NOT NULL,
  "reason"           "StockAdjustmentReason" NOT NULL,
  "notes"            TEXT,
  "status"           "StockAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
  "journalEntryId"   TEXT,
  "approvedByUserId" UUID,
  "approvedAt"       TIMESTAMP(3),
  "createdByUserId"  UUID    NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_adjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_adjustment_orgId_adjustmentNumber_key" ON "stock_adjustment"("orgId", "adjustmentNumber");
CREATE UNIQUE INDEX "stock_adjustment_journalEntryId_key" ON "stock_adjustment"("journalEntryId");
CREATE INDEX "stock_adjustment_orgId_status_idx" ON "stock_adjustment"("orgId", "status");

CREATE TABLE "stock_adjustment_line" (
  "id"              TEXT    NOT NULL,
  "adjustmentId"    TEXT    NOT NULL,
  "inventoryItemId" TEXT    NOT NULL,
  "quantityChange"  INTEGER NOT NULL,
  "unitCost"        DECIMAL(65,30) NOT NULL DEFAULT 0,
  "reason"          TEXT,
  CONSTRAINT "stock_adjustment_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_transfer" (
  "id"                TEXT    NOT NULL,
  "orgId"             TEXT    NOT NULL,
  "transferNumber"    TEXT    NOT NULL,
  "fromWarehouseId"   TEXT    NOT NULL,
  "toWarehouseId"     TEXT    NOT NULL,
  "status"            "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"             TEXT,
  "initiatedByUserId" UUID    NOT NULL,
  "approvedByUserId"  UUID,
  "approvedAt"        TIMESTAMP(3),
  "completedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_transfer_orgId_transferNumber_key" ON "stock_transfer"("orgId", "transferNumber");
CREATE INDEX "stock_transfer_orgId_status_idx" ON "stock_transfer"("orgId", "status");

CREATE TABLE "stock_transfer_line" (
  "id"              TEXT    NOT NULL,
  "transferId"      TEXT    NOT NULL,
  "inventoryItemId" TEXT    NOT NULL,
  "quantity"        INTEGER NOT NULL,
  CONSTRAINT "stock_transfer_line_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────────────────────────
-- Sprint 26.3: Procurement & Accounts Payable
-- ────────────────────────────────────────────────────────────────────────────────

CREATE TABLE "purchase_order" (
  "id"                 TEXT    NOT NULL,
  "orgId"              TEXT    NOT NULL,
  "vendorId"           TEXT    NOT NULL,
  "poNumber"           TEXT    NOT NULL,
  "poDate"             TEXT    NOT NULL,
  "expectedDelivery"   TEXT,
  "status"             "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "formData"           JSONB,
  "subtotalAmount"     DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxAmount"          DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalAmount"        DECIMAL(65,30) NOT NULL DEFAULT 0,
  "currency"           TEXT    NOT NULL DEFAULT 'INR',
  "warehouseId"        TEXT,
  "notes"              TEXT,
  "termsAndConditions" TEXT,
  "supplierGstin"      TEXT,
  "placeOfSupply"      TEXT,
  "gstTotalCgst"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "gstTotalSgst"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "gstTotalIgst"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "approvedByUserId"   UUID,
  "approvedAt"         TIMESTAMP(3),
  "rejectedByUserId"   UUID,
  "rejectedAt"         TIMESTAMP(3),
  "rejectionReason"    TEXT,
  "createdByUserId"    UUID    NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"         TIMESTAMP(3),
  CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_order_orgId_poNumber_key" ON "purchase_order"("orgId", "poNumber");
CREATE INDEX "purchase_order_orgId_status_idx" ON "purchase_order"("orgId", "status");
CREATE INDEX "purchase_order_vendorId_idx" ON "purchase_order"("vendorId");
CREATE INDEX "vendor_bill_purchaseOrderId_idx" ON "vendor_bill"("purchaseOrderId");

CREATE TABLE "purchase_order_line" (
  "id"              TEXT    NOT NULL,
  "purchaseOrderId" TEXT    NOT NULL,
  "inventoryItemId" TEXT,
  "description"     TEXT    NOT NULL,
  "quantity"        DECIMAL(65,30) NOT NULL DEFAULT 1,
  "unitPrice"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxRate"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount"        DECIMAL(65,30) NOT NULL DEFAULT 0,
  "lineTotal"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "hsnCode"         TEXT,
  "gstRate"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cgstAmount"      DECIMAL(65,30) NOT NULL DEFAULT 0,
  "sgstAmount"      DECIMAL(65,30) NOT NULL DEFAULT 0,
  "igstAmount"      DECIMAL(65,30) NOT NULL DEFAULT 0,
  "receivedQty"     DECIMAL(65,30) NOT NULL DEFAULT 0,
  "billedQty"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  CONSTRAINT "purchase_order_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goods_receipt_note" (
  "id"               TEXT    NOT NULL,
  "orgId"            TEXT    NOT NULL,
  "purchaseOrderId"  TEXT    NOT NULL,
  "grnNumber"        TEXT    NOT NULL,
  "receiptDate"      TEXT    NOT NULL,
  "warehouseId"      TEXT    NOT NULL,
  "status"           "GrnStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"            TEXT,
  "inspectionNotes"  TEXT,
  "receivedByUserId" UUID    NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goods_receipt_note_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "goods_receipt_note_orgId_grnNumber_key" ON "goods_receipt_note"("orgId", "grnNumber");
CREATE INDEX "goods_receipt_note_orgId_status_idx" ON "goods_receipt_note"("orgId", "status");
CREATE INDEX "goods_receipt_note_purchaseOrderId_idx" ON "goods_receipt_note"("purchaseOrderId");

CREATE TABLE "goods_receipt_note_line" (
  "id"              TEXT    NOT NULL,
  "grnId"           TEXT    NOT NULL,
  "poLineId"        TEXT    NOT NULL,
  "receivedQty"     DECIMAL(65,30) NOT NULL,
  "acceptedQty"     DECIMAL(65,30) NOT NULL DEFAULT 0,
  "rejectedQty"     DECIMAL(65,30) NOT NULL DEFAULT 0,
  "rejectionReason" TEXT,
  CONSTRAINT "goods_receipt_note_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "three_way_match_result" (
  "id"               TEXT    NOT NULL,
  "orgId"            TEXT    NOT NULL,
  "purchaseOrderId"  TEXT    NOT NULL,
  "vendorBillId"     TEXT    NOT NULL,
  "matchStatus"      "MatchStatus" NOT NULL DEFAULT 'PENDING',
  "qtyMatchScore"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overallScore"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discrepancies"    JSONB,
  "resolvedByUserId" UUID,
  "resolvedAt"       TIMESTAMP(3),
  "resolutionNote"   TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "three_way_match_result_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "three_way_match_result_purchaseOrderId_vendorBillId_key" ON "three_way_match_result"("purchaseOrderId", "vendorBillId");
CREATE INDEX "three_way_match_result_orgId_matchStatus_idx" ON "three_way_match_result"("orgId", "matchStatus");

-- ────────────────────────────────────────────────────────────────────────────────
-- Foreign key constraints
-- ────────────────────────────────────────────────────────────────────────────────

-- inventory_item
ALTER TABLE "inventory_item"
  ADD CONSTRAINT "inventory_item_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_item_hsnSacCodeId_fkey" FOREIGN KEY ("hsnSacCodeId") REFERENCES "hsn_sac_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- invoice_line_item -> inventory_item
ALTER TABLE "invoice_line_item"
  ADD CONSTRAINT "invoice_line_item_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- warehouse
ALTER TABLE "warehouse"
  ADD CONSTRAINT "warehouse_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- stock_level
ALTER TABLE "stock_level"
  ADD CONSTRAINT "stock_level_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_level_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_level_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- stock_event
ALTER TABLE "stock_event"
  ADD CONSTRAINT "stock_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_event_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_event_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- stock_adjustment
ALTER TABLE "stock_adjustment"
  ADD CONSTRAINT "stock_adjustment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_adjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_adjustment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- stock_adjustment_line
ALTER TABLE "stock_adjustment_line"
  ADD CONSTRAINT "stock_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_adjustment_line_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- stock_transfer
ALTER TABLE "stock_transfer"
  ADD CONSTRAINT "stock_transfer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- stock_transfer_line
ALTER TABLE "stock_transfer_line"
  ADD CONSTRAINT "stock_transfer_line_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transfer_line_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- purchase_order
ALTER TABLE "purchase_order"
  ADD CONSTRAINT "purchase_order_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- purchase_order_line
ALTER TABLE "purchase_order_line"
  ADD CONSTRAINT "purchase_order_line_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_line_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- vendor_bill -> purchase_order
ALTER TABLE "vendor_bill"
  ADD CONSTRAINT "vendor_bill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- goods_receipt_note
ALTER TABLE "goods_receipt_note"
  ADD CONSTRAINT "goods_receipt_note_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "goods_receipt_note_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "goods_receipt_note_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- goods_receipt_note_line
ALTER TABLE "goods_receipt_note_line"
  ADD CONSTRAINT "goods_receipt_note_line_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_receipt_note"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "goods_receipt_note_line_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "purchase_order_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- three_way_match_result
ALTER TABLE "three_way_match_result"
  ADD CONSTRAINT "three_way_match_result_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "three_way_match_result_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "three_way_match_result_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
