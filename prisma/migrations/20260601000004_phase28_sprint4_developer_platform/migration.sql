-- Phase 28 Sprint 28.4: Platform V2 & Developer Hub
-- Adds: WebhookDeadLetter, ApiKey rate limit fields

-- Add rate limit and API version fields to api_key
ALTER TABLE "api_key" ADD COLUMN IF NOT EXISTS "apiVersion" TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE "api_key" ADD COLUMN IF NOT EXISTS "rateLimitTier" TEXT NOT NULL DEFAULT 'free';

-- Create webhook_dead_letter table
CREATE TABLE IF NOT EXISTS "webhook_dead_letter" (
  "id" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lastAttemptAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "lastError" TEXT,
  "lastStatus" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "webhook_dead_letter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "webhook_dead_letter_orgId_status_idx"
  ON "webhook_dead_letter"("orgId", "status");

CREATE INDEX IF NOT EXISTS "webhook_dead_letter_status_nextRetryAt_idx"
  ON "webhook_dead_letter"("status", "nextRetryAt");

ALTER TABLE "webhook_dead_letter" DROP CONSTRAINT IF EXISTS "webhook_dead_letter_endpointId_fkey";
ALTER TABLE "webhook_dead_letter" ADD CONSTRAINT "webhook_dead_letter_endpointId_fkey"
  FOREIGN KEY ("endpointId") REFERENCES "api_webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webhook_dead_letter" DROP CONSTRAINT IF EXISTS "webhook_dead_letter_orgId_fkey";
ALTER TABLE "webhook_dead_letter" ADD CONSTRAINT "webhook_dead_letter_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
