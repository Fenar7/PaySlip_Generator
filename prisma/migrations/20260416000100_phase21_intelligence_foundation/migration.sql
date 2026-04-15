-- Phase 21 Sprint 21.1: Intelligence Foundation (IntelInsight, InsightEvent, AiJob, AiJobEvent)
-- Phase 21 Sprint 21.2: Document Intelligence Workbench (ExtractionReview, ExtractionField)
-- Phase 21 Sprint 21.3: Customer Health Intelligence (CustomerHealthSnapshot)
-- All statements are idempotent using IF NOT EXISTS / DO $$ guards.

-- Enums

DO $$ BEGIN
  CREATE TYPE "IntelInsightStatus" AS ENUM (
    'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntelInsightSeverity" AS ENUM (
    'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntelInsightCategory" AS ENUM (
    'REVENUE', 'RECEIVABLES', 'DOCUMENTS', 'PAYROLL', 'OPERATIONS',
    'COMPLIANCE', 'PARTNER', 'MARKETPLACE', 'INTEGRATIONS', 'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InsightSourceType" AS ENUM (
    'RULE', 'AI', 'HYBRID', 'INTEGRATION', 'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AiJobStatus" AS ENUM (
    'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExtractionReviewStatus" AS ENUM (
    'UPLOADED', 'QUEUED', 'PROCESSING', 'NEEDS_REVIEW',
    'APPROVED', 'PROMOTED', 'REJECTED', 'FAILED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- intel_insight

CREATE TABLE IF NOT EXISTS "intel_insight" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orgId"                 TEXT NOT NULL,
  "category"              "IntelInsightCategory" NOT NULL,
  "severity"              "IntelInsightSeverity" NOT NULL,
  "status"                "IntelInsightStatus" NOT NULL DEFAULT 'NEW',
  "title"                 TEXT NOT NULL,
  "summary"               TEXT NOT NULL,
  "evidence"              JSONB,
  "sourceType"            "InsightSourceType" NOT NULL,
  "sourceRecordType"      TEXT,
  "sourceRecordId"        TEXT,
  "recommendedActionType" TEXT,
  "assignedRole"          TEXT,
  "createdByJobId"        TEXT,
  "dedupeKey"             TEXT,
  "firstDetectedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastDetectedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "acknowledgedAt"        TIMESTAMPTZ,
  "acknowledgedByUserId"  UUID,
  "resolvedAt"            TIMESTAMPTZ,
  "resolvedByUserId"      UUID,
  "dismissedAt"           TIMESTAMPTZ,
  "dismissedByUserId"     UUID,
  "dismissedReason"       TEXT,
  "expiresAt"             TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "intel_insight_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intel_insight_org_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "intel_insight" ADD CONSTRAINT "intel_insight_orgId_dedupeKey_key" UNIQUE ("orgId", "dedupeKey");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "intel_insight_orgId_status_idx"          ON "intel_insight" ("orgId", "status");
CREATE INDEX IF NOT EXISTS "intel_insight_orgId_category_severity_idx" ON "intel_insight" ("orgId", "category", "severity");
CREATE INDEX IF NOT EXISTS "intel_insight_orgId_status_expiresAt_idx" ON "intel_insight" ("orgId", "status", "expiresAt");

-- insight_event

CREATE TABLE IF NOT EXISTS "insight_event" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "insightId"  TEXT NOT NULL,
  "eventType"  TEXT NOT NULL,
  "actorId"    UUID,
  "actorLabel" TEXT,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "insight_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insight_event_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "intel_insight"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "insight_event_insightId_createdAt_idx" ON "insight_event" ("insightId", "createdAt");

-- ai_job

CREATE TABLE IF NOT EXISTS "ai_job" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orgId"                 TEXT NOT NULL,
  "userId"                UUID,
  "feature"               TEXT NOT NULL,
  "status"                "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
  "provider"              TEXT,
  "model"                 TEXT,
  "promptTemplateKey"     TEXT,
  "promptTemplateVersion" TEXT,
  "inputRef"              JSONB,
  "outputRef"             JSONB,
  "tokensInput"           INTEGER,
  "tokensOutput"          INTEGER,
  "costEstimatePaise"     INTEGER,
  "errorCode"             TEXT,
  "errorMessage"          TEXT,
  "startedAt"             TIMESTAMPTZ,
  "completedAt"           TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ai_job_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_job_org_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_job_orgId_feature_status_idx" ON "ai_job" ("orgId", "feature", "status");
CREATE INDEX IF NOT EXISTS "ai_job_orgId_createdAt_idx"       ON "ai_job" ("orgId", "createdAt");

-- ai_job_event

CREATE TABLE IF NOT EXISTS "ai_job_event" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "jobId"     TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ai_job_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_job_event_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_job"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_job_event_jobId_createdAt_idx" ON "ai_job_event" ("jobId", "createdAt");

-- extraction_review

CREATE TABLE IF NOT EXISTS "extraction_review" (
  "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orgId"              TEXT NOT NULL,
  "aiJobId"            TEXT,
  "ocrJobId"           TEXT,
  "sourceAttachmentId" TEXT,
  "targetType"         TEXT,
  "targetDraftId"      TEXT,
  "status"             "ExtractionReviewStatus" NOT NULL DEFAULT 'UPLOADED',
  "originalOutput"     JSONB,
  "correctedOutput"    JSONB,
  "reviewerId"         UUID,
  "reviewedAt"         TIMESTAMPTZ,
  "promotedAt"         TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "extraction_review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "extraction_review_org_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "extraction_review_orgId_status_idx"    ON "extraction_review" ("orgId", "status");
CREATE INDEX IF NOT EXISTS "extraction_review_orgId_createdAt_idx" ON "extraction_review" ("orgId", "createdAt");

-- extraction_field

CREATE TABLE IF NOT EXISTS "extraction_field" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "reviewId"         TEXT NOT NULL,
  "fieldKey"         TEXT NOT NULL,
  "proposedValue"    TEXT,
  "normalizedValue"  TEXT,
  "correctedValue"   TEXT,
  "confidence"       DOUBLE PRECISION,
  "validationStatus" TEXT,
  "validationError"  TEXT,
  "sourcePage"       INTEGER,
  "sourceRegion"     TEXT,
  "accepted"         BOOLEAN NOT NULL DEFAULT false,
  "rejectedReason"   TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "extraction_field_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "extraction_field_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "extraction_review"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "extraction_field_reviewId_idx" ON "extraction_field" ("reviewId");

-- customer_health_snapshot

CREATE TABLE IF NOT EXISTS "customer_health_snapshot" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orgId"            TEXT NOT NULL,
  "customerId"       TEXT NOT NULL,
  "score"            DOUBLE PRECISION NOT NULL,
  "riskBand"         TEXT NOT NULL,
  "factors"          JSONB NOT NULL,
  "recommendedAction" TEXT,
  "calculatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "validUntil"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "customer_health_snapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_health_snapshot_org_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_health_snapshot_orgId_customerId_calculatedAt_idx" ON "customer_health_snapshot" ("orgId", "customerId", "calculatedAt");
CREATE INDEX IF NOT EXISTS "customer_health_snapshot_orgId_riskBand_idx"                ON "customer_health_snapshot" ("orgId", "riskBand");
