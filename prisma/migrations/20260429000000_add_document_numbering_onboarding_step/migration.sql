-- AlterTable
ALTER TABLE "onboarding_progress" ADD COLUMN IF NOT EXISTS "documentNumbering" BOOLEAN NOT NULL DEFAULT false;
