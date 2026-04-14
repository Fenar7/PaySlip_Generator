-- Phase 18 Sprint 1: Config Foundation
-- Adds `enabled` and `updatedAt` fields to ticket_escalation_rule

ALTER TABLE "ticket_escalation_rule" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ticket_escalation_rule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
