-- Phase 24 Sprint 24.5: Add TOTP 2FA fields to Profile and high-value payment gate to OrgDefaults

-- Profile: TOTP 2FA fields
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "totpEnabledAt" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "recoveryCodes" JSONB;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "twoFaEnforcedByOrg" BOOLEAN NOT NULL DEFAULT false;

-- OrgDefaults: High-value payment approval gate
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "highValuePaymentThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100000;
ALTER TABLE "org_defaults" ADD COLUMN IF NOT EXISTS "requireDualApprovalPayment" BOOLEAN NOT NULL DEFAULT false;
