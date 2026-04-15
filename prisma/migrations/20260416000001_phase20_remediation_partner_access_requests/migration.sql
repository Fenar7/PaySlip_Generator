-- Phase 20 Pre-Master Remediation: partner client access request workflow
--
-- Adds PartnerClientAccessRequest model so partners submit PENDING requests
-- rather than creating active assignments unilaterally. Client org admins
-- must explicitly approve before the partner gains cross-org access.
--
-- Safe to re-run: CREATE TYPE IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS.

-- ─── PartnerAccessRequestStatus enum ──────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PartnerAccessRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── partner_client_access_requests table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "partner_client_access_requests" (
    "id"                TEXT        NOT NULL,
    "partnerId"         TEXT        NOT NULL,
    "clientOrgId"       TEXT        NOT NULL,
    "requestedByUserId" TEXT        NOT NULL,
    "scope"             TEXT[]      NOT NULL DEFAULT '{}',
    "status"            "PartnerAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes"             TEXT,
    "reviewedByUserId"  TEXT,
    "reviewedAt"        TIMESTAMP(3),
    "expiresAt"         TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_client_access_requests_pkey" PRIMARY KEY ("id")
);

-- ─── Composite index for status-aware lookup ───────────────────────────────
CREATE INDEX IF NOT EXISTS "partner_client_access_requests_partnerId_clientOrgId_status_idx"
    ON "partner_client_access_requests"("partnerId", "clientOrgId", "status");

-- ─── Foreign keys ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "partner_client_access_requests"
    ADD CONSTRAINT "partner_client_access_requests_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "partner_client_access_requests"
    ADD CONSTRAINT "partner_client_access_requests_clientOrgId_fkey"
    FOREIGN KEY ("clientOrgId") REFERENCES "organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
