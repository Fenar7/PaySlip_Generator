-- Phase 22 Audit Remediation: Add RecipientVerification model
-- Sprint 22.3 requires email-token verification for shared documents that set requiresVerification = true.

-- CreateEnum
CREATE TYPE "recipient_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "recipient_verification" (
    "id" TEXT NOT NULL,
    "sharedDocumentId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "recipient_verification_status" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipient_verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipient_verification_tokenHash_key" ON "recipient_verification"("tokenHash");

-- CreateIndex
CREATE INDEX "recipient_verification_sharedDocumentId_recipientEmail_idx" ON "recipient_verification"("sharedDocumentId", "recipientEmail");

-- CreateIndex
CREATE INDEX "recipient_verification_tokenHash_idx" ON "recipient_verification"("tokenHash");

-- AddForeignKey
ALTER TABLE "recipient_verification" ADD CONSTRAINT "recipient_verification_sharedDocumentId_fkey" FOREIGN KEY ("sharedDocumentId") REFERENCES "shared_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
