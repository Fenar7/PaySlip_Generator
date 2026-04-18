import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
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

const MAX_WORKFLOW_DEPTH = 5;
/** Guard against event storms: skip if a run for the same workflow+entity is in-flight within this window */
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

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
    // Idempotency guard: skip if a run for the same workflow+entity is already in-flight
    if (event.sourceEntityId) {
      const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
      const recentRun = await db.workflowRun.findFirst({
        where: {
          workflowId: workflow.id,
          sourceEntityId: event.sourceEntityId,
          startedAt: { gte: windowStart },
          status: { in: ["PENDING", "RUNNING"] },
        },
      });
      if (recentRun) {
        console.info(
          `[WorkflowEngine] Idempotency skip workflow=${workflow.id} entity=${event.sourceEntityId}`
        );
        continue;
      }
    }

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
    // Evaluate optional condition before executing the step
    if (step.conditionJson) {
      const meetsCondition = evaluateCondition(
        step.conditionJson as StepCondition,
        event.payload
      );
      if (!meetsCondition) {
        await db.workflowStepRun.create({
          data: {
            workflowRunId: run.id,
            workflowStepId: step.id,
            status: "CANCELLED",
            startedAt: new Date(),
            completedAt: new Date(),
            outputPayload: { skipped: true, reason: "condition_not_met" } as Prisma.InputJsonValue,
          },
        });
        continue;
      }
    }

    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: run.id,
        workflowStepId: step.id,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      const output = await executeStep(
        step.actionType as SupportedAction,
        step.config as Record<string, unknown>,
        event
      );

      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          outputPayload: (output ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: { status: "FAILED", completedAt: new Date(), failureReason: msg },
      });
      runStatus = "FAILED";
      failureReason = msg;
      break; // halt on first step failure
    }
  }

  await db.workflowRun.update({
    where: { id: run.id },
    data: { status: runStatus, completedAt: new Date(), failureReason },
  });

  if (runStatus === "FAILED") {
    await Promise.all([
      createNotification({
        orgId: event.orgId,
        userId: workflow.createdBy,
        type: "workflow_run_failed",
        title: `Automation "${workflow.name}" failed`,
        body: `Run ${run.id.slice(-8)} failed: ${failureReason ?? "unknown error"}`,
        link: `/app/flow/workflows/${workflow.id}/runs`,
      }),
      db.auditLog.create({
        data: {
          orgId: event.orgId,
          actorId: workflow.createdBy,
          action: "workflow_run_failed",
          entityType: "WorkflowRun",
          entityId: run.id,
          metadata: { workflowId: workflow.id, workflowName: workflow.name, failureReason },
        },
      }),
    ]);
  }

  return { runId: run.id, status: runStatus };
}

/**
 * Evaluate a simple field-level condition against the trigger event payload.
 */
export function evaluateCondition(
  condition: StepCondition,
  context: Record<string, unknown>
): boolean {
  const actual = context[condition.field];
  const expected = condition.value;
  switch (condition.operator) {
    case "==":  return actual == expected;
    case "!=":  return actual != expected;
    case ">":   return (actual as number) > (expected as number);
    case "<":   return (actual as number) < (expected as number);
    case ">=":  return (actual as number) >= (expected as number);
    case "<=":  return (actual as number) <= (expected as number);
    default:    return true;
  }
}

/** Interpolate {{variable}} placeholders in a template string using the event payload. */
function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = payload[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

function interpolateObject(
  obj: Record<string, unknown>,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = typeof v === "string" ? interpolate(v, payload) : v;
  }
  return result;
}

