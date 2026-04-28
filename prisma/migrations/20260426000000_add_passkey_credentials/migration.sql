-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "passkeyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passkeyEnabledAt" TIMESTAMP(3),
ADD COLUMN     "preferredMfaMethod" TEXT NOT NULL DEFAULT 'passkey';

-- CreateTable
CREATE TABLE "passkey_credentials" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceName" TEXT,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentials_credentialId_key" ON "passkey_credentials"("credentialId");

-- CreateIndex
CREATE INDEX "passkey_credentials_userId_idx" ON "passkey_credentials"("userId");

-- AddForeignKey
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

