-- Phase 28 Governance & Platform Schema Remediation
-- Adds missing models from Sprint 28.3 (SSO/RBAC) and Sprint 28.4 (Developer Platform)
-- that were lost during cherry-pick conflict resolution.

-- Add OIDC fields to SsoConfig
ALTER TABLE "sso_config" ADD COLUMN "protocol" TEXT NOT NULL DEFAULT 'SAML';
ALTER TABLE "sso_config" ADD COLUMN "oidc_issuer_url" TEXT;
ALTER TABLE "sso_config" ADD COLUMN "oidc_client_id" TEXT;
ALTER TABLE "sso_config" ADD COLUMN "oidc_client_secret" TEXT;
ALTER TABLE "sso_config" ADD COLUMN "oidc_jwks_url" TEXT;
ALTER TABLE "sso_config" ADD COLUMN "oidc_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "sso_config" ADD COLUMN "oidc_email_domains" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add rateLimitTier to ApiKey
ALTER TABLE "api_key" ADD COLUMN "rate_limit_tier" TEXT NOT NULL DEFAULT 'free';

-- Add customRoleId to Member
ALTER TABLE "member" ADD COLUMN "custom_role_id" TEXT;

-- Create CustomRole table
CREATE TABLE "custom_role" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_role_pkey" PRIMARY KEY ("id")
);

-- Create DataResidencyConfig table
CREATE TABLE "data_residency_config" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'IN',
    "bucket_endpoint" TEXT,
    "enforced" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_residency_config_pkey" PRIMARY KEY ("id")
);

-- Create SsoGroupMapping table
CREATE TABLE "sso_group_mapping" (
    "id" TEXT NOT NULL,
    "sso_config_id" TEXT NOT NULL,
    "external_group" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "custom_role_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_group_mapping_pkey" PRIMARY KEY ("id")
);

-- Create WebhookDeadLetter table
CREATE TABLE "webhook_dead_letter" (
    "id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "last_status" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letter_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "custom_role_org_id_idx" ON "custom_role"("org_id");
CREATE UNIQUE INDEX "custom_role_org_name_unique" ON "custom_role"("org_id", "name");
CREATE UNIQUE INDEX "data_residency_config_org_id_key" ON "data_residency_config"("org_id");
CREATE INDEX "sso_group_mapping_sso_config_id_idx" ON "sso_group_mapping"("sso_config_id");
CREATE UNIQUE INDEX "sso_group_mapping_config_group_unique" ON "sso_group_mapping"("sso_config_id", "external_group");
CREATE INDEX "webhook_dead_letter_status_next_retry_at_idx" ON "webhook_dead_letter"("status", "next_retry_at");
CREATE INDEX "webhook_dead_letter_org_id_status_idx" ON "webhook_dead_letter"("org_id", "status");
CREATE INDEX "webhook_dead_letter_endpoint_id_idx" ON "webhook_dead_letter"("endpoint_id");
CREATE INDEX "member_custom_role_id_idx" ON "member"("custom_role_id");

-- Foreign keys
ALTER TABLE "member" ADD CONSTRAINT "member_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "custom_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_role" ADD CONSTRAINT "custom_role_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_residency_config" ADD CONSTRAINT "data_residency_config_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sso_group_mapping" ADD CONSTRAINT "sso_group_mapping_sso_config_id_fkey" FOREIGN KEY ("sso_config_id") REFERENCES "sso_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_dead_letter" ADD CONSTRAINT "webhook_dead_letter_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "api_webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_dead_letter" ADD CONSTRAINT "webhook_dead_letter_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
