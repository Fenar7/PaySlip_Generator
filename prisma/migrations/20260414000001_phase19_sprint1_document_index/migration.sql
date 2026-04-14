-- Phase 19 Sprint 19.1: SW Docs Control Plane — DocumentIndex
-- Normalized unified listing and search layer for all document types.
-- Source of truth remains the original document models (Invoice, Voucher,
-- SalarySlip, Quote). This table is the read-optimised vault/listing layer.

CREATE TABLE "document_index" (
    "id"                TEXT NOT NULL,
    "orgId"             TEXT NOT NULL,
    "docType"           TEXT NOT NULL,
    "documentId"        TEXT NOT NULL,
    "documentNumber"    TEXT NOT NULL,
    "titleOrSummary"    TEXT NOT NULL,
    "counterpartyLabel" TEXT,
    "status"            TEXT NOT NULL,
    "primaryDate"       TIMESTAMP(3) NOT NULL,
    "amount"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency"          TEXT NOT NULL DEFAULT 'INR',
    "archivedAt"        TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_index_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one row per document per org
CREATE UNIQUE INDEX "document_index_orgId_docType_documentId_key"
    ON "document_index"("orgId", "docType", "documentId");

-- Query-performance indexes
CREATE INDEX "document_index_orgId_docType_idx"
    ON "document_index"("orgId", "docType");

CREATE INDEX "document_index_orgId_status_idx"
    ON "document_index"("orgId", "status");

CREATE INDEX "document_index_orgId_archivedAt_idx"
    ON "document_index"("orgId", "archivedAt");

CREATE INDEX "document_index_orgId_primaryDate_idx"
    ON "document_index"("orgId", "primaryDate");

-- Foreign key to organization
ALTER TABLE "document_index"
    ADD CONSTRAINT "document_index_orgId_fkey"
    FOREIGN KEY ("orgId")
    REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
