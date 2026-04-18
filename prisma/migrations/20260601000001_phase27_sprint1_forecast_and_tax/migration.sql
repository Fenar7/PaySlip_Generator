-- Phase 27 Sprint 27.1: AI Financial Forecaster & Global Tax Engine

-- Enums
DO $$ BEGIN
  CREATE TYPE "ForecastTrigger" AS ENUM ('SCHEDULED', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaxRegion" AS ENUM ('IN_GST', 'UK_VAT', 'EU_VAT', 'US_SALES', 'AU_GST', 'NZ_GST', 'SG_GST', 'EXEMPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaxFilingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend IntelInsightCategory
ALTER TYPE "IntelInsightCategory" ADD VALUE IF NOT EXISTS 'SPENDING_ANOMALY';
ALTER TYPE "IntelInsightCategory" ADD VALUE IF NOT EXISTS 'FORECAST_DEVIATION';
ALTER TYPE "IntelInsightCategory" ADD VALUE IF NOT EXISTS 'TAX_LIABILITY';

-- Organization: add primaryTaxRegion
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "primary_tax_region" "TaxRegion";

-- ForecastSnapshot table
CREATE TABLE IF NOT EXISTS "forecast_snapshot" (
  "id"             TEXT NOT NULL,
  "orgId"          TEXT NOT NULL,
  "generatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "baseCurrency"   TEXT NOT NULL DEFAULT 'INR',
  "smoothingAlpha" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "historicalData" JSONB NOT NULL,
  "projections"    JSONB NOT NULL,
  "revenueRunRate" JSONB NOT NULL,
  "anomalies"      JSONB,
  "actualValues"   JSONB,
  "triggerType"    "ForecastTrigger" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forecast_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "forecast_snapshot_orgId_generatedAt_idx"
  ON "forecast_snapshot" ("orgId", "generatedAt" DESC);

ALTER TABLE "forecast_snapshot"
  DROP CONSTRAINT IF EXISTS "forecast_snapshot_orgId_fkey";
ALTER TABLE "forecast_snapshot"
  ADD CONSTRAINT "forecast_snapshot_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TaxConfig table
CREATE TABLE IF NOT EXISTS "tax_config" (
  "id"                 TEXT NOT NULL,
  "orgId"              TEXT NOT NULL,
  "region"             "TaxRegion" NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "registrationName"   TEXT,
  "isDefault"          BOOLEAN NOT NULL DEFAULT false,
  "config"             JSONB NOT NULL,
  "thresholdAmount"    DECIMAL(15,2),
  "filingFrequency"    "TaxFilingFrequency" NOT NULL DEFAULT 'MONTHLY',
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_config_orgId_region_registrationNumber_key"
  ON "tax_config" ("orgId", "region", "registrationNumber");

CREATE INDEX IF NOT EXISTS "tax_config_orgId_isActive_idx"
  ON "tax_config" ("orgId", "isActive");

ALTER TABLE "tax_config"
  DROP CONSTRAINT IF EXISTS "tax_config_orgId_fkey";
ALTER TABLE "tax_config"
  ADD CONSTRAINT "tax_config_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TaxLiabilityEstimate table
CREATE TABLE IF NOT EXISTS "tax_liability_estimate" (
  "id"             TEXT NOT NULL,
  "orgId"          TEXT NOT NULL,
  "taxConfigId"    TEXT NOT NULL,
  "periodStart"    TIMESTAMP(3) NOT NULL,
  "periodEnd"      TIMESTAMP(3) NOT NULL,
  "outputTax"      JSONB NOT NULL,
  "outputTaxTotal" DECIMAL(15,2) NOT NULL,
  "inputTax"       JSONB NOT NULL,
  "inputTaxTotal"  DECIMAL(15,2) NOT NULL,
  "netLiability"   DECIMAL(15,2) NOT NULL,
  "currency"       TEXT NOT NULL DEFAULT 'INR',
  "generatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tax_liability_estimate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tax_liability_estimate_orgId_periodStart_periodEnd_idx"
  ON "tax_liability_estimate" ("orgId", "periodStart", "periodEnd");

CREATE INDEX IF NOT EXISTS "tax_liability_estimate_taxConfigId_idx"
  ON "tax_liability_estimate" ("taxConfigId");

ALTER TABLE "tax_liability_estimate"
  DROP CONSTRAINT IF EXISTS "tax_liability_estimate_orgId_fkey";
ALTER TABLE "tax_liability_estimate"
  ADD CONSTRAINT "tax_liability_estimate_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tax_liability_estimate"
  DROP CONSTRAINT IF EXISTS "tax_liability_estimate_taxConfigId_fkey";
ALTER TABLE "tax_liability_estimate"
  ADD CONSTRAINT "tax_liability_estimate_taxConfigId_fkey"
  FOREIGN KEY ("taxConfigId") REFERENCES "tax_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
