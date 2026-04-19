-- Phase 28 Sprint 28.1: Unified Billing & Subscription OS
-- Add Stripe support to Subscription model + new billing infrastructure tables

-- Add Stripe fields to subscription
ALTER TABLE "subscription" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "subscription" ADD COLUMN "stripeSubId" TEXT;
CREATE UNIQUE INDEX "subscription_stripeCustomerId_key" ON "subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "subscription_stripeSubId_key" ON "subscription"("stripeSubId");

-- Create billing_account table
CREATE TYPE "BillingGateway" AS ENUM ('STRIPE', 'RAZORPAY');
CREATE TYPE "BillingAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

CREATE TABLE "billing_account" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "gateway" "BillingGateway" NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "billingCountry" TEXT NOT NULL DEFAULT 'IN',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stripeCustomerId" TEXT,
    "razorpayCustomerId" TEXT,
    "status" "BillingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_account_orgId_key" ON "billing_account"("orgId");
CREATE UNIQUE INDEX "billing_account_stripeCustomerId_key" ON "billing_account"("stripeCustomerId");
CREATE UNIQUE INDEX "billing_account_razorpayCustomerId_key" ON "billing_account"("razorpayCustomerId");
CREATE INDEX "billing_account_gateway_status_idx" ON "billing_account"("gateway", "status");

-- Create billing_event table
CREATE TYPE "BillingEventType" AS ENUM (
    'CHECKOUT_INITIATED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_ACTIVATED',
    'PAYMENT_SUCCEEDED',
    'PAYMENT_FAILED',
    'SUBSCRIPTION_PAUSED',
    'SUBSCRIPTION_RESUMED',
    'SUBSCRIPTION_CANCELED',
    'INVOICE_GENERATED',
    'OVERAGE_CHARGED',
    'DUNNING_ATTEMPT',
    'REFUND_ISSUED'
);

CREATE TABLE "billing_event" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "gatewayEventId" TEXT,
    "amount" BIGINT,
    "currency" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_event_gatewayEventId_key" ON "billing_event"("gatewayEventId");
CREATE INDEX "billing_event_billingAccountId_createdAt_idx" ON "billing_event"("billingAccountId", "createdAt" DESC);
CREATE INDEX "billing_event_type_idx" ON "billing_event"("type");

-- Create overage_line table
CREATE TABLE "overage_line" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "includedUnits" INTEGER NOT NULL,
    "usedUnits" INTEGER NOT NULL,
    "overageUnits" INTEGER NOT NULL,
    "overageRate" BIGINT NOT NULL,
    "overageAmount" BIGINT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overage_line_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "overage_line_billingAccountId_resource_periodMonth_key" ON "overage_line"("billingAccountId", "resource", "periodMonth");
CREATE INDEX "overage_line_billingAccountId_periodMonth_idx" ON "overage_line"("billingAccountId", "periodMonth");

-- Create billing_dunning_attempt table
CREATE TABLE "billing_dunning_attempt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_dunning_attempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_dunning_attempt_orgId_subscriptionId_idx" ON "billing_dunning_attempt"("orgId", "subscriptionId");
CREATE INDEX "billing_dunning_attempt_status_scheduledAt_idx" ON "billing_dunning_attempt"("status", "scheduledAt");

-- Add foreign keys
ALTER TABLE "billing_account" ADD CONSTRAINT "billing_account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_event" ADD CONSTRAINT "billing_event_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overage_line" ADD CONSTRAINT "overage_line_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_dunning_attempt" ADD CONSTRAINT "billing_dunning_attempt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_dunning_attempt" ADD CONSTRAINT "billing_dunning_attempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
