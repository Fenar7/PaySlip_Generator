-- Phase 18 Sprint 18.2: Notification Delivery Operations
-- Adds NotificationDelivery model for outbound delivery attempt tracking

-- Enum for delivery status lifecycle
DO $$ BEGIN
  CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
    'QUEUED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'TERMINAL_FAILURE',
    'REPLAYED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enum for delivery channel
DO $$ BEGIN
  CREATE TYPE "NotificationDeliveryChannel" AS ENUM (
    'in_app',
    'email'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- NotificationDelivery — one record per outbound attempt
CREATE TABLE IF NOT EXISTS "notification_delivery" (
  "id"              TEXT NOT NULL,
  "notificationId"  TEXT NOT NULL,
  "orgId"           TEXT NOT NULL,
  "channel"         "NotificationDeliveryChannel" NOT NULL,
  "recipientTarget" TEXT NOT NULL,
  "status"          "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount"    INTEGER NOT NULL DEFAULT 0,
  "maxAttempts"     INTEGER NOT NULL DEFAULT 3,
  "provider"        TEXT,
  "providerRef"     TEXT,
  "sourceModule"    TEXT,
  "sourceRef"       TEXT,
  "workflowRunId"   TEXT,
  "scheduledActionId" TEXT,
  "queuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"          TIMESTAMP(3),
  "deliveredAt"     TIMESTAMP(3),
  "failedAt"        TIMESTAMP(3),
  "nextRetryAt"     TIMESTAMP(3),
  "failureReason"   TEXT,
  "replayedFromId"  TEXT,
  "replayedAt"      TIMESTAMP(3),
  "replayedBy"      UUID,
  CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id")
);

-- Indexes for operator console queries
CREATE INDEX IF NOT EXISTS "notification_delivery_orgId_status_idx"
  ON "notification_delivery"("orgId", "status");
CREATE INDEX IF NOT EXISTS "notification_delivery_orgId_channel_idx"
  ON "notification_delivery"("orgId", "channel");
CREATE INDEX IF NOT EXISTS "notification_delivery_notificationId_idx"
  ON "notification_delivery"("notificationId");
CREATE INDEX IF NOT EXISTS "notification_delivery_nextRetryAt_status_idx"
  ON "notification_delivery"("nextRetryAt", "status")
  WHERE "nextRetryAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "notification_delivery_sourceModule_idx"
  ON "notification_delivery"("orgId", "sourceModule");

-- FK to Organization (cascade delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_delivery_orgId_fkey'
  ) THEN
    ALTER TABLE "notification_delivery"
      ADD CONSTRAINT "notification_delivery_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_delivery_notificationId_fkey'
  ) THEN
    ALTER TABLE "notification_delivery"
      ADD CONSTRAINT "notification_delivery_notificationId_fkey"
      FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Self-referential FK for replay chain
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_delivery_replayedFromId_fkey'
  ) THEN
    ALTER TABLE "notification_delivery"
      ADD CONSTRAINT "notification_delivery_replayedFromId_fkey"
      FOREIGN KEY ("replayedFromId") REFERENCES "notification_delivery"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add email opt-in flag to Notification for delivery gate
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "emailRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "recipientEmail"  TEXT;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "sourceModule"    TEXT;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "sourceRef"       TEXT;
