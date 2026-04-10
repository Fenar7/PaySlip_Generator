-- Phase 15 Sprint 15.1: GST, e-Invoicing, TDS
-- CreateEnum
CREATE TYPE "TdsSection" AS ENUM ('SECTION_194A', 'SECTION_194C', 'SECTION_194J', 'SECTION_194H', 'SECTION_194I', 'SECTION_194Q', 'OTHER');

-- CreateEnum
CREATE TYPE "TdsCertStatus" AS ENUM ('PENDING_CERT', 'CERT_RECEIVED', 'FILED');

-- CreateEnum
CREATE TYPE "GstType" AS ENUM ('INTRASTATE', 'INTERSTATE', 'EXEMPT');

-- AlterTable: invoice – add GST / IRN / e-Way Bill columns
ALTER TABLE "invoice"
  ADD COLUMN "supplierGstin"       TEXT,
  ADD COLUMN "customerGstin"       TEXT,
  ADD COLUMN "placeOfSupply"       TEXT,
  ADD COLUMN "reverseCharge"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "exportType"          TEXT,
  ADD COLUMN "gstTotalCgst"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "gstTotalSgst"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "gstTotalIgst"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "gstTotalCess"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "irnNumber"           TEXT,
  ADD COLUMN "irnAckNumber"        TEXT,
  ADD COLUMN "irnAckDate"          TIMESTAMP(3),
  ADD COLUMN "irnQrCode"           TEXT,
  ADD COLUMN "eWayBillNumber"      TEXT,
  ADD COLUMN "eWayBillDate"        TIMESTAMP(3),
  ADD COLUMN "eWayBillExpiry"      TIMESTAMP(3),
  ADD COLUMN "ewbTransportMode"    TEXT,
  ADD COLUMN "ewbVehicleNumber"    TEXT,
  ADD COLUMN "ewbTransporterGstin" TEXT,
  ADD COLUMN "ewbTransportDocNo"   TEXT,
  ADD COLUMN "ewbDistanceKm"       INTEGER,
  ADD COLUMN "ewbFromPincode"      TEXT,
  ADD COLUMN "ewbToPincode"        TEXT;

-- AlterTable: invoice_line_item – add HSN/SAC/GST columns
ALTER TABLE "invoice_line_item"
  ADD COLUMN "hsnCode"    TEXT,
  ADD COLUMN "sacCode"    TEXT,
  ADD COLUMN "gstRate"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "gstType"    "GstType" NOT NULL DEFAULT 'INTRASTATE',
  ADD COLUMN "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "cessAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: hsn_sac_code
CREATE TABLE "hsn_sac_code" (
  "id"          TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "gstRate"     DOUBLE PRECISION NOT NULL,
  "isService"   BOOLEAN NOT NULL DEFAULT false,
  "chapter"     TEXT,
  "section"     TEXT,

  CONSTRAINT "hsn_sac_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hsn_sac_code_code_key" ON "hsn_sac_code"("code");

-- CreateIndex
CREATE INDEX "hsn_sac_code_code_idx" ON "hsn_sac_code"("code");

-- CreateIndex
CREATE INDEX "hsn_sac_code_description_idx" ON "hsn_sac_code"("description");

-- CreateTable: tds_record
CREATE TABLE "tds_record" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId"      TEXT NOT NULL,
  "tdsSection"     "TdsSection" NOT NULL,
  "tdsRate"        DOUBLE PRECISION NOT NULL,
  "tdsAmount"      DOUBLE PRECISION NOT NULL,
  "certStatus"     "TdsCertStatus" NOT NULL DEFAULT 'PENDING_CERT',
  "certNumber"     TEXT,
  "certDate"       TIMESTAMP(3),
  "certFilePath"   TEXT,
  "deductorTan"    TEXT,
  "financialYear"  TEXT NOT NULL,
  "quarter"        TEXT NOT NULL,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tds_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tds_record_organizationId_financialYear_idx" ON "tds_record"("organizationId", "financialYear");

-- CreateIndex
CREATE INDEX "tds_record_invoiceId_idx" ON "tds_record"("invoiceId");

-- AddForeignKey
ALTER TABLE "tds_record" ADD CONSTRAINT "tds_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_record" ADD CONSTRAINT "tds_record_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
