import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { createNotification, notifyOrgAdmins } from "@/lib/notifications";
import { createApprovalRequest } from "./approvals";
import {
  SUPPORTED_TRIGGERS,
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

type StepCondition = {
  field: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
  value: unknown;
};

type StepExecutionContext = {
  runId: string;
  workflowId: string;
  workflowName: string;
  workflowCreatedBy: string;
  stepSequence: number;
  nextStepSequence: number;
};

type StepExecutionResult = {
  output?: Record<string, unknown>;
  pauseRun?: boolean;
};

type WorkflowWithSteps = Awaited<
  ReturnType<typeof db.workflowDefinition.findMany>
>[number] & {
  steps: Awaited<ReturnType<typeof db.workflowStep.findMany>>;
};

const MAX_WORKFLOW_DEPTH = 5;
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeActorId(actorId?: string): string | null {
  return actorId && UUID_PATTERN.test(actorId) ? actorId : null;
}

async function recordWorkflowFailure(
  workflow: WorkflowWithSteps,
  runId: string,
  orgId: string,
  failureReason?: string,
) {
  await Promise.all([
    createNotification({
      orgId,
      userId: workflow.createdBy,
      type: "workflow_run_failed",
      title: `Automation "${workflow.name}" failed`,
      body: `Run ${runId.slice(-8)} failed: ${failureReason ?? "unknown error"}`,
      link: `/app/flow/workflows/${workflow.id}/runs`,
      sourceModule: "flow",
      sourceRef: runId,
    }),
    logAudit({
      orgId,
      actorId: workflow.createdBy,
      action: "workflow_run_failed",
      entityType: "WorkflowRun",
      entityId: runId,
      metadata: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        failureReason,
      },
    }),
  ]);
}

export async function fireWorkflowTrigger(event: WorkflowTriggerEvent) {
  const currentDepth = event.depth ?? 0;
  if (currentDepth >= MAX_WORKFLOW_DEPTH) {
    console.warn(
      `[WorkflowEngine] Max depth reached (${currentDepth}) for org ${event.orgId}. Potential cycle detected for ${event.triggerType}.`,
    );
    return;
  }

  if (!SUPPORTED_TRIGGERS.includes(event.triggerType as never)) {
    console.warn(`[WorkflowEngine] Unknown trigger type: ${event.triggerType}`);
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
    if (event.sourceEntityId) {
      const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
      const recentRun = await db.workflowRun.findFirst({
        where: {
          workflowId: workflow.id,
          orgId: event.orgId,
          sourceEntityId: event.sourceEntityId,
          startedAt: { gte: windowStart },
          status: { in: ["PENDING", "RUNNING"] },
        },
      });

      if (recentRun) {
        console.info(
          `[WorkflowEngine] Idempotency skip workflow=${workflow.id} entity=${event.sourceEntityId}`,
        );
        continue;
      }
    }

    await executeWorkflow(workflow, { ...event, depth: currentDepth + 1 });
  }
}

async function executeWorkflow(
  workflow: WorkflowWithSteps,
  event: WorkflowTriggerEvent,
) {
  const run = await db.workflowRun.create({
    data: {
      workflowId: workflow.id,
      orgId: event.orgId,
      triggerType: event.triggerType,
      sourceModule: event.sourceModule,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      actorId: sanitizeActorId(event.actorId),
      status: "RUNNING",
    },
  });

  return continueWorkflowRun({
    runId: run.id,
    workflow,
    event,
    startSequence: 1,
  });
}

export async function resumeWorkflowRun(input: {
  workflowRunId: string;
  orgId: string;
  event: WorkflowTriggerEvent;
  startSequence: number;
}) {
  const run = await db.workflowRun.findFirst({
    where: { id: input.workflowRunId, orgId: input.orgId },
    select: { id: true, workflowId: true, status: true },
  });

  if (!run || ["CANCELLED", "FAILED", "SUCCEEDED"].includes(run.status)) {
    return { runId: input.workflowRunId, status: "CANCELLED" as const };
  }

  const workflow = await db.workflowDefinition.findFirst({
    where: { id: run.workflowId, orgId: input.orgId },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });

  if (!workflow) {
    throw new Error(`Workflow ${run.workflowId} not found for run ${input.workflowRunId}`);
  }

  await db.workflowRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", completedAt: null, failureReason: null },
  });

  return continueWorkflowRun({
    runId: run.id,
    workflow,
    event: input.event,
    startSequence: input.startSequence,
  });
}

