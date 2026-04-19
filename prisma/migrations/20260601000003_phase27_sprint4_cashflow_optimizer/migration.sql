-- Phase 27 Sprint 27.4: Cash-Flow Optimizer

CREATE TABLE "payment_optimization_run" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "currentBalance" DECIMAL(15,2) NOT NULL,
    "projectedInflows30d" DECIMAL(15,2) NOT NULL,
    "liquidityTarget" DECIMAL(15,2) NOT NULL,
    "totalDiscountCapturable" DECIMAL(15,2) NOT NULL,
    "totalDiscountRecommended" DECIMAL(15,2) NOT NULL,
    "discountCaptureRate" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_optimization_run_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_optimization_run_orgId_generatedAt_idx" ON "payment_optimization_run"("orgId", "generatedAt" DESC);
ALTER TABLE "payment_optimization_run" ADD CONSTRAINT "payment_optimization_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cashflow_alert_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "liquidityTargetPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "forecastDeviationPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "largeOutflowPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "discountExpiryHours" INTEGER NOT NULL DEFAULT 48,
    "dsoSpikePct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "collectionStallDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashflow_alert_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cashflow_alert_config_orgId_key" ON "cashflow_alert_config"("orgId");
ALTER TABLE "cashflow_alert_config" ADD CONSTRAINT "cashflow_alert_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
