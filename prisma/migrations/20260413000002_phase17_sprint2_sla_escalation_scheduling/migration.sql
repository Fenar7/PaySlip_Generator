-- Phase 17 Sprint 2: SLA, Escalation, and Scheduling Orchestration

CREATE TYPE "ScheduledActionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED');

-- TicketSlaPolicy
CREATE TABLE "ticket_sla_policy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT,
    "firstResponseTargetMins" INTEGER NOT NULL,
    "resolutionTargetMins" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ticket_sla_policy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ticket_sla_policy_orgId_isDefault_idx" ON "ticket_sla_policy"("orgId", "isDefault");
ALTER TABLE "ticket_sla_policy" ADD CONSTRAINT "ticket_sla_policy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TicketEscalationRule
CREATE TABLE "ticket_escalation_rule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breachType" TEXT NOT NULL,
    "afterMins" INTEGER NOT NULL,
    "targetRole" TEXT,
    "targetUserId" UUID,
    "notifyOrgAdmins" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_escalation_rule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ticket_escalation_rule_orgId_breachType_idx" ON "ticket_escalation_rule"("orgId", "breachType");
ALTER TABLE "ticket_escalation_rule" ADD CONSTRAINT "ticket_escalation_rule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ScheduledAction
CREATE TABLE "scheduled_action" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "workflowRunId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "ScheduledActionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "scheduled_action_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scheduled_action_orgId_status_scheduledAt_idx" ON "scheduled_action"("orgId", "status", "scheduledAt");
CREATE INDEX "scheduled_action_nextRetryAt_status_idx" ON "scheduled_action"("nextRetryAt", "status");
ALTER TABLE "scheduled_action" ADD CONSTRAINT "scheduled_action_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DeadLetterAction
CREATE TABLE "dead_letter_action" (
    "id" TEXT NOT NULL,
    "scheduledActionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "failureReason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deadLetteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    CONSTRAINT "dead_letter_action_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dead_letter_action_scheduledActionId_key" UNIQUE ("scheduledActionId")
);
CREATE INDEX "dead_letter_action_orgId_deadLetteredAt_idx" ON "dead_letter_action"("orgId", "deadLetteredAt");
ALTER TABLE "dead_letter_action" ADD CONSTRAINT "dead_letter_action_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend JobLog
ALTER TABLE "job_logs" ADD COLUMN IF NOT EXISTS "workflowRunId" TEXT;
ALTER TABLE "job_logs" ADD COLUMN IF NOT EXISTS "scheduledActionId" TEXT;
ALTER TABLE "job_logs" ADD COLUMN IF NOT EXISTS "terminalState" TEXT;
