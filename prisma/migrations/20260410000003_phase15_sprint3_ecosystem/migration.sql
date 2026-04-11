-- Sprint 15.3: Ecosystem (Marketplace, OAuth, Webhook v2, Partner)

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "MarketplaceTemplateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "PartnerType" AS ENUM ('ACCOUNTANT', 'TECHNOLOGY', 'RESELLER');
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- ─── Marketplace Tables ─────────────────────────────────────────────────────

CREATE TABLE "marketplace_templates" (
    "id" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previewImageUrl" TEXT NOT NULL,
    "previewPdfUrl" TEXT,
    "category" TEXT[],
    "tags" TEXT[],
    "price" DECIMAL(8,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "publisherOrgId" TEXT,
    "publisherName" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" "MarketplaceTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "templateData" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_purchases" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "razorpayPaymentId" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_revenue" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "publisherOrgId" TEXT NOT NULL,
    "totalAmount" DECIMAL(8,2) NOT NULL,
    "publisherShare" DECIMAL(8,2) NOT NULL,
    "platformShare" DECIMAL(8,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYOUT',
    "paidOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_revenue_pkey" PRIMARY KEY ("id")
);

-- ─── OAuth Tables ───────────────────────────────────────────────────────────

CREATE TABLE "oauth_apps" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "logoUrl" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "scopes" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_apps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oauth_authorizations" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "grantedBy" UUID NOT NULL,
    "scopes" TEXT[],
    "authCode" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- ─── Partner Tables ─────────────────────────────────────────────────────────

CREATE TABLE "partner_profiles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "partnerCode" TEXT NOT NULL,
    "revenueShare" DECIMAL(5,2) NOT NULL,
    "managedOrgCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_managed_orgs" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_managed_orgs_pkey" PRIMARY KEY ("id")
);

-- ─── Webhook v2 Enhancements ────────────────────────────────────────────────

ALTER TABLE "api_webhook_endpoint" ADD COLUMN "apiVersion" TEXT NOT NULL DEFAULT 'v2';
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "signingSecret" TEXT;
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "retryBackoff" TEXT NOT NULL DEFAULT 'exponential';
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "consecutiveFails" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "autoDisableAt" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "lastDeliveryAt" TIMESTAMP(3);
ALTER TABLE "api_webhook_endpoint" ADD COLUMN "lastSuccessAt" TIMESTAMP(3);

ALTER TABLE "api_webhook_delivery" ADD COLUMN "nextRetryAt" TIMESTAMP(3);
ALTER TABLE "api_webhook_delivery" ADD COLUMN "requestBody" JSONB;
ALTER TABLE "api_webhook_delivery" ALTER COLUMN "responseBody" SET DATA TYPE TEXT;
ALTER TABLE "api_webhook_delivery" ALTER COLUMN "deliveredAt" DROP NOT NULL;
ALTER TABLE "api_webhook_delivery" ALTER COLUMN "deliveredAt" DROP DEFAULT;

-- ─── Unique Indexes ─────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "marketplace_purchases_orgId_templateId_key" ON "marketplace_purchases"("orgId", "templateId");
CREATE UNIQUE INDEX "marketplace_reviews_orgId_templateId_key" ON "marketplace_reviews"("orgId", "templateId");
CREATE UNIQUE INDEX "marketplace_revenue_purchaseId_key" ON "marketplace_revenue"("purchaseId");
CREATE UNIQUE INDEX "oauth_apps_clientId_key" ON "oauth_apps"("clientId");
CREATE UNIQUE INDEX "oauth_authorizations_authCode_key" ON "oauth_authorizations"("authCode");
CREATE UNIQUE INDEX "oauth_authorizations_accessToken_key" ON "oauth_authorizations"("accessToken");
CREATE UNIQUE INDEX "oauth_authorizations_refreshToken_key" ON "oauth_authorizations"("refreshToken");
CREATE UNIQUE INDEX "partner_profiles_orgId_key" ON "partner_profiles"("orgId");
CREATE UNIQUE INDEX "partner_profiles_partnerCode_key" ON "partner_profiles"("partnerCode");
CREATE UNIQUE INDEX "partner_managed_orgs_partnerId_orgId_key" ON "partner_managed_orgs"("partnerId", "orgId");

-- ─── Foreign Keys ───────────────────────────────────────────────────────────

ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketplace_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketplace_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "marketplace_revenue" ADD CONSTRAINT "marketplace_revenue_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "marketplace_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_revenue" ADD CONSTRAINT "marketplace_revenue_publisherOrgId_fkey" FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "oauth_apps" ADD CONSTRAINT "oauth_apps_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_appId_fkey" FOREIGN KEY ("appId") REFERENCES "oauth_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_managed_orgs" ADD CONSTRAINT "partner_managed_orgs_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_managed_orgs" ADD CONSTRAINT "partner_managed_orgs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
