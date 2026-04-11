import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getActiveOrg } from "@/lib/multi-org";
import type { BillingInterval, PlanId } from "@/lib/plans/config";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "paused";

type BillingOrgResolution =
  | { success: true; orgId: string }
  | { success: false; error: string; status: 400 | 403 };

type BillingCustomerResolution =
  | { success: true; data: { email: string; name: string } }
  | { success: false; error: string };

type AuthBillingUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string | null;
    name?: string | null;
  } | null;
};

export async function resolveBillingOrgId(
  userId: string,
  requestedOrgId?: string,
): Promise<BillingOrgResolution> {
  if (requestedOrgId) {
    const member = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: requestedOrgId,
          userId,
        },
      },
      select: { organizationId: true },
    });

    if (!member) {
      return {
        success: false,
        error: "Unauthorized for this org",
        status: 403,
      };
    }

    return { success: true, orgId: member.organizationId };
  }

  const activeOrg = await getActiveOrg(userId);
  if (!activeOrg) {
    return {
      success: false,
      error: "No organization context available",
      status: 400,
    };
  }

  return { success: true, orgId: activeOrg.id };
}

export async function resolveBillingCustomer(
  user: AuthBillingUser,
): Promise<BillingCustomerResolution> {
  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });

  const email = profile?.email ?? user.email ?? null;
  const name =
    profile?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    email?.split("@")[0] ??
    null;

  if (!email || !name) {
    return {
      success: false,
      error: "Billing contact details are missing for this account",
    };
  }

  return {
    success: true,
    data: { email, name },
  };
}

const RAZORPAY_PLAN_ENV_KEYS: Record<
  Exclude<PlanId, "free">,
  Record<BillingInterval, keyof NodeJS.ProcessEnv>
> = {
  starter: {
    monthly: "RAZORPAY_PLAN_STARTER_MONTHLY",
    yearly: "RAZORPAY_PLAN_STARTER_YEARLY",
  },
  pro: {
    monthly: "RAZORPAY_PLAN_PRO_MONTHLY",
    yearly: "RAZORPAY_PLAN_PRO_YEARLY",
  },
  enterprise: {
    monthly: "RAZORPAY_PLAN_ENTERPRISE_MONTHLY",
    yearly: "RAZORPAY_PLAN_ENTERPRISE_YEARLY",
  },
};

export function getRazorpayPlanId(
  planId: PlanId,
  billingInterval: BillingInterval,
): string | null {
  if (planId === "free") {
    return null;
  }

  const envKey = RAZORPAY_PLAN_ENV_KEYS[planId][billingInterval];
  return process.env[envKey] ?? null;
}

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
    const razorpaySubscription = await pauseRazorpaySubscription(
      sub.razorpaySubId,
      "now",
    );
    if (!razorpaySubscription) {
      return { success: false, error: "Billing is not configured" };
    }
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
    const razorpaySubscription = await resumeRazorpaySubscription(
      sub.razorpaySubId,
    );
    if (!razorpaySubscription) {
      return { success: false, error: "Billing is not configured" };
    }
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
  newPlanId: PlanId,
  billingInterval: BillingInterval,
  immediate: boolean = false,
): Promise<ActionResult<{ planId: string }>> {
  const { changeSubscriptionPlan } = await import("@/lib/razorpay");

  if (newPlanId === "free") {
    return {
      success: false,
      error: "Use cancellation to move an org back to the Free plan",
    };
  }

  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) return { success: false, error: "Subscription not found" };
  if (!sub.razorpaySubId)
    return { success: false, error: "No active Razorpay subscription" };

  const razorpayPlanId = getRazorpayPlanId(newPlanId, billingInterval);
  if (!razorpayPlanId) {
    return {
      success: false,
      error: `Missing Razorpay plan ID for ${newPlanId} (${billingInterval})`,
    };
  }

  try {
    const razorpaySubscription = await changeSubscriptionPlan(
      sub.razorpaySubId,
      razorpayPlanId,
      immediate,
    );
    if (!razorpaySubscription) {
      return { success: false, error: "Billing is not configured" };
    }
  } catch (err) {
    console.error("[Billing] changePlan error:", err);
    return { success: false, error: "Failed to change plan on Razorpay" };
  }

  await db.subscription.update({
    where: { orgId },
    data: {
      planId: newPlanId,
      razorpayPlanId,
      billingInterval,
    },
  });

  return { success: true, data: { planId: newPlanId } };
}

export async function cancelSubscription(
  orgId: string,
  cancelAtPeriodEnd: boolean = true,
): Promise<ActionResult<{ cancelledAtPeriodEnd: boolean }>> {
  const { cancelRazorpaySubscription } = await import("@/lib/razorpay");

  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) {
    return { success: false, error: "Subscription not found" };
  }
  if (!sub.razorpaySubId) {
    return { success: false, error: "No active Razorpay subscription" };
  }
  if (sub.status === "cancelled") {
    return { success: false, error: "Subscription is already cancelled" };
  }

  try {
    const razorpaySubscription = await cancelRazorpaySubscription(
      sub.razorpaySubId,
      cancelAtPeriodEnd,
    );
    if (!razorpaySubscription) {
      return { success: false, error: "Billing is not configured" };
    }
  } catch (err) {
    console.error("[Billing] cancel error:", err);
    return { success: false, error: "Failed to cancel subscription on Razorpay" };
  }

  await db.subscription.update({
    where: { orgId },
    data: {
      cancelAtPeriodEnd,
      ...(cancelAtPeriodEnd
        ? {}
        : { status: "cancelled", cancelledAt: new Date() }),
    },
  });

  return { success: true, data: { cancelledAtPeriodEnd: cancelAtPeriodEnd } };
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