async function executeStep(
  actionType: SupportedAction,
  config: Record<string, unknown>,
  event: WorkflowTriggerEvent
): Promise<Record<string, unknown> | undefined> {
  const orgId = event.orgId;

  switch (actionType) {
    // ── Email ─────────────────────────────────────────────────────────────
    case "send_email": {
      const to = (config.to as string) ?? (event.payload.customerEmail as string);
      if (!to) throw new Error("send_email: no recipient address");
      const subject = interpolate(
        (config.subject as string) ?? "Notification from Slipwise",
        event.payload
      );
      const body = interpolate(
        (config.body as string) ?? "<p>You have a new notification.</p>",
        event.payload
      );
      await sendEmail({ to, subject, html: body });
      return { to, subject };
    }

    // ── In-app notifications ───────────────────────────────────────────────
    case "send_notification":
    case "create_notification": {
      const userId = (config.userId as string) ?? event.actorId;
      if (userId) {
        await createNotification({
          orgId,
          userId,
          type: "workflow_notification",
          title: interpolate((config.title as string) ?? "Workflow Update", event.payload),
          body: interpolate(
            (config.body as string) ?? "A workflow step has been executed.",
            event.payload
          ),
          link: config.link as string | undefined,
        });
      }
      return { userId };
    }

    case "notify_org_admins": {
      await notifyOrgAdmins({
        orgId,
        type: "workflow_admin_notification",
        title: interpolate((config.title as string) ?? "Workflow Admin Alert", event.payload),
        body: interpolate(
          (config.body as string) ?? "An automated workflow requires attention.",
          event.payload
        ),
        link: config.link as string | undefined,
      });
      return {};
    }

    // ── Ticket operations ──────────────────────────────────────────────────
    case "create_ticket": {
      const invoiceId =
        (config.invoiceId as string) ??
        (event.sourceEntityType === "Invoice" ? event.sourceEntityId : undefined);
      if (!invoiceId) throw new Error("create_ticket: invoiceId required");
      const ticket = await db.invoiceTicket.create({
        data: {
          invoiceId,
          orgId,
          submitterName: "SW Flow Automation",
          submitterEmail: "no-reply@slipwise.io",
          category: (config.category as never) ?? "OTHER",
          description: interpolate(
            (config.description as string) ?? "Automated ticket created by workflow.",
            event.payload
          ),
          status: "OPEN",
          assigneeId: (config.assigneeId as string) ?? null,
        },
      });
      return { ticketId: ticket.id };
    }

    case "assign_ticket": {
      if (event.sourceEntityType === "InvoiceTicket" && event.sourceEntityId) {
        await db.invoiceTicket.update({
          where: { id: event.sourceEntityId },
          data: { assigneeId: config.assigneeId as string | undefined },
        });
      }
      return {};
    }

    // ── Document mutations ─────────────────────────────────────────────────
    case "update_invoice_status": {
      const invoiceId =
        (config.invoiceId as string) ??
        (event.sourceEntityType === "Invoice" ? event.sourceEntityId : undefined);
      if (!invoiceId) throw new Error("update_invoice_status: invoiceId required");
      const VALID_STATUSES = ["DRAFT", "ISSUED", "PAID", "VOID", "OVERDUE"];
      const newStatus = config.status as string;
      if (!VALID_STATUSES.includes(newStatus)) {
        throw new Error(`update_invoice_status: invalid status "${newStatus}"`);
      }
      await db.invoice.update({
        where: { id: invoiceId, orgId },
        data: { status: newStatus as never },
      });
      return { invoiceId, newStatus };
    }

    // ── Approvals ──────────────────────────────────────────────────────────
    case "create_approval_request": {
      await createApprovalRequest({
        docType: (config.docType as string) ?? event.sourceEntityType ?? "unknown",
        docId: (config.docId as string) ?? event.sourceEntityId ?? "unknown",
        orgId,
        requestedById: "system",
        requestedByName: "SW Flow Automation",
        docNumber: (config.docNumber as string) ?? "Automated Request",
      });
      return {};
    }

    // ── Audit log ──────────────────────────────────────────────────────────
    case "add_audit_log": {
      await db.auditLog.create({
        data: {
          orgId,
          actorId: event.actorId ?? null,
          action: interpolate((config.action as string) ?? "workflow_action", event.payload),
          entityType: (config.entityType as string) ?? event.sourceEntityType ?? "Workflow",
          entityId: (config.entityId as string) ?? event.sourceEntityId,
          metadata: {
            triggeredBy: "workflow",
            triggerType: event.triggerType,
            payload: event.payload,
          },
        },
      });
      return {};
    }

    // ── Delay / scheduling ─────────────────────────────────────────────────
    case "wait": {
      const delayHours = (config.delayHours as number) ?? 1;
      const scheduledAt = new Date(Date.now() + delayHours * 3_600_000);
      await db.scheduledAction.create({
        data: {
          orgId,
          actionType: (config.nextActionType as string) ?? "send_notification",
          sourceModule: event.sourceModule,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          payload: config as Prisma.InputJsonValue,
          scheduledAt,
        },
      });
      return { scheduledAt: scheduledAt.toISOString() };
    }

    case "schedule_reminder": {
      const delayMinutes = (config.delayMinutes as number) ?? 60;
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
      return { scheduledAt: scheduledAt.toISOString() };
    }

    // ── Outbound webhook ───────────────────────────────────────────────────
    case "webhook_call": {
      const url = config.url as string;
      if (!url) throw new Error("webhook_call: url is required");
      const method = ((config.method as string) ?? "POST").toUpperCase();
      const body = JSON.stringify(
        config.bodyTemplate
          ? interpolateObject(config.bodyTemplate as Record<string, unknown>, event.payload)
          : { event: event.triggerType, payload: event.payload }
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
      return { url, statusCode: response.status };
    }

    // ── Internal housekeeping ──────────────────────────────────────────────
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
      return {};
    }

    case "escalate_to_role":
    case "create_follow_up":
      console.info(`[WorkflowEngine] ${actionType} staged → org=${orgId}`, config);
      return {};

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
}
