-- Phase 27 Sprint 27.3: Forensic Audit & Legal-Grade Logging
-- Adds chain fields to audit_log, plus verification and export models

-- Add forensic chain fields to existing audit_log table
ALTER TABLE "audit_log" ADD COLUMN "sequenceNum" BIGINT;
ALTER TABLE "audit_log" ADD COLUMN "entryHash" TEXT;
ALTER TABLE "audit_log" ADD COLUMN "prevHash" TEXT;
ALTER TABLE "audit_log" ADD COLUMN "chainStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

-- Index for chain traversal
CREATE INDEX "audit_log_orgId_sequenceNum_idx" ON "audit_log"("orgId", "sequenceNum");

-- Chain status enum
CREATE TYPE "ChainStatus" AS ENUM ('VALID', 'BROKEN', 'UNVERIFIED');
CREATE TYPE "ChainVerificationStatus" AS ENUM ('INTACT', 'BROKEN', 'EMPTY');
CREATE TYPE "AuditExportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- Audit chain verification results
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

CREATE INDEX "audit_chain_verification_orgId_verifiedAt_idx" ON "audit_chain_verification"("orgId", "verifiedAt" DESC);
ALTER TABLE "audit_chain_verification" ADD CONSTRAINT "audit_chain_verification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit package export tracking
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

CREATE INDEX "audit_package_export_orgId_createdAt_idx" ON "audit_package_export"("orgId", "createdAt" DESC);
ALTER TABLE "audit_package_export" ADD CONSTRAINT "audit_package_export_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
