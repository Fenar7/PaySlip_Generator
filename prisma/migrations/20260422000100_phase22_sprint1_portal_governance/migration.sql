-- Phase 22 Sprint 22.1: Portal Access Governance
-- Adds portal policy fields, revocable session model, durable rate-limit model,
-- and enriched access log (action, statusCode, performance index).

-- ─── OrgDefaults: portal policy columns ─────────────────────────────────────

ALTER TABLE "org_defaults"
  ADD COLUMN IF NOT EXISTS "portalMagicLinkExpiryHours"   INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "portalSessionExpiryHours"     INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "portalProofUploadEnabled"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "portalTicketCreationEnabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "portalStatementEnabled"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "portalQuoteAcceptanceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ─── CustomerPortalAccessLog: enrichment columns ────────────────────────────

ALTER TABLE "customer_portal_access_log"
  ADD COLUMN IF NOT EXISTS "action"     TEXT,
  ADD COLUMN IF NOT EXISTS "statusCode" INTEGER;

CREATE INDEX IF NOT EXISTS "customer_portal_access_log_orgId_accessedAt_idx"
  ON "customer_portal_access_log" ("orgId", "accessedAt");

-- ─── CustomerPortalSession: revocable session table ─────────────────────────

CREATE TABLE IF NOT EXISTS "customer_portal_session" (
  "id"         TEXT      NOT NULL,
  "orgId"      TEXT      NOT NULL,
  "customerId" TEXT      NOT NULL,
  "jti"        TEXT      NOT NULL,
  "issuedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "revokedAt"  TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "ip"         TEXT,
  "userAgent"  TEXT,

  CONSTRAINT "customer_portal_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_portal_session_jti_key"
  ON "customer_portal_session" ("jti");

CREATE INDEX IF NOT EXISTS "customer_portal_session_customerId_orgId_idx"
  ON "customer_portal_session" ("customerId", "orgId");

CREATE INDEX IF NOT EXISTS "customer_portal_session_orgId_revokedAt_idx"
  ON "customer_portal_session" ("orgId", "revokedAt");

ALTER TABLE "customer_portal_session"
  ADD CONSTRAINT "customer_portal_session_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_portal_session_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── PortalRateLimit: durable rate-limit buckets ────────────────────────────

CREATE TABLE IF NOT EXISTS "portal_rate_limit" (
  "id"        TEXT         NOT NULL,
  "key"       TEXT         NOT NULL,
  "count"     INTEGER      NOT NULL DEFAULT 1,
  "windowEnd" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "portal_rate_limit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "portal_rate_limit_key_key"
  ON "portal_rate_limit" ("key");

CREATE INDEX IF NOT EXISTS "portal_rate_limit_key_windowEnd_idx"
  ON "portal_rate_limit" ("key", "windowEnd");
