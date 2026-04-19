/**
 * Phase 28.1: Subscription Dunning Service
 *
 * Handles automatic payment retry and communication escalation
 * for subscriptions in past_due state.
 *
 * Schedule: Day 1, 3, 7, 14, 21, 30 — then auto-cancel.
 */

import { db } from "@/lib/db";
import { DUNNING_SCHEDULE } from "./types";
import { retryStripePayment } from "./stripe";
import { retryRazorpayPayment } from "./razorpay";

type DunningStatus = "SCHEDULED" | "EXECUTED" | "SUCCESS" | "FAILED" | "EXHAUSTED";

/**
 * Process dunning for all subscriptions that are past_due.
 * Called by the cron job at `/api/cron/billing-dunning`.
 */
export async function processDunningBatch(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  canceled: number;
}> {
  const now = new Date();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let canceled = 0;

  // Find all past_due subscriptions
  const pastDueSubs = await db.subscription.findMany({
    where: { status: "past_due" },
    include: { organization: { include: { billingAccount: true } } },
  });

  for (const sub of pastDueSubs) {
    const account = sub.organization?.billingAccount;
    if (!account) continue;

    // Get last dunning attempt for this subscription
    const lastAttempt = await db.billingDunningAttempt.findFirst({
      where: { subscriptionId: sub.id },
      orderBy: { attemptNumber: "desc" },
    });

    const nextAttemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;
    const scheduleEntry = DUNNING_SCHEDULE.find((s) => s.attempt === nextAttemptNumber);

    // If no more retries in schedule, cancel the subscription
    if (!scheduleEntry) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "canceled", cancelAtPeriodEnd: false },
      });
      await db.billingDunningAttempt.create({
        data: {
          orgId: sub.orgId,
          subscriptionId: sub.id,
          attemptNumber: nextAttemptNumber,
          scheduledAt: now,
          executedAt: now,
          status: "EXHAUSTED" as DunningStatus,
        },
      });
      canceled++;
      continue;
    }

    // Check if enough time has passed since subscription went past_due
    const daysSincePastDue = getDaysSinceStatusChange(sub.currentPeriodEnd);
    if (daysSincePastDue < scheduleEntry.dayOffset) {
      continue; // Not yet time for this attempt
    }

    // Skip if already attempted today
    if (lastAttempt?.executedAt) {
      const lastAttemptDate = new Date(lastAttempt.executedAt);
      if (isSameDay(lastAttemptDate, now)) continue;
    }

    processed++;

    // Execute retry based on gateway
    let result: { success: boolean; error?: string };
    const gateway = account.gateway;

    if (gateway === "STRIPE" && sub.stripeSubId) {
      result = await retryStripePayment(sub.stripeSubId);
    } else if (gateway === "RAZORPAY" && sub.razorpaySubId) {
      result = await retryRazorpayPayment(sub.razorpaySubId);
    } else {
      result = { success: false, error: "No gateway subscription ID found" };
    }

    // Record the attempt
    const status: DunningStatus = result.success ? "SUCCESS" : "FAILED";
    await db.billingDunningAttempt.create({
      data: {
        orgId: sub.orgId,
        subscriptionId: sub.id,
        attemptNumber: nextAttemptNumber,
        scheduledAt: now,
        executedAt: now,
        status,
        metadata: result.error ? { error: result.error } : undefined,
      },
    });

    if (result.success) {
      // Reactivate subscription
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "active" },
      });
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed, succeeded, failed, canceled };
}

/**
 * Get dunning history for an org's subscription.
 */
export async function getDunningHistory(orgId: string) {
  return db.billingDunningAttempt.findMany({
    where: { orgId },
    orderBy: { scheduledAt: "desc" },
    take: 20,
  });
}

/**
 * Schedule the next dunning attempt (for display purposes).
 */
export async function getNextDunningAttempt(subscriptionId: string): Promise<{
  attemptNumber: number;
  scheduledDay: number;
  willCancel: boolean;
} | null> {
  const lastAttempt = await db.billingDunningAttempt.findFirst({
    where: { subscriptionId },
    orderBy: { attemptNumber: "desc" },
  });

  const nextNumber = (lastAttempt?.attemptNumber ?? 0) + 1;
  const scheduleEntry = DUNNING_SCHEDULE.find((s) => s.attempt === nextNumber);

  if (!scheduleEntry) {
    return { attemptNumber: nextNumber, scheduledDay: 30, willCancel: true };
  }

  return {
    attemptNumber: nextNumber,
    scheduledDay: scheduleEntry.dayOffset,
    willCancel: false,
  };
}

function getDaysSinceStatusChange(periodEnd: Date | null): number {
  if (!periodEnd) return 0;
  const now = new Date();
  const diff = now.getTime() - new Date(periodEnd).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
