-- Invoice snapshot fields for payment reconciliation
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "lastPaymentAt" TIMESTAMP(3);
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "lastPaymentMethod" TEXT;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "paymentPromiseDate" TEXT;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "paymentLinkStatus" TEXT;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "paymentLinkLastEventAt" TIMESTAMP(3);

-- Initialize remainingAmount to totalAmount for existing unpaid invoices
UPDATE "invoice" SET "remainingAmount" = "totalAmount" WHERE "status" NOT IN ('PAID', 'CANCELLED');

-- InvoicePayment reconciliation fields
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'admin_manual';
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SETTLED';
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "externalPaymentId" TEXT;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "externalReferenceId" TEXT;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "externalPayload" JSONB;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "paymentMethodDisplay" TEXT;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "paymentChannel" TEXT;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "plannedNextPaymentDate" TEXT;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "recordedByUserId" UUID;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "reviewedByUserId" UUID;
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "invoice_payment" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Index on externalPaymentId for idempotency lookups
CREATE INDEX IF NOT EXISTS "invoice_payment_externalPaymentId_idx" ON "invoice_payment"("externalPaymentId");

-- InvoiceProof linking to ledger row
ALTER TABLE "invoice_proof" ADD COLUMN IF NOT EXISTS "invoicePaymentId" TEXT;
ALTER TABLE "invoice_proof" ADD COLUMN IF NOT EXISTS "plannedNextPaymentDate" TEXT;

-- Unique constraint on invoicePaymentId (one proof per ledger row)
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_proof_invoicePaymentId_key" ON "invoice_proof"("invoicePaymentId");
