-- Phase 27.5: Executive Intel Hub

-- Enums
CREATE TYPE "FlashReportChannel" AS ENUM ('PUSH', 'EMAIL', 'WHATSAPP');
CREATE TYPE "FlashReportFrequency" AS ENUM ('DAILY_9AM', 'WEEKLY_MONDAY', 'MONTHLY_1ST', 'CUSTOM_CRON');
CREATE TYPE "FlashDeliveryStatus" AS ENUM ('DELIVERED', 'FAILED', 'PENDING');

-- Flash Report Schedule
CREATE TABLE "flash_report_schedule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "FlashReportChannel" NOT NULL,
    "schedule" "FlashReportFrequency" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "customCron" TEXT,
    "whatsappNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastDeliveryStatus" "FlashDeliveryStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_report_schedule_pkey" PRIMARY KEY ("id")
);

-- Flash Report Delivery
CREATE TABLE "flash_report_delivery" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "channel" "FlashReportChannel" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FlashDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flash_report_delivery_pkey" PRIMARY KEY ("id")
);

-- Executive KPI Cache
CREATE TABLE "executive_kpi_cache" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executive_kpi_cache_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "flash_report_schedule_orgId_userId_channel_key" ON "flash_report_schedule"("orgId", "userId", "channel");
CREATE INDEX "flash_report_schedule_isActive_schedule_idx" ON "flash_report_schedule"("isActive", "schedule");

CREATE UNIQUE INDEX "flash_report_delivery_idempotencyKey_key" ON "flash_report_delivery"("idempotencyKey");
CREATE INDEX "flash_report_delivery_orgId_createdAt_idx" ON "flash_report_delivery"("orgId", "createdAt" DESC);
CREATE INDEX "flash_report_delivery_status_retryCount_idx" ON "flash_report_delivery"("status", "retryCount");

CREATE UNIQUE INDEX "executive_kpi_cache_orgId_period_key" ON "executive_kpi_cache"("orgId", "period");

-- Foreign keys
ALTER TABLE "flash_report_schedule" ADD CONSTRAINT "flash_report_schedule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "flash_report_schedule" ADD CONSTRAINT "flash_report_schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flash_report_delivery" ADD CONSTRAINT "flash_report_delivery_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "flash_report_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "executive_kpi_cache" ADD CONSTRAINT "executive_kpi_cache_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
