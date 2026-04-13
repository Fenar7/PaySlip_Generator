import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createNotification, notifyOrgAdmins } from "@/lib/notifications";
import { createApprovalRequest } from "./approvals";
import {
  SUPPORTED_TRIGGERS,
  SUPPORTED_ACTIONS,
  type SupportedTrigger,
  type SupportedAction,
} from "./catalog";

export type WorkflowTriggerEvent = {
  triggerType: SupportedTrigger;
  orgId: string;
  sourceModule: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  actorId?: string;
  payload: Record<string, unknown>;
  depth?: number;
};

const MAX_WORKFLOW_DEPTH = 5;

/**
 * Fire all ACTIVE workflow definitions that match the trigger type for the org.
 */
export async function fireWorkflowTrigger(event: WorkflowTriggerEvent) {
  const currentDepth = event.depth ?? 0;
  if (currentDepth >= MAX_WORKFLOW_DEPTH) {
    console.warn(
      `[WorkflowEngine] Max depth reached (${currentDepth}) for org ${event.orgId}. Potential cycle detected for ${event.triggerType}.`
    );
    return;
  }

  const matchingWorkflows = await db.workflowDefinition.findMany({
    where: {
      orgId: event.orgId,
      triggerType: event.triggerType,
      status: "ACTIVE",
    },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });

  for (const workflow of matchingWorkflows) {
    await executeWorkflow(workflow, { ...event, depth: currentDepth + 1 });
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
  const orgId = event.orgId;

  switch (actionType) {
    case "send_notification": {
      const userId = (config.userId as string) ?? event.actorId;
      if (userId) {
        await createNotification({
          orgId,
          userId,
          type: "workflow_notification",
          title: (config.title as string) ?? "Workflow Update",
          body: (config.body as string) ?? "A workflow step has been executed.",
          link: config.link as string | undefined,
        });
      }
      break;
    }

    case "notify_org_admins": {
      await notifyOrgAdmins({
        orgId,
        type: "workflow_admin_notification",
        title: (config.title as string) ?? "Workflow Admin Alert",
        body: (config.body as string) ?? "An automated workflow requires attention.",
        link: config.link as string | undefined,
      });
      break;
    }

    case "enqueue_scheduled_action":
      await db.scheduledAction.create({
        data: {
          orgId,
          actionType: (config.actionType as string) ?? "send_notification",
          sourceModule: event.sourceModule,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          payload: config as Prisma.InputJsonValue,
          scheduledAt: new Date(),
        },
      });
      break;

    case "create_approval_request": {
      await createApprovalRequest({
        docType: (config.docType as string) ?? event.sourceEntityType ?? "unknown",
        docId: (config.docId as string) ?? event.sourceEntityId ?? "unknown",
        orgId,
        requestedById: "system",
        requestedByName: "SW Flow Automation",
        docNumber: (config.docNumber as string) ?? "Automated Request",
      });
      break;
    }

    case "assign_ticket": {
      if (event.sourceEntityType === "InvoiceTicket" && event.sourceEntityId) {
        await db.invoiceTicket.update({
          where: { id: event.sourceEntityId },
          data: {
            assigneeId: config.assigneeId as string | undefined,
          },
        });
      }
      break;
    }

    case "schedule_reminder": {
      const delayMinutes = (config.delayMinutes as number) ?? 60;
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);

      await db.scheduledAction.create({
        data: {
          orgId,
          actionType: "send_notification",
          sourceModule: event.sourceModule,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          payload: config as Prisma.InputJsonValue,
          scheduledAt,
        },
      });
      break;
    }

    case "escalate_to_role":
    case "create_follow_up":
      // These are specialized and will be wired to their respective modules in the future.
      console.log(`[WorkflowEngine] ${actionType} → org=${orgId} (Staged)`, config);
      break;

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
}
