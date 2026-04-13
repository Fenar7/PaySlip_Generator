"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SUPPORTED_TRIGGERS, SUPPORTED_ACTIONS } from "@/lib/flow/workflow-engine";
import { validateActionType, validateTriggerType } from "@/lib/flow/workflow-validation";
import { logFlowConfigChange } from "@/lib/flow/audit";
import { Prisma } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WorkflowStepInput = {
  actionType: string;
  config: Record<string, unknown>;
};

export async function createWorkflow(input: {
  name: string;
  triggerType: string;
  steps: WorkflowStepInput[];
}): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireOrgContext();

  if (!SUPPORTED_TRIGGERS.includes(input.triggerType as never)) {
    return { success: false, error: `Unsupported trigger: ${input.triggerType}` };
  }

  for (const step of input.steps) {
    if (!SUPPORTED_ACTIONS.includes(step.actionType as never)) {
      return { success: false, error: `Unsupported action: ${step.actionType}` };
    }
  }

  const workflow = await db.workflowDefinition.create({
    data: {
      orgId,
      name: input.name,
      triggerType: input.triggerType,
      status: "DRAFT",
      config: {},
      createdBy: userId,
      steps: {
        create: input.steps.map((step, index) => ({
          sequence: index + 1,
          actionType: step.actionType,
          config: step.config as Prisma.InputJsonValue,
        })),
      },
    },
  });

  revalidatePath("/app/flow/workflows");
  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "workflow.created",
    entityType: "WorkflowDefinition",
    entityId: workflow.id,
    metadata: { name: input.name, triggerType: input.triggerType, stepCount: input.steps.length },
  });
  return { success: true, data: { id: workflow.id } };
}

export async function activateWorkflow(
  workflowId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();

  const workflow = await db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
    include: { steps: true },
  });

  if (!workflow) return { success: false, error: "Workflow not found" };
  if (workflow.steps.length === 0) {
    return { success: false, error: "Cannot activate a workflow with no steps" };
  }

  await db.workflowDefinition.update({
    where: { id: workflowId },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/app/flow/workflows");
  revalidatePath(`/app/flow/workflows/${workflowId}`);
  await logFlowConfigChange({
    orgId: workflow.orgId,
    actorId: userId,
    action: "workflow.activated",
    entityType: "WorkflowDefinition",
    entityId: workflowId,
  });
  return { success: true, data: undefined };
}

export async function pauseWorkflow(
  workflowId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();

  await db.workflowDefinition.update({
    where: { id: workflowId, orgId },
    data: { status: "PAUSED" },
  });

  revalidatePath("/app/flow/workflows");
  revalidatePath(`/app/flow/workflows/${workflowId}`);
  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "workflow.paused",
    entityType: "WorkflowDefinition",
    entityId: workflowId,
  });
  return { success: true, data: undefined };
}

export async function archiveWorkflow(
  workflowId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();

  await db.workflowDefinition.update({
    where: { id: workflowId, orgId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/app/flow/workflows");
  revalidatePath(`/app/flow/workflows/${workflowId}`);
  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "workflow.archived",
    entityType: "WorkflowDefinition",
    entityId: workflowId,
  });
  return { success: true, data: undefined };
}

export async function updateWorkflow(
  workflowId: string,
  input: { name?: string; description?: string; triggerType?: string }
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireOrgContext();

  const existing = await db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
  });

  if (!existing) return { success: false, error: "Workflow not found" };
  if (existing.status === "ACTIVE") {
    return { success: false, error: "Cannot edit an ACTIVE workflow. Pause it first." };
  }
  if (existing.status === "ARCHIVED") {
    return { success: false, error: "Cannot edit an ARCHIVED workflow." };
  }

  if (input.triggerType) {
    const triggerCheck = validateTriggerType(input.triggerType);
    if (!triggerCheck.valid) return { success: false, error: triggerCheck.error! };
  }

  const updated = await db.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.triggerType !== undefined && { triggerType: input.triggerType }),
    },
  });

  revalidatePath("/app/flow/workflows");
  revalidatePath(`/app/flow/workflows/${workflowId}`);
  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "workflow.updated",
    entityType: "WorkflowDefinition",
    entityId: workflowId,
    metadata: { changes: input },
  });
  return { success: true, data: { id: updated.id } };
}

export async function updateWorkflowSteps(
  workflowId: string,
  steps: { actionType: string; config: Record<string, unknown> }[]
): Promise<ActionResult<{ count: number }>> {
  const { orgId, userId } = await requireOrgContext();

  const existing = await db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
  });

  if (!existing) return { success: false, error: "Workflow not found" };
  if (existing.status === "ACTIVE") {
    return { success: false, error: "Cannot edit steps of an ACTIVE workflow. Pause it first." };
  }
  if (existing.status === "ARCHIVED") {
    return { success: false, error: "Cannot edit steps of an ARCHIVED workflow." };
  }

  for (const step of steps) {
    const check = validateActionType(step.actionType);
    if (!check.valid) return { success: false, error: check.error! };
  }

  // Delete existing steps and recreate in sequence
  await db.workflowStep.deleteMany({ where: { workflowId } });
  await db.workflowStep.createMany({
    data: steps.map((step, index) => ({
      workflowId,
      sequence: index + 1,
      actionType: step.actionType,
      config: step.config as Prisma.InputJsonValue,
    })),
  });

  revalidatePath("/app/flow/workflows");
  revalidatePath(`/app/flow/workflows/${workflowId}`);
  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "workflow.steps_updated",
    entityType: "WorkflowDefinition",
    entityId: workflowId,
    metadata: { stepCount: steps.length },
  });
  return { success: true, data: { count: steps.length } };
}

export async function getWorkflowWithRuns(workflowId: string) {
  const { orgId } = await requireOrgContext();

  return db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
    include: {
      steps: { orderBy: { sequence: "asc" } },
      runs: {
        orderBy: { startedAt: "desc" },
        take: 50,
        include: {
          stepRuns: { orderBy: { startedAt: "asc" } },
        },
      },
    },
  });
}
