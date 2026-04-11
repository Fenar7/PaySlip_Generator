-- Phase 15.2: i18n + Multi-currency schema changes

-- OrgDefaults: i18n + Country fields
ALTER TABLE "org_defaults" ADD COLUMN "defaultLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "org_defaults" ADD COLUMN "defaultDocLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "org_defaults" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE "org_defaults" ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "org_defaults" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "org_defaults" ADD COLUMN "vatRegNumber" TEXT;
ALTER TABLE "org_defaults" ADD COLUMN "vatRate" DECIMAL(5, 2);
ALTER TABLE "org_defaults" ADD COLUMN "fiscalYearStart" INTEGER NOT NULL DEFAULT 4;

-- Customer: preferred language
ALTER TABLE "customer" ADD COLUMN "preferredLanguage" TEXT;

-- Invoice: Multi-currency + i18n fields
ALTER TABLE "invoice" ADD COLUMN "displayCurrency" TEXT;
ALTER TABLE "invoice" ADD COLUMN "exchangeRate" DOUBLE PRECISION;
ALTER TABLE "invoice" ADD COLUMN "displayTotalAmount" DOUBLE PRECISION;
ALTER TABLE "invoice" ADD COLUMN "exchangeRateDate" TIMESTAMP(3);
ALTER TABLE "invoice" ADD COLUMN "documentLanguage" TEXT NOT NULL DEFAULT 'en';

-- Voucher: document language
ALTER TABLE "voucher" ADD COLUMN "documentLanguage" TEXT NOT NULL DEFAULT 'en';

-- SalarySlip: document language
ALTER TABLE "salary_slip" ADD COLUMN "documentLanguage" TEXT NOT NULL DEFAULT 'en';

-- Quote: document language
ALTER TABLE "quote" ADD COLUMN "documentLanguage" TEXT NOT NULL DEFAULT 'en';

-- ExchangeRate table
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- ExchangeRate unique constraint and index
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_fetchedAt_key" ON "exchange_rates"("fromCurrency", "toCurrency", "fetchedAt");
CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON "exchange_rates"("fromCurrency", "toCurrency");
