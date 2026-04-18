import { db } from "@/lib/db";
import type { ScheduledAction } from "@/generated/prisma/client";
import { fireWorkflowTrigger } from "./workflow-engine";
import { processApprovalEscalations } from "./approvals";
import { sendEmail } from "@/lib/email";
import { notifyOrgAdmins } from "@/lib/notifications";

export async function processScheduledActions() {
  const now = new Date();

  // Pick up pending actions ready to roll, or failed ones ready for retry
  const actions = await db.scheduledAction.findMany({
    where: {
      status: "PENDING",
      OR: [
        { nextRetryAt: null, scheduledAt: { lte: now } },
        { nextRetryAt: { lte: now } }
      ]
    },
    take: 50,
  });

  let processed = 0;
  for (const action of actions) {
    await executeAction(action);
    processed++;
  }

  return { processed, totalReady: actions.length };
}

async function executeAction(action: ScheduledAction) {
  // Optimistic lock into RUNNING
  await db.scheduledAction.update({
    where: { id: action.id },
    data: { status: "RUNNING" }
  });

  try {
    const payload =
      action.payload && typeof action.payload === "object"
        ? (action.payload as Record<string, unknown>)
        : {};

    if ("simulate_fail" in payload && payload.simulate_fail) {
      throw new Error("Simulated transient failure for testing");
    }

    switch (action.actionType) {
      case "send_invoice_email": {
        const { invoiceId, recipientEmail, subject, bodyHtml } = payload as {
          invoiceId?: string;
          recipientEmail?: string;
          subject?: string;
          bodyHtml?: string;
        };
        if (invoiceId && recipientEmail) {
          const invoice = await db.invoice.findUnique({
            where: { id: invoiceId },
            select: { invoiceNumber: true, id: true },
          });
          if (invoice) {
            await sendEmail({
              to: recipientEmail,
              subject: subject ?? `Invoice ${invoice.invoiceNumber} from Slipwise`,
              html: bodyHtml ?? `<p>Your invoice <strong>${invoice.invoiceNumber}</strong> is ready.</p>`,
            });
          }
        }
        break;
      }

      case "escalate_approval": {
        const { approvalRequestId } = payload as { approvalRequestId?: string };
        if (approvalRequestId) {
          // Attempt to advance the specific request; fall back to batch escalation.
          const approval = await db.approvalRequest.findUnique({
            where: { id: approvalRequestId },
            select: { id: true, status: true, dueAt: true },
          });
          if (approval && ["PENDING", "ESCALATED"].includes(approval.status)) {
            // Force dueAt to now so processApprovalEscalations picks it up immediately.
            await db.approvalRequest.update({
              where: { id: approvalRequestId },
              data: { dueAt: new Date(0) },
            });
          }
        }
        // Always run the escalation sweep so any overdue requests are advanced.
        await processApprovalEscalations();
        break;
      }

      case "escalate_ticket": {
        const { ticketId } = payload as { ticketId?: string };
        if (ticketId) {
          const ticket = await db.invoiceTicket.findUnique({
            where: { id: ticketId },
            select: { id: true, orgId: true, description: true, status: true },
          });
          if (ticket && ticket.status !== "CLOSED") {
            await notifyOrgAdmins({
              orgId: ticket.orgId,
              type: "ticket_escalated",
              title: "Support Ticket Escalated",
              body: `Ticket ${ticketId} has exceeded its SLA and requires immediate attention.`,
              link: `/app/support/tickets/${ticketId}`,
            });
          }
        }
        break;
      }

      default:
        // Unknown action types are logged and succeeded to avoid indefinite retries.
        console.warn(`[FlowScheduler] Unknown actionType "${action.actionType}" for action ${action.id}`);
        break;
    }

    // Mark as succeeded
    await db.scheduledAction.update({
      where: { id: action.id },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date()
      }
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown execution error";
    console.error(`[FlowScheduler] Action ${action.id} failed:`, error);
    
    const incrementedAttempts = action.attemptCount + 1;
    
    if (incrementedAttempts >= action.maxAttempts) {
      // Create Dead letter gracefully in a transaction
      await db.$transaction([
        db.scheduledAction.update({
          where: { id: action.id },
          data: {
            status: "DEAD_LETTERED",
            attemptCount: incrementedAttempts,
            lastError: errorMsg
          }
        }),
        db.deadLetterAction.create({
          data: {
            scheduledActionId: action.id,
            orgId: action.orgId,
            actionType: action.actionType,
            sourceModule: action.sourceModule,
            failureReason: errorMsg,
            payload: action.payload !== null ? action.payload : {},
          }
        })
      ]);

      // Hook terminal failure trigger
      await fireWorkflowTrigger({
        triggerType: "scheduled_action.dead_lettered",
        orgId: action.orgId,
        sourceModule: action.sourceModule,
        sourceEntityType: action.sourceEntityType ?? "unknown",
        sourceEntityId: action.sourceEntityId ?? "unknown",
        payload: {
          actionType: action.actionType,
          error: errorMsg,
          attemptCount: incrementedAttempts,
        },
      });

    } else {
      // Exponential backoff: 5 min × 2^(attempts-1)
      const nextRetryAt = new Date();
      nextRetryAt.setMinutes(nextRetryAt.getMinutes() + (5 * Math.pow(2, incrementedAttempts - 1)));

      await db.scheduledAction.update({
        where: { id: action.id },
        data: {
          status: "PENDING",
          attemptCount: incrementedAttempts,
          nextRetryAt,
          lastError: errorMsg
        }
      });
    }
  }
}
