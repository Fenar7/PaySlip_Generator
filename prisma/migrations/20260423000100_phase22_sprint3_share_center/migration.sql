-- Phase 22 Sprint 22.3: Secure Share Center
-- Extends SharedDocument with lifecycle status, revocation, recipient metadata.
-- Adds ShareBundle, ShareBundleItem, ShareAccessLog models.
-- Also adds ExternalAccessEvent for Sprint 22.5 portal analytics.

-- Enums

CREATE TYPE "shared_document_status" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'DISABLED_BY_POLICY'
);

CREATE TYPE "share_bundle_status" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE "share_access_event_type" AS ENUM (
  'VIEWED',
  'DOWNLOADED',
  'EXPIRED',
  'REVOKED',
  'RECIPIENT_VERIFIED',
  'VERIFICATION_FAILED',
  'BLOCKED_BY_POLICY'
);

CREATE TYPE "external_access_event_type" AS ENUM (
  'PORTAL_LOGIN',
  'PORTAL_LOGOUT',
  'PORTAL_SESSION_EXPIRED',
  'PORTAL_SESSION_REVOKED',
  'INVOICE_VIEWED',
  'INVOICE_DOWNLOADED',
  'STATEMENT_VIEWED',
  'QUOTE_VIEWED',
  'QUOTE_ACCEPTED',
  'QUOTE_DECLINED',
  'TICKET_VIEWED',
  'TICKET_REPLY_SUBMITTED',
  'PROOF_UPLOADED',
  'DOCUMENT_SHARED',
  'SHARE_VIEWED',
  'SHARE_DOWNLOADED',
  'SHARE_REVOKED',
  'BUNDLE_VIEWED',
  'BUNDLE_DOWNLOADED',
  'UNUSUAL_ACCESS'
);

-- Extend SharedDocument with lifecycle fields

ALTER TABLE "shared_document"
  ADD COLUMN "status" "shared_document_status" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "download_allowed" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "requires_verification" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "recipient_email" TEXT,
  ADD COLUMN "recipient_name" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "revoked_at" TIMESTAMPTZ,
  ADD COLUMN "revoked_by" UUID;

CREATE INDEX "shared_document_org_id_status_idx" ON "shared_document" ("org_id", "status");

-- ShareBundle

CREATE TABLE "share_bundle" (
  "id"              TEXT NOT NULL,
  "org_id"          TEXT NOT NULL,
  "token"           TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "description"     TEXT,
  "status"          "share_bundle_status" NOT NULL DEFAULT 'ACTIVE',
  "expires_at"      TIMESTAMPTZ,
  "view_count"      INTEGER NOT NULL DEFAULT 0,
  "download_allowed" BOOLEAN NOT NULL DEFAULT TRUE,
  "recipient_email" TEXT,
  "recipient_name"  TEXT,
  "notes"           TEXT,
  "revoked_at"      TIMESTAMPTZ,
  "revoked_by"      UUID,
  "created_by"      UUID NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "share_bundle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_bundle_token_key" ON "share_bundle" ("token");
CREATE INDEX "share_bundle_org_id_status_idx" ON "share_bundle" ("org_id", "status");

ALTER TABLE "share_bundle"
  ADD CONSTRAINT "share_bundle_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organization" ("id") ON DELETE CASCADE;

-- ShareBundleItem

CREATE TABLE "share_bundle_item" (
  "id"                TEXT NOT NULL,
  "bundle_id"         TEXT NOT NULL,
  "shared_document_id" TEXT NOT NULL,
  "sort_order"        INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "share_bundle_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_bundle_item_bundle_id_shared_document_id_key"
  ON "share_bundle_item" ("bundle_id", "shared_document_id");

ALTER TABLE "share_bundle_item"
  ADD CONSTRAINT "share_bundle_item_bundle_id_fkey"
  FOREIGN KEY ("bundle_id") REFERENCES "share_bundle" ("id") ON DELETE CASCADE;

ALTER TABLE "share_bundle_item"
  ADD CONSTRAINT "share_bundle_item_shared_document_id_fkey"
  FOREIGN KEY ("shared_document_id") REFERENCES "shared_document" ("id") ON DELETE CASCADE;

-- ShareAccessLog

CREATE TABLE "share_access_log" (
  "id"                 TEXT NOT NULL,
  "org_id"             TEXT NOT NULL,
  "shared_document_id" TEXT,
  "bundle_id"          TEXT,
  "event"              "share_access_event_type" NOT NULL,
  "recipient_email"    TEXT,
  "ip"                 TEXT,
  "user_agent"         TEXT,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "share_access_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "share_access_log_org_id_created_at_idx" ON "share_access_log" ("org_id", "created_at");
CREATE INDEX "share_access_log_shared_document_id_idx" ON "share_access_log" ("shared_document_id");
CREATE INDEX "share_access_log_bundle_id_idx" ON "share_access_log" ("bundle_id");

ALTER TABLE "share_access_log"
  ADD CONSTRAINT "share_access_log_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organization" ("id") ON DELETE CASCADE;

ALTER TABLE "share_access_log"
  ADD CONSTRAINT "share_access_log_shared_document_id_fkey"
  FOREIGN KEY ("shared_document_id") REFERENCES "shared_document" ("id") ON DELETE SET NULL;

ALTER TABLE "share_access_log"
  ADD CONSTRAINT "share_access_log_bundle_id_fkey"
  FOREIGN KEY ("bundle_id") REFERENCES "share_bundle" ("id") ON DELETE SET NULL;

-- ExternalAccessEvent (Sprint 22.5)

CREATE TABLE "external_access_event" (
  "id"            TEXT NOT NULL,
  "org_id"        TEXT NOT NULL,
  "customer_id"   TEXT,
  "user_id"       UUID,
  "event_type"    "external_access_event_type" NOT NULL,
  "resource_type" TEXT,
  "resource_id"   TEXT,
  "metadata"      JSONB,
  "ip"            TEXT,
  "user_agent"    TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "external_access_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_access_event_org_id_event_type_created_at_idx"
  ON "external_access_event" ("org_id", "event_type", "created_at");
CREATE INDEX "external_access_event_org_id_customer_id_created_at_idx"
  ON "external_access_event" ("org_id", "customer_id", "created_at");
CREATE INDEX "external_access_event_org_id_created_at_idx"
  ON "external_access_event" ("org_id", "created_at");

ALTER TABLE "external_access_event"
  ADD CONSTRAINT "external_access_event_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organization" ("id") ON DELETE CASCADE;
