import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "paused";

export async function getOrCreateSubscription(orgId: string) {
  let sub = await db.subscription.findUnique({ where: { orgId } });

  if (!sub) {
    sub = await db.subscription.create({
      data: {
        orgId,
        planId: "free",
        status: "active",
      },
    });
  }

  return sub;
}

export async function updateSubscriptionFromWebhook(params: {
  orgId?: string;
  razorpaySubId: string;
  planId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
}) {
  const where = params.orgId
    ? { orgId: params.orgId }
    : { razorpaySubId: params.razorpaySubId };

  return db.subscription.update({
    where,
    data: {
      ...(params.planId && { planId: params.planId }),
      status: params.status,
      ...(params.currentPeriodStart && {
        currentPeriodStart: params.currentPeriodStart,
      }),
      ...(params.currentPeriodEnd && {
        currentPeriodEnd: params.currentPeriodEnd,
      }),
      ...(params.cancelledAt && { cancelledAt: params.cancelledAt }),
    },
  });
}

export async function startTrial(
  orgId: string,
  planId: string,
  trialDays: number = 14,
) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  return db.subscription.upsert({
    where: { orgId },
    create: {
      orgId,
      planId,
      status: "trialing",
      trialEndsAt,
    },
    update: {
      planId,
      status: "trialing",
      trialEndsAt,
    },
  });
}

export async function recordRazorpayEvent(
  eventId: string,
  type: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await db.razorpayEvent.create({
      data: {
        id: eventId,
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return false;
    }
    throw error;
  }
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function pauseSubscription(
  orgId: string,
  resumeAt?: Date,
  reason?: string,
): Promise<ActionResult<{ pausedAt: Date }>> {
  const { pauseRazorpaySubscription } = await import("@/lib/razorpay");

  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) return { success: false, error: "Subscription not found" };
  if (!sub.razorpaySubId)
    return { success: false, error: "No active Razorpay subscription" };
  if (sub.status === "paused")
    return { success: false, error: "Subscription already paused" };

  try {
    await pauseRazorpaySubscription(sub.razorpaySubId, "now");
  } catch (err) {
    console.error("[Billing] pause error:", err);
    return { success: false, error: "Failed to pause subscription on Razorpay" };
  }

  const now = new Date();
  await db.subscription.update({
    where: { orgId },
    data: {
      status: "paused",
      pausedAt: now,
      pausedUntil: resumeAt ?? null,
      pauseReason: reason ?? null,
    },
  });

  return { success: true, data: { pausedAt: now } };
}

export async function resumeSubscription(
  orgId: string,
): Promise<ActionResult<{ resumedAt: Date }>> {
  const { resumeRazorpaySubscription } = await import("@/lib/razorpay");

  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) return { success: false, error: "Subscription not found" };
  if (!sub.razorpaySubId)
    return { success: false, error: "No active Razorpay subscription" };
  if (sub.status !== "paused")
    return { success: false, error: "Subscription is not paused" };

  try {
    await resumeRazorpaySubscription(sub.razorpaySubId);
  } catch (err) {
    console.error("[Billing] resume error:", err);
    return { success: false, error: "Failed to resume subscription on Razorpay" };
  }

  const now = new Date();
  await db.subscription.update({
    where: { orgId },
    data: {
      status: "active",
      pausedAt: null,
      pausedUntil: null,
      pauseReason: null,
    },
  });

  return { success: true, data: { resumedAt: now } };
}

export async function changePlan(
  orgId: string,
  newPlanId: string,
  billingInterval: "monthly" | "yearly",
  immediate: boolean = false,
): Promise<ActionResult<{ planId: string }>> {
  const { changeSubscriptionPlan } = await import("@/lib/razorpay");

  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) return { success: false, error: "Subscription not found" };
  if (!sub.razorpaySubId)
    return { success: false, error: "No active Razorpay subscription" };

  try {
    await changeSubscriptionPlan(sub.razorpaySubId, newPlanId, immediate);
  } catch (err) {
    console.error("[Billing] changePlan error:", err);
    return { success: false, error: "Failed to change plan on Razorpay" };
  }

  await db.subscription.update({
    where: { orgId },
    data: {
      planId: newPlanId,
      razorpayPlanId: newPlanId,
      billingInterval,
    },
  });

  return { success: true, data: { planId: newPlanId } };
}

export async function createBillingInvoice(
  orgId: string,
  params: {
    razorpayInvoiceId?: string;
    razorpayPaymentId?: string;
    planId: string;
    amountPaise: bigint | number;
    currency?: string;
    periodStart: Date;
    periodEnd: Date;
    status?: string;
    pdfUrl?: string;
  },
) {
  return db.billingInvoice.create({
    data: {
      orgId,
      razorpayInvoiceId: params.razorpayInvoiceId,
      razorpayPaymentId: params.razorpayPaymentId,
      planId: params.planId,
      amountPaise: BigInt(params.amountPaise),
      currency: params.currency ?? "INR",
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      status: params.status ?? "paid",
      pdfUrl: params.pdfUrl,
    },
  });
}
