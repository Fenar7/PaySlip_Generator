ALTER TABLE "marketplace_revenue"
  ADD COLUMN IF NOT EXISTS "eligibleAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lastEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onHoldReason" TEXT,
  ADD COLUMN IF NOT EXISTS "queuedAt" TIMESTAMP(3);

ALTER TABLE "marketplace_revenue"
  ALTER COLUMN "status" SET DEFAULT 'pending';

UPDATE "marketplace_revenue"
SET "status" = 'pending'
WHERE "status" = 'PENDING_PAYOUT';

CREATE TABLE IF NOT EXISTS "marketplace_payout_beneficiary" (
  "id" TEXT NOT NULL,
  "publisherOrgId" TEXT NOT NULL,
  "accountHolderName" TEXT NOT NULL,
  "payoutMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
  "bankAccountCiphertext" TEXT,
  "bankAccountLast4" TEXT,
  "bankAccountFingerprint" TEXT,
  "ifscCiphertext" TEXT,
  "upiIdCiphertext" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending_verification',
  "providerName" TEXT,
  "providerBeneficiaryId" TEXT,
  "verificationReference" TEXT,
  "verificationNotes" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_payout_beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marketplace_payout_run" (
  "id" TEXT NOT NULL,
  "runNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "providerName" TEXT NOT NULL DEFAULT 'manual',
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "manualReviewCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "requestedByUserId" UUID,
  "approvedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "executedByUserId" UUID,
  "executedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_payout_run_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marketplace_payout_item" (
  "id" TEXT NOT NULL,
  "payoutRunId" TEXT NOT NULL,
  "revenueId" TEXT NOT NULL,
  "publisherOrgId" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "providerReferenceId" TEXT,
  "externalReferenceId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "manualReviewReason" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_payout_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marketplace_payout_attempt" (
  "id" TEXT NOT NULL,
  "payoutRunId" TEXT NOT NULL,
  "payoutItemId" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "idempotencyKey" TEXT NOT NULL,
  "providerRequestId" TEXT,
  "providerReferenceId" TEXT,
  "requestPayload" JSONB NOT NULL,
  "responsePayload" JSONB,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "retryable" BOOLEAN NOT NULL DEFAULT true,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketplace_payout_attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marketplace_payout_event" (
  "id" TEXT NOT NULL,
  "publisherOrgId" TEXT,
  "payoutRunId" TEXT,
  "payoutItemId" TEXT,
  "payoutAttemptId" TEXT,
  "revenueId" TEXT,
  "beneficiaryId" TEXT,
  "actorId" UUID,
  "actorType" TEXT NOT NULL DEFAULT 'user',
  "eventType" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketplace_payout_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_payout_beneficiary_publisherOrgId_key"
  ON "marketplace_payout_beneficiary"("publisherOrgId");

CREATE INDEX IF NOT EXISTS "marketplace_payout_beneficiary_status_updatedAt_idx"
  ON "marketplace_payout_beneficiary"("status", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_payout_run_runNumber_key"
  ON "marketplace_payout_run"("runNumber");

CREATE INDEX IF NOT EXISTS "marketplace_payout_run_status_createdAt_idx"
  ON "marketplace_payout_run"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "marketplace_payout_item_publisherOrgId_status_idx"
  ON "marketplace_payout_item"("publisherOrgId", "status");

CREATE INDEX IF NOT EXISTS "marketplace_payout_item_status_createdAt_idx"
  ON "marketplace_payout_item"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_payout_item_revenueId_key"
  ON "marketplace_payout_item"("revenueId");

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_payout_item_payoutRunId_revenueId_key"
  ON "marketplace_payout_item"("payoutRunId", "revenueId");

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_payout_attempt_idempotencyKey_key"
  ON "marketplace_payout_attempt"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "marketplace_payout_attempt_payoutItemId_createdAt_idx"
  ON "marketplace_payout_attempt"("payoutItemId", "createdAt");

CREATE INDEX IF NOT EXISTS "marketplace_payout_attempt_status_createdAt_idx"
  ON "marketplace_payout_attempt"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "marketplace_payout_event_publisherOrgId_createdAt_idx"
  ON "marketplace_payout_event"("publisherOrgId", "createdAt");

CREATE INDEX IF NOT EXISTS "marketplace_payout_event_eventType_createdAt_idx"
  ON "marketplace_payout_event"("eventType", "createdAt");

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_beneficiary"
    ADD CONSTRAINT "marketplace_payout_beneficiary_publisherOrgId_fkey"
    FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_item"
    ADD CONSTRAINT "marketplace_payout_item_payoutRunId_fkey"
    FOREIGN KEY ("payoutRunId") REFERENCES "marketplace_payout_run"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_item"
    ADD CONSTRAINT "marketplace_payout_item_revenueId_fkey"
    FOREIGN KEY ("revenueId") REFERENCES "marketplace_revenue"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_item"
    ADD CONSTRAINT "marketplace_payout_item_publisherOrgId_fkey"
    FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_item"
    ADD CONSTRAINT "marketplace_payout_item_beneficiaryId_fkey"
    FOREIGN KEY ("beneficiaryId") REFERENCES "marketplace_payout_beneficiary"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_attempt"
    ADD CONSTRAINT "marketplace_payout_attempt_payoutRunId_fkey"
    FOREIGN KEY ("payoutRunId") REFERENCES "marketplace_payout_run"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_attempt"
    ADD CONSTRAINT "marketplace_payout_attempt_payoutItemId_fkey"
    FOREIGN KEY ("payoutItemId") REFERENCES "marketplace_payout_item"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_event"
    ADD CONSTRAINT "marketplace_payout_event_publisherOrgId_fkey"
    FOREIGN KEY ("publisherOrgId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_event"
    ADD CONSTRAINT "marketplace_payout_event_payoutRunId_fkey"
    FOREIGN KEY ("payoutRunId") REFERENCES "marketplace_payout_run"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_event"
    ADD CONSTRAINT "marketplace_payout_event_payoutItemId_fkey"
    FOREIGN KEY ("payoutItemId") REFERENCES "marketplace_payout_item"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_event"
    ADD CONSTRAINT "marketplace_payout_event_payoutAttemptId_fkey"
    FOREIGN KEY ("payoutAttemptId") REFERENCES "marketplace_payout_attempt"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_event"
    ADD CONSTRAINT "marketplace_payout_event_revenueId_fkey"
    FOREIGN KEY ("revenueId") REFERENCES "marketplace_revenue"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "marketplace_payout_event"
    ADD CONSTRAINT "marketplace_payout_event_beneficiaryId_fkey"
    FOREIGN KEY ("beneficiaryId") REFERENCES "marketplace_payout_beneficiary"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
