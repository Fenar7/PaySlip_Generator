import type { ScheduledAction } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notifyOrgAdmins } from "@/lib/notifications";
import { processApprovalEscalations } from "./approvals";
import { fireWorkflowTrigger, resumeWorkflowRun, type WorkflowTriggerEvent } from "./workflow-engine";

async function claimScheduledAction(actionId: string, now: Date): Promise<ScheduledAction | null> {
  const claimed = await db.scheduledAction.updateMany({
    where: {
      id: actionId,
      status: "PENDING",
      OR: [
        { nextRetryAt: null, scheduledAt: { lte: now } },
        { nextRetryAt: { lte: now } },
      ],
    },
    data: { status: "RUNNING" },
  });

  if (claimed.count === 0) {
    return null;
  }

  return db.scheduledAction.findUnique({ where: { id: actionId } });
}

export async function processScheduledActions() {
  const now = new Date();
  const readyActions = await db.scheduledAction.findMany({
    where: {
      status: "PENDING",
      OR: [
        { nextRetryAt: null, scheduledAt: { lte: now } },
        { nextRetryAt: { lte: now } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  let processed = 0;
  for (const readyAction of readyActions) {
    const claimedAction = await claimScheduledAction(readyAction.id, now);
    if (!claimedAction) {
      continue;
    }

    await executeAction(claimedAction);
    processed++;
  }

  return { processed, totalReady: readyActions.length };
}

async function executeAction(action: ScheduledAction) {
  try {
    const payload =
      action.payload && typeof action.payload === "object"
        ? (action.payload as Record<string, unknown>)
        : {};

    if ("simulate_fail" in payload && payload.simulate_fail) {
      throw new Error("Simulated transient failure for testing");
    }

    switch (action.actionType) {
      case "resume_workflow_run": {
        const event = payload.event as WorkflowTriggerEvent | undefined;
        const startSequence = payload.startSequence;

        if (!action.workflowRunId || !event || typeof startSequence !== "number") {
          throw new Error("resume_workflow_run: invalid continuation payload");
        }

        await resumeWorkflowRun({
          workflowRunId: action.workflowRunId,
          orgId: action.orgId,
          event,
          startSequence,
        });
        break;
      }

      case "send_invoice_email": {
        const { invoiceId, recipientEmail, subject, bodyHtml } = payload as {
          invoiceId?: string;
          recipientEmail?: string;
          subject?: string;
          bodyHtml?: string;
        };

        if (invoiceId && recipientEmail) {
          const invoice = await db.invoice.findFirst({
            where: { id: invoiceId, organizationId: action.orgId },
            select: { invoiceNumber: true, id: true },
          });

          if (invoice) {
            await sendEmail({
              to: recipientEmail,
              subject: subject ?? `Invoice ${invoice.invoiceNumber} from Slipwise`,
              html:
                bodyHtml ??
                `<p>Your invoice <strong>${invoice.invoiceNumber}</strong> is ready.</p>`,
            });
          }
        }
        break;
      }

      case "escalate_approval": {
        const { approvalRequestId } = payload as { approvalRequestId?: string };
        if (approvalRequestId) {
          const approval = await db.approvalRequest.findUnique({
            where: { id: approvalRequestId },
            select: { id: true, status: true },
          });

          if (approval && ["PENDING", "ESCALATED"].includes(approval.status)) {
            await db.approvalRequest.update({
              where: { id: approvalRequestId },
              data: { dueAt: new Date(0) },
            });
          }
        }

        await processApprovalEscalations();
        break;
      }

      case "escalate_ticket": {
        const { ticketId } = payload as { ticketId?: string };
        if (ticketId) {
          const ticket = await db.invoiceTicket.findUnique({
            where: { id: ticketId },
            select: { id: true, orgId: true, status: true },
          });

          if (ticket && ticket.status !== "CLOSED") {
            await notifyOrgAdmins({
              orgId: ticket.orgId,
              type: "ticket_escalated",
              title: "Support Ticket Escalated",
              body: `Ticket ${ticketId} has exceeded its SLA and requires immediate attention.`,
              link: `/app/flow/tickets/${ticketId}`,
            });
          }
        }
        break;
      }

      default:
        console.warn(
          `[FlowScheduler] Unknown actionType "${action.actionType}" for action ${action.id}`,
        );
        break;
    }

    await db.scheduledAction.update({
      where: { id: action.id },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown execution error";
    console.error(`[FlowScheduler] Action ${action.id} failed:`, error);

    const incrementedAttempts = action.attemptCount + 1;
    if (incrementedAttempts >= action.maxAttempts) {
      await db.$transaction([
        db.scheduledAction.update({
          where: { id: action.id },
          data: {
            status: "DEAD_LETTERED",
            attemptCount: incrementedAttempts,
            lastError: errorMessage,
          },
        }),
        db.deadLetterAction.create({
          data: {
            scheduledActionId: action.id,
            orgId: action.orgId,
            actionType: action.actionType,
            sourceModule: action.sourceModule,
            failureReason: errorMessage,
            payload: action.payload !== null ? action.payload : {},
          },
        }),
      ]);

      await fireWorkflowTrigger({
        triggerType: "scheduled_action.dead_lettered",
        orgId: action.orgId,
        sourceModule: action.sourceModule,
        sourceEntityType: action.sourceEntityType ?? "unknown",
        sourceEntityId: action.sourceEntityId ?? "unknown",
        payload: {
          actionType: action.actionType,
          error: errorMessage,
          attemptCount: incrementedAttempts,
        },
      });
      return;
    }

    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(
      nextRetryAt.getMinutes() + 5 * Math.pow(2, incrementedAttempts - 1),
    );

    await db.scheduledAction.update({
      where: { id: action.id },
      data: {
        status: "PENDING",
        attemptCount: incrementedAttempts,
        nextRetryAt,
        lastError: errorMessage,
      },
    });
  }
}
