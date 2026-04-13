-- Phase 18 Sprint 18.2: Notification Delivery Operations
-- Adds NotificationDelivery model for outbound delivery attempt tracking

-- Enum for delivery status lifecycle
CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'TERMINAL_FAILURE',
  'REPLAYED'
);

-- Enum for delivery channel
CREATE TYPE "NotificationDeliveryChannel" AS ENUM (
  'in_app',
  'email'
);

-- NotificationDelivery — one record per outbound attempt
CREATE TABLE "notification_delivery" (
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
CREATE INDEX "notification_delivery_orgId_status_idx"
  ON "notification_delivery"("orgId", "status");
CREATE INDEX "notification_delivery_orgId_channel_idx"
  ON "notification_delivery"("orgId", "channel");
CREATE INDEX "notification_delivery_notificationId_idx"
  ON "notification_delivery"("notificationId");
CREATE INDEX "notification_delivery_nextRetryAt_status_idx"
  ON "notification_delivery"("nextRetryAt", "status")
  WHERE "nextRetryAt" IS NOT NULL;
CREATE INDEX "notification_delivery_sourceModule_idx"
  ON "notification_delivery"("orgId", "sourceModule");

-- FK to Organization (cascade delete)
ALTER TABLE "notification_delivery"
  ADD CONSTRAINT "notification_delivery_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Self-referential FK for replay chain
ALTER TABLE "notification_delivery"
  ADD CONSTRAINT "notification_delivery_replayedFromId_fkey"
  FOREIGN KEY ("replayedFromId") REFERENCES "notification_delivery"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add email opt-in flag to Notification for delivery gate
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "emailRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientEmail"  TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sourceModule"    TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sourceRef"       TEXT;
