-- Phase 17 Sprint 1: Flow Foundation, Approval Policies, Ticket Enhancements

-- Enums
CREATE TYPE "ApprovalPolicyStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ApprovalStepMode" AS ENUM ('SINGLE', 'SEQUENTIAL');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "TicketSeverity" AS ENUM ('INFORMATIONAL', 'BLOCKING', 'FINANCE_CRITICAL', 'CUSTOMER_ESCALATED');

-- ApprovalPolicy
CREATE TABLE "approval_policy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "ApprovalPolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "stepMode" "ApprovalStepMode" NOT NULL DEFAULT 'SINGLE',
    "escalateAfterMins" INTEGER,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_policy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approval_policy_orgId_module_status_idx" ON "approval_policy"("orgId", "module", "status");
ALTER TABLE "approval_policy" ADD CONSTRAINT "approval_policy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ApprovalPolicyRule
CREATE TABLE "approval_policy_rule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "minAmount" DECIMAL(14,2),
    "maxAmount" DECIMAL(14,2),
    "approverRole" TEXT,
    "approverUserId" UUID,
    "fallbackRole" TEXT,
    "fallbackUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_policy_rule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approval_policy_rule_policyId_sequence_idx" ON "approval_policy_rule"("policyId", "sequence");

-- Extend InvoiceTicket
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "severity" "TicketSeverity" NOT NULL DEFAULT 'INFORMATIONAL';
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "firstResponseDueAt" TIMESTAMP(3);
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "resolutionDueAt" TIMESTAMP(3);
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "firstRespondedAt" TIMESTAMP(3);
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "breachedAt" TIMESTAMP(3);
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "breachType" TEXT;
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "escalationLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "sourceModule" TEXT;
ALTER TABLE "invoice_tickets" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;

-- Extend ApprovalRequest
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "policyId" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "policyRuleId" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3);
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "escalationLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- Extend Notification
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sourceModule" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sourceRef" TEXT;
