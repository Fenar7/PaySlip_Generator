-- Phase 19 DB sync remediation: remove legacy polymorphic foreign keys
-- These relations are resolved in application code via docType/entityType and
-- must not be enforced as physical FKs on shared identifier columns.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_invoice_fkey'
  ) THEN
    ALTER TABLE "approval_request" DROP CONSTRAINT "approval_invoice_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_salary_slip_fkey'
  ) THEN
    ALTER TABLE "approval_request" DROP CONSTRAINT "approval_salary_slip_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_voucher_fkey'
  ) THEN
    ALTER TABLE "approval_request" DROP CONSTRAINT "approval_voucher_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_attachment_invoice_fkey'
  ) THEN
    ALTER TABLE "file_attachment" DROP CONSTRAINT "file_attachment_invoice_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_attachment_salary_slip_fkey'
  ) THEN
    ALTER TABLE "file_attachment" DROP CONSTRAINT "file_attachment_salary_slip_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_attachment_voucher_fkey'
  ) THEN
    ALTER TABLE "file_attachment" DROP CONSTRAINT "file_attachment_voucher_fkey";
  END IF;
END $$;
