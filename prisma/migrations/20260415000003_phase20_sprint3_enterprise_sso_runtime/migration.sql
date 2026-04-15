-- Phase 20 Sprint 20.3: Enterprise SSO runtime, enforcement, and recovery

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SsoMetadataStatus'
  ) THEN
    CREATE TYPE "SsoMetadataStatus" AS ENUM ('PENDING', 'VALID', 'FAILED', 'STALE');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SsoAuthnRequestMode'
  ) THEN
    CREATE TYPE "SsoAuthnRequestMode" AS ENUM ('LOGIN', 'TEST');
  END IF;
END $$;

ALTER TABLE "sso_config"
  ADD COLUMN IF NOT EXISTS "idpEntityId" TEXT,
  ADD COLUMN IF NOT EXISTS "idpSsoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "idpSsoBinding" TEXT,
  ADD COLUMN IF NOT EXISTS "idpCertificates" JSONB,
  ADD COLUMN IF NOT EXISTS "metadataStatus" "SsoMetadataStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "metadataError" TEXT,
  ADD COLUMN IF NOT EXISTS "metadataLastFetchedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "metadataNextRefreshAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastFailureAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastFailureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginEmail" TEXT;

CREATE TABLE IF NOT EXISTS "sso_break_glass_code" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "sso_break_glass_code_codeHash_key"
  ON "sso_break_glass_code"("codeHash");

CREATE INDEX IF NOT EXISTS "sso_break_glass_code_orgId_expiresAt_idx"
  ON "sso_break_glass_code"("orgId", "expiresAt");

CREATE INDEX IF NOT EXISTS "sso_break_glass_code_orgId_redeemedAt_idx"
  ON "sso_break_glass_code"("orgId", "redeemedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sso_break_glass_code_orgId_fkey'
  ) THEN
    ALTER TABLE "sso_break_glass_code"
      ADD CONSTRAINT "sso_break_glass_code_orgId_fkey"
      FOREIGN KEY ("orgId")
      REFERENCES "organization"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "sso_authn_request" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "sso_authn_request_requestId_key"
  ON "sso_authn_request"("requestId");

CREATE INDEX IF NOT EXISTS "sso_authn_request_orgId_expiresAt_idx"
  ON "sso_authn_request"("orgId", "expiresAt");

CREATE INDEX IF NOT EXISTS "sso_authn_request_orgId_consumedAt_idx"
  ON "sso_authn_request"("orgId", "consumedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sso_authn_request_orgId_fkey'
  ) THEN
    ALTER TABLE "sso_authn_request"
      ADD CONSTRAINT "sso_authn_request_orgId_fkey"
      FOREIGN KEY ("orgId")
      REFERENCES "organization"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "sso_assertion_replay" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "assertionId" TEXT NOT NULL,
  "responseId" TEXT,
  "nameId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sso_assertion_replay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sso_assertion_replay_assertionId_key"
  ON "sso_assertion_replay"("assertionId");

CREATE INDEX IF NOT EXISTS "sso_assertion_replay_orgId_expiresAt_idx"
  ON "sso_assertion_replay"("orgId", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sso_assertion_replay_orgId_fkey'
  ) THEN
    ALTER TABLE "sso_assertion_replay"
      ADD CONSTRAINT "sso_assertion_replay_orgId_fkey"
      FOREIGN KEY ("orgId")
      REFERENCES "organization"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