async function continueWorkflowRun(input: {
  runId: string;
  workflow: WorkflowWithSteps;
  event: WorkflowTriggerEvent;
  startSequence: number;
}) {
  let runStatus: "SUCCEEDED" | "FAILED" | "PENDING" = "SUCCEEDED";
  let failureReason: string | undefined;
  const remainingSteps = input.workflow.steps.filter(
    (step) => step.sequence >= input.startSequence,
  );

  for (const step of remainingSteps) {
    if (step.conditionJson) {
      const meetsCondition = evaluateCondition(
        step.conditionJson as StepCondition,
        input.event.payload,
      );

      if (!meetsCondition) {
        await db.workflowStepRun.create({
          data: {
            workflowRunId: input.runId,
            workflowStepId: step.id,
            status: "CANCELLED",
            startedAt: new Date(),
            completedAt: new Date(),
            outputPayload: {
              skipped: true,
              reason: "condition_not_met",
            } as Prisma.InputJsonValue,
          },
        });
        continue;
      }
    }

    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: input.runId,
        workflowStepId: step.id,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      const output = await executeStep(
        step.actionType as SupportedAction,
        step.config as Record<string, unknown>,
        input.event,
        {
          runId: input.runId,
          workflowId: input.workflow.id,
          workflowName: input.workflow.name,
          workflowCreatedBy: input.workflow.createdBy,
          stepSequence: step.sequence,
          nextStepSequence: step.sequence + 1,
        },
      );

      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          outputPayload: (output.output ?? {}) as Prisma.InputJsonValue,
        },
      });

      if (output.pauseRun) {
        runStatus = "PENDING";
        break;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          failureReason: message,
        },
      });
      runStatus = "FAILED";
      failureReason = message;
      break;
    }
  }

  await db.workflowRun.update({
    where: { id: input.runId },
    data: {
      status: runStatus,
      completedAt: runStatus === "PENDING" ? null : new Date(),
      failureReason,
    },
  });

  if (runStatus === "FAILED") {
    await recordWorkflowFailure(
      input.workflow,
      input.runId,
      input.event.orgId,
      failureReason,
    );
  }

  return { runId: input.runId, status: runStatus };
}

export function evaluateCondition(
  condition: StepCondition,
  context: Record<string, unknown>,
): boolean {
  const actual = context[condition.field];
  const expected = condition.value;

  switch (condition.operator) {
    case "==":
      return actual == expected;
    case "!=":
      return actual != expected;
    case ">":
      return (actual as number) > (expected as number);
    case "<":
      return (actual as number) < (expected as number);
    case ">=":
      return (actual as number) >= (expected as number);
    case "<=":
      return (actual as number) <= (expected as number);
    default:
      return true;
  }
}

function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = payload[key];
    return value !== undefined && value !== null ? String(value) : `{{${key}}}`;
  });
}

function interpolateObject(
  obj: Record<string, unknown>,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === "string" ? interpolate(value, payload) : value;
  }

  return result;
}

