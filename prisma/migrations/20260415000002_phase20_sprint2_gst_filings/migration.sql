DO $$
BEGIN
    CREATE TYPE "GstFilingReturnType" AS ENUM ('GSTR1');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "GstFilingRunStatus" AS ENUM (
        'DRAFT',
        'BLOCKED',
        'READY',
        'SUBMISSION_PENDING',
        'RECONCILING',
        'RECONCILED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "GstFilingValidationSeverity" AS ENUM ('ERROR', 'WARNING', 'INFO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "GstFilingSubmissionStatus" AS ENUM (
        'INTENT_RECORDED',
        'SUBMITTED',
        'ACKNOWLEDGED',
        'FAILED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "GstFilingProvider" AS ENUM ('MANUAL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "GstFilingReconciliationStatus" AS ENUM (
        'PENDING',
        'MATCHED',
        'VARIANCE',
        'ACTION_REQUIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "GstFilingEventType" AS ENUM (
        'RUN_CREATED',
        'VALIDATION_COMPLETED',
        'STATUS_CHANGED',
        'PACKAGE_EXPORTED',
        'SUBMISSION_INTENT_RECORDED',
        'SUBMISSION_RECORDED',
        'SUBMISSION_FAILED',
        'RECONCILIATION_RECORDED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "gst_filing_run" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gst_filing_run_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gst_filing_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "gst_filing_validation_issue" (
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
    CONSTRAINT "gst_filing_validation_issue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gst_filing_validation_issue_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gst_filing_validation_issue_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "gst_filing_submission" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gst_filing_submission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gst_filing_submission_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gst_filing_submission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "gst_filing_reconciliation" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gst_filing_reconciliation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gst_filing_reconciliation_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gst_filing_reconciliation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "gst_filing_event" (
    "id" TEXT NOT NULL,
    "filingRunId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventType" "GstFilingEventType" NOT NULL,
    "actorId" UUID,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gst_filing_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gst_filing_event_filingRunId_fkey" FOREIGN KEY ("filingRunId") REFERENCES "gst_filing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gst_filing_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "gst_filing_run_orgId_periodMonth_returnType_key"
    ON "gst_filing_run"("orgId", "periodMonth", "returnType");

CREATE INDEX IF NOT EXISTS "gst_filing_run_orgId_status_periodMonth_idx"
    ON "gst_filing_run"("orgId", "status", "periodMonth");

CREATE INDEX IF NOT EXISTS "gst_filing_validation_issue_filingRunId_severity_idx"
    ON "gst_filing_validation_issue"("filingRunId", "severity");

CREATE INDEX IF NOT EXISTS "gst_filing_validation_issue_orgId_createdAt_idx"
    ON "gst_filing_validation_issue"("orgId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "gst_filing_submission_filingRunId_attempt_key"
    ON "gst_filing_submission"("filingRunId", "attempt");

CREATE INDEX IF NOT EXISTS "gst_filing_submission_orgId_status_initiatedAt_idx"
    ON "gst_filing_submission"("orgId", "status", "initiatedAt");

CREATE INDEX IF NOT EXISTS "gst_filing_reconciliation_orgId_status_createdAt_idx"
    ON "gst_filing_reconciliation"("orgId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "gst_filing_reconciliation_filingRunId_createdAt_idx"
    ON "gst_filing_reconciliation"("filingRunId", "createdAt");

CREATE INDEX IF NOT EXISTS "gst_filing_event_filingRunId_createdAt_idx"
    ON "gst_filing_event"("filingRunId", "createdAt");

CREATE INDEX IF NOT EXISTS "gst_filing_event_orgId_createdAt_idx"
    ON "gst_filing_event"("orgId", "createdAt");
