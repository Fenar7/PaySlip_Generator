import "server-only";

import { db } from "@/lib/db";
import type { PlanId, PlanLimits } from "./config";
import { getPlanLimits } from "./config";
import { getMonthlyUsage } from "./usage";

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "enterprise"];

export async function getOrgPlan(orgId: string): Promise<{
  planId: PlanId;
  status: string;
  limits: PlanLimits;
  trialEndsAt?: Date | null;
}> {
  const subscription = await db.subscription.findUnique({
    where: { orgId },
  });

  if (!subscription) {
    return {
      planId: "free",
      status: "active",
      limits: getPlanLimits("free"),
      trialEndsAt: null,
    };
  }

  const planId = (PLAN_ORDER.includes(subscription.planId as PlanId)
    ? subscription.planId
    : "free") as PlanId;

  return {
    planId,
    status: subscription.status,
    limits: getPlanLimits(planId),
    trialEndsAt: subscription.trialEndsAt,
  };
}

export async function checkLimit(
  orgId: string,
  resource: string
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  planId: PlanId;
}> {
  const orgPlan = await getOrgPlan(orgId);
  const limits = orgPlan.limits;
  const limit = (limits as unknown as Record<string, number | boolean>)[resource];

  if (typeof limit !== "number") {
    return { allowed: true, current: 0, limit: 0, planId: orgPlan.planId };
  }

  // -1 means unlimited
  if (limit === -1) {
    const current = await getMonthlyUsage(orgId, resource);
    return { allowed: true, current, limit: -1, planId: orgPlan.planId };
  }

  const current = await getMonthlyUsage(orgId, resource);

  return {
    allowed: current < limit,
    current,
    limit,
    planId: orgPlan.planId,
  };
}

export async function checkFeature(
  orgId: string,
  feature: keyof PlanLimits
): Promise<boolean> {
  const orgPlan = await getOrgPlan(orgId);
  const value = orgPlan.limits[feature];
  return typeof value === "boolean" ? value : false;
}

/**
 * Like checkFeature but throws if the feature is not available.
 * Use in server actions to enforce plan gates.
 */
export async function requireFeature(
  orgId: string,
  feature: keyof PlanLimits
): Promise<void> {
  const allowed = await checkFeature(orgId, feature);
  if (!allowed) {
    throw new Error(
      `This feature requires a plan that includes "${feature}". Please upgrade your plan.`
    );
  }
}

export async function requirePlan(
  orgId: string,
  minimumPlan: PlanId
): Promise<void> {
  const orgPlan = await getOrgPlan(orgId);
  const currentIndex = PLAN_ORDER.indexOf(orgPlan.planId);
  const requiredIndex = PLAN_ORDER.indexOf(minimumPlan);

  if (currentIndex < requiredIndex) {
    throw new Error(
      `This feature requires the ${minimumPlan} plan or higher. Current plan: ${orgPlan.planId}`
    );
  }
}

export function isTrialExpired(subscription: {
  status: string;
  trialEndsAt: Date | null;
}): boolean {
  if (subscription.status !== "trialing") return false;
  if (!subscription.trialEndsAt) return false;
  return new Date() > subscription.trialEndsAt;
}
