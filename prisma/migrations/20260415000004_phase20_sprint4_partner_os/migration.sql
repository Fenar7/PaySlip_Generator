-- Phase 20 Sprint 20.4: Partner Operating System
-- Adds UNDER_REVIEW and REVOKED to PartnerStatus enum,
-- extends PartnerProfile with lifecycle audit fields,
-- extends PartnerManagedOrg with scope/attribution/revocation,
-- adds PartnerReviewEvent and PartnerActivityLog for auditability.

-- 1. Extend PartnerStatus enum with new values
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'REVOKED';

-- 2. Add lifecycle audit columns to partner_profiles
ALTER TABLE "partner_profiles"
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewNotes"       TEXT,
  ADD COLUMN IF NOT EXISTS "suspendedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendedReason"   TEXT,
  ADD COLUMN IF NOT EXISTS "revokedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedReason"     TEXT;

-- 3. Extend partner_managed_orgs with scope, attribution, and revocation
ALTER TABLE "partner_managed_orgs"
  ADD COLUMN IF NOT EXISTS "addedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "scope"         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "revokedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedBy"     TEXT;

-- 4. Create partner_review_events (append-only lifecycle audit)
CREATE TABLE IF NOT EXISTS "partner_review_events" (
  "id"          TEXT NOT NULL,
  "partnerId"   TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "fromStatus"  "PartnerStatus" NOT NULL,
  "toStatus"    "PartnerStatus" NOT NULL,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "partner_review_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "partner_review_events"
  ADD CONSTRAINT "partner_review_events_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Create partner_activity_logs (cross-org action attribution)
CREATE TABLE IF NOT EXISTS "partner_activity_logs" (
  "id"           TEXT NOT NULL,
  "partnerId"    TEXT NOT NULL,
  "actorUserId"  TEXT NOT NULL,
  "managedOrgId" TEXT,
  "clientOrgId"  TEXT,
  "action"       TEXT NOT NULL,
  "entityType"   TEXT,
  "entityId"     TEXT,
  "metadata"     JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "partner_activity_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "partner_activity_logs"
  ADD CONSTRAINT "partner_activity_logs_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_activity_logs"
  ADD CONSTRAINT "partner_activity_logs_managedOrgId_fkey"
    FOREIGN KEY ("managedOrgId") REFERENCES "partner_managed_orgs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Indexes for efficient governance queries
CREATE INDEX IF NOT EXISTS "partner_review_events_partnerId_idx"
  ON "partner_review_events"("partnerId");

CREATE INDEX IF NOT EXISTS "partner_activity_logs_partnerId_idx"
  ON "partner_activity_logs"("partnerId");

CREATE INDEX IF NOT EXISTS "partner_activity_logs_clientOrgId_idx"
  ON "partner_activity_logs"("clientOrgId");

CREATE INDEX IF NOT EXISTS "partner_profiles_status_idx"
  ON "partner_profiles"("status");
