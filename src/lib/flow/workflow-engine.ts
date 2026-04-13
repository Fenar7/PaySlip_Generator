import { db } from "@/lib/db";

// Supported trigger families per PRD 17.3
export const SUPPORTED_TRIGGERS = [
  "invoice.issued",
  "invoice.overdue",
  "payment_proof.submitted",
  "ticket.opened",
  "approval.requested",
  "approval.breached",
  "vendor_bill.submitted",
  "payment_run.failed",
  "close_task.blocked",
  "scheduled_action.dead_lettered",
] as const;

// Supported action families per PRD 17.3
export const SUPPORTED_ACTIONS = [
  "assign_ticket",
  "create_approval_request",
  "send_notification",
  "schedule_reminder",
  "escalate_to_role",
  "enqueue_scheduled_action",
  "create_follow_up",
  "notify_org_admins",
] as const;

export type SupportedTrigger = (typeof SUPPORTED_TRIGGERS)[number];
export type SupportedAction = (typeof SUPPORTED_ACTIONS)[number];

export type WorkflowTriggerEvent = {
  triggerType: SupportedTrigger;
  orgId: string;
  sourceModule: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  actorId?: string;
  payload: Record<string, unknown>;
};

/**
 * Fire all ACTIVE workflow definitions that match the trigger type for the org.
 */
export async function fireWorkflowTrigger(event: WorkflowTriggerEvent) {
  const matchingWorkflows = await db.workflowDefinition.findMany({
    where: {
      orgId: event.orgId,
      triggerType: event.triggerType,
      status: "ACTIVE",
    },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });

  for (const workflow of matchingWorkflows) {
    await executeWorkflow(workflow, event);
  }
}

type WorkflowWithSteps = Awaited<
  ReturnType<typeof db.workflowDefinition.findMany>
>[number] & {
  steps: Awaited<ReturnType<typeof db.workflowStep.findMany>>;
};

async function executeWorkflow(
  workflow: WorkflowWithSteps,
  event: WorkflowTriggerEvent
) {
  const run = await db.workflowRun.create({
    data: {
      workflowId: workflow.id,
      orgId: event.orgId,
      triggerType: event.triggerType,
      sourceModule: event.sourceModule,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      actorId: event.actorId,
      status: "RUNNING",
    },
  });

  let runStatus: "SUCCEEDED" | "FAILED" = "SUCCEEDED";
  let failureReason: string | undefined;

  for (const step of workflow.steps) {
    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: run.id,
        workflowStepId: step.id,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      await executeStep(
        step.actionType as SupportedAction,
        step.config as Record<string, unknown>,
        event
      );

      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: { status: "SUCCEEDED", completedAt: new Date() },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: { status: "FAILED", completedAt: new Date(), failureReason: msg },
      });
      runStatus = "FAILED";
      failureReason = msg;
      break; // Halt on first step failure
    }
  }

  await db.workflowRun.update({
    where: { id: run.id },
    data: { status: runStatus, completedAt: new Date(), failureReason },
  });

  return { runId: run.id, status: runStatus };
}

async function executeStep(
  actionType: SupportedAction,
  config: Record<string, unknown>,
  event: WorkflowTriggerEvent
) {
  switch (actionType) {
    case "send_notification":
    case "notify_org_admins":
      // Sprint 17.3: stub — will wire to push/email in 17.4
      console.log(`[WorkflowEngine] ${actionType} → org=${event.orgId}`, config);
      break;

    case "enqueue_scheduled_action":
      await db.scheduledAction.create({
        data: {
          orgId: event.orgId,
          actionType: (config.actionType as string) ?? "send_notification",
          sourceModule: event.sourceModule,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          payload: config,
          scheduledAt: new Date(),
        },
      });
      break;

    case "assign_ticket":
    case "create_approval_request":
    case "schedule_reminder":
    case "escalate_to_role":
    case "create_follow_up":
      // Sprint 17.3: stub — integration hooks for 17.4
      console.log(`[WorkflowEngine] ${actionType} → org=${event.orgId}`, config);
      break;

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
}
