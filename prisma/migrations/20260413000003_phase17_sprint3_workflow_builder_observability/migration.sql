-- Phase 17 Sprint 3: Workflow Builder, Run History, Observability

DO $$ BEGIN
    CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- WorkflowDefinition
CREATE TABLE IF NOT EXISTS "workflow_definition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workflow_definition_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "workflow_definition" ADD COLUMN IF NOT EXISTS "description" TEXT;
CREATE INDEX IF NOT EXISTS "workflow_definition_orgId_status_idx" ON "workflow_definition"("orgId", "status");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workflow_definition_orgId_fkey'
    ) THEN
        ALTER TABLE "workflow_definition"
            ADD CONSTRAINT "workflow_definition_orgId_fkey"
            FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- WorkflowStep
CREATE TABLE IF NOT EXISTS "workflow_step" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_step_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "workflow_step_workflowId_sequence_idx" ON "workflow_step"("workflowId", "sequence");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workflow_step_workflowId_fkey'
    ) THEN
        ALTER TABLE "workflow_step"
            ADD CONSTRAINT "workflow_step_workflowId_fkey"
            FOREIGN KEY ("workflowId") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- WorkflowRun
CREATE TABLE IF NOT EXISTS "workflow_run" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "actorId" UUID,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "workflow_run_orgId_status_startedAt_idx" ON "workflow_run"("orgId", "status", "startedAt");
CREATE INDEX IF NOT EXISTS "workflow_run_sourceModule_sourceEntityId_idx" ON "workflow_run"("sourceModule", "sourceEntityId");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workflow_run_orgId_fkey'
    ) THEN
        ALTER TABLE "workflow_run"
            ADD CONSTRAINT "workflow_run_orgId_fkey"
            FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workflow_run_workflowId_fkey'
    ) THEN
        ALTER TABLE "workflow_run"
            ADD CONSTRAINT "workflow_run_workflowId_fkey"
            FOREIGN KEY ("workflowId") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- WorkflowStepRun
CREATE TABLE IF NOT EXISTS "workflow_step_run" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "workflowStepId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "outputPayload" JSONB,
    CONSTRAINT "workflow_step_run_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "workflow_step_run" ADD COLUMN IF NOT EXISTS "outputPayload" JSONB;
CREATE INDEX IF NOT EXISTS "workflow_step_run_workflowRunId_status_idx" ON "workflow_step_run"("workflowRunId", "status");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workflow_step_run_workflowRunId_fkey'
    ) THEN
        ALTER TABLE "workflow_step_run"
            ADD CONSTRAINT "workflow_step_run_workflowRunId_fkey"
            FOREIGN KEY ("workflowRunId") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workflow_step_run_workflowStepId_fkey'
    ) THEN
        ALTER TABLE "workflow_step_run"
            ADD CONSTRAINT "workflow_step_run_workflowStepId_fkey"
            FOREIGN KEY ("workflowStepId") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
