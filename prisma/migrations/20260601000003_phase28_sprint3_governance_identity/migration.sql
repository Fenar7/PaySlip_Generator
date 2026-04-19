-- Phase 28 Sprint 28.3: Advanced Governance & Identity
-- Adds: CustomRole, SsoGroupMapping, DataResidencyConfig
-- Modifies: SsoConfig (OIDC fields + protocol), Member (customRoleId)

-- Create SsoProtocol enum
DO $$ BEGIN
  CREATE TYPE "SsoProtocol" AS ENUM ('SAML', 'OIDC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create DataResidencyRegion enum
DO $$ BEGIN
  CREATE TYPE "DataResidencyRegion" AS ENUM ('US', 'EU', 'IN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add protocol and OIDC fields to sso_config
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "protocol" "SsoProtocol" NOT NULL DEFAULT 'SAML';
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "oidc_issuer_url" TEXT;
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "oidc_client_id" TEXT;
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "oidc_client_secret" TEXT;
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "oidc_jwks_url" TEXT;
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "oidc_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "sso_config" ADD COLUMN IF NOT EXISTS "oidc_email_domains" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create custom_role table
CREATE TABLE IF NOT EXISTS "custom_role" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" JSONB NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "custom_role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "custom_role_orgId_name_key" ON "custom_role"("orgId", "name");

ALTER TABLE "custom_role" DROP CONSTRAINT IF EXISTS "custom_role_orgId_fkey";
ALTER TABLE "custom_role" ADD CONSTRAINT "custom_role_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add customRoleId to member table
ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "customRoleId" TEXT;

ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_customRoleId_fkey";
ALTER TABLE "member" ADD CONSTRAINT "member_customRoleId_fkey"
  FOREIGN KEY ("customRoleId") REFERENCES "custom_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create sso_group_mapping table
CREATE TABLE IF NOT EXISTS "sso_group_mapping" (
  "id" TEXT NOT NULL,
  "ssoConfigId" TEXT NOT NULL,
  "externalGroup" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "customRoleId" TEXT,

  CONSTRAINT "sso_group_mapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sso_group_mapping_ssoConfigId_externalGroup_key"
  ON "sso_group_mapping"("ssoConfigId", "externalGroup");

ALTER TABLE "sso_group_mapping" DROP CONSTRAINT IF EXISTS "sso_group_mapping_ssoConfigId_fkey";
ALTER TABLE "sso_group_mapping" ADD CONSTRAINT "sso_group_mapping_ssoConfigId_fkey"
  FOREIGN KEY ("ssoConfigId") REFERENCES "sso_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sso_group_mapping" DROP CONSTRAINT IF EXISTS "sso_group_mapping_customRoleId_fkey";
ALTER TABLE "sso_group_mapping" ADD CONSTRAINT "sso_group_mapping_customRoleId_fkey"
  FOREIGN KEY ("customRoleId") REFERENCES "custom_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create data_residency_config table
CREATE TABLE IF NOT EXISTS "data_residency_config" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "region" "DataResidencyRegion" NOT NULL DEFAULT 'IN',
  "bucketEndpoint" TEXT,
  "enforced" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "data_residency_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "data_residency_config_orgId_key" ON "data_residency_config"("orgId");

ALTER TABLE "data_residency_config" DROP CONSTRAINT IF EXISTS "data_residency_config_orgId_fkey";
ALTER TABLE "data_residency_config" ADD CONSTRAINT "data_residency_config_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
