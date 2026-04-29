-- CreateEnum
CREATE TYPE "SequenceDocumentType" AS ENUM ('INVOICE', 'VOUCHER');

-- CreateEnum
CREATE TYPE "SequencePeriodicity" AS ENUM ('NONE', 'MONTHLY', 'YEARLY', 'FINANCIAL_YEAR');

-- CreateEnum
CREATE TYPE "SequencePeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "sequenceId" TEXT,
ADD COLUMN     "sequenceNumber" INTEGER,
ADD COLUMN     "sequencePeriodId" TEXT;

-- AlterTable
ALTER TABLE "voucher" ADD COLUMN     "sequenceId" TEXT,
ADD COLUMN     "sequenceNumber" INTEGER,
ADD COLUMN     "sequencePeriodId" TEXT;

-- CreateTable
CREATE TABLE "sequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "SequenceDocumentType" NOT NULL,
    "periodicity" "SequencePeriodicity" NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_format" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "formatString" TEXT NOT NULL,
    "startCounter" INTEGER NOT NULL DEFAULT 1,
    "counterPadding" INTEGER NOT NULL DEFAULT 5,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequence_format_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_period" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "currentCounter" INTEGER NOT NULL DEFAULT 1,
    "status" "SequencePeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_period_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sequence_organizationId_documentType_idx" ON "sequence"("organizationId", "documentType");

-- CreateIndex
CREATE INDEX "sequence_organizationId_isActive_idx" ON "sequence"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "sequence_format_sequenceId_idx" ON "sequence_format"("sequenceId");

-- CreateIndex
CREATE INDEX "sequence_period_sequenceId_status_idx" ON "sequence_period"("sequenceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_period_sequenceId_startDate_endDate_key" ON "sequence_period"("sequenceId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "sequence" ADD CONSTRAINT "sequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_format" ADD CONSTRAINT "sequence_format_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_period" ADD CONSTRAINT "sequence_period_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_sequencePeriodId_fkey" FOREIGN KEY ("sequencePeriodId") REFERENCES "sequence_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_sequencePeriodId_fkey" FOREIGN KEY ("sequencePeriodId") REFERENCES "sequence_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