async function executeStep(
  actionType: SupportedAction,
  config: Record<string, unknown>,
  event: WorkflowTriggerEvent,
  context: StepExecutionContext,
): Promise<StepExecutionResult> {
  const orgId = event.orgId;

  switch (actionType) {
    case "send_email": {
      const to = (config.to as string) ?? (event.payload.customerEmail as string);
      if (!to) {
        throw new Error("send_email: no recipient address");
      }

      const subject = interpolate(
        (config.subject as string) ?? "Notification from Slipwise",
        event.payload,
      );
      const body = interpolate(
        (config.body as string) ?? "<p>You have a new notification.</p>",
        event.payload,
      );
      await sendEmail({ to, subject, html: body });
      return { output: { to, subject } };
    }

    case "send_notification":
    case "create_notification": {
      const userId = sanitizeActorId((config.userId as string) ?? event.actorId);
      if (userId) {
        await createNotification({
          orgId,
          userId,
          type: "workflow_notification",
          title: interpolate((config.title as string) ?? "Workflow Update", event.payload),
          body: interpolate(
            (config.body as string) ?? "A workflow step has been executed.",
            event.payload,
          ),
          link: config.link as string | undefined,
          sourceModule: "flow",
          sourceRef: context.runId,
        });
      }
      return { output: { userId } };
    }

    case "notify_org_admins": {
      await notifyOrgAdmins({
        orgId,
        type: "workflow_admin_notification",
        title: interpolate((config.title as string) ?? "Workflow Admin Alert", event.payload),
        body: interpolate(
          (config.body as string) ?? "An automated workflow requires attention.",
          event.payload,
        ),
        link: config.link as string | undefined,
      });
      return { output: {} };
    }

    case "create_ticket": {
      const invoiceId =
        (config.invoiceId as string) ??
        (event.sourceEntityType === "Invoice" ? event.sourceEntityId : undefined);
      if (!invoiceId) {
        throw new Error("create_ticket: invoiceId required");
      }

      const ticket = await db.invoiceTicket.create({
        data: {
          invoiceId,
          orgId,
          submitterName: "SW Flow Automation",
          submitterEmail: "no-reply@slipwise.io",
          category: (config.category as never) ?? "OTHER",
          description: interpolate(
            (config.description as string) ?? "Automated ticket created by workflow.",
            event.payload,
          ),
          status: "OPEN",
          assigneeId: sanitizeActorId(config.assigneeId as string | undefined),
        },
      });
      return { output: { ticketId: ticket.id } };
    }

    case "assign_ticket": {
      const assigneeId = sanitizeActorId(config.assigneeId as string | undefined);
      if (event.sourceEntityType === "InvoiceTicket" && event.sourceEntityId) {
        await db.invoiceTicket.update({
          where: { id: event.sourceEntityId },
          data: { assigneeId },
        });
      }
      return { output: { assigneeId } };
    }

    case "update_invoice_status": {
      const invoiceId =
        (config.invoiceId as string) ??
        (event.sourceEntityType === "Invoice" ? event.sourceEntityId : undefined);
      if (!invoiceId) {
        throw new Error("update_invoice_status: invoiceId required");
      }

      const validStatuses = ["DRAFT", "ISSUED", "PAID", "VOID", "OVERDUE"];
      const newStatus = config.status as string;
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`update_invoice_status: invalid status "${newStatus}"`);
      }

      const invoice = await db.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
        select: { id: true },
      });
      if (!invoice) {
        throw new Error("update_invoice_status: invoice not found or unauthorized");
      }

      await db.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus as never },
      });
      return { output: { invoiceId, newStatus } };
    }

    case "create_approval_request": {
      const fallbackRequestedById = sanitizeActorId(event.actorId) ?? context.workflowCreatedBy;
      await createApprovalRequest({
        docType: (config.docType as string) ?? event.sourceEntityType ?? "unknown",
        docId: (config.docId as string) ?? event.sourceEntityId ?? "unknown",
        orgId,
        requestedById: fallbackRequestedById,
        fallbackRequestedById: context.workflowCreatedBy,
        requestedByName: "SW Flow Automation",
        docNumber: (config.docNumber as string) ?? "Automated Request",
        amount:
          typeof config.amount === "number"
            ? config.amount
            : typeof event.payload.amount === "number"
              ? (event.payload.amount as number)
              : typeof event.payload.totalAmount === "number"
                ? (event.payload.totalAmount as number)
                : undefined,
      });
      return { output: {} };
    }

    case "add_audit_log": {
      const actorId = sanitizeActorId(event.actorId) ?? context.workflowCreatedBy;
      await logAudit({
        orgId,
        actorId,
        action: interpolate((config.action as string) ?? "workflow_action", event.payload),
        entityType: (config.entityType as string) ?? event.sourceEntityType ?? "Workflow",
        entityId: (config.entityId as string) ?? event.sourceEntityId,
        metadata: {
          triggeredBy: "workflow",
          triggerType: event.triggerType,
          payload: event.payload,
        },
      });
      return { output: {} };
    }

    case "wait": {
      const delayHours = Number(config.delayHours ?? 1);
      const scheduledAt = new Date(Date.now() + delayHours * 3_600_000);
      await db.scheduledAction.create({
        data: {
          orgId,
          actionType: "resume_workflow_run",
          sourceModule: event.sourceModule,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          workflowRunId: context.runId,
          payload: {
            event,
            startSequence: context.nextStepSequence,
          } as Prisma.InputJsonValue,
          scheduledAt,
        },
      });
      return {
        output: { scheduledAt: scheduledAt.toISOString() },
        pauseRun: true,
      };
    }

    case "schedule_reminder": {
      const delayMinutes = Number(config.delayMinutes ?? 60);
      const scheduledAt = new Date(Date.now() + delayMinutes * 60_000);
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
      return { output: { scheduledAt: scheduledAt.toISOString() } };
    }

    case "webhook_call": {
      const url = config.url as string;
      if (!url) {
        throw new Error("webhook_call: url is required");
      }

      const method = ((config.method as string) ?? "POST").toUpperCase();
      const body = JSON.stringify(
        config.bodyTemplate
          ? interpolateObject(config.bodyTemplate as Record<string, unknown>, event.payload)
          : { event: event.triggerType, payload: event.payload },
      );

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(config.headers as Record<string, string> | undefined),
      };

      const response = await fetch(url, {
        method,
        headers,
        body: ["GET", "HEAD"].includes(method) ? undefined : body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`webhook_call: HTTP ${response.status} from ${url}`);
      }

      return { output: { url, statusCode: response.status } };
    }

    case "enqueue_scheduled_action": {
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
      return { output: {} };
    }

    case "escalate_to_role":
    case "create_follow_up":
      console.info(`[WorkflowEngine] ${actionType} staged → org=${orgId}`, config);
      return { output: {} };

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
}
