-- Phase 19 DB sync remediation
-- Aligns the post-Phase-19 database with current runtime expectations after
-- the backlog migration chain has been applied.

-- ─── Books / journal source parity ─────────────────────────────────────────────

ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'VENDOR_BILL';
ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'VENDOR_BILL_PAYMENT';

-- ─── Org defaults runtime fields ───────────────────────────────────────────────

ALTER TABLE "org_defaults"
  ADD COLUMN IF NOT EXISTS "vendorBillPrefix" TEXT NOT NULL DEFAULT 'BILL',
  ADD COLUMN IF NOT EXISTS "vendorBillCounter" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "defaultExpenseAccountId" TEXT;

-- ─── Invoice proof runtime relation ────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_proof_invoicePaymentId_fkey'
  ) THEN
    ALTER TABLE "invoice_proof"
      ADD CONSTRAINT "invoice_proof_invoicePaymentId_fkey"
      FOREIGN KEY ("invoicePaymentId")
      REFERENCES "invoice_payment"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Remove migration-only columns absent from schema ──────────────────────────

ALTER TABLE "approval_request" DROP COLUMN IF EXISTS "resolvedAt";

ALTER TABLE "job_log"
  DROP COLUMN IF EXISTS "workflowRunId",
  DROP COLUMN IF EXISTS "scheduledActionId",
  DROP COLUMN IF EXISTS "terminalState";

-- ─── Notification delivery schema parity ───────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_delivery_orgId_fkey'
  ) THEN
    ALTER TABLE "notification_delivery"
      DROP CONSTRAINT "notification_delivery_orgId_fkey";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notification_delivery_orgId_sourceModule_idx"
  ON "notification_delivery"("orgId", "sourceModule");

-- ─── Escalation rule timestamp parity ──────────────────────────────────────────

ALTER TABLE "ticket_escalation_rule"
  ALTER COLUMN "updatedAt" DROP DEFAULT;
