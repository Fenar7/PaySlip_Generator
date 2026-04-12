-- CreateEnum
CREATE TYPE "GlAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'CONTRA');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "AccountingStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RevenueRecognitionStatus" AS ENUM ('PENDING', 'RECOGNIZED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "JournalSource" AS ENUM ('MANUAL', 'INVOICE', 'INVOICE_PAYMENT', 'VOUCHER', 'SALARY_SLIP', 'GST', 'TDS', 'OPENING_BALANCE', 'SYSTEM_REVERSAL');

-- CreateEnum
CREATE TYPE "FiscalPeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- AlterTable
ALTER TABLE "org_defaults" ADD COLUMN     "booksEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coaSeededAt" TIMESTAMP(3),
ADD COLUMN     "coaTemplate" TEXT,
ADD COLUMN     "defaultBankAccountId" TEXT,
ADD COLUMN     "defaultGatewayClearingAccountId" TEXT,
ADD COLUMN     "defaultGstOutputAccountId" TEXT,
ADD COLUMN     "defaultPayableAccountId" TEXT,
ADD COLUMN     "defaultPayrollExpenseAccountId" TEXT,
ADD COLUMN     "defaultPayrollPayableAccountId" TEXT,
ADD COLUMN     "defaultReceivableAccountId" TEXT,
ADD COLUMN     "defaultRevenueAccountId" TEXT,
ADD COLUMN     "defaultSuspenseAccountId" TEXT,
ADD COLUMN     "defaultTdsPayableAccountId" TEXT;

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "accountingPostedAt" TIMESTAMP(3),
ADD COLUMN     "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "postedJournalEntryId" TEXT,
ADD COLUMN     "revenueRecognitionStatus" "RevenueRecognitionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "voucher" ADD COLUMN     "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "salary_slip" ADD COLUMN     "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "payoutJournalEntryId" TEXT,
ADD COLUMN     "payoutPostedAt" TIMESTAMP(3),
ADD COLUMN     "postedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invoice_payment" ADD COLUMN     "accountingPostedAt" TIMESTAMP(3),
ADD COLUMN     "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "bankMatchId" TEXT,
ADD COLUMN     "clearingAccountId" TEXT,
ADD COLUMN     "journalEntryId" TEXT;

-- CreateTable
CREATE TABLE "gl_account" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "GlAccountType" NOT NULL,
    "normalBalance" "NormalBalance" NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "systemKey" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "allowManualEntries" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gl_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_period" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FiscalPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "isAdjustmentPeriod" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" UUID,
    "reopenReason" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" UUID,
    "closedAt" TIMESTAMP(3),
    "closedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fiscalPeriodId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "source" "JournalSource" NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "memo" TEXT,
    "sourceId" TEXT,
    "sourceRef" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalDebit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "reversalOfId" TEXT,
    "metadata" JSONB,
    "createdBy" UUID,
    "postedBy" UUID,
    "postedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_line" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gl_account_orgId_accountType_isActive_idx" ON "gl_account"("orgId", "accountType", "isActive");

-- CreateIndex
CREATE INDEX "gl_account_orgId_parentId_idx" ON "gl_account"("orgId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "gl_account_orgId_code_key" ON "gl_account"("orgId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "gl_account_orgId_systemKey_key" ON "gl_account"("orgId", "systemKey");

-- CreateIndex
CREATE INDEX "fiscal_period_orgId_status_startDate_idx" ON "fiscal_period"("orgId", "status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_period_orgId_label_key" ON "fiscal_period"("orgId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_period_orgId_startDate_endDate_key" ON "fiscal_period"("orgId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "journal_entry_orgId_entryDate_status_idx" ON "journal_entry"("orgId", "entryDate", "status");

-- CreateIndex
CREATE INDEX "journal_entry_orgId_source_sourceId_idx" ON "journal_entry"("orgId", "source", "sourceId");

-- CreateIndex
CREATE INDEX "journal_entry_fiscalPeriodId_status_idx" ON "journal_entry"("fiscalPeriodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_orgId_entryNumber_key" ON "journal_entry"("orgId", "entryNumber");

-- CreateIndex
CREATE INDEX "journal_line_orgId_accountId_idx" ON "journal_line"("orgId", "accountId");

-- CreateIndex
CREATE INDEX "journal_line_orgId_entityType_entityId_idx" ON "journal_line"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_line_journalEntryId_lineNumber_key" ON "journal_line"("journalEntryId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_postedJournalEntryId_key" ON "invoice"("postedJournalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_journalEntryId_key" ON "voucher"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_slip_journalEntryId_key" ON "salary_slip"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_slip_payoutJournalEntryId_key" ON "salary_slip"("payoutJournalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payment_journalEntryId_key" ON "invoice_payment"("journalEntryId");

-- AddForeignKey
ALTER TABLE "gl_account" ADD CONSTRAINT "gl_account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gl_account" ADD CONSTRAINT "gl_account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "gl_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_period" ADD CONSTRAINT "fiscal_period_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "gl_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_payoutJournalEntryId_fkey" FOREIGN KEY ("payoutJournalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

