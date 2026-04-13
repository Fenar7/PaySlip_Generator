"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SUPPORTED_TRIGGERS, SUPPORTED_ACTIONS } from "@/lib/flow/workflow-engine";

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
          config: step.config,
        })),
      },
    },
  });

  revalidatePath("/app/flow/workflows");
  return { success: true, data: { id: workflow.id } };
}

export async function activateWorkflow(
  workflowId: string
): Promise<ActionResult<void>> {
  const { orgId } = await requireOrgContext();

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
  return { success: true, data: undefined };
}

export async function pauseWorkflow(
  workflowId: string
): Promise<ActionResult<void>> {
  const { orgId } = await requireOrgContext();

  await db.workflowDefinition.update({
    where: { id: workflowId, orgId },
    data: { status: "PAUSED" },
  });

  revalidatePath("/app/flow/workflows");
  return { success: true, data: undefined };
}

export async function archiveWorkflow(
  workflowId: string
): Promise<ActionResult<void>> {
  const { orgId } = await requireOrgContext();

  await db.workflowDefinition.update({
    where: { id: workflowId, orgId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/app/flow/workflows");
  return { success: true, data: undefined };
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
