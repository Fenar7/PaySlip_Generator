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
