-- Phase 15 production remediation: schema/config parity
-- Align Sprint 15.3 marketplace tables with the current Prisma schema.

ALTER TABLE "marketplace_purchases"
  ADD COLUMN IF NOT EXISTS "userId" UUID,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;

ALTER TABLE "marketplace_reviews"
  ADD COLUMN IF NOT EXISTS "userId" UUID;
