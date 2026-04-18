-- Phase 26 Sprint 26.4: Advanced Compliance & E-Invoicing v2
-- Phase 26 Sprint 26.5: Enterprise CRM & SOP Knowledge Base

-- ─── Sprint 26.4: New Enums ──────────────────────────────────────────────────

CREATE TYPE "gstr2b_import_status" AS ENUM (
  'UPLOADED', 'PARSING', 'PARSED', 'RECONCILING', 'RECONCILED', 'FAILED'
);

CREATE TYPE "gstr2b_match_status" AS ENUM (
  'UNMATCHED', 'AUTO_MATCHED', 'SUGGESTED', 'MANUALLY_MATCHED',
  'MISMATCH', 'NOT_IN_BOOKS', 'NOT_IN_GSTR2B'
);

CREATE TYPE "e_invoice_request_type" AS ENUM (
  'GENERATE_IRN', 'CANCEL_IRN', 'GENERATE_EWAY_BILL', 'CANCEL_EWAY_BILL'
);

CREATE TYPE "e_invoice_status" AS ENUM (
  'PENDING', 'SUBMITTED', 'SUCCESS', 'FAILED', 'CANCELLED'
);

-- ─── Sprint 26.5: New Enums ──────────────────────────────────────────────────

CREATE TYPE "customer_lifecycle_stage" AS ENUM (
  'PROSPECT', 'QUALIFIED', 'NEGOTIATION', 'WON', 'ACTIVE', 'AT_RISK', 'CHURNED'
);

CREATE TYPE "vendor_compliance_status" AS ENUM (
  'PENDING', 'VERIFIED', 'SUSPENDED', 'BLOCKED'
);

CREATE TYPE "sop_document_status" AS ENUM (
  'DRAFT', 'PUBLISHED', 'ARCHIVED'
);

-- ─── Sprint 26.4: New Tables ─────────────────────────────────────────────────

CREATE TABLE "gstr2b_import" (
  "id"                TEXT         NOT NULL,
  "orgId"             TEXT         NOT NULL,
  "period"            TEXT         NOT NULL,
  "fileKey"           TEXT,
  "rawJson"           JSONB,
  "importedByUserId"  UUID         NOT NULL,
  "status"            "gstr2b_import_status" NOT NULL DEFAULT 'UPLOADED',
  "totalEntries"      INTEGER      NOT NULL DEFAULT 0,
  "matchedCount"      INTEGER      NOT NULL DEFAULT 0,
  "unmatchedCount"    INTEGER      NOT NULL DEFAULT 0,
  "mismatchCount"     INTEGER      NOT NULL DEFAULT 0,
  "notInBooksCount"   INTEGER      NOT NULL DEFAULT 0,
  "errorMessage"      TEXT,
  "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "gstr2b_import_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gstr2b_import_orgId_fkey" FOREIGN KEY ("orgId")
    REFERENCES "organization"("id") ON DELETE CASCADE
);

CREATE INDEX "gstr2b_import_orgId_period_idx"  ON "gstr2b_import"("orgId", "period");
CREATE INDEX "gstr2b_import_orgId_status_idx"  ON "gstr2b_import"("orgId", "status");

CREATE TABLE "gstr2b_entry" (
  "id"                  TEXT          NOT NULL,
  "importId"            TEXT          NOT NULL,
  "orgId"               TEXT          NOT NULL,
  "supplierGstin"       TEXT          NOT NULL,
  "supplierName"        TEXT,
  "docNumber"           TEXT          NOT NULL,
  "docDate"             TEXT          NOT NULL,
  "docType"             TEXT          NOT NULL,
  "taxableAmount"       DECIMAL(15,2) NOT NULL,
  "cgst"                DECIMAL(15,2) NOT NULL DEFAULT 0,
  "sgst"                DECIMAL(15,2) NOT NULL DEFAULT 0,
  "igst"                DECIMAL(15,2) NOT NULL DEFAULT 0,
  "cess"                DECIMAL(15,2) NOT NULL DEFAULT 0,
  "totalTax"            DECIMAL(15,2) NOT NULL DEFAULT 0,
  "matchStatus"         "gstr2b_match_status" NOT NULL DEFAULT 'UNMATCHED',
  "matchedBillId"       TEXT,
  "matchConfidence"     DOUBLE PRECISION,
  "matchNote"           TEXT,
  "reconciledByUserId"  UUID,
  "reconciledAt"        TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "gstr2b_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gstr2b_entry_importId_fkey" FOREIGN KEY ("importId")
    REFERENCES "gstr2b_import"("id") ON DELETE CASCADE
);

CREATE INDEX "gstr2b_entry_importId_matchStatus_idx" ON "gstr2b_entry"("importId", "matchStatus");
CREATE INDEX "gstr2b_entry_orgId_supplierGstin_idx"  ON "gstr2b_entry"("orgId", "supplierGstin");
CREATE INDEX "gstr2b_entry_orgId_docNumber_idx"      ON "gstr2b_entry"("orgId", "docNumber");

