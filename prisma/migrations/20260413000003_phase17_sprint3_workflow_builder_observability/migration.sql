-- Phase 17 Sprint 3: Workflow Builder, Run History, Observability

CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED');

-- WorkflowDefinition
CREATE TABLE "workflow_definition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workflow_definition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_definition_orgId_status_idx" ON "workflow_definition"("orgId", "status");
ALTER TABLE "workflow_definition" ADD CONSTRAINT "workflow_definition_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkflowStep
CREATE TABLE "workflow_step" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_step_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_step_workflowId_sequence_idx" ON "workflow_step"("workflowId", "sequence");
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkflowRun
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "actorId" UUID,
    "representedId" UUID,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_run_orgId_status_startedAt_idx" ON "workflow_run"("orgId", "status", "startedAt");
CREATE INDEX "workflow_run_sourceModule_sourceEntityId_idx" ON "workflow_run"("sourceModule", "sourceEntityId");
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkflowStepRun
CREATE TABLE "workflow_step_run" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "workflowStepId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    CONSTRAINT "workflow_step_run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_step_run_workflowRunId_status_idx" ON "workflow_step_run"("workflowRunId", "status");
ALTER TABLE "workflow_step_run" ADD CONSTRAINT "workflow_step_run_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_step_run" ADD CONSTRAINT "workflow_step_run_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;
