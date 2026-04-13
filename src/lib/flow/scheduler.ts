import { db } from "@/lib/db";
import type { ScheduledAction } from "@/generated/prisma/client";
import { fireWorkflowTrigger } from "./workflow-engine";

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
    // Scaffold boundaries for Sprint 17.2 acceptance
    switch (action.actionType) {
      case "send_invoice_email":
      case "escalate_ticket":
      case "escalate_approval":
      default:
        // By default we simulate execution
        console.log(`[FlowScheduler] Executing ${action.actionType} for org ${action.orgId}`);
        const payloadObj = action.payload && typeof action.payload === 'object' ? action.payload : {};
        if ('simulate_fail' in payloadObj && payloadObj.simulate_fail) {
           throw new Error("Simulated transient failure for testing");
        }
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

      // Phase 17.4: Hook terminal failure trigger
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
      // Exponential backoff logic (5 mins * 2^(attempts-1))
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
