-- ExtendEnum
ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'BANK_RECONCILIATION';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankAccountType') THEN
    CREATE TYPE "BankAccountType" AS ENUM ('BANK', 'CASH', 'PETTY_CASH', 'GATEWAY_CLEARING');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankImportStatus') THEN
    CREATE TYPE "BankImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankTxnDirection') THEN
    CREATE TYPE "BankTxnDirection" AS ENUM ('CREDIT', 'DEBIT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankTxnStatus') THEN
    CREATE TYPE "BankTxnStatus" AS ENUM ('UNMATCHED', 'SUGGESTED', 'PARTIALLY_MATCHED', 'MATCHED', 'IGNORED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchEntityType') THEN
    CREATE TYPE "MatchEntityType" AS ENUM ('INVOICE_PAYMENT', 'VOUCHER', 'JOURNAL_ENTRY', 'INTERNAL_TRANSFER', 'BANK_FEE');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "journal_line"
  ADD COLUMN IF NOT EXISTS "bankTransactionId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_account" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "glAccountId" TEXT NOT NULL,
  "openingJournalEntryId" TEXT,
  "gatewayClearingAccountId" TEXT,
  "type" "BankAccountType" NOT NULL DEFAULT 'BANK',
  "name" TEXT NOT NULL,
  "bankName" TEXT,
  "maskedAccountNo" TEXT,
  "ifscOrSwift" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "openingBalanceDate" TIMESTAMP(3),
  "mappingProfile" JSONB,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_statement_import" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "sourceFormat" TEXT NOT NULL DEFAULT 'csv',
  "status" "BankImportStatus" NOT NULL DEFAULT 'UPLOADED',
  "mappingProfile" JSONB,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" JSONB,
  "statementStart" TIMESTAMP(3),
  "statementEnd" TIMESTAMP(3),
  "uploadedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "bank_statement_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_transaction" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "txnDate" TIMESTAMP(3) NOT NULL,
  "valueDate" TIMESTAMP(3),
  "direction" "BankTxnDirection" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "runningBalance" DOUBLE PRECISION,
  "reference" TEXT,
  "description" TEXT NOT NULL,
  "normalizedPayee" TEXT,
  "normalizedType" TEXT,
  "fingerprint" TEXT NOT NULL,
  "rawPayload" JSONB,
  "status" "BankTxnStatus" NOT NULL DEFAULT 'UNMATCHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_transaction_match" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "bankTxnId" TEXT NOT NULL,
  "entityType" "MatchEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "matchedAmount" DOUBLE PRECISION NOT NULL,
  "confidenceScore" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
  "createdByUserId" UUID,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bank_transaction_match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bank_account_glAccountId_key"
  ON "bank_account"("glAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bank_account_openingJournalEntryId_key"
  ON "bank_account"("openingJournalEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_account_orgId_isActive_idx"
  ON "bank_account"("orgId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_account_orgId_isPrimary_idx"
  ON "bank_account"("orgId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bank_statement_import_bankAccountId_checksum_key"
  ON "bank_statement_import"("bankAccountId", "checksum");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_statement_import_orgId_status_idx"
  ON "bank_statement_import"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bank_transaction_bankAccountId_fingerprint_key"
  ON "bank_transaction"("bankAccountId", "fingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_transaction_orgId_status_txnDate_idx"
  ON "bank_transaction"("orgId", "status", "txnDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_transaction_orgId_bankAccountId_txnDate_idx"
  ON "bank_transaction"("orgId", "bankAccountId", "txnDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bank_transaction_match_bankTxnId_entityType_entityId_key"
  ON "bank_transaction_match"("bankTxnId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_transaction_match_orgId_status_idx"
  ON "bank_transaction_match"("orgId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_transaction_match_entityType_entityId_idx"
  ON "bank_transaction_match"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "journal_line_orgId_bankTransactionId_idx"
  ON "journal_line"("orgId", "bankTransactionId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_account_orgId_fkey') THEN
    ALTER TABLE "bank_account"
      ADD CONSTRAINT "bank_account_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_account_glAccountId_fkey') THEN
    ALTER TABLE "bank_account"
      ADD CONSTRAINT "bank_account_glAccountId_fkey"
      FOREIGN KEY ("glAccountId") REFERENCES "gl_account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_account_openingJournalEntryId_fkey') THEN
    ALTER TABLE "bank_account"
      ADD CONSTRAINT "bank_account_openingJournalEntryId_fkey"
      FOREIGN KEY ("openingJournalEntryId") REFERENCES "journal_entry"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_account_gatewayClearingAccountId_fkey') THEN
    ALTER TABLE "bank_account"
      ADD CONSTRAINT "bank_account_gatewayClearingAccountId_fkey"
      FOREIGN KEY ("gatewayClearingAccountId") REFERENCES "gl_account"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_statement_import_orgId_fkey') THEN
    ALTER TABLE "bank_statement_import"
      ADD CONSTRAINT "bank_statement_import_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_statement_import_bankAccountId_fkey') THEN
    ALTER TABLE "bank_statement_import"
      ADD CONSTRAINT "bank_statement_import_bankAccountId_fkey"
      FOREIGN KEY ("bankAccountId") REFERENCES "bank_account"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_orgId_fkey') THEN
    ALTER TABLE "bank_transaction"
      ADD CONSTRAINT "bank_transaction_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_bankAccountId_fkey') THEN
    ALTER TABLE "bank_transaction"
      ADD CONSTRAINT "bank_transaction_bankAccountId_fkey"
      FOREIGN KEY ("bankAccountId") REFERENCES "bank_account"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_importId_fkey') THEN
    ALTER TABLE "bank_transaction"
      ADD CONSTRAINT "bank_transaction_importId_fkey"
      FOREIGN KEY ("importId") REFERENCES "bank_statement_import"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_match_orgId_fkey') THEN
    ALTER TABLE "bank_transaction_match"
      ADD CONSTRAINT "bank_transaction_match_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_match_bankTxnId_fkey') THEN
    ALTER TABLE "bank_transaction_match"
      ADD CONSTRAINT "bank_transaction_match_bankTxnId_fkey"
      FOREIGN KEY ("bankTxnId") REFERENCES "bank_transaction"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_line_bankTransactionId_fkey') THEN
    ALTER TABLE "journal_line"
      ADD CONSTRAINT "journal_line_bankTransactionId_fkey"
      FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transaction"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_payment_bankMatchId_fkey') THEN
    ALTER TABLE "invoice_payment"
      ADD CONSTRAINT "invoice_payment_bankMatchId_fkey"
      FOREIGN KEY ("bankMatchId") REFERENCES "bank_transaction_match"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