CREATE TABLE "e_invoice_request" (
  "id"                TEXT         NOT NULL,
  "orgId"             TEXT         NOT NULL,
  "invoiceId"         TEXT         NOT NULL,
  "requestType"       "e_invoice_request_type" NOT NULL,
  "status"            "e_invoice_status" NOT NULL DEFAULT 'PENDING',
  "requestPayload"    JSONB,
  "responsePayload"   JSONB,
  "irnNumber"         TEXT,
  "ackNumber"         TEXT,
  "ackDate"           TIMESTAMPTZ,
  "signedQrCode"      TEXT,
  "errorCode"         TEXT,
  "errorMessage"      TEXT,
  "cancelReason"      TEXT,
  "cancelledAt"       TIMESTAMPTZ,
  "triggeredByUserId" UUID,
  "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "e_invoice_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "e_invoice_request_orgId_fkey" FOREIGN KEY ("orgId")
    REFERENCES "organization"("id") ON DELETE CASCADE,
  CONSTRAINT "e_invoice_request_invoiceId_fkey" FOREIGN KEY ("invoiceId")
    REFERENCES "invoice"("id") ON DELETE CASCADE
);

CREATE INDEX "e_invoice_request_orgId_status_idx"  ON "e_invoice_request"("orgId", "status");
CREATE INDEX "e_invoice_request_invoiceId_idx"     ON "e_invoice_request"("invoiceId");
CREATE INDEX "e_invoice_request_irnNumber_idx"     ON "e_invoice_request"("irnNumber");

CREATE TABLE "e_invoice_config" (
  "id"                      TEXT         NOT NULL,
  "orgId"                   TEXT         NOT NULL,
  "enabled"                 BOOLEAN      NOT NULL DEFAULT FALSE,
  "irpEnvironment"          TEXT         NOT NULL DEFAULT 'sandbox',
  "gstin"                   TEXT,
  "encryptedUsername"       TEXT,
  "encryptedPassword"       TEXT,
  "authTokenCache"          TEXT,
  "tokenExpiresAt"          TIMESTAMPTZ,
  "autoGenerateIrn"         BOOLEAN      NOT NULL DEFAULT FALSE,
  "autoGenerateEwb"         BOOLEAN      NOT NULL DEFAULT FALSE,
  "ewbDefaultTransportMode" TEXT,
  "createdAt"               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"               TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "e_invoice_config_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "e_invoice_config_orgId_key"   UNIQUE ("orgId"),
  CONSTRAINT "e_invoice_config_orgId_fkey"  FOREIGN KEY ("orgId")
    REFERENCES "organization"("id") ON DELETE CASCADE
);

-- ─── Sprint 26.5: Customer and Vendor CRM columns ────────────────────────────

ALTER TABLE "customer"
  ADD COLUMN "industry"          TEXT,
  ADD COLUMN "segment"           TEXT,
  ADD COLUMN "lifecycleStage"    "customer_lifecycle_stage" NOT NULL DEFAULT 'PROSPECT',
  ADD COLUMN "source"            TEXT,
  ADD COLUMN "assignedToUserId"  UUID,
  ADD COLUMN "nextFollowUpAt"    TIMESTAMPTZ,
  ADD COLUMN "lifetimeValue"     DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalInvoiced"     DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalPaid"         DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lastInteractionAt" TIMESTAMPTZ,
  ADD COLUMN "tags"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "vendor"
  ADD COLUMN "category"          TEXT,
  ADD COLUMN "paymentTermsDays"  INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "rating"            INTEGER,
  ADD COLUMN "complianceStatus"  "vendor_compliance_status" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "totalBilled"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalPaid"         DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lastOrderAt"       TIMESTAMPTZ,
  ADD COLUMN "tags"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ─── Sprint 26.5: New Tables ─────────────────────────────────────────────────

CREATE TABLE "crm_note" (
  "id"               TEXT         NOT NULL,
  "orgId"            TEXT         NOT NULL,
  "entityType"       TEXT         NOT NULL,
  "entityId"         TEXT         NOT NULL,
  "content"          TEXT         NOT NULL,
  "isPinned"         BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdByUserId"  UUID         NOT NULL,
  "createdAt"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "crm_note_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_note_orgId_fkey" FOREIGN KEY ("orgId")
    REFERENCES "organization"("id") ON DELETE CASCADE
);

CREATE INDEX "crm_note_orgId_entityType_entityId_idx" ON "crm_note"("orgId", "entityType", "entityId");
CREATE INDEX "crm_note_entityId_createdAt_idx"        ON "crm_note"("entityId", "createdAt");

CREATE TABLE "sop_document" (
  "id"                  TEXT              NOT NULL,
  "orgId"               TEXT              NOT NULL,
  "title"               TEXT              NOT NULL,
  "slug"                TEXT              NOT NULL,
  "category"            TEXT,
  "content"             TEXT              NOT NULL,
  "excerpt"             TEXT,
  "status"              "sop_document_status" NOT NULL DEFAULT 'DRAFT',
  "sortOrder"           INTEGER           NOT NULL DEFAULT 0,
  "isPinned"            BOOLEAN           NOT NULL DEFAULT FALSE,
  "publishedAt"         TIMESTAMPTZ,
  "publishedByUserId"   UUID,
  "createdByUserId"     UUID              NOT NULL,
  "lastEditedByUserId"  UUID,
  "createdAt"           TIMESTAMPTZ       NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ       NOT NULL DEFAULT now(),
  "archivedAt"          TIMESTAMPTZ,

  CONSTRAINT "sop_document_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "sop_document_orgId_slug_key" UNIQUE ("orgId", "slug"),
  CONSTRAINT "sop_document_orgId_fkey"     FOREIGN KEY ("orgId")
    REFERENCES "organization"("id") ON DELETE CASCADE
);

CREATE INDEX "sop_document_orgId_status_category_idx" ON "sop_document"("orgId", "status", "category");
