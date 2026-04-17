"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SUPPORTED_TRIGGERS, SUPPORTED_ACTIONS } from "@/lib/flow/catalog";
import { validateActionType, validateTriggerType, validateWorkflowForActivation } from "@/lib/flow/workflow-validation";
import { logFlowConfigChange } from "@/lib/flow/audit";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { Prisma } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WorkflowStepInput = {
  actionType: string;
  config: Record<string, unknown>;
  conditionJson?: { field: string; operator: string; value: unknown } | null;
  label?: string;
};

export async function createWorkflow(input: {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  steps: WorkflowStepInput[];
}): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

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
      description: input.description ?? null,
      triggerType: input.triggerType,
      triggerConfig: (input.triggerConfig ?? {}) as Prisma.InputJsonValue,
      status: "DRAFT",
      config: {},
      createdBy: userId,
      steps: {
        create: input.steps.map((step, index) => ({
          sequence: index + 1,
          actionType: step.actionType,
          config: step.config as Prisma.InputJsonValue,
          conditionJson: step.conditionJson
            ? (step.conditionJson as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          label: step.label ?? null,
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
  const { orgId, userId } = await requireRole("admin");

  const workflow = await db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
    include: { steps: true },
  });

  if (!workflow) return { success: false, error: "Workflow not found" };

  const validation = validateWorkflowForActivation(workflow);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  // Plan gate: count currently ACTIVE workflows for this org
  const { limits } = await getOrgPlan(orgId);
  const limit = limits.activeWorkflowAutomations;
  if (limit === 0) {
    return { success: false, error: "Workflow automation is not available on your current plan." };
  }
  if (limit > 0) {
    const activeCount = await db.workflowDefinition.count({
      where: { orgId, status: "ACTIVE" },
    });
    if (activeCount >= limit) {
      return {
        success: false,
        error: `Your plan allows a maximum of ${limit} active automation${limit === 1 ? "" : "s"}. Pause another workflow to activate this one.`,
      };
    }
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
  const { orgId, userId } = await requireRole("admin");

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
  const { orgId, userId } = await requireRole("admin");

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
  input: {
    name?: string;
    description?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
  }
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

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
      ...(input.triggerConfig !== undefined && {
        triggerConfig: input.triggerConfig as Prisma.InputJsonValue,
      }),
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
  steps: WorkflowStepInput[]
): Promise<ActionResult<{ count: number }>> {
  const { orgId, userId } = await requireRole("admin");

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

  // Replace all steps atomically: delete old, recreate in sequence
  await db.workflowStep.deleteMany({ where: { workflowId } });
  await db.workflowStep.createMany({
    data: steps.map((step, index) => ({
      workflowId,
      sequence: index + 1,
      actionType: step.actionType,
      config: step.config as Prisma.InputJsonValue,
      conditionJson: step.conditionJson
        ? (step.conditionJson as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      label: step.label ?? null,
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

export async function duplicateWorkflow(
  workflowId: string
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const source = await db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });
  if (!source) return { success: false, error: "Workflow not found" };

  const copy = await db.workflowDefinition.create({
    data: {
      orgId,
      name: `${source.name} (copy)`,
      description: source.description,
      triggerType: source.triggerType,
      triggerConfig: source.triggerConfig ?? Prisma.JsonNull,
      status: "DRAFT",
      config: {},
      createdBy: userId,
      steps: {
        create: source.steps.map((s) => ({
          sequence: s.sequence,
          actionType: s.actionType,
          config: s.config as Prisma.InputJsonValue,
          conditionJson: s.conditionJson ?? Prisma.JsonNull,
          label: s.label,
        })),
      },
    },
  });

  revalidatePath("/app/flow/workflows");
  return { success: true, data: { id: copy.id } };
}

export async function triggerWorkflowManually(
  workflowId: string
): Promise<ActionResult<{ runId: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const workflow = await db.workflowDefinition.findFirst({
    where: { id: workflowId, orgId },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });
  if (!workflow) return { success: false, error: "Workflow not found" };
  if (workflow.status !== "ACTIVE") {
    return { success: false, error: "Only ACTIVE workflows can be manually triggered." };
  }

  const { fireWorkflowTrigger } = await import("@/lib/flow/workflow-engine");
  await fireWorkflowTrigger({
    triggerType: "manual",
    orgId,
    sourceModule: "manual",
    sourceEntityType: "WorkflowDefinition",
    sourceEntityId: workflowId,
    actorId: userId,
    payload: { triggeredBy: userId, workflowId },
  });

  // Fetch the run that was just created
  const latestRun = await db.workflowRun.findFirst({
    where: { workflowId, orgId },
    orderBy: { startedAt: "desc" },
  });

  return { success: true, data: { runId: latestRun?.id ?? workflowId } };
}

export async function cancelWorkflowRun(runId: string): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const run = await db.workflowRun.findFirst({
    where: { id: runId, orgId },
  });
  if (!run) return { success: false, error: "Run not found" };
  if (!["PENDING", "RUNNING"].includes(run.status)) {
    return { success: false, error: "Only PENDING or RUNNING runs can be cancelled." };
  }

  await db.workflowRun.update({
    where: { id: runId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "workflow_run.cancelled",
    entityType: "WorkflowRun",
    entityId: runId,
  });
  return { success: true, data: undefined };
}

export async function getWorkflowWithRuns(workflowId: string) {
  const { orgId } = await requireRole("admin");

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
