-- Phase 14: AR Automation — Full Schema Migration
-- Sprint 14.1: Dunning Engine
-- Sprint 14.2: Customer Portal & Statements
-- Sprint 14.3: Quotes & Payment Arrangements

-- ============================================================================
-- 1. CREATE ENUM TYPES
-- ============================================================================

CREATE TYPE "DunningTone" AS ENUM ('FRIENDLY', 'POLITE', 'FIRM', 'URGENT', 'ESCALATE');
CREATE TYPE "DunningLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED');
CREATE TYPE "ArrangementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- ============================================================================
-- 2. ALTER EXISTING ENUM: InvoiceStatus
-- ============================================================================

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'ARRANGEMENT_MADE';

-- ============================================================================
-- 3. ALTER EXISTING TABLES
-- ============================================================================

-- Invoice: add dunning fields
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "dunningEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "dunningPausedUntil" TIMESTAMP(3);
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "dunningSequenceId" TEXT;

-- Customer: add payment health score
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "paymentHealthScore" INTEGER NOT NULL DEFAULT 100;

-- OrgDefaults: add portal, quote, and dunning fields
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "portalHeaderMessage" TEXT;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "portalSupportEmail" TEXT;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "portalSupportPhone" TEXT;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "quotePrefix" TEXT NOT NULL DEFAULT 'QTE';
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "quoteCounter" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "quoteValidityDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "quoteHeaderLabel" TEXT NOT NULL DEFAULT 'QUOTE';
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "defaultDunningSeqId" TEXT;

-- ============================================================================
-- 4. CREATE NEW TABLES
-- ============================================================================

-- DunningSequence
CREATE TABLE IF NOT EXISTS "dunning_sequence" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dunning_sequence_pkey" PRIMARY KEY ("id")
);

-- DunningStep
CREATE TABLE IF NOT EXISTS "dunning_step" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "daysOffset" INTEGER NOT NULL,
    "channels" TEXT[],
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "smsBody" TEXT,
    "smsTemplateId" TEXT,
    "tone" "DunningTone" NOT NULL,
    "createTicket" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dunning_step_pkey" PRIMARY KEY ("id")
);

-- DunningLog
CREATE TABLE IF NOT EXISTS "dunning_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "DunningLogStatus" NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_log_pkey" PRIMARY KEY ("id")
);

-- DunningOptOut
CREATE TABLE IF NOT EXISTS "dunning_opt_out" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_opt_out_pkey" PRIMARY KEY ("id")
);

-- CustomerPortalToken
CREATE TABLE IF NOT EXISTS "customer_portal_token" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_portal_token_pkey" PRIMARY KEY ("id")
);

-- CustomerPortalAccessLog
CREATE TABLE IF NOT EXISTS "customer_portal_access_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_portal_access_log_pkey" PRIMARY KEY ("id")
);

-- CustomerStatement
CREATE TABLE IF NOT EXISTS "customer_statement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInvoiced" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fileUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_statement_pkey" PRIMARY KEY ("id")
);

-- Quote
CREATE TABLE IF NOT EXISTS "quote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "templateId" TEXT,
    "publicToken" TEXT,
    "convertedInvoiceId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "quote_pkey" PRIMARY KEY ("id")
);

-- QuoteLineItem
CREATE TABLE IF NOT EXISTS "quote_line_item" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "quote_line_item_pkey" PRIMARY KEY ("id")
);

-- PaymentArrangement
CREATE TABLE IF NOT EXISTS "payment_arrangement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalArranged" DOUBLE PRECISION NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "status" "ArrangementStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_arrangement_pkey" PRIMARY KEY ("id")
);

-- PaymentInstallment
CREATE TABLE IF NOT EXISTS "payment_installment" (
    "id" TEXT NOT NULL,
    "arrangementId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "invoicePaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_installment_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 5. UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "dunning_step_sequenceId_stepNumber_key" ON "dunning_step"("sequenceId", "stepNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "dunning_opt_out_token_key" ON "dunning_opt_out"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "dunning_opt_out_orgId_customerId_key" ON "dunning_opt_out"("orgId", "customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_portal_token_tokenHash_key" ON "customer_portal_token"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "quote_publicToken_key" ON "quote"("publicToken");
CREATE UNIQUE INDEX IF NOT EXISTS "quote_orgId_quoteNumber_key" ON "quote"("orgId", "quoteNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_arrangement_invoiceId_key" ON "payment_arrangement"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_installment_invoicePaymentId_key" ON "payment_installment"("invoicePaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_installment_arrangementId_installmentNumber_key" ON "payment_installment"("arrangementId", "installmentNumber");

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS "dunning_sequence_orgId_isDefault_idx" ON "dunning_sequence"("orgId", "isDefault");
CREATE INDEX IF NOT EXISTS "dunning_log_invoiceId_stepNumber_idx" ON "dunning_log"("invoiceId", "stepNumber");
CREATE INDEX IF NOT EXISTS "dunning_log_orgId_createdAt_idx" ON "dunning_log"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "customer_portal_token_customerId_orgId_idx" ON "customer_portal_token"("customerId", "orgId");
CREATE INDEX IF NOT EXISTS "customer_portal_access_log_customerId_orgId_idx" ON "customer_portal_access_log"("customerId", "orgId");
CREATE INDEX IF NOT EXISTS "customer_statement_customerId_fromDate_toDate_idx" ON "customer_statement"("customerId", "fromDate", "toDate");
CREATE INDEX IF NOT EXISTS "quote_orgId_status_idx" ON "quote"("orgId", "status");
CREATE INDEX IF NOT EXISTS "payment_arrangement_orgId_status_idx" ON "payment_arrangement"("orgId", "status");

-- ============================================================================
-- 7. FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- DunningSequence
ALTER TABLE "dunning_sequence" ADD CONSTRAINT "dunning_sequence_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DunningStep
ALTER TABLE "dunning_step" ADD CONSTRAINT "dunning_step_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "dunning_sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DunningLog
ALTER TABLE "dunning_log" ADD CONSTRAINT "dunning_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dunning_log" ADD CONSTRAINT "dunning_log_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dunning_log" ADD CONSTRAINT "dunning_log_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "dunning_sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DunningOptOut
ALTER TABLE "dunning_opt_out" ADD CONSTRAINT "dunning_opt_out_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dunning_opt_out" ADD CONSTRAINT "dunning_opt_out_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CustomerPortalToken
ALTER TABLE "customer_portal_token" ADD CONSTRAINT "customer_portal_token_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_portal_token" ADD CONSTRAINT "customer_portal_token_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CustomerPortalAccessLog
ALTER TABLE "customer_portal_access_log" ADD CONSTRAINT "customer_portal_access_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_portal_access_log" ADD CONSTRAINT "customer_portal_access_log_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CustomerStatement
ALTER TABLE "customer_statement" ADD CONSTRAINT "customer_statement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement" ADD CONSTRAINT "customer_statement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Quote
ALTER TABLE "quote" ADD CONSTRAINT "quote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote" ADD CONSTRAINT "quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote" ADD CONSTRAINT "quote_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- QuoteLineItem
ALTER TABLE "quote_line_item" ADD CONSTRAINT "quote_line_item_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentArrangement
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PaymentInstallment
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "payment_arrangement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_invoicePaymentId_fkey" FOREIGN KEY ("invoicePaymentId") REFERENCES "invoice_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
