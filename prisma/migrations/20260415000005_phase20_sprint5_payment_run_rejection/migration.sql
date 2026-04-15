-- Phase 20 Sprint 20.5 — Payment Run Rejection Lifecycle
-- Adds REJECTED status and rejection tracking fields to the payment_run table.
-- Safe to re-run: ADD VALUE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS

-- Add REJECTED to the PaymentRunStatus enum
ALTER TYPE "PaymentRunStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Add rejection tracking columns
ALTER TABLE "payment_run"
  ADD COLUMN IF NOT EXISTS "rejectedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "rejectionReason"  TEXT;
