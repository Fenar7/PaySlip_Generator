-- Phase 21 Sprint 21.4: Anomaly Detection and Sprint 21.5: AI Governance
-- Forward-only migration. All tables use IF NOT EXISTS guards for idempotency.

-- ─── anomaly_rule ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "anomaly_rule" (
    "id"              TEXT NOT NULL,
    "key"             TEXT NOT NULL,
    "category"        TEXT NOT NULL,
    "severityDefault" TEXT NOT NULL,
    "enabled"         BOOLEAN NOT NULL DEFAULT true,
    "thresholdConfig" JSONB,
    "planGate"        TEXT,
    "description"     TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_rule_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "anomaly_rule_key_key" ON "anomaly_rule"("key");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "anomaly_rule_category_enabled_idx" ON "anomaly_rule"("category", "enabled");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ─── anomaly_detection_run ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "anomaly_detection_run" (
    "id"              TEXT NOT NULL,
    "orgId"           TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"     TIMESTAMP(3),
    "rulesEvaluated"  INTEGER NOT NULL DEFAULT 0,
    "insightsCreated" INTEGER NOT NULL DEFAULT 0,
    "insightsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage"    TEXT,

    CONSTRAINT "anomaly_detection_run_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "anomaly_detection_run_orgId_startedAt_idx" ON "anomaly_detection_run"("orgId", "startedAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "anomaly_detection_run"
    ADD CONSTRAINT "anomaly_detection_run_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── ai_usage_record ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ai_usage_record" (
    "id"                TEXT NOT NULL,
    "orgId"             TEXT NOT NULL,
    "userId"            UUID,
    "feature"           TEXT NOT NULL,
    "provider"          TEXT NOT NULL,
    "model"             TEXT NOT NULL,
    "promptTemplateKey" TEXT,
    "usageType"         TEXT NOT NULL DEFAULT 'completion',
    "tokensInput"       INTEGER NOT NULL DEFAULT 0,
    "tokensOutput"      INTEGER NOT NULL DEFAULT 0,
    "costEstimatePaise" INTEGER NOT NULL DEFAULT 0,
    "success"           BOOLEAN NOT NULL,
    "errorCode"         TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_record_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ai_usage_record_orgId_feature_createdAt_idx" ON "ai_usage_record"("orgId", "feature", "createdAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ai_usage_record_orgId_createdAt_idx" ON "ai_usage_record"("orgId", "createdAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_usage_record"
    ADD CONSTRAINT "ai_usage_record_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
