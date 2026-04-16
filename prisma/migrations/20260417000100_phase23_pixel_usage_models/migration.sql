-- Phase 23 Sprint 23.1 + 23.5 Migration
-- Adds SW Pixel job tracking, usage metering events, and org usage snapshots.

-- ──────────────────────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE "pixel_tool_type" AS ENUM (
  'PASSPORT_PHOTO',
  'RESIZE',
  'COMPRESS',
  'ADJUST',
  'FORMAT_CONVERT',
  'PRINT_SHEET'
);

CREATE TYPE "usage_resource" AS ENUM (
  'INVOICE',
  'QUOTE',
  'VOUCHER',
  'SALARY_SLIP',
  'FILE_STORAGE_BYTES',
  'TEAM_MEMBER',
  'WEBHOOK_CALL',
  'PORTAL_SESSION',
  'SHARE_BUNDLE',
  'PIXEL_JOB_SAVED'
);

-- ──────────────────────────────────────────────────────────────────────────────
-- pixel_job_record
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "pixel_job_record" (
  "id"             TEXT         NOT NULL,
  "orgId"          TEXT         NOT NULL,
  "userId"         UUID         NOT NULL,
  "toolType"       "pixel_tool_type" NOT NULL,
  "inputFileName"  TEXT         NOT NULL,
  "outputFileName" TEXT,
  "presetId"       TEXT,
  "storagePath"    TEXT,
  "fileSizeBytes"  INTEGER,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3),

  CONSTRAINT "pixel_job_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pixel_job_record_orgId_userId_createdAt_idx"
  ON "pixel_job_record" ("orgId", "userId", "createdAt");

CREATE INDEX "pixel_job_record_orgId_toolType_createdAt_idx"
  ON "pixel_job_record" ("orgId", "toolType", "createdAt");

ALTER TABLE "pixel_job_record"
  ADD CONSTRAINT "pixel_job_record_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────────────
-- usage_event
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "usage_event" (
  "id"         TEXT          NOT NULL,
  "orgId"      TEXT          NOT NULL,
  "resource"   "usage_resource" NOT NULL,
  "delta"      INTEGER       NOT NULL,
  "entityId"   TEXT,
  "recordedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "usage_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_event_orgId_resource_recordedAt_idx"
  ON "usage_event" ("orgId", "resource", "recordedAt");

ALTER TABLE "usage_event"
  ADD CONSTRAINT "usage_event_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────────────
-- org_usage_snapshot
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_usage_snapshot" (
  "id"                   TEXT         NOT NULL,
  "orgId"                TEXT         NOT NULL,
  "periodStart"          TIMESTAMP(3) NOT NULL,
  "periodEnd"            TIMESTAMP(3) NOT NULL,
  "activeInvoices"       INTEGER      NOT NULL DEFAULT 0,
  "activeQuotes"         INTEGER      NOT NULL DEFAULT 0,
  "vouchers"             INTEGER      NOT NULL DEFAULT 0,
  "salarySlips"          INTEGER      NOT NULL DEFAULT 0,
  "storageBytes"         BIGINT       NOT NULL DEFAULT 0,
  "teamMembers"          INTEGER      NOT NULL DEFAULT 0,
  "webhookCallsMonthly"  INTEGER      NOT NULL DEFAULT 0,
  "activePortalSessions" INTEGER      NOT NULL DEFAULT 0,
  "activeShareBundles"   INTEGER      NOT NULL DEFAULT 0,
  "pixelJobsSaved"       INTEGER      NOT NULL DEFAULT 0,
  "lastComputedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "org_usage_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_usage_snapshot_orgId_periodStart_key"
  ON "org_usage_snapshot" ("orgId", "periodStart");

CREATE INDEX "org_usage_snapshot_orgId_periodStart_idx"
  ON "org_usage_snapshot" ("orgId", "periodStart");

ALTER TABLE "org_usage_snapshot"
  ADD CONSTRAINT "org_usage_snapshot_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
