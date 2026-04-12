-- ExtendEnum
ALTER TYPE "MatchEntityType" ADD VALUE IF NOT EXISTS 'VENDOR_BILL_PAYMENT';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorBillStatus') THEN
    CREATE TYPE "VendorBillStatus" AS ENUM (
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'OVERDUE',
      'PARTIALLY_PAID',
      'PAID',
      'CANCELLED'
    );
  END IF;
END $$;

ALTER TYPE "VendorBillStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "VendorBillStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "VendorBillStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "VendorBillStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorBillPaymentStatus') THEN
    CREATE TYPE "VendorBillPaymentStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'VOIDED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentRunStatus') THEN
    CREATE TYPE "PaymentRunStatus" AS ENUM (
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentRunStatus') THEN
    BEGIN
      ALTER TYPE "PaymentRunStatus" RENAME VALUE 'EXECUTED' TO 'COMPLETED';
    EXCEPTION
      WHEN invalid_parameter_value OR undefined_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TYPE "PaymentRunStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentRunStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "PaymentRunStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PaymentRunStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentRunItemStatus') THEN
    CREATE TYPE "PaymentRunItemStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'FAILED', 'SKIPPED');
  END IF;
END $$;

ALTER TYPE "PaymentRunItemStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PaymentRunItemStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CloseRunStatus') THEN
    CREATE TYPE "CloseRunStatus" AS ENUM ('DRAFT', 'READY', 'BLOCKED', 'CLOSED', 'REOPENED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CloseTaskStatus') THEN
    CREATE TYPE "CloseTaskStatus" AS ENUM ('PENDING', 'PASSED', 'BLOCKED', 'WAIVED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_bill" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "vendorId" TEXT,
  "expenseAccountId" TEXT,
  "billNumber" TEXT NOT NULL,
  "billDate" TEXT NOT NULL,
  "dueDate" TEXT,
  "status" "VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
  "formData" JSONB NOT NULL,
  "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "gstTotalCgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gstTotalSgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gstTotalIgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gstTotalCess" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
  "journalEntryId" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "vendor_bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_bill_line" (
  "id" TEXT NOT NULL,
  "vendorBillId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "vendor_bill_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_bill_payment" (
  "id" TEXT NOT NULL,
  "vendorBillId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "paymentRunId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" TEXT,
  "note" TEXT,
  "source" TEXT NOT NULL DEFAULT 'admin_manual',
  "status" "VendorBillPaymentStatus" NOT NULL DEFAULT 'SETTLED',
  "externalPaymentId" TEXT,
  "externalReferenceId" TEXT,
  "externalPayload" JSONB,
  "recordedByUserId" UUID,
  "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
  "journalEntryId" TEXT,
  "bankMatchId" TEXT,
  "clearingAccountId" TEXT,
  "accountingPostedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vendor_bill_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_run" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "runNumber" TEXT NOT NULL,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "status" "PaymentRunStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "requestedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" UUID,
  "executedAt" TIMESTAMP(3),
  "executedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_run_item" (
  "id" TEXT NOT NULL,
  "paymentRunId" TEXT NOT NULL,
  "vendorBillId" TEXT NOT NULL,
  "proposedAmount" DOUBLE PRECISION NOT NULL,
  "approvedAmount" DOUBLE PRECISION,
  "status" "PaymentRunItemStatus" NOT NULL DEFAULT 'PENDING',
  "executedPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_run_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "close_run" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "fiscalPeriodId" TEXT NOT NULL,
  "status" "CloseRunStatus" NOT NULL DEFAULT 'DRAFT',
  "blockerCount" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB,
  "notes" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedByUserId" UUID,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" UUID,
  "reopenedAt" TIMESTAMP(3),
  "reopenedByUserId" UUID,
  "reportSnapshotId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "close_task" (
  "id" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "status" "CloseTaskStatus" NOT NULL DEFAULT 'PENDING',
  "severity" TEXT NOT NULL DEFAULT 'blocker',
  "blockerReason" TEXT,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_bill_orgId_billNumber_key"
  ON "vendor_bill"("orgId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_bill_journalEntryId_key"
  ON "vendor_bill"("journalEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_bill_orgId_status_idx"
  ON "vendor_bill"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_bill_payment_journalEntryId_key"
  ON "vendor_bill_payment"("journalEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_bill_payment_vendorBillId_idx"
  ON "vendor_bill_payment"("vendorBillId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_bill_payment_externalPaymentId_idx"
  ON "vendor_bill_payment"("externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_run_orgId_runNumber_key"
  ON "payment_run"("orgId", "runNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_run_orgId_status_idx"
  ON "payment_run"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_run_item_paymentRunId_vendorBillId_key"
  ON "payment_run_item"("paymentRunId", "vendorBillId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_run_item_executedPaymentId_key"
  ON "payment_run_item"("executedPaymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_run_item_vendorBillId_status_idx"
  ON "payment_run_item"("vendorBillId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "close_run_orgId_fiscalPeriodId_key"
  ON "close_run"("orgId", "fiscalPeriodId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "close_run_orgId_status_idx"
  ON "close_run"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "close_task_closeRunId_code_key"
  ON "close_task"("closeRunId", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "close_task_orgId_status_idx"
  ON "close_task"("orgId", "status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_orgId_fkey') THEN
    ALTER TABLE "vendor_bill"
      ADD CONSTRAINT "vendor_bill_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_vendorId_fkey') THEN
    ALTER TABLE "vendor_bill"
      ADD CONSTRAINT "vendor_bill_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "vendor"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_expenseAccountId_fkey') THEN
    ALTER TABLE "vendor_bill"
      ADD CONSTRAINT "vendor_bill_expenseAccountId_fkey"
      FOREIGN KEY ("expenseAccountId") REFERENCES "gl_account"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_journalEntryId_fkey') THEN
    ALTER TABLE "vendor_bill"
      ADD CONSTRAINT "vendor_bill_journalEntryId_fkey"
      FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_line_vendorBillId_fkey') THEN
    ALTER TABLE "vendor_bill_line"
      ADD CONSTRAINT "vendor_bill_line_vendorBillId_fkey"
      FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_payment_orgId_fkey') THEN
    ALTER TABLE "vendor_bill_payment"
      ADD CONSTRAINT "vendor_bill_payment_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_payment_vendorBillId_fkey') THEN
    ALTER TABLE "vendor_bill_payment"
      ADD CONSTRAINT "vendor_bill_payment_vendorBillId_fkey"
      FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_payment_paymentRunId_fkey') THEN
    ALTER TABLE "vendor_bill_payment"
      ADD CONSTRAINT "vendor_bill_payment_paymentRunId_fkey"
      FOREIGN KEY ("paymentRunId") REFERENCES "payment_run"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_payment_journalEntryId_fkey') THEN
    ALTER TABLE "vendor_bill_payment"
      ADD CONSTRAINT "vendor_bill_payment_journalEntryId_fkey"
      FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_bill_payment_bankMatchId_fkey') THEN
    ALTER TABLE "vendor_bill_payment"
      ADD CONSTRAINT "vendor_bill_payment_bankMatchId_fkey"
      FOREIGN KEY ("bankMatchId") REFERENCES "bank_transaction_match"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_run_orgId_fkey') THEN
    ALTER TABLE "payment_run"
      ADD CONSTRAINT "payment_run_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_run_item_paymentRunId_fkey') THEN
    ALTER TABLE "payment_run_item"
      ADD CONSTRAINT "payment_run_item_paymentRunId_fkey"
      FOREIGN KEY ("paymentRunId") REFERENCES "payment_run"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_run_item_vendorBillId_fkey') THEN
    ALTER TABLE "payment_run_item"
      ADD CONSTRAINT "payment_run_item_vendorBillId_fkey"
      FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_run_item_executedPaymentId_fkey') THEN
    ALTER TABLE "payment_run_item"
      ADD CONSTRAINT "payment_run_item_executedPaymentId_fkey"
      FOREIGN KEY ("executedPaymentId") REFERENCES "vendor_bill_payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'close_run_orgId_fkey') THEN
    ALTER TABLE "close_run"
      ADD CONSTRAINT "close_run_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'close_run_fiscalPeriodId_fkey') THEN
    ALTER TABLE "close_run"
      ADD CONSTRAINT "close_run_fiscalPeriodId_fkey"
      FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_period"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'close_task_closeRunId_fkey') THEN
    ALTER TABLE "close_task"
      ADD CONSTRAINT "close_task_closeRunId_fkey"
      FOREIGN KEY ("closeRunId") REFERENCES "close_run"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'close_task_orgId_fkey') THEN
    ALTER TABLE "close_task"
      ADD CONSTRAINT "close_task_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
