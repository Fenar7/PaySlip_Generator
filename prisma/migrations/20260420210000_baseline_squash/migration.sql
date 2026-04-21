-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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
CREATE TYPE "JournalSource" AS ENUM ('MANUAL', 'INVOICE', 'INVOICE_PAYMENT', 'VOUCHER', 'VENDOR_BILL', 'VENDOR_BILL_PAYMENT', 'SALARY_SLIP', 'GST', 'TDS', 'BANK_RECONCILIATION', 'OPENING_BALANCE', 'SYSTEM_REVERSAL');

-- CreateEnum
CREATE TYPE "FiscalPeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('BANK', 'CASH', 'PETTY_CASH', 'GATEWAY_CLEARING');

-- CreateEnum
CREATE TYPE "BankImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "BankTxnDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "BankTxnStatus" AS ENUM ('UNMATCHED', 'SUGGESTED', 'PARTIALLY_MATCHED', 'MATCHED', 'IGNORED');

-- CreateEnum
CREATE TYPE "MatchEntityType" AS ENUM ('INVOICE_PAYMENT', 'VENDOR_BILL_PAYMENT', 'VOUCHER', 'JOURNAL_ENTRY', 'INTERNAL_TRANSFER', 'BANK_FEE');

-- CreateEnum
CREATE TYPE "VendorBillStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorBillPaymentStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentRunStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentRunItemStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CloseRunStatus" AS ENUM ('DRAFT', 'READY', 'BLOCKED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "CloseTaskStatus" AS ENUM ('PENDING', 'PASSED', 'BLOCKED', 'WAIVED');

-- CreateEnum
CREATE TYPE "TdsSection" AS ENUM ('SECTION_194A', 'SECTION_194C', 'SECTION_194J', 'SECTION_194H', 'SECTION_194I', 'SECTION_194Q', 'OTHER');

-- CreateEnum
CREATE TYPE "TdsCertStatus" AS ENUM ('PENDING_CERT', 'CERT_RECEIVED', 'FILED');

-- CreateEnum
CREATE TYPE "GstType" AS ENUM ('INTRASTATE', 'INTERSTATE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "GstFilingReturnType" AS ENUM ('GSTR1');

-- CreateEnum
CREATE TYPE "GstFilingRunStatus" AS ENUM ('DRAFT', 'BLOCKED', 'READY', 'SUBMISSION_PENDING', 'RECONCILING', 'RECONCILED', 'FAILED');

-- CreateEnum
CREATE TYPE "GstFilingValidationSeverity" AS ENUM ('ERROR', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "GstFilingSubmissionStatus" AS ENUM ('INTENT_RECORDED', 'SUBMITTED', 'ACKNOWLEDGED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GstFilingProvider" AS ENUM ('MANUAL');

-- CreateEnum
CREATE TYPE "GstFilingReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'VARIANCE', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "GstFilingEventType" AS ENUM ('RUN_CREATED', 'VALIDATION_COMPLETED', 'STATUS_CHANGED', 'PACKAGE_EXPORTED', 'SUBMISSION_INTENT_RECORDED', 'SUBMISSION_RECORDED', 'SUBMISSION_FAILED', 'RECONCILIATION_RECORDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VIEWED', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED', 'REISSUED', 'ARRANGEMENT_MADE');

-- CreateEnum
CREATE TYPE "ProofReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BILLING_QUERY', 'AMOUNT_DISPUTE', 'MISSING_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApprovalPolicyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ApprovalStepMode" AS ENUM ('SINGLE', 'SEQUENTIAL');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketSeverity" AS ENUM ('INFORMATIONAL', 'BLOCKING', 'FINANCE_CRITICAL', 'CUSTOMER_ESCALATED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduledActionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'TERMINAL_FAILURE', 'REPLAYED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('in_app', 'email');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProxyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChainStatus" AS ENUM ('VALID', 'BROKEN', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "ChainVerificationStatus" AS ENUM ('INTACT', 'BROKEN', 'EMPTY');

-- CreateEnum
CREATE TYPE "AuditExportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "shared_document_status" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'DISABLED_BY_POLICY');

-- CreateEnum
CREATE TYPE "share_bundle_status" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "share_access_event_type" AS ENUM ('VIEWED', 'DOWNLOADED', 'EXPIRED', 'REVOKED', 'RECIPIENT_VERIFIED', 'VERIFICATION_FAILED', 'BLOCKED_BY_POLICY');

-- CreateEnum
CREATE TYPE "SsoMetadataStatus" AS ENUM ('PENDING', 'VALID', 'FAILED', 'STALE');

-- CreateEnum
CREATE TYPE "SsoAuthnRequestMode" AS ENUM ('LOGIN', 'TEST');

-- CreateEnum
CREATE TYPE "DunningTone" AS ENUM ('FRIENDLY', 'POLITE', 'FIRM', 'URGENT', 'ESCALATE');

-- CreateEnum
CREATE TYPE "DunningLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ArrangementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "MarketplaceTemplateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('ACCOUNTANT', 'TECHNOLOGY', 'RESELLER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PartnerAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntelInsightStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntelInsightSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IntelInsightCategory" AS ENUM ('REVENUE', 'RECEIVABLES', 'DOCUMENTS', 'PAYROLL', 'OPERATIONS', 'COMPLIANCE', 'PARTNER', 'MARKETPLACE', 'INTEGRATIONS', 'SYSTEM', 'SPENDING_ANOMALY', 'FORECAST_DEVIATION', 'TAX_LIABILITY');

-- CreateEnum
CREATE TYPE "InsightSourceType" AS ENUM ('RULE', 'AI', 'HYBRID', 'INTEGRATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExtractionReviewStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'PROMOTED', 'REJECTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "external_access_event_type" AS ENUM ('PORTAL_LOGIN', 'PORTAL_LOGOUT', 'PORTAL_SESSION_EXPIRED', 'PORTAL_SESSION_REVOKED', 'INVOICE_VIEWED', 'INVOICE_DOWNLOADED', 'STATEMENT_VIEWED', 'QUOTE_VIEWED', 'QUOTE_ACCEPTED', 'QUOTE_DECLINED', 'TICKET_VIEWED', 'TICKET_REPLY_SUBMITTED', 'PROOF_UPLOADED', 'DOCUMENT_SHARED', 'SHARE_VIEWED', 'SHARE_DOWNLOADED', 'SHARE_REVOKED', 'BUNDLE_VIEWED', 'BUNDLE_DOWNLOADED', 'UNUSUAL_ACCESS');

-- CreateEnum
CREATE TYPE "recipient_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "pixel_tool_type" AS ENUM ('PASSPORT_PHOTO', 'RESIZE', 'COMPRESS', 'ADJUST', 'FORMAT_CONVERT', 'PRINT_SHEET');

-- CreateEnum
CREATE TYPE "usage_resource" AS ENUM ('INVOICE', 'QUOTE', 'VOUCHER', 'SALARY_SLIP', 'FILE_STORAGE_BYTES', 'TEAM_MEMBER', 'WEBHOOK_CALL', 'PORTAL_SESSION', 'SHARE_BUNDLE', 'PIXEL_JOB_SAVED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'REVIEW', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('STANDALONE', 'HOLDING', 'SUBSIDIARY', 'BRANCH');

-- CreateEnum
CREATE TYPE "InterCompanyTransferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryValuationMethod" AS ENUM ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE');

-- CreateEnum
CREATE TYPE "StockEventType" AS ENUM ('PURCHASE_RECEIPT', 'SALES_DISPATCH', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN_IN', 'RETURN_OUT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('PHYSICAL_COUNT', 'DAMAGE', 'THEFT', 'EXPIRED', 'FOUND', 'CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GrnStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'MATCHED', 'PARTIAL_MATCH', 'MISMATCH', 'RESOLVED', 'WAIVED');

-- CreateEnum
CREATE TYPE "gstr2b_import_status" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'RECONCILING', 'RECONCILED', 'FAILED');

-- CreateEnum
CREATE TYPE "gstr2b_match_status" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'SUGGESTED', 'MANUALLY_MATCHED', 'MISMATCH', 'NOT_IN_BOOKS', 'NOT_IN_GSTR2B');

-- CreateEnum
CREATE TYPE "e_invoice_request_type" AS ENUM ('GENERATE_IRN', 'CANCEL_IRN', 'GENERATE_EWAY_BILL', 'CANCEL_EWAY_BILL');

-- CreateEnum
CREATE TYPE "e_invoice_status" AS ENUM ('PENDING', 'SUBMITTED', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "customer_lifecycle_stage" AS ENUM ('PROSPECT', 'QUALIFIED', 'NEGOTIATION', 'WON', 'ACTIVE', 'AT_RISK', 'CHURNED');

-- CreateEnum
CREATE TYPE "vendor_compliance_status" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "sop_document_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ForecastTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaxRegion" AS ENUM ('IN_GST', 'UK_VAT', 'EU_VAT', 'US_SALES', 'AU_GST', 'NZ_GST', 'SG_GST', 'EXEMPT');

-- CreateEnum
CREATE TYPE "TaxFilingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "FlashReportChannel" AS ENUM ('PUSH', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "FlashReportFrequency" AS ENUM ('DAILY_9AM', 'WEEKLY_MONDAY', 'MONTHLY_1ST', 'CUSTOM_CRON');

-- CreateEnum
CREATE TYPE "FlashDeliveryStatus" AS ENUM ('DELIVERED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "BillingGateway" AS ENUM ('STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "BillingAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('CHECKOUT_INITIATED', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_ACTIVATED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'SUBSCRIPTION_PAUSED', 'SUBSCRIPTION_RESUMED', 'SUBSCRIPTION_CANCELED', 'INVOICE_GENERATED', 'OVERAGE_CHARGED', 'DUNNING_ATTEMPT', 'REFUND_ISSUED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpEnabledAt" TIMESTAMP(3),
    "recoveryCodes" JSONB,
    "twoFaEnforcedByOrg" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "entity_group_id" TEXT,
    "parent_org_id" TEXT,
    "entity_type" "EntityType" NOT NULL DEFAULT 'STANDALONE',
    "consolidation_currency" TEXT NOT NULL DEFAULT 'INR',
    "primary_tax_region" "TaxRegion",

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "customRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" UUID NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branding_profile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#dc2626',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "fontColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_defaults" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankIFSC" TEXT,
    "taxId" TEXT,
    "gstin" TEXT,
    "businessAddress" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceCounter" INTEGER NOT NULL DEFAULT 1,
    "voucherPrefix" TEXT NOT NULL DEFAULT 'VCH',
    "voucherCounter" INTEGER NOT NULL DEFAULT 1,
    "salarySlipPrefix" TEXT NOT NULL DEFAULT 'SAL',
    "salarySlipCounter" INTEGER NOT NULL DEFAULT 1,
    "vendorBillPrefix" TEXT NOT NULL DEFAULT 'BILL',
    "vendorBillCounter" INTEGER NOT NULL DEFAULT 1,
    "defaultInvoiceTemplate" TEXT NOT NULL DEFAULT 'minimal',
    "defaultVoucherTemplate" TEXT NOT NULL DEFAULT 'minimal-office',
    "defaultSlipTemplate" TEXT NOT NULL DEFAULT 'modern-premium',
    "upiVpa" TEXT,
    "gstStateCode" TEXT,
    "panNumber" TEXT,
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalHeaderMessage" TEXT,
    "portalSupportEmail" TEXT,
    "portalSupportPhone" TEXT,
    "portalMagicLinkExpiryHours" INTEGER NOT NULL DEFAULT 24,
    "portalSessionExpiryHours" INTEGER NOT NULL DEFAULT 24,
    "portalProofUploadEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalTicketCreationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "portalStatementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "portalQuoteAcceptanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "highValuePaymentThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "requireDualApprovalPayment" BOOLEAN NOT NULL DEFAULT false,
    "quotePrefix" TEXT NOT NULL DEFAULT 'QTE',
    "quoteCounter" INTEGER NOT NULL DEFAULT 1,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 14,
    "quoteHeaderLabel" TEXT NOT NULL DEFAULT 'QUOTE',
    "defaultDunningSeqId" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "defaultDocLanguage" TEXT NOT NULL DEFAULT 'en',
    "country" TEXT NOT NULL DEFAULT 'IN',
    "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "vatRegNumber" TEXT,
    "vatRate" DECIMAL(5,2),
    "fiscalYearStart" INTEGER NOT NULL DEFAULT 4,
    "booksEnabled" BOOLEAN NOT NULL DEFAULT false,
    "coaTemplate" TEXT,
    "coaSeededAt" TIMESTAMP(3),
    "defaultReceivableAccountId" TEXT,
    "defaultPayableAccountId" TEXT,
    "defaultBankAccountId" TEXT,
    "defaultRevenueAccountId" TEXT,
    "defaultExpenseAccountId" TEXT,
    "defaultPayrollExpenseAccountId" TEXT,
    "defaultPayrollPayableAccountId" TEXT,
    "defaultGstOutputAccountId" TEXT,
    "defaultTdsPayableAccountId" TEXT,
    "defaultGatewayClearingAccountId" TEXT,
    "defaultSuspenseAccountId" TEXT,
    "poPrefix" TEXT NOT NULL DEFAULT 'PO',
    "poCounter" INTEGER NOT NULL DEFAULT 1,
    "grnPrefix" TEXT NOT NULL DEFAULT 'GRN',
    "grnCounter" INTEGER NOT NULL DEFAULT 1,
    "matchQtyTolerancePct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "matchAmountTolerancePct" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_defaults_pkey" PRIMARY KEY ("id")
);

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
    "bankTransactionId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account" (
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
CREATE TABLE "bank_statement_import" (
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
CREATE TABLE "bank_transaction" (
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
CREATE TABLE "bank_transaction_match" (
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

-- CreateTable
CREATE TABLE "vendor_bill" (
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
    "purchaseOrderId" TEXT,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "vendor_bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bill_line" (
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
CREATE TABLE "vendor_bill_payment" (
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
CREATE TABLE "payment_run" (
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
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_run_item" (
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
CREATE TABLE "close_run" (
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
CREATE TABLE "close_task" (
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

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentHealthScore" INTEGER NOT NULL DEFAULT 100,
    "preferredLanguage" TEXT,
    "razorpayCustomerId" TEXT,
    "industry" TEXT,
    "segment" TEXT,
    "lifecycleStage" "customer_lifecycle_stage" NOT NULL DEFAULT 'PROSPECT',
    "source" TEXT,
    "assignedToUserId" UUID,
    "nextFollowUpAt" TIMESTAMP(3),
    "lifetimeValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalInvoiced" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastInteractionAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "rating" INTEGER,
    "complianceStatus" "vendor_compliance_status" NOT NULL DEFAULT 'PENDING',
    "totalBilled" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "employeeId" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankIFSC" TEXT,
    "panNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employmentType" TEXT,
    "ctcAnnual" DECIMAL(65,30),
    "effectiveFrom" TIMESTAMP(3),
    "pfAccountNumber" TEXT,
    "esiNumber" TEXT,
    "taxRegime" TEXT NOT NULL DEFAULT 'new',
    "pfOptOut" BOOLEAN NOT NULL DEFAULT false,
    "esiOptOut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "originalId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "reissueReason" TEXT,
    "razorpayPaymentLinkId" TEXT,
    "razorpayPaymentLinkUrl" TEXT,
    "paymentLinkExpiresAt" TIMESTAMP(3),
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPaymentAt" TIMESTAMP(3),
    "lastPaymentMethod" TEXT,
    "paymentPromiseDate" TEXT,
    "paymentLinkStatus" TEXT,
    "paymentLinkLastEventAt" TIMESTAMP(3),
    "dunningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dunningPausedUntil" TIMESTAMP(3),
    "dunningSequenceId" TEXT,
    "supplierGstin" TEXT,
    "customerGstin" TEXT,
    "placeOfSupply" TEXT,
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "exportType" TEXT,
    "gstTotalCgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstTotalSgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstTotalIgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstTotalCess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "irnNumber" TEXT,
    "irnAckNumber" TEXT,
    "irnAckDate" TIMESTAMP(3),
    "irnQrCode" TEXT,
    "eWayBillNumber" TEXT,
    "eWayBillDate" TIMESTAMP(3),
    "eWayBillExpiry" TIMESTAMP(3),
    "ewbTransportMode" TEXT,
    "ewbVehicleNumber" TEXT,
    "ewbTransporterGstin" TEXT,
    "ewbTransportDocNo" TEXT,
    "ewbDistanceKm" INTEGER,
    "ewbFromPincode" TEXT,
    "ewbToPincode" TEXT,
    "displayCurrency" TEXT,
    "exchangeRate" DOUBLE PRECISION,
    "displayTotalAmount" DOUBLE PRECISION,
    "exchangeRateDate" TIMESTAMP(3),
    "documentLanguage" TEXT NOT NULL DEFAULT 'en',
    "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
    "revenueRecognitionStatus" "RevenueRecognitionStatus" NOT NULL DEFAULT 'PENDING',
    "postedJournalEntryId" TEXT,
    "accountingPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "generatedFromRuleId" TEXT,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_item" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    "sacCode" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstType" "GstType" NOT NULL DEFAULT 'INTRASTATE',
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cessAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT,
    "voucherNumber" TEXT NOT NULL,
    "voucherDate" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'payment',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "formData" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isMultiLine" BOOLEAN NOT NULL DEFAULT false,
    "documentLanguage" TEXT NOT NULL DEFAULT 'en',
    "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_line" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT,
    "time" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "voucher_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_slip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT,
    "slipNumber" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "formData" JSONB NOT NULL,
    "grossPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentLanguage" TEXT NOT NULL DEFAULT 'en',
    "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
    "journalEntryId" TEXT,
    "payoutJournalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "payoutPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "salary_slip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_component" (
    "id" TEXT NOT NULL,
    "salarySlipId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "salary_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_preset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_state_event" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "actorId" UUID,
    "actorName" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_state_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "note" TEXT,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'admin_manual',
    "status" TEXT NOT NULL DEFAULT 'SETTLED',
    "externalPaymentId" TEXT,
    "externalReferenceId" TEXT,
    "externalPayload" JSONB,
    "paymentMethodDisplay" TEXT,
    "paymentChannel" TEXT,
    "plannedNextPaymentDate" TEXT,
    "recordedByUserId" UUID,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
    "journalEntryId" TEXT,
    "bankMatchId" TEXT,
    "clearingAccountId" TEXT,
    "accountingPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_proof" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoicePaymentId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDate" TEXT,
    "paymentMethod" TEXT,
    "plannedNextPaymentDate" TEXT,
    "uploadedByToken" TEXT,
    "uploadedByUserId" UUID,
    "reviewStatus" "ProofReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_invoice_token" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_invoice_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_ticket" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "submitterToken" TEXT,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "severity" "TicketSeverity" NOT NULL DEFAULT 'INFORMATIONAL',
    "dueAt" TIMESTAMP(3),
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "breachedAt" TIMESTAMP(3),
    "breachType" TEXT,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "sourceModule" TEXT,

    CONSTRAINT "invoice_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_reply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" UUID,
    "authorName" TEXT NOT NULL,
    "portalCustomerId" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "status" "ApprovalPolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "stepMode" "ApprovalStepMode" NOT NULL DEFAULT 'SINGLE',
    "escalateAfterMins" INTEGER,
    "minAmount" DECIMAL(14,2),
    "maxAmount" DECIMAL(14,2),
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policy_rule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "minAmount" DECIMAL(14,2),
    "maxAmount" DECIMAL(14,2),
    "approverRole" TEXT,
    "approverUserId" UUID,
    "fallbackRole" TEXT,
    "fallbackUserId" UUID,
    "approverType" TEXT NOT NULL DEFAULT 'role',
    "approvalMode" TEXT NOT NULL DEFAULT 'any_one',
    "escalateAfterHours" INTEGER,
    "allowDelegation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_policy_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_sla_policy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT,
    "firstResponseTargetMins" INTEGER NOT NULL,
    "resolutionTargetMins" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_sla_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_escalation_rule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breachType" TEXT NOT NULL,
    "afterMins" INTEGER NOT NULL,
    "targetRole" TEXT,
    "targetUserId" UUID,
    "notifyOrgAdmins" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_escalation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_action" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "workflowRunId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "ScheduledActionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "scheduled_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_action" (
    "id" TEXT NOT NULL,
    "scheduledActionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "failureReason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deadLetteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,

    CONSTRAINT "dead_letter_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "conditionJson" JSONB,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "actorId" UUID,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_run" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "workflowStepId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "outputPayload" JSONB,

    CONSTRAINT "workflow_step_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_request" (
    "id" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "requestedById" UUID NOT NULL,
    "requestedByName" TEXT,
    "approverId" UUID,
    "approverName" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "policyId" TEXT,
    "policyRuleId" TEXT,
    "dueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "currentRuleOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "approval_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decision" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ruleOrder" INTEGER NOT NULL,
    "decidedById" UUID NOT NULL,
    "decidedByName" TEXT,
    "delegatedFromId" UUID,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_delegation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "reason" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "severity" TEXT,
    "sourceModule" TEXT,
    "sourceRef" TEXT,
    "emailRequested" BOOLEAN NOT NULL DEFAULT false,
    "recipientEmail" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL,
    "recipientTarget" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "provider" TEXT,
    "providerRef" TEXT,
    "sourceModule" TEXT,
    "sourceRef" TEXT,
    "workflowRunId" TEXT,
    "scheduledActionId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "replayedFromId" TEXT,
    "replayedAt" TIMESTAMP(3),
    "replayedBy" UUID,

    CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" UUID,
    "actorName" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "docType" TEXT,
    "docId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_send" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "SendStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_send_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_rule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "baseInvoiceId" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "runsCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_invoice_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_log" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT,
    "orgId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invoiceId" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "job_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "report_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_filing_run" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "returnType" "GstFilingReturnType" NOT NULL DEFAULT 'GSTR1',
    "status" "GstFilingRunStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceSnapshotHash" TEXT,
    "validatedSnapshotHash" TEXT,
    "blockerCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "submittedByUserId" UUID,
    "submittedAt" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_filing_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_filing_validation_issue" (
    "id" TEXT NOT NULL,
    "filingRunId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "GstFilingValidationSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "invoiceId" TEXT,
    "invoiceNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_filing_validation_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_filing_submission" (
    "id" TEXT NOT NULL,
    "filingRunId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "GstFilingSubmissionStatus" NOT NULL DEFAULT 'INTENT_RECORDED',
    "provider" "GstFilingProvider" NOT NULL DEFAULT 'MANUAL',
    "attempt" INTEGER NOT NULL,
    "requestHash" TEXT NOT NULL,
    "externalReference" TEXT,
    "acknowledgementNumber" TEXT,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "initiatedByUserId" UUID,
    "completedByUserId" UUID,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_filing_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_filing_reconciliation" (
    "id" TEXT NOT NULL,
    "filingRunId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "GstFilingReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "varianceCount" INTEGER NOT NULL DEFAULT 0,
    "delta" JSONB,
    "note" TEXT,
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_filing_reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_filing_event" (
    "id" TEXT NOT NULL,
    "filingRunId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventType" "GstFilingEventType" NOT NULL,
    "actorId" UUID,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_filing_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxy_grant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "representedId" UUID NOT NULL,
    "scope" TEXT[],
    "reason" TEXT NOT NULL,
    "grantedBy" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ProxyStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proxy_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "representedId" UUID,
    "proxyGrantId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sequenceNum" BIGINT,
    "entryHash" TEXT,
    "prevHash" TEXT,
    "chainStatus" "ChainStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_chain_verification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "totalEntries" INTEGER NOT NULL,
    "verifiedEntries" INTEGER NOT NULL,
    "status" "ChainVerificationStatus" NOT NULL,
    "firstBreakSeq" BIGINT,
    "firstBreakHash" TEXT,
    "gapsDetected" JSONB,
    "durationMs" INTEGER NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'CRON',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_chain_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_package_export" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "fileSizeBytes" BIGINT,
    "storageKey" TEXT,
    "downloadUrl" TEXT,
    "downloadExpiry" TIMESTAMP(3),
    "exportedByUserId" UUID NOT NULL,
    "status" "AuditExportStatus" NOT NULL DEFAULT 'GENERATING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_package_export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_usage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "send_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "docType" TEXT,
    "docId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "send_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "billingInterval" TEXT,
    "razorpayCustomerId" TEXT,
    "razorpaySubId" TEXT,
    "razorpayPlanId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pausedUntil" TIMESTAMP(3),
    "pauseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_record" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "periodDay" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "razorpay_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "razorpay_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral" (
    "id" TEXT NOT NULL,
    "referrerId" UUID NOT NULL,
    "referredOrgId" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "creditApplied" BOOLEAN NOT NULL DEFAULT false,
    "referrerCredit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),

    CONSTRAINT "referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_document" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "status" "shared_document_status" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "downloadAllowed" BOOLEAN NOT NULL DEFAULT true,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT false,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "notes" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_bundle" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "share_bundle_status" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadAllowed" BOOLEAN NOT NULL DEFAULT true,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "notes" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_bundle_item" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "sharedDocumentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "share_bundle_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_access_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sharedDocumentId" TEXT,
    "bundleId" TEXT,
    "event" "share_access_event_type" NOT NULL,
    "recipientEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accountCreated" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "orgSetup" BOOLEAN NOT NULL DEFAULT false,
    "firstDocCreated" BOOLEAN NOT NULL DEFAULT false,
    "firstDocExported" BOOLEAN NOT NULL DEFAULT false,
    "teamMemberInvited" BOOLEAN NOT NULL DEFAULT false,
    "recurringSetup" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_virtual_account" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "razorpayVaId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "customer_virtual_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unmatched_payment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "virtualAccountId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "payerName" TEXT,
    "payerAccount" TEXT,
    "payerIfsc" TEXT,
    "razorpayPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "matchedInvoiceId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "unmatched_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "razorpayInvoiceId" TEXT,
    "razorpayPaymentId" TEXT,
    "planId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "rateLimitTier" TEXT NOT NULL DEFAULT 'free',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_webhook_endpoint" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secretHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDeliveredAt" TIMESTAMP(3),
    "apiVersion" TEXT NOT NULL DEFAULT 'v2',
    "signingSecret" TEXT,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "retryBackoff" TEXT NOT NULL DEFAULT 'exponential',
    "consecutiveFails" INTEGER NOT NULL DEFAULT 0,
    "autoDisableAt" INTEGER NOT NULL DEFAULT 10,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),

    CONSTRAINT "api_webhook_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_webhook_delivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "nextRetryAt" TIMESTAMP(3),
    "requestBody" JSONB,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "api_webhook_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_request_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'SAML',
    "provider" TEXT NOT NULL,
    "metadataUrl" TEXT,
    "metadataXml" TEXT,
    "acsUrl" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "idpEntityId" TEXT,
    "idpSsoUrl" TEXT,
    "idpSsoBinding" TEXT,
    "idpCertificates" JSONB,
    "oidcIssuerUrl" TEXT,
    "oidcClientId" TEXT,
    "oidcClientSecret" TEXT,
    "oidcJwksUrl" TEXT,
    "oidcScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "oidcEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadataStatus" "SsoMetadataStatus" NOT NULL DEFAULT 'PENDING',
    "metadataError" TEXT,
    "metadataLastFetchedAt" TIMESTAMP(3),
    "metadataNextRefreshAt" TIMESTAMP(3),
    "ssoEnforced" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "testedAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastFailureReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_break_glass_code" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "issuedByUserId" UUID NOT NULL,
    "redeemedByUserId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_break_glass_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_authn_request" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mode" "SsoAuthnRequestMode" NOT NULL DEFAULT 'LOGIN',
    "redirectTo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "sso_authn_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_assertion_replay" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "assertionId" TEXT NOT NULL,
    "responseId" TEXT,
    "nameId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_assertion_replay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_org_preference" (
    "userId" UUID NOT NULL,
    "activeOrgId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_org_preference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "org_domain" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "org_domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_white_label" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "removeBranding" BOOLEAN NOT NULL DEFAULT false,
    "emailFromName" TEXT,
    "emailReplyTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_white_label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_email_domain" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "defaultRole" TEXT NOT NULL DEFAULT 'viewer',
    "autoJoin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_email_domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_job" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputS3Key" TEXT NOT NULL,
    "extractedData" JSONB,
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ocr_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_integration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "externalOrgId" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunning_sequence" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dunning_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunning_step" (
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

-- CreateTable
CREATE TABLE "dunning_log" (
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

-- CreateTable
CREATE TABLE "dunning_opt_out" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_opt_out_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_portal_token" (
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

-- CreateTable
CREATE TABLE "customer_portal_access_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "action" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "statusCode" INTEGER,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_portal_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_portal_session" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "customer_portal_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_statement" (
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

-- CreateTable
CREATE TABLE "quote" (
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
    "documentLanguage" TEXT NOT NULL DEFAULT 'en',
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

-- CreateTable
CREATE TABLE "quote_line_item" (
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

-- CreateTable
CREATE TABLE "payment_arrangement" (
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

-- CreateTable
CREATE TABLE "payment_installment" (
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

-- CreateTable
CREATE TABLE "hsn_sac_code" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gstRate" DOUBLE PRECISION NOT NULL,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "chapter" TEXT,
    "section" TEXT,

    CONSTRAINT "hsn_sac_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tdsSection" "TdsSection" NOT NULL,
    "tdsRate" DOUBLE PRECISION NOT NULL,
    "tdsAmount" DOUBLE PRECISION NOT NULL,
    "certStatus" "TdsCertStatus" NOT NULL DEFAULT 'PENDING_CERT',
    "certNumber" TEXT,
    "certDate" TIMESTAMP(3),
    "certFilePath" TEXT,
    "deductorTan" TEXT,
    "financialYear" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tds_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_templates" (
    "id" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previewImageUrl" TEXT NOT NULL,
    "previewPdfUrl" TEXT,
    "category" TEXT[],
    "tags" TEXT[],
    "price" DECIMAL(8,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "publisherOrgId" TEXT,
    "publisherName" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" "MarketplaceTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "templateData" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_template_revisions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "publisherDisplayName" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "previewImageUrl" TEXT NOT NULL,
    "previewPdfUrl" TEXT,
    "status" "MarketplaceTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_template_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_purchases" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" UUID,
    "amount" DECIMAL(8,2) NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisionId" TEXT,

    CONSTRAINT "marketplace_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" UUID,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_revenue" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "publisherOrgId" TEXT NOT NULL,
    "totalAmount" DECIMAL(8,2) NOT NULL,
    "publisherShare" DECIMAL(8,2) NOT NULL,
    "platformShare" DECIMAL(8,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "eligibleAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "paidOutAt" TIMESTAMP(3),
    "onHoldReason" TEXT,
    "failureReason" TEXT,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_payout_beneficiary" (
    "id" TEXT NOT NULL,
    "publisherOrgId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "payoutMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "bankAccountCiphertext" TEXT,
    "bankAccountLast4" TEXT,
    "bankAccountFingerprint" TEXT,
    "ifscCiphertext" TEXT,
    "upiIdCiphertext" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "providerName" TEXT,
    "providerBeneficiaryId" TEXT,
    "verificationReference" TEXT,
    "verificationNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_payout_beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_payout_run" (
    "id" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "providerName" TEXT NOT NULL DEFAULT 'manual',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "manualReviewCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "requestedByUserId" UUID,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "executedByUserId" UUID,
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_payout_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_payout_item" (
    "id" TEXT NOT NULL,
    "payoutRunId" TEXT NOT NULL,
    "revenueId" TEXT NOT NULL,
    "publisherOrgId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerReferenceId" TEXT,
    "externalReferenceId" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "manualReviewReason" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_payout_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_payout_attempt" (
    "id" TEXT NOT NULL,
    "payoutRunId" TEXT NOT NULL,
    "payoutItemId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "providerReferenceId" TEXT,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_payout_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_payout_event" (
    "id" TEXT NOT NULL,
    "publisherOrgId" TEXT,
    "payoutRunId" TEXT,
    "payoutItemId" TEXT,
    "payoutAttemptId" TEXT,
    "revenueId" TEXT,
    "beneficiaryId" TEXT,
    "actorId" UUID,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_payout_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_apps" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "logoUrl" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "scopes" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_authorizations" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "grantedBy" UUID NOT NULL,
    "scopes" TEXT[],
    "authCode" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_profiles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "partnerCode" TEXT NOT NULL,
    "revenueShare" DECIMAL(5,2) NOT NULL,
    "managedOrgCount" INTEGER NOT NULL DEFAULT 0,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_managed_orgs" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedByUserId" TEXT,
    "scope" TEXT[],
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "partner_managed_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_client_access_requests" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "scope" TEXT[],
    "status" "PartnerAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_client_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_review_events" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "fromStatus" "PartnerStatus" NOT NULL,
    "toStatus" "PartnerStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_activity_logs" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "managedOrgId" TEXT,
    "clientOrgId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_index" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "titleOrSummary" TEXT NOT NULL,
    "counterpartyLabel" TEXT,
    "status" TEXT NOT NULL,
    "primaryDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "document_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intel_insight" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "category" "IntelInsightCategory" NOT NULL,
    "severity" "IntelInsightSeverity" NOT NULL,
    "status" "IntelInsightStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB,
    "sourceType" "InsightSourceType" NOT NULL,
    "sourceRecordType" TEXT,
    "sourceRecordId" TEXT,
    "recommendedActionType" TEXT,
    "assignedRole" TEXT,
    "createdByJobId" TEXT,
    "dedupeKey" TEXT,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" UUID,
    "dismissedAt" TIMESTAMP(3),
    "dismissedByUserId" UUID,
    "dismissedReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intel_insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_event" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" UUID,
    "actorLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_job" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" UUID,
    "feature" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "model" TEXT,
    "promptTemplateKey" TEXT,
    "promptTemplateVersion" TEXT,
    "inputRef" JSONB,
    "outputRef" JSONB,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "costEstimatePaise" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_job_event" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_job_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_review" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "aiJobId" TEXT,
    "ocrJobId" TEXT,
    "sourceAttachmentId" TEXT,
    "targetType" TEXT,
    "targetDraftId" TEXT,
    "status" "ExtractionReviewStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalOutput" JSONB,
    "correctedOutput" JSONB,
    "reviewerId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_field" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "proposedValue" TEXT,
    "normalizedValue" TEXT,
    "correctedValue" TEXT,
    "confidence" DOUBLE PRECISION,
    "validationStatus" TEXT,
    "validationError" TEXT,
    "sourcePage" INTEGER,
    "sourceRegion" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_health_snapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "riskBand" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "recommendedAction" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_health_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_rule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severityDefault" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholdConfig" JSONB,
    "planGate" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_detection_run" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rulesEvaluated" INTEGER NOT NULL DEFAULT 0,
    "insightsCreated" INTEGER NOT NULL DEFAULT 0,
    "insightsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "anomaly_detection_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_record" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" UUID,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTemplateKey" TEXT,
    "usageType" TEXT NOT NULL DEFAULT 'completion',
    "tokensInput" INTEGER NOT NULL DEFAULT 0,
    "tokensOutput" INTEGER NOT NULL DEFAULT 0,
    "costEstimatePaise" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_access_event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" UUID,
    "eventType" "external_access_event_type" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_access_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_verification" (
    "id" TEXT NOT NULL,
    "sharedDocumentId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "recipient_verification_status" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipient_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pixel_job_record" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "toolType" "pixel_tool_type" NOT NULL,
    "inputFileName" TEXT NOT NULL,
    "outputFileName" TEXT,
    "presetId" TEXT,
    "storagePath" TEXT,
    "fileSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "pixel_job_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "resource" "usage_resource" NOT NULL,
    "delta" INTEGER NOT NULL,
    "entityId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_usage_snapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "activeInvoices" INTEGER NOT NULL DEFAULT 0,
    "activeQuotes" INTEGER NOT NULL DEFAULT 0,
    "vouchers" INTEGER NOT NULL DEFAULT 0,
    "salarySlips" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "teamMembers" INTEGER NOT NULL DEFAULT 0,
    "webhookCallsMonthly" INTEGER NOT NULL DEFAULT 0,
    "activePortalSessions" INTEGER NOT NULL DEFAULT 0,
    "activeShareBundles" INTEGER NOT NULL DEFAULT 0,
    "pixelJobsSaved" INTEGER NOT NULL DEFAULT 0,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_usage_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tally_import_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorDetails" JSONB,

    CONSTRAINT "tally_import_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_ctc_component" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "employee_ctc_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "workingDays" INTEGER NOT NULL DEFAULT 26,
    "totalGross" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNetPay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPfEmployer" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalEsiEmployer" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,

    CONSTRAINT "payroll_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_item" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salarySlipId" TEXT,
    "attendedDays" INTEGER NOT NULL,
    "lossOfPayDays" INTEGER NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(65,30) NOT NULL,
    "basicPay" DECIMAL(65,30) NOT NULL,
    "hra" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "specialAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pfEmployee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "esiEmployee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tdsDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "professionalTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(65,30) NOT NULL,
    "netPay" DECIMAL(65,30) NOT NULL,
    "pfEmployer" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "esiEmployer" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "holdReason" TEXT,

    CONSTRAINT "payroll_run_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_settings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "pfEnabled" BOOLEAN NOT NULL DEFAULT true,
    "esiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultTaxRegime" TEXT NOT NULL DEFAULT 'new',
    "professionalTaxState" TEXT,
    "professionalTaxSlabs" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_otp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "admin_org_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inter_company_transfer" (
    "id" TEXT NOT NULL,
    "entity_group_id" TEXT NOT NULL,
    "source_org_id" TEXT NOT NULL,
    "destination_org_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "transfer_date" TIMESTAMP(3) NOT NULL,
    "reference_number" TEXT,
    "status" "InterCompanyTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "source_journal_entry_id" TEXT,
    "destination_journal_entry_id" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "approved_by_user_id" UUID,
    "posted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_company_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "hsnSacCodeId" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 0,
    "valuationMethod" "InventoryValuationMethod" NOT NULL DEFAULT 'FIFO',
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_level" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "valuationAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "eventType" "StockEventType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "journalEntryId" TEXT,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_line" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reason" TEXT,

    CONSTRAINT "stock_adjustment_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "initiatedByUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_line" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "stock_transfer_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poDate" TEXT NOT NULL,
    "expectedDelivery" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB,
    "subtotalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "warehouseId" TEXT,
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "supplierGstin" TEXT,
    "placeOfSupply" TEXT,
    "gstTotalCgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gstTotalSgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gstTotalIgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" UUID,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_line" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "receivedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "billedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_note" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "receiptDate" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "GrnStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "inspectionNotes" TEXT,
    "receivedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipt_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_note_line" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poLineId" TEXT NOT NULL,
    "receivedQty" DECIMAL(65,30) NOT NULL,
    "acceptedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rejectedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,

    CONSTRAINT "goods_receipt_note_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "three_way_match_result" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "qtyMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discrepancies" JSONB,
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "three_way_match_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gstr2b_import" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fileKey" TEXT,
    "rawJson" JSONB,
    "importedByUserId" UUID NOT NULL,
    "status" "gstr2b_import_status" NOT NULL DEFAULT 'UPLOADED',
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "notInBooksCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gstr2b_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gstr2b_entry" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierGstin" TEXT NOT NULL,
    "supplierName" TEXT,
    "docNumber" TEXT NOT NULL,
    "docDate" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "taxableAmount" DECIMAL(15,2) NOT NULL,
    "cgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cess" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "matchStatus" "gstr2b_match_status" NOT NULL DEFAULT 'UNMATCHED',
    "matchedBillId" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "matchNote" TEXT,
    "reconciledByUserId" UUID,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gstr2b_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_request" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "requestType" "e_invoice_request_type" NOT NULL,
    "status" "e_invoice_status" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "irnNumber" TEXT,
    "ackNumber" TEXT,
    "ackDate" TIMESTAMP(3),
    "signedQrCode" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "triggeredByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e_invoice_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "irpEnvironment" TEXT NOT NULL DEFAULT 'sandbox',
    "gstin" TEXT,
    "encryptedUsername" TEXT,
    "encryptedPassword" TEXT,
    "authTokenCache" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "autoGenerateIrn" BOOLEAN NOT NULL DEFAULT false,
    "autoGenerateEwb" BOOLEAN NOT NULL DEFAULT false,
    "ewbDefaultTransportMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e_invoice_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_note" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_document" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" "sop_document_status" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" UUID,
    "createdByUserId" UUID NOT NULL,
    "lastEditedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "sop_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_snapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "smoothingAlpha" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "historicalData" JSONB NOT NULL,
    "projections" JSONB NOT NULL,
    "revenueRunRate" JSONB NOT NULL,
    "anomalies" JSONB,
    "actualValues" JSONB,
    "triggerType" "ForecastTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "region" "TaxRegion" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "registrationName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "thresholdAmount" DECIMAL(15,2),
    "filingFrequency" "TaxFilingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_liability_estimate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taxConfigId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "outputTax" JSONB NOT NULL,
    "outputTaxTotal" DECIMAL(15,2) NOT NULL,
    "inputTax" JSONB NOT NULL,
    "inputTaxTotal" DECIMAL(15,2) NOT NULL,
    "netLiability" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_liability_estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_optimization_run" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "currentBalance" DECIMAL(15,2) NOT NULL,
    "projectedInflows30d" DECIMAL(15,2) NOT NULL,
    "liquidityTarget" DECIMAL(15,2) NOT NULL,
    "totalDiscountCapturable" DECIMAL(15,2) NOT NULL,
    "totalDiscountRecommended" DECIMAL(15,2) NOT NULL,
    "discountCaptureRate" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_optimization_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_alert_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "liquidityTargetPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "forecastDeviationPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "largeOutflowPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "discountExpiryHours" INTEGER NOT NULL DEFAULT 48,
    "dsoSpikePct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "collectionStallDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashflow_alert_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_report_schedule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "FlashReportChannel" NOT NULL,
    "schedule" "FlashReportFrequency" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "customCron" TEXT,
    "whatsappNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastDeliveryStatus" "FlashDeliveryStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_report_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_report_delivery" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "channel" "FlashReportChannel" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FlashDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "flash_report_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executive_kpi_cache" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executive_kpi_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_account" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "gateway" "BillingGateway" NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "billingCountry" TEXT NOT NULL DEFAULT 'IN',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stripeCustomerId" TEXT,
    "razorpayCustomerId" TEXT,
    "status" "BillingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_event" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "gatewayEventId" TEXT,
    "amount" BIGINT,
    "currency" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overage_line" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "includedUnits" INTEGER NOT NULL,
    "usedUnits" INTEGER NOT NULL,
    "overageUnits" INTEGER NOT NULL,
    "overageRate" BIGINT NOT NULL,
    "overageAmount" BIGINT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overage_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_dunning_attempt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_dunning_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_role" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_residency_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'IN',
    "bucketEndpoint" TEXT,
    "enforced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_residency_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_group_mapping" (
    "id" TEXT NOT NULL,
    "ssoConfigId" TEXT NOT NULL,
    "externalGroup" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "customRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_group_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_dead_letter" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastStatus" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "organization_entity_group_id_idx" ON "organization"("entity_group_id");

-- CreateIndex
CREATE INDEX "member_customRoleId_idx" ON "member"("customRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "branding_profile_organizationId_key" ON "branding_profile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_defaults_organizationId_key" ON "org_defaults"("organizationId");

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
CREATE INDEX "journal_line_orgId_bankTransactionId_idx" ON "journal_line"("orgId", "bankTransactionId");

-- CreateIndex
CREATE INDEX "journal_line_orgId_entityType_entityId_idx" ON "journal_line"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_line_journalEntryId_lineNumber_key" ON "journal_line"("journalEntryId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_glAccountId_key" ON "bank_account"("glAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_openingJournalEntryId_key" ON "bank_account"("openingJournalEntryId");

-- CreateIndex
CREATE INDEX "bank_account_orgId_isActive_idx" ON "bank_account"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "bank_account_orgId_isPrimary_idx" ON "bank_account"("orgId", "isPrimary");

-- CreateIndex
CREATE INDEX "bank_statement_import_orgId_status_idx" ON "bank_statement_import"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_statement_import_bankAccountId_checksum_key" ON "bank_statement_import"("bankAccountId", "checksum");

-- CreateIndex
CREATE INDEX "bank_transaction_orgId_status_txnDate_idx" ON "bank_transaction"("orgId", "status", "txnDate");

-- CreateIndex
CREATE INDEX "bank_transaction_orgId_bankAccountId_txnDate_idx" ON "bank_transaction"("orgId", "bankAccountId", "txnDate");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transaction_bankAccountId_fingerprint_key" ON "bank_transaction"("bankAccountId", "fingerprint");

-- CreateIndex
CREATE INDEX "bank_transaction_match_orgId_status_idx" ON "bank_transaction_match"("orgId", "status");

-- CreateIndex
CREATE INDEX "bank_transaction_match_entityType_entityId_idx" ON "bank_transaction_match"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transaction_match_bankTxnId_entityType_entityId_key" ON "bank_transaction_match"("bankTxnId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bill_journalEntryId_key" ON "vendor_bill"("journalEntryId");

-- CreateIndex
CREATE INDEX "vendor_bill_orgId_status_idx" ON "vendor_bill"("orgId", "status");

-- CreateIndex
CREATE INDEX "vendor_bill_purchaseOrderId_idx" ON "vendor_bill"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bill_orgId_billNumber_key" ON "vendor_bill"("orgId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bill_payment_journalEntryId_key" ON "vendor_bill_payment"("journalEntryId");

-- CreateIndex
CREATE INDEX "vendor_bill_payment_vendorBillId_idx" ON "vendor_bill_payment"("vendorBillId");

-- CreateIndex
CREATE INDEX "vendor_bill_payment_externalPaymentId_idx" ON "vendor_bill_payment"("externalPaymentId");

-- CreateIndex
CREATE INDEX "payment_run_orgId_status_idx" ON "payment_run"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_run_orgId_runNumber_key" ON "payment_run"("orgId", "runNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payment_run_item_executedPaymentId_key" ON "payment_run_item"("executedPaymentId");

-- CreateIndex
CREATE INDEX "payment_run_item_vendorBillId_status_idx" ON "payment_run_item"("vendorBillId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_run_item_paymentRunId_vendorBillId_key" ON "payment_run_item"("paymentRunId", "vendorBillId");

-- CreateIndex
CREATE INDEX "close_run_orgId_status_idx" ON "close_run"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "close_run_orgId_fiscalPeriodId_key" ON "close_run"("orgId", "fiscalPeriodId");

-- CreateIndex
CREATE INDEX "close_task_orgId_status_idx" ON "close_task"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "close_task_closeRunId_code_key" ON "close_task"("closeRunId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "customer_razorpayCustomerId_key" ON "customer"("razorpayCustomerId");

-- CreateIndex
CREATE INDEX "customer_organizationId_idx" ON "customer"("organizationId");

-- CreateIndex
CREATE INDEX "vendor_organizationId_idx" ON "vendor"("organizationId");

-- CreateIndex
CREATE INDEX "employee_organizationId_idx" ON "employee"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_postedJournalEntryId_key" ON "invoice"("postedJournalEntryId");

-- CreateIndex
CREATE INDEX "invoice_organizationId_status_idx" ON "invoice"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_organizationId_invoiceNumber_key" ON "invoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_line_item_inventoryItemId_idx" ON "invoice_line_item"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_journalEntryId_key" ON "voucher"("journalEntryId");

-- CreateIndex
CREATE INDEX "voucher_organizationId_status_idx" ON "voucher"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_organizationId_voucherNumber_key" ON "voucher"("organizationId", "voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "salary_slip_journalEntryId_key" ON "salary_slip"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_slip_payoutJournalEntryId_key" ON "salary_slip"("payoutJournalEntryId");

-- CreateIndex
CREATE INDEX "salary_slip_organizationId_status_idx" ON "salary_slip"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_slip_organizationId_slipNumber_key" ON "salary_slip"("organizationId", "slipNumber");

-- CreateIndex
CREATE INDEX "file_attachment_organizationId_entityType_entityId_idx" ON "file_attachment"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "salary_preset_organizationId_idx" ON "salary_preset"("organizationId");

-- CreateIndex
CREATE INDEX "invoice_state_event_invoiceId_idx" ON "invoice_state_event"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payment_journalEntryId_key" ON "invoice_payment"("journalEntryId");

-- CreateIndex
CREATE INDEX "invoice_payment_invoiceId_idx" ON "invoice_payment"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_payment_externalPaymentId_idx" ON "invoice_payment"("externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_proof_invoicePaymentId_key" ON "invoice_proof"("invoicePaymentId");

-- CreateIndex
CREATE INDEX "invoice_proof_invoiceId_idx" ON "invoice_proof"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "public_invoice_token_token_key" ON "public_invoice_token"("token");

-- CreateIndex
CREATE INDEX "public_invoice_token_token_idx" ON "public_invoice_token"("token");

-- CreateIndex
CREATE INDEX "invoice_ticket_invoiceId_idx" ON "invoice_ticket"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_ticket_orgId_status_idx" ON "invoice_ticket"("orgId", "status");

-- CreateIndex
CREATE INDEX "ticket_reply_ticketId_idx" ON "ticket_reply"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_reply_portalCustomerId_idx" ON "ticket_reply"("portalCustomerId");

-- CreateIndex
CREATE INDEX "approval_policy_orgId_module_status_idx" ON "approval_policy"("orgId", "module", "status");

-- CreateIndex
CREATE INDEX "approval_policy_rule_policyId_sequence_idx" ON "approval_policy_rule"("policyId", "sequence");

-- CreateIndex
CREATE INDEX "ticket_sla_policy_orgId_isDefault_idx" ON "ticket_sla_policy"("orgId", "isDefault");

-- CreateIndex
CREATE INDEX "ticket_escalation_rule_orgId_breachType_idx" ON "ticket_escalation_rule"("orgId", "breachType");

-- CreateIndex
CREATE INDEX "scheduled_action_orgId_status_scheduledAt_idx" ON "scheduled_action"("orgId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_action_nextRetryAt_status_idx" ON "scheduled_action"("nextRetryAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_action_scheduledActionId_key" ON "dead_letter_action"("scheduledActionId");

-- CreateIndex
CREATE INDEX "dead_letter_action_orgId_deadLetteredAt_idx" ON "dead_letter_action"("orgId", "deadLetteredAt");

-- CreateIndex
CREATE INDEX "workflow_definition_orgId_status_idx" ON "workflow_definition"("orgId", "status");

-- CreateIndex
CREATE INDEX "workflow_step_workflowId_sequence_idx" ON "workflow_step"("workflowId", "sequence");

-- CreateIndex
CREATE INDEX "workflow_run_orgId_status_startedAt_idx" ON "workflow_run"("orgId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "workflow_run_sourceModule_sourceEntityId_idx" ON "workflow_run"("sourceModule", "sourceEntityId");

-- CreateIndex
CREATE INDEX "workflow_step_run_workflowRunId_status_idx" ON "workflow_step_run"("workflowRunId", "status");

-- CreateIndex
CREATE INDEX "approval_request_orgId_status_idx" ON "approval_request"("orgId", "status");

-- CreateIndex
CREATE INDEX "approval_request_docType_docId_idx" ON "approval_request"("docType", "docId");

-- CreateIndex
CREATE INDEX "approval_decision_requestId_ruleOrder_idx" ON "approval_decision"("requestId", "ruleOrder");

-- CreateIndex
CREATE INDEX "approval_delegation_orgId_isActive_idx" ON "approval_delegation"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "approval_delegation_fromUserId_isActive_idx" ON "approval_delegation"("fromUserId", "isActive");

-- CreateIndex
CREATE INDEX "notification_userId_isRead_idx" ON "notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notification_orgId_idx" ON "notification"("orgId");

-- CreateIndex
CREATE INDEX "notification_delivery_orgId_status_idx" ON "notification_delivery"("orgId", "status");

-- CreateIndex
CREATE INDEX "notification_delivery_orgId_channel_idx" ON "notification_delivery"("orgId", "channel");

-- CreateIndex
CREATE INDEX "notification_delivery_notificationId_idx" ON "notification_delivery"("notificationId");

-- CreateIndex
CREATE INDEX "notification_delivery_nextRetryAt_status_idx" ON "notification_delivery"("nextRetryAt", "status");

-- CreateIndex
CREATE INDEX "notification_delivery_orgId_sourceModule_idx" ON "notification_delivery"("orgId", "sourceModule");

-- CreateIndex
CREATE INDEX "activity_log_orgId_createdAt_idx" ON "activity_log"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "scheduled_send_orgId_status_idx" ON "scheduled_send"("orgId", "status");

-- CreateIndex
CREATE INDEX "scheduled_send_scheduledAt_status_idx" ON "scheduled_send"("scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_invoice_rule_baseInvoiceId_key" ON "recurring_invoice_rule"("baseInvoiceId");

-- CreateIndex
CREATE INDEX "recurring_invoice_rule_orgId_status_idx" ON "recurring_invoice_rule"("orgId", "status");

-- CreateIndex
CREATE INDEX "recurring_invoice_rule_nextRunAt_status_idx" ON "recurring_invoice_rule"("nextRunAt", "status");

-- CreateIndex
CREATE INDEX "job_log_jobName_status_idx" ON "job_log"("jobName", "status");

-- CreateIndex
CREATE INDEX "job_log_orgId_status_idx" ON "job_log"("orgId", "status");

-- CreateIndex
CREATE INDEX "job_log_nextRetryAt_status_idx" ON "job_log"("nextRetryAt", "status");

-- CreateIndex
CREATE INDEX "report_snapshot_orgId_reportType_idx" ON "report_snapshot"("orgId", "reportType");

-- CreateIndex
CREATE INDEX "gst_filing_run_orgId_status_periodMonth_idx" ON "gst_filing_run"("orgId", "status", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "gst_filing_run_orgId_periodMonth_returnType_key" ON "gst_filing_run"("orgId", "periodMonth", "returnType");

-- CreateIndex
CREATE INDEX "gst_filing_validation_issue_filingRunId_severity_idx" ON "gst_filing_validation_issue"("filingRunId", "severity");

-- CreateIndex
CREATE INDEX "gst_filing_validation_issue_orgId_createdAt_idx" ON "gst_filing_validation_issue"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "gst_filing_submission_orgId_status_initiatedAt_idx" ON "gst_filing_submission"("orgId", "status", "initiatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "gst_filing_submission_filingRunId_attempt_key" ON "gst_filing_submission"("filingRunId", "attempt");

-- CreateIndex
CREATE INDEX "gst_filing_reconciliation_orgId_status_createdAt_idx" ON "gst_filing_reconciliation"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "gst_filing_reconciliation_filingRunId_createdAt_idx" ON "gst_filing_reconciliation"("filingRunId", "createdAt");

-- CreateIndex
CREATE INDEX "gst_filing_event_filingRunId_createdAt_idx" ON "gst_filing_event"("filingRunId", "createdAt");

-- CreateIndex
CREATE INDEX "gst_filing_event_orgId_createdAt_idx" ON "gst_filing_event"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "proxy_grant_orgId_status_idx" ON "proxy_grant"("orgId", "status");

-- CreateIndex
CREATE INDEX "proxy_grant_actorId_status_idx" ON "proxy_grant"("actorId", "status");

-- CreateIndex
CREATE INDEX "audit_log_orgId_createdAt_idx" ON "audit_log"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_orgId_sequenceNum_idx" ON "audit_log"("orgId", "sequenceNum");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_chain_verification_orgId_verifiedAt_idx" ON "audit_chain_verification"("orgId", "verifiedAt" DESC);

-- CreateIndex
CREATE INDEX "audit_package_export_orgId_createdAt_idx" ON "audit_package_export"("orgId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "storage_usage_orgId_idx" ON "storage_usage"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "storage_usage_orgId_category_key" ON "storage_usage"("orgId", "category");

-- CreateIndex
CREATE INDEX "send_log_orgId_type_idx" ON "send_log"("orgId", "type");

-- CreateIndex
CREATE INDEX "send_log_orgId_sentAt_idx" ON "send_log"("orgId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orgId_key" ON "subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_razorpayCustomerId_key" ON "subscription"("razorpayCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_razorpaySubId_key" ON "subscription"("razorpaySubId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeCustomerId_key" ON "subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubId_key" ON "subscription"("stripeSubId");

-- CreateIndex
CREATE INDEX "usage_record_orgId_periodMonth_idx" ON "usage_record"("orgId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "usage_record_orgId_resource_periodMonth_key" ON "usage_record"("orgId", "resource", "periodMonth");

-- CreateIndex
CREATE INDEX "razorpay_event_type_idx" ON "razorpay_event"("type");

-- CreateIndex
CREATE INDEX "razorpay_event_processedAt_idx" ON "razorpay_event"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_referralCode_key" ON "referral"("referralCode");

-- CreateIndex
CREATE INDEX "referral_referrerId_idx" ON "referral"("referrerId");

-- CreateIndex
CREATE INDEX "referral_referralCode_idx" ON "referral"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "shared_document_shareToken_key" ON "shared_document"("shareToken");

-- CreateIndex
CREATE INDEX "shared_document_shareToken_idx" ON "shared_document"("shareToken");

-- CreateIndex
CREATE INDEX "shared_document_orgId_docType_docId_idx" ON "shared_document"("orgId", "docType", "docId");

-- CreateIndex
CREATE INDEX "shared_document_orgId_status_idx" ON "shared_document"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "share_bundle_token_key" ON "share_bundle"("token");

-- CreateIndex
CREATE INDEX "share_bundle_orgId_status_idx" ON "share_bundle"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "share_bundle_item_bundleId_sharedDocumentId_key" ON "share_bundle_item"("bundleId", "sharedDocumentId");

-- CreateIndex
CREATE INDEX "share_access_log_orgId_createdAt_idx" ON "share_access_log"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "share_access_log_sharedDocumentId_idx" ON "share_access_log"("sharedDocumentId");

-- CreateIndex
CREATE INDEX "share_access_log_bundleId_idx" ON "share_access_log"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_userId_key" ON "onboarding_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_virtual_account_razorpayVaId_key" ON "customer_virtual_account"("razorpayVaId");

-- CreateIndex
CREATE INDEX "customer_virtual_account_orgId_customerId_idx" ON "customer_virtual_account"("orgId", "customerId");

-- CreateIndex
CREATE INDEX "unmatched_payment_orgId_status_idx" ON "unmatched_payment"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_razorpayInvoiceId_key" ON "billing_invoice"("razorpayInvoiceId");

-- CreateIndex
CREATE INDEX "billing_invoice_orgId_createdAt_idx" ON "billing_invoice"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_keyHash_key" ON "api_key"("keyHash");

-- CreateIndex
CREATE INDEX "api_key_orgId_isActive_idx" ON "api_key"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "api_key_keyHash_idx" ON "api_key"("keyHash");

-- CreateIndex
CREATE INDEX "api_webhook_endpoint_orgId_isActive_idx" ON "api_webhook_endpoint"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "api_webhook_delivery_endpointId_deliveredAt_idx" ON "api_webhook_delivery"("endpointId", "deliveredAt");

-- CreateIndex
CREATE INDEX "api_request_log_orgId_createdAt_idx" ON "api_request_log"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "api_request_log_apiKeyId_createdAt_idx" ON "api_request_log"("apiKeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sso_config_orgId_key" ON "sso_config"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "sso_break_glass_code_codeHash_key" ON "sso_break_glass_code"("codeHash");

-- CreateIndex
CREATE INDEX "sso_break_glass_code_orgId_expiresAt_idx" ON "sso_break_glass_code"("orgId", "expiresAt");

-- CreateIndex
CREATE INDEX "sso_break_glass_code_orgId_redeemedAt_idx" ON "sso_break_glass_code"("orgId", "redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sso_authn_request_requestId_key" ON "sso_authn_request"("requestId");

-- CreateIndex
CREATE INDEX "sso_authn_request_orgId_expiresAt_idx" ON "sso_authn_request"("orgId", "expiresAt");

-- CreateIndex
CREATE INDEX "sso_authn_request_orgId_consumedAt_idx" ON "sso_authn_request"("orgId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sso_assertion_replay_assertionId_key" ON "sso_assertion_replay"("assertionId");

-- CreateIndex
CREATE INDEX "sso_assertion_replay_orgId_expiresAt_idx" ON "sso_assertion_replay"("orgId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_domain_orgId_key" ON "org_domain"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_domain_domain_key" ON "org_domain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "org_white_label_orgId_key" ON "org_white_label"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_email_domain_orgId_emailDomain_key" ON "org_email_domain"("orgId", "emailDomain");

-- CreateIndex
CREATE INDEX "ocr_job_orgId_createdAt_idx" ON "ocr_job"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_integration_orgId_provider_key" ON "org_integration"("orgId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "dunning_sequence_orgId_isDefault_idx" ON "dunning_sequence"("orgId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "dunning_step_sequenceId_stepNumber_key" ON "dunning_step"("sequenceId", "stepNumber");

-- CreateIndex
CREATE INDEX "dunning_log_invoiceId_stepNumber_idx" ON "dunning_log"("invoiceId", "stepNumber");

-- CreateIndex
CREATE INDEX "dunning_log_orgId_createdAt_idx" ON "dunning_log"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dunning_opt_out_token_key" ON "dunning_opt_out"("token");

-- CreateIndex
CREATE UNIQUE INDEX "dunning_opt_out_orgId_customerId_key" ON "dunning_opt_out"("orgId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_portal_token_tokenHash_key" ON "customer_portal_token"("tokenHash");

-- CreateIndex
CREATE INDEX "customer_portal_token_customerId_orgId_idx" ON "customer_portal_token"("customerId", "orgId");

-- CreateIndex
CREATE INDEX "customer_portal_access_log_customerId_orgId_idx" ON "customer_portal_access_log"("customerId", "orgId");

-- CreateIndex
CREATE INDEX "customer_portal_access_log_orgId_accessedAt_idx" ON "customer_portal_access_log"("orgId", "accessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_portal_session_jti_key" ON "customer_portal_session"("jti");

-- CreateIndex
CREATE INDEX "customer_portal_session_customerId_orgId_idx" ON "customer_portal_session"("customerId", "orgId");

-- CreateIndex
CREATE INDEX "customer_portal_session_orgId_revokedAt_idx" ON "customer_portal_session"("orgId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "portal_rate_limit_key_key" ON "portal_rate_limit"("key");

-- CreateIndex
CREATE INDEX "portal_rate_limit_key_windowEnd_idx" ON "portal_rate_limit"("key", "windowEnd");

-- CreateIndex
CREATE INDEX "customer_statement_customerId_fromDate_toDate_idx" ON "customer_statement"("customerId", "fromDate", "toDate");

-- CreateIndex
CREATE UNIQUE INDEX "quote_publicToken_key" ON "quote"("publicToken");

-- CreateIndex
CREATE INDEX "quote_orgId_status_idx" ON "quote"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quote_orgId_quoteNumber_key" ON "quote"("orgId", "quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payment_arrangement_invoiceId_key" ON "payment_arrangement"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_arrangement_orgId_status_idx" ON "payment_arrangement"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_installment_invoicePaymentId_key" ON "payment_installment"("invoicePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_installment_arrangementId_installmentNumber_key" ON "payment_installment"("arrangementId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "hsn_sac_code_code_key" ON "hsn_sac_code"("code");

-- CreateIndex
CREATE INDEX "hsn_sac_code_code_idx" ON "hsn_sac_code"("code");

-- CreateIndex
CREATE INDEX "hsn_sac_code_description_idx" ON "hsn_sac_code"("description");

-- CreateIndex
CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON "exchange_rates"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_fetchedAt_key" ON "exchange_rates"("fromCurrency", "toCurrency", "fetchedAt");

-- CreateIndex
CREATE INDEX "tds_record_organizationId_financialYear_idx" ON "tds_record"("organizationId", "financialYear");

-- CreateIndex
CREATE INDEX "tds_record_invoiceId_idx" ON "tds_record"("invoiceId");

-- CreateIndex
CREATE INDEX "marketplace_template_revisions_templateId_idx" ON "marketplace_template_revisions"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_purchases_orgId_templateId_key" ON "marketplace_purchases"("orgId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reviews_orgId_templateId_key" ON "marketplace_reviews"("orgId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_revenue_purchaseId_key" ON "marketplace_revenue"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_payout_beneficiary_publisherOrgId_key" ON "marketplace_payout_beneficiary"("publisherOrgId");

-- CreateIndex
CREATE INDEX "marketplace_payout_beneficiary_status_updatedAt_idx" ON "marketplace_payout_beneficiary"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_payout_run_runNumber_key" ON "marketplace_payout_run"("runNumber");

-- CreateIndex
CREATE INDEX "marketplace_payout_run_status_createdAt_idx" ON "marketplace_payout_run"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_payout_item_revenueId_key" ON "marketplace_payout_item"("revenueId");

-- CreateIndex
CREATE INDEX "marketplace_payout_item_publisherOrgId_status_idx" ON "marketplace_payout_item"("publisherOrgId", "status");

-- CreateIndex
CREATE INDEX "marketplace_payout_item_status_createdAt_idx" ON "marketplace_payout_item"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_payout_item_payoutRunId_revenueId_key" ON "marketplace_payout_item"("payoutRunId", "revenueId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_payout_attempt_idempotencyKey_key" ON "marketplace_payout_attempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "marketplace_payout_attempt_payoutItemId_createdAt_idx" ON "marketplace_payout_attempt"("payoutItemId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_payout_attempt_status_createdAt_idx" ON "marketplace_payout_attempt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_payout_event_publisherOrgId_createdAt_idx" ON "marketplace_payout_event"("publisherOrgId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_payout_event_eventType_createdAt_idx" ON "marketplace_payout_event"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_apps_clientId_key" ON "oauth_apps"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authCode_key" ON "oauth_authorizations"("authCode");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_accessToken_key" ON "oauth_authorizations"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_refreshToken_key" ON "oauth_authorizations"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "partner_profiles_orgId_key" ON "partner_profiles"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_profiles_partnerCode_key" ON "partner_profiles"("partnerCode");

-- CreateIndex
CREATE UNIQUE INDEX "partner_managed_orgs_partnerId_orgId_key" ON "partner_managed_orgs"("partnerId", "orgId");

-- CreateIndex
CREATE INDEX "partner_client_access_requests_partnerId_clientOrgId_status_idx" ON "partner_client_access_requests"("partnerId", "clientOrgId", "status");

-- CreateIndex
CREATE INDEX "document_index_orgId_docType_idx" ON "document_index"("orgId", "docType");

-- CreateIndex
CREATE INDEX "document_index_orgId_status_idx" ON "document_index"("orgId", "status");

-- CreateIndex
CREATE INDEX "document_index_orgId_archivedAt_idx" ON "document_index"("orgId", "archivedAt");

-- CreateIndex
CREATE INDEX "document_index_orgId_primaryDate_idx" ON "document_index"("orgId", "primaryDate");

-- CreateIndex
CREATE UNIQUE INDEX "document_index_orgId_docType_documentId_key" ON "document_index"("orgId", "docType", "documentId");

-- CreateIndex
CREATE INDEX "document_event_orgId_docType_documentId_eventAt_idx" ON "document_event"("orgId", "docType", "documentId", "eventAt");

-- CreateIndex
CREATE INDEX "document_event_orgId_eventType_eventAt_idx" ON "document_event"("orgId", "eventType", "eventAt");

-- CreateIndex
CREATE INDEX "document_event_orgId_docType_eventAt_idx" ON "document_event"("orgId", "docType", "eventAt");

-- CreateIndex
CREATE INDEX "intel_insight_orgId_status_idx" ON "intel_insight"("orgId", "status");

-- CreateIndex
CREATE INDEX "intel_insight_orgId_category_severity_idx" ON "intel_insight"("orgId", "category", "severity");

-- CreateIndex
CREATE INDEX "intel_insight_orgId_status_expiresAt_idx" ON "intel_insight"("orgId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "intel_insight_orgId_dedupeKey_key" ON "intel_insight"("orgId", "dedupeKey");

-- CreateIndex
CREATE INDEX "insight_event_insightId_createdAt_idx" ON "insight_event"("insightId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_job_orgId_feature_status_idx" ON "ai_job"("orgId", "feature", "status");

-- CreateIndex
CREATE INDEX "ai_job_orgId_createdAt_idx" ON "ai_job"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_job_event_jobId_createdAt_idx" ON "ai_job_event"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "extraction_review_orgId_status_idx" ON "extraction_review"("orgId", "status");

-- CreateIndex
CREATE INDEX "extraction_review_orgId_createdAt_idx" ON "extraction_review"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "extraction_field_reviewId_idx" ON "extraction_field"("reviewId");

-- CreateIndex
CREATE INDEX "customer_health_snapshot_orgId_customerId_calculatedAt_idx" ON "customer_health_snapshot"("orgId", "customerId", "calculatedAt");

-- CreateIndex
CREATE INDEX "customer_health_snapshot_orgId_riskBand_idx" ON "customer_health_snapshot"("orgId", "riskBand");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_rule_key_key" ON "anomaly_rule"("key");

-- CreateIndex
CREATE INDEX "anomaly_rule_category_enabled_idx" ON "anomaly_rule"("category", "enabled");

-- CreateIndex
CREATE INDEX "anomaly_detection_run_orgId_startedAt_idx" ON "anomaly_detection_run"("orgId", "startedAt");

-- CreateIndex
CREATE INDEX "ai_usage_record_orgId_feature_createdAt_idx" ON "ai_usage_record"("orgId", "feature", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_record_orgId_createdAt_idx" ON "ai_usage_record"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "external_access_event_orgId_eventType_createdAt_idx" ON "external_access_event"("orgId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "external_access_event_orgId_customerId_createdAt_idx" ON "external_access_event"("orgId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "external_access_event_orgId_createdAt_idx" ON "external_access_event"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "recipient_verification_tokenHash_key" ON "recipient_verification"("tokenHash");

-- CreateIndex
CREATE INDEX "recipient_verification_sharedDocumentId_recipientEmail_idx" ON "recipient_verification"("sharedDocumentId", "recipientEmail");

-- CreateIndex
CREATE INDEX "recipient_verification_tokenHash_idx" ON "recipient_verification"("tokenHash");

-- CreateIndex
CREATE INDEX "pixel_job_record_orgId_userId_createdAt_idx" ON "pixel_job_record"("orgId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "pixel_job_record_orgId_toolType_createdAt_idx" ON "pixel_job_record"("orgId", "toolType", "createdAt");

-- CreateIndex
CREATE INDEX "usage_event_orgId_resource_recordedAt_idx" ON "usage_event"("orgId", "resource", "recordedAt");

-- CreateIndex
CREATE INDEX "org_usage_snapshot_orgId_periodStart_idx" ON "org_usage_snapshot"("orgId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "org_usage_snapshot_orgId_periodStart_key" ON "org_usage_snapshot"("orgId", "periodStart");

-- CreateIndex
CREATE INDEX "tally_import_log_orgId_importedAt_idx" ON "tally_import_log"("orgId", "importedAt");

-- CreateIndex
CREATE INDEX "employee_ctc_component_employeeId_isActive_idx" ON "employee_ctc_component"("employeeId", "isActive");

-- CreateIndex
CREATE INDEX "payroll_run_orgId_status_idx" ON "payroll_run"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_orgId_period_key" ON "payroll_run"("orgId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_item_salarySlipId_key" ON "payroll_run_item"("salarySlipId");

-- CreateIndex
CREATE INDEX "payroll_run_item_runId_idx" ON "payroll_run_item"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_item_runId_employeeId_key" ON "payroll_run_item"("runId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_settings_orgId_key" ON "payroll_settings"("orgId");

-- CreateIndex
CREATE INDEX "employee_otp_orgId_idx" ON "employee_otp"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_otp_email_orgId_key" ON "employee_otp"("email", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_group_admin_org_id_key" ON "entity_group"("admin_org_id");

-- CreateIndex
CREATE INDEX "inter_company_transfer_entity_group_id_status_idx" ON "inter_company_transfer"("entity_group_id", "status");

-- CreateIndex
CREATE INDEX "inter_company_transfer_source_org_id_idx" ON "inter_company_transfer"("source_org_id");

-- CreateIndex
CREATE INDEX "inter_company_transfer_destination_org_id_idx" ON "inter_company_transfer"("destination_org_id");

-- CreateIndex
CREATE INDEX "inventory_item_orgId_isActive_idx" ON "inventory_item"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "inventory_item_orgId_category_idx" ON "inventory_item"("orgId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_orgId_sku_key" ON "inventory_item"("orgId", "sku");

-- CreateIndex
CREATE INDEX "warehouse_orgId_isActive_idx" ON "warehouse"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_orgId_code_key" ON "warehouse"("orgId", "code");

-- CreateIndex
CREATE INDEX "stock_level_orgId_warehouseId_idx" ON "stock_level"("orgId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_level_inventoryItemId_warehouseId_key" ON "stock_level"("inventoryItemId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_event_inventoryItemId_warehouseId_createdAt_idx" ON "stock_event"("inventoryItemId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_event_orgId_eventType_createdAt_idx" ON "stock_event"("orgId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "stock_event_referenceType_referenceId_idx" ON "stock_event"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustment_journalEntryId_key" ON "stock_adjustment"("journalEntryId");

-- CreateIndex
CREATE INDEX "stock_adjustment_orgId_status_idx" ON "stock_adjustment"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustment_orgId_adjustmentNumber_key" ON "stock_adjustment"("orgId", "adjustmentNumber");

-- CreateIndex
CREATE INDEX "stock_transfer_orgId_status_idx" ON "stock_transfer"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_orgId_transferNumber_key" ON "stock_transfer"("orgId", "transferNumber");

-- CreateIndex
CREATE INDEX "purchase_order_orgId_status_idx" ON "purchase_order"("orgId", "status");

-- CreateIndex
CREATE INDEX "purchase_order_vendorId_idx" ON "purchase_order"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_orgId_poNumber_key" ON "purchase_order"("orgId", "poNumber");

-- CreateIndex
CREATE INDEX "goods_receipt_note_orgId_status_idx" ON "goods_receipt_note"("orgId", "status");

-- CreateIndex
CREATE INDEX "goods_receipt_note_purchaseOrderId_idx" ON "goods_receipt_note"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_note_orgId_grnNumber_key" ON "goods_receipt_note"("orgId", "grnNumber");

-- CreateIndex
CREATE INDEX "three_way_match_result_orgId_matchStatus_idx" ON "three_way_match_result"("orgId", "matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "three_way_match_result_purchaseOrderId_vendorBillId_key" ON "three_way_match_result"("purchaseOrderId", "vendorBillId");

-- CreateIndex
CREATE INDEX "gstr2b_import_orgId_period_idx" ON "gstr2b_import"("orgId", "period");

-- CreateIndex
CREATE INDEX "gstr2b_import_orgId_status_idx" ON "gstr2b_import"("orgId", "status");

-- CreateIndex
CREATE INDEX "gstr2b_entry_importId_matchStatus_idx" ON "gstr2b_entry"("importId", "matchStatus");

-- CreateIndex
CREATE INDEX "gstr2b_entry_orgId_supplierGstin_idx" ON "gstr2b_entry"("orgId", "supplierGstin");

-- CreateIndex
CREATE INDEX "gstr2b_entry_orgId_docNumber_idx" ON "gstr2b_entry"("orgId", "docNumber");

-- CreateIndex
CREATE INDEX "e_invoice_request_orgId_status_idx" ON "e_invoice_request"("orgId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_request_invoiceId_idx" ON "e_invoice_request"("invoiceId");

-- CreateIndex
CREATE INDEX "e_invoice_request_irnNumber_idx" ON "e_invoice_request"("irnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "e_invoice_config_orgId_key" ON "e_invoice_config"("orgId");

-- CreateIndex
CREATE INDEX "crm_note_orgId_entityType_entityId_idx" ON "crm_note"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "crm_note_entityId_createdAt_idx" ON "crm_note"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "sop_document_orgId_status_category_idx" ON "sop_document"("orgId", "status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "sop_document_orgId_slug_key" ON "sop_document"("orgId", "slug");

-- CreateIndex
CREATE INDEX "forecast_snapshot_orgId_generatedAt_idx" ON "forecast_snapshot"("orgId", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "tax_config_orgId_isActive_idx" ON "tax_config"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tax_config_orgId_region_registrationNumber_key" ON "tax_config"("orgId", "region", "registrationNumber");

-- CreateIndex
CREATE INDEX "tax_liability_estimate_orgId_periodStart_periodEnd_idx" ON "tax_liability_estimate"("orgId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "tax_liability_estimate_taxConfigId_idx" ON "tax_liability_estimate"("taxConfigId");

-- CreateIndex
CREATE INDEX "payment_optimization_run_orgId_generatedAt_idx" ON "payment_optimization_run"("orgId", "generatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cashflow_alert_config_orgId_key" ON "cashflow_alert_config"("orgId");

-- CreateIndex
CREATE INDEX "flash_report_schedule_isActive_schedule_idx" ON "flash_report_schedule"("isActive", "schedule");

-- CreateIndex
CREATE UNIQUE INDEX "flash_report_schedule_orgId_userId_channel_key" ON "flash_report_schedule"("orgId", "userId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "flash_report_delivery_idempotencyKey_key" ON "flash_report_delivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "flash_report_delivery_orgId_createdAt_idx" ON "flash_report_delivery"("orgId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "flash_report_delivery_status_retryCount_idx" ON "flash_report_delivery"("status", "retryCount");

-- CreateIndex
CREATE UNIQUE INDEX "executive_kpi_cache_orgId_period_key" ON "executive_kpi_cache"("orgId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "billing_account_orgId_key" ON "billing_account"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_account_stripeCustomerId_key" ON "billing_account"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_account_razorpayCustomerId_key" ON "billing_account"("razorpayCustomerId");

-- CreateIndex
CREATE INDEX "billing_account_gateway_status_idx" ON "billing_account"("gateway", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_event_gatewayEventId_key" ON "billing_event"("gatewayEventId");

-- CreateIndex
CREATE INDEX "billing_event_billingAccountId_createdAt_idx" ON "billing_event"("billingAccountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "billing_event_type_idx" ON "billing_event"("type");

-- CreateIndex
CREATE INDEX "overage_line_billingAccountId_periodMonth_idx" ON "overage_line"("billingAccountId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "overage_line_billingAccountId_resource_periodMonth_key" ON "overage_line"("billingAccountId", "resource", "periodMonth");

-- CreateIndex
CREATE INDEX "billing_dunning_attempt_orgId_subscriptionId_idx" ON "billing_dunning_attempt"("orgId", "subscriptionId");

-- CreateIndex
CREATE INDEX "billing_dunning_attempt_status_scheduledAt_idx" ON "billing_dunning_attempt"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "custom_role_orgId_idx" ON "custom_role"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_role_org_name_unique" ON "custom_role"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "data_residency_config_orgId_key" ON "data_residency_config"("orgId");

-- CreateIndex
CREATE INDEX "sso_group_mapping_ssoConfigId_idx" ON "sso_group_mapping"("ssoConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "sso_group_mapping_config_group_unique" ON "sso_group_mapping"("ssoConfigId", "externalGroup");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_status_nextRetryAt_idx" ON "webhook_dead_letter"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_orgId_status_idx" ON "webhook_dead_letter"("orgId", "status");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_endpointId_idx" ON "webhook_dead_letter"("endpointId");

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_entity_group_id_fkey" FOREIGN KEY ("entity_group_id") REFERENCES "entity_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_parent_org_id_fkey" FOREIGN KEY ("parent_org_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "custom_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_profile" ADD CONSTRAINT "branding_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_defaults" ADD CONSTRAINT "org_defaults_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "gl_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_openingJournalEntryId_fkey" FOREIGN KEY ("openingJournalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_gatewayClearingAccountId_fkey" FOREIGN KEY ("gatewayClearingAccountId") REFERENCES "gl_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_import" ADD CONSTRAINT "bank_statement_import_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_import" ADD CONSTRAINT "bank_statement_import_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "bank_statement_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction_match" ADD CONSTRAINT "bank_transaction_match_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction_match" ADD CONSTRAINT "bank_transaction_match_bankTxnId_fkey" FOREIGN KEY ("bankTxnId") REFERENCES "bank_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill" ADD CONSTRAINT "vendor_bill_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill" ADD CONSTRAINT "vendor_bill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill" ADD CONSTRAINT "vendor_bill_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "gl_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill" ADD CONSTRAINT "vendor_bill_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill" ADD CONSTRAINT "vendor_bill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_line" ADD CONSTRAINT "vendor_bill_line_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_payment" ADD CONSTRAINT "vendor_bill_payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_payment" ADD CONSTRAINT "vendor_bill_payment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_payment" ADD CONSTRAINT "vendor_bill_payment_paymentRunId_fkey" FOREIGN KEY ("paymentRunId") REFERENCES "payment_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_payment" ADD CONSTRAINT "vendor_bill_payment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_payment" ADD CONSTRAINT "vendor_bill_payment_bankMatchId_fkey" FOREIGN KEY ("bankMatchId") REFERENCES "bank_transaction_match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run" ADD CONSTRAINT "payment_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_item" ADD CONSTRAINT "payment_run_item_paymentRunId_fkey" FOREIGN KEY ("paymentRunId") REFERENCES "payment_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_item" ADD CONSTRAINT "payment_run_item_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_item" ADD CONSTRAINT "payment_run_item_executedPaymentId_fkey" FOREIGN KEY ("executedPaymentId") REFERENCES "vendor_bill_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_run" ADD CONSTRAINT "close_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_run" ADD CONSTRAINT "close_run_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_task" ADD CONSTRAINT "close_task_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES "close_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_task" ADD CONSTRAINT "close_task_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_generatedFromRuleId_fkey" FOREIGN KEY ("generatedFromRuleId") REFERENCES "recurring_invoice_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_line" ADD CONSTRAINT "voucher_line_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_payoutJournalEntryId_fkey" FOREIGN KEY ("payoutJournalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_component" ADD CONSTRAINT "salary_component_salarySlipId_fkey" FOREIGN KEY ("salarySlipId") REFERENCES "salary_slip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_invoice_fkey" FOREIGN KEY ("entityId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_voucher_fkey" FOREIGN KEY ("entityId") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_vendor_bill_fkey" FOREIGN KEY ("entityId") REFERENCES "vendor_bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_salary_slip_fkey" FOREIGN KEY ("entityId") REFERENCES "salary_slip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_quote_fkey" FOREIGN KEY ("entityId") REFERENCES "quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachment" ADD CONSTRAINT "file_attachment_ticket_reply_fkey" FOREIGN KEY ("entityId") REFERENCES "ticket_reply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_preset" ADD CONSTRAINT "salary_preset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_state_event" ADD CONSTRAINT "invoice_state_event_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_bankMatchId_fkey" FOREIGN KEY ("bankMatchId") REFERENCES "bank_transaction_match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_proof" ADD CONSTRAINT "invoice_proof_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_proof" ADD CONSTRAINT "invoice_proof_invoicePaymentId_fkey" FOREIGN KEY ("invoicePaymentId") REFERENCES "invoice_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_invoice_token" ADD CONSTRAINT "public_invoice_token_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_ticket" ADD CONSTRAINT "invoice_ticket_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reply" ADD CONSTRAINT "ticket_reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "invoice_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy" ADD CONSTRAINT "approval_policy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_rule" ADD CONSTRAINT "approval_policy_rule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "approval_policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_sla_policy" ADD CONSTRAINT "ticket_sla_policy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_escalation_rule" ADD CONSTRAINT "ticket_escalation_rule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_action" ADD CONSTRAINT "scheduled_action_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_action" ADD CONSTRAINT "dead_letter_action_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definition" ADD CONSTRAINT "workflow_definition_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_run" ADD CONSTRAINT "workflow_step_run_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_run" ADD CONSTRAINT "workflow_step_run_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_invoice_fkey" FOREIGN KEY ("docId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_voucher_fkey" FOREIGN KEY ("docId") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_vendor_bill_fkey" FOREIGN KEY ("docId") REFERENCES "vendor_bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_payment_run_fkey" FOREIGN KEY ("docId") REFERENCES "payment_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_salary_slip_fkey" FOREIGN KEY ("docId") REFERENCES "salary_slip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decision" ADD CONSTRAINT "approval_decision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "approval_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegation" ADD CONSTRAINT "approval_delegation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_replayedFromId_fkey" FOREIGN KEY ("replayedFromId") REFERENCES "notification_delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_send" ADD CONSTRAINT "scheduled_send_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_rule" ADD CONSTRAINT "recurring_invoice_rule_baseInvoiceId_fkey" FOREIGN KEY ("baseInvoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_snapshot" ADD CONSTRAINT "report_snapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_run" ADD CONSTRAINT "gst_filing_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_validation_issue" ADD CONSTRAINT "gst_filing_validation_issue_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_validation_issue" ADD CONSTRAINT "gst_filing_validation_issue_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_submission" ADD CONSTRAINT "gst_filing_submission_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_submission" ADD CONSTRAINT "gst_filing_submission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_reconciliation" ADD CONSTRAINT "gst_filing_reconciliation_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_reconciliation" ADD CONSTRAINT "gst_filing_reconciliation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_event" ADD CONSTRAINT "gst_filing_event_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_filing_event" ADD CONSTRAINT "gst_filing_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_grant" ADD CONSTRAINT "proxy_grant_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_representedId_fkey" FOREIGN KEY ("representedId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_chain_verification" ADD CONSTRAINT "audit_chain_verification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_package_export" ADD CONSTRAINT "audit_package_export_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_usage" ADD CONSTRAINT "storage_usage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_log" ADD CONSTRAINT "send_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_document" ADD CONSTRAINT "shared_document_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_bundle" ADD CONSTRAINT "share_bundle_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_bundle_item" ADD CONSTRAINT "share_bundle_item_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "share_bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_bundle_item" ADD CONSTRAINT "share_bundle_item_sharedDocumentId_fkey" FOREIGN KEY ("sharedDocumentId") REFERENCES "shared_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_access_log" ADD CONSTRAINT "share_access_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_access_log" ADD CONSTRAINT "share_access_log_sharedDocumentId_fkey" FOREIGN KEY ("sharedDocumentId") REFERENCES "shared_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_access_log" ADD CONSTRAINT "share_access_log_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "share_bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_virtual_account" ADD CONSTRAINT "customer_virtual_account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_virtual_account" ADD CONSTRAINT "customer_virtual_account_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unmatched_payment" ADD CONSTRAINT "unmatched_payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_webhook_endpoint" ADD CONSTRAINT "api_webhook_endpoint_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_webhook_delivery" ADD CONSTRAINT "api_webhook_delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "api_webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_log" ADD CONSTRAINT "api_request_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_log" ADD CONSTRAINT "api_request_log_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_key"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_config" ADD CONSTRAINT "sso_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_break_glass_code" ADD CONSTRAINT "sso_break_glass_code_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_authn_request" ADD CONSTRAINT "sso_authn_request_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_assertion_replay" ADD CONSTRAINT "sso_assertion_replay_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_preference" ADD CONSTRAINT "user_org_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_preference" ADD CONSTRAINT "user_org_preference_activeOrgId_fkey" FOREIGN KEY ("activeOrgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_domain" ADD CONSTRAINT "org_domain_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_white_label" ADD CONSTRAINT "org_white_label_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_email_domain" ADD CONSTRAINT "org_email_domain_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_job" ADD CONSTRAINT "ocr_job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_integration" ADD CONSTRAINT "org_integration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_sequence" ADD CONSTRAINT "dunning_sequence_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_step" ADD CONSTRAINT "dunning_step_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "dunning_sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_log" ADD CONSTRAINT "dunning_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_log" ADD CONSTRAINT "dunning_log_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_log" ADD CONSTRAINT "dunning_log_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "dunning_sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_opt_out" ADD CONSTRAINT "dunning_opt_out_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_opt_out" ADD CONSTRAINT "dunning_opt_out_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_token" ADD CONSTRAINT "customer_portal_token_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_token" ADD CONSTRAINT "customer_portal_token_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_access_log" ADD CONSTRAINT "customer_portal_access_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_access_log" ADD CONSTRAINT "customer_portal_access_log_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_session" ADD CONSTRAINT "customer_portal_session_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_portal_session" ADD CONSTRAINT "customer_portal_session_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_statement" ADD CONSTRAINT "customer_statement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_statement" ADD CONSTRAINT "customer_statement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_item" ADD CONSTRAINT "quote_line_item_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_arrangement" ADD CONSTRAINT "payment_arrangement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "payment_arrangement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_invoicePaymentId_fkey" FOREIGN KEY ("invoicePaymentId") REFERENCES "invoice_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_record" ADD CONSTRAINT "tds_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_record" ADD CONSTRAINT "tds_record_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_template_revisions" ADD CONSTRAINT "marketplace_template_revisions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketplace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketplace_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "marketplace_template_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketplace_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_revenue" ADD CONSTRAINT "marketplace_revenue_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "marketplace_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_revenue" ADD CONSTRAINT "marketplace_revenue_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_beneficiary" ADD CONSTRAINT "marketplace_payout_beneficiary_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_item" ADD CONSTRAINT "marketplace_payout_item_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "marketplace_payout_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_item" ADD CONSTRAINT "marketplace_payout_item_revenueId_fkey" FOREIGN KEY ("revenueId") REFERENCES "marketplace_revenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_item" ADD CONSTRAINT "marketplace_payout_item_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_item" ADD CONSTRAINT "marketplace_payout_item_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "marketplace_payout_beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_attempt" ADD CONSTRAINT "marketplace_payout_attempt_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "marketplace_payout_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_attempt" ADD CONSTRAINT "marketplace_payout_attempt_payoutItemId_fkey" FOREIGN KEY ("payoutItemId") REFERENCES "marketplace_payout_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_event" ADD CONSTRAINT "marketplace_payout_event_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_event" ADD CONSTRAINT "marketplace_payout_event_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "marketplace_payout_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_event" ADD CONSTRAINT "marketplace_payout_event_payoutItemId_fkey" FOREIGN KEY ("payoutItemId") REFERENCES "marketplace_payout_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_event" ADD CONSTRAINT "marketplace_payout_event_payoutAttemptId_fkey" FOREIGN KEY ("payoutAttemptId") REFERENCES "marketplace_payout_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_event" ADD CONSTRAINT "marketplace_payout_event_revenueId_fkey" FOREIGN KEY ("revenueId") REFERENCES "marketplace_revenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_payout_event" ADD CONSTRAINT "marketplace_payout_event_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "marketplace_payout_beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_apps" ADD CONSTRAINT "oauth_apps_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_appId_fkey" FOREIGN KEY ("appId") REFERENCES "oauth_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_managed_orgs" ADD CONSTRAINT "partner_managed_orgs_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_managed_orgs" ADD CONSTRAINT "partner_managed_orgs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_client_access_requests" ADD CONSTRAINT "partner_client_access_requests_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_client_access_requests" ADD CONSTRAINT "partner_client_access_requests_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_review_events" ADD CONSTRAINT "partner_review_events_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_activity_logs" ADD CONSTRAINT "partner_activity_logs_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_activity_logs" ADD CONSTRAINT "partner_activity_logs_managedOrgId_fkey" FOREIGN KEY ("managedOrgId") REFERENCES "partner_managed_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_index" ADD CONSTRAINT "document_index_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_event" ADD CONSTRAINT "document_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intel_insight" ADD CONSTRAINT "intel_insight_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_event" ADD CONSTRAINT "insight_event_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "intel_insight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_job" ADD CONSTRAINT "ai_job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_job_event" ADD CONSTRAINT "ai_job_event_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_review" ADD CONSTRAINT "extraction_review_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_field" ADD CONSTRAINT "extraction_field_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "extraction_review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_health_snapshot" ADD CONSTRAINT "customer_health_snapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_detection_run" ADD CONSTRAINT "anomaly_detection_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_access_event" ADD CONSTRAINT "external_access_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_verification" ADD CONSTRAINT "recipient_verification_sharedDocumentId_fkey" FOREIGN KEY ("sharedDocumentId") REFERENCES "shared_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pixel_job_record" ADD CONSTRAINT "pixel_job_record_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_usage_snapshot" ADD CONSTRAINT "org_usage_snapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tally_import_log" ADD CONSTRAINT "tally_import_log_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_ctc_component" ADD CONSTRAINT "employee_ctc_component_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_item" ADD CONSTRAINT "payroll_run_item_runId_fkey" FOREIGN KEY ("runId") REFERENCES "payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_item" ADD CONSTRAINT "payroll_run_item_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_item" ADD CONSTRAINT "payroll_run_item_salarySlipId_fkey" FOREIGN KEY ("salarySlipId") REFERENCES "salary_slip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_group" ADD CONSTRAINT "entity_group_admin_org_id_fkey" FOREIGN KEY ("admin_org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer" ADD CONSTRAINT "inter_company_transfer_entity_group_id_fkey" FOREIGN KEY ("entity_group_id") REFERENCES "entity_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer" ADD CONSTRAINT "inter_company_transfer_source_org_id_fkey" FOREIGN KEY ("source_org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer" ADD CONSTRAINT "inter_company_transfer_destination_org_id_fkey" FOREIGN KEY ("destination_org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_hsnSacCodeId_fkey" FOREIGN KEY ("hsnSacCodeId") REFERENCES "hsn_sac_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_level" ADD CONSTRAINT "stock_level_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_level" ADD CONSTRAINT "stock_level_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_level" ADD CONSTRAINT "stock_level_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_event" ADD CONSTRAINT "stock_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_event" ADD CONSTRAINT "stock_event_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_event" ADD CONSTRAINT "stock_event_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment" ADD CONSTRAINT "stock_adjustment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment" ADD CONSTRAINT "stock_adjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment" ADD CONSTRAINT "stock_adjustment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_line" ADD CONSTRAINT "stock_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_line" ADD CONSTRAINT "stock_adjustment_line_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer" ADD CONSTRAINT "stock_transfer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer" ADD CONSTRAINT "stock_transfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer" ADD CONSTRAINT "stock_transfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_line" ADD CONSTRAINT "stock_transfer_line_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_line" ADD CONSTRAINT "stock_transfer_line_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_note_line" ADD CONSTRAINT "goods_receipt_note_line_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_receipt_note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_note_line" ADD CONSTRAINT "goods_receipt_note_line_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "purchase_order_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gstr2b_import" ADD CONSTRAINT "gstr2b_import_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gstr2b_entry" ADD CONSTRAINT "gstr2b_entry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "gstr2b_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_request" ADD CONSTRAINT "e_invoice_request_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_request" ADD CONSTRAINT "e_invoice_request_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_config" ADD CONSTRAINT "e_invoice_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_note" ADD CONSTRAINT "crm_note_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_note" ADD CONSTRAINT "crm_note_customer_fk" FOREIGN KEY ("entityId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_note" ADD CONSTRAINT "crm_note_vendor_fk" FOREIGN KEY ("entityId") REFERENCES "vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_document" ADD CONSTRAINT "sop_document_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_snapshot" ADD CONSTRAINT "forecast_snapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_config" ADD CONSTRAINT "tax_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_liability_estimate" ADD CONSTRAINT "tax_liability_estimate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_liability_estimate" ADD CONSTRAINT "tax_liability_estimate_taxConfigId_fkey" FOREIGN KEY ("taxConfigId") REFERENCES "tax_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_optimization_run" ADD CONSTRAINT "payment_optimization_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_alert_config" ADD CONSTRAINT "cashflow_alert_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_report_schedule" ADD CONSTRAINT "flash_report_schedule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_report_schedule" ADD CONSTRAINT "flash_report_schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_report_delivery" ADD CONSTRAINT "flash_report_delivery_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "flash_report_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_report_delivery" ADD CONSTRAINT "flash_report_delivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executive_kpi_cache" ADD CONSTRAINT "executive_kpi_cache_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_account" ADD CONSTRAINT "billing_account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_event" ADD CONSTRAINT "billing_event_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overage_line" ADD CONSTRAINT "overage_line_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_dunning_attempt" ADD CONSTRAINT "billing_dunning_attempt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_dunning_attempt" ADD CONSTRAINT "billing_dunning_attempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_role" ADD CONSTRAINT "custom_role_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_residency_config" ADD CONSTRAINT "data_residency_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_group_mapping" ADD CONSTRAINT "sso_group_mapping_ssoConfigId_fkey" FOREIGN KEY ("ssoConfigId") REFERENCES "sso_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_dead_letter" ADD CONSTRAINT "webhook_dead_letter_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "api_webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_dead_letter" ADD CONSTRAINT "webhook_dead_letter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

