/**
 * Phase 28.1: Usage Metering Service
 *
 * Tracks per-org resource consumption and calculates overages against plan limits.
 * Overage charges are accumulated per billing period and settled at period end.
 */

import { db } from "@/lib/db";
import { getOrgPlan } from "@/lib/plans/enforcement";
import type { OverageCalculation } from "./types";
import { OVERAGE_RATES_PAISE } from "./types";

/**
 * Resource-to-plan-limit mapping.
 * Maps metering resource names to PlanLimits field names.
 */
const RESOURCE_LIMIT_MAP: Record<string, string> = {
  pdf_jobs: "pdfExportsPerMonth",
  pixel_jobs: "pixelJobsSaved",
  api_requests: "pdfExportsPerMonth", // reuse as general API metering
  storage_gb: "storageBytes",
  email_sends: "emailSendsPerMonth",
};

/**
 * Get the current billing period boundaries for an org.
 */
export function getCurrentPeriod(): { periodMonth: string; periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodMonth, periodStart, periodEnd };
}

/**
 * Record a usage event for a specific resource.
 * Increments the count atomically via upsert.
 */
export async function recordUsage(orgId: string, resource: string, units: number = 1): Promise<void> {
  const { periodMonth } = getCurrentPeriod();

  await db.usageRecord.upsert({
    where: { orgId_resource_periodMonth: { orgId, resource, periodMonth } },
    update: { count: { increment: units } },
    create: { orgId, resource, periodMonth, count: units },
  });
}

/**
 * Get current usage for all metered resources for an org in the current period.
 */
export async function getCurrentUsage(orgId: string): Promise<Record<string, number>> {
  const { periodMonth } = getCurrentPeriod();

  const records = await db.usageRecord.findMany({
    where: { orgId, periodMonth },
    select: { resource: true, count: true },
  });

  const usage: Record<string, number> = {};
  for (const r of records) {
    usage[r.resource] = r.count;
  }
  return usage;
}

/**
 * Check if a specific resource has hit its limit (hard block for free tier).
 */
export async function checkResourceLimit(
  orgId: string,
  resource: string,
): Promise<{ allowed: boolean; current: number; limit: number; usagePercent: number }> {
  const { periodMonth } = getCurrentPeriod();
  const { planId, limits } = await getOrgPlan(orgId);

  const limitField = RESOURCE_LIMIT_MAP[resource];
  const limit = limitField
    ? (limits as unknown as Record<string, number>)[limitField] ?? -1
    : -1;

  // -1 = unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, usagePercent: 0 };
  }

  const record = await db.usageRecord.findUnique({
    where: { orgId_resource_periodMonth: { orgId, resource, periodMonth } },
    select: { count: true },
  });

  const current = record?.count ?? 0;
  const usagePercent = limit > 0 ? Math.round((current / limit) * 100) : 0;

  // Free tier: hard block at 100%
  if (planId === "free") {
    return { allowed: current < limit, current, limit, usagePercent };
  }

  // Paid tiers: allow overage (soft limit)
  return { allowed: true, current, limit, usagePercent };
}

/**
 * Calculate overage for all metered resources for an org.
 * Called by the overage cron job at period end.
 */
export async function calculateOverages(orgId: string): Promise<OverageCalculation[]> {
  const { limits } = await getOrgPlan(orgId);
  const usage = await getCurrentUsage(orgId);
  const overages: OverageCalculation[] = [];

  for (const [resource, ratePaise] of Object.entries(OVERAGE_RATES_PAISE)) {
    const limitField = RESOURCE_LIMIT_MAP[resource];
    if (!limitField) continue;

    const includedUnits = (limits as unknown as Record<string, number>)[limitField] ?? 0;
    if (includedUnits === -1) continue; // unlimited

    const usedUnits = usage[resource] ?? 0;
    if (usedUnits <= includedUnits) continue;

    const overageUnits = usedUnits - includedUnits;
    const overageAmountPaise = BigInt(overageUnits) * ratePaise;

    overages.push({
      resource,
      includedUnits,
      usedUnits,
      overageUnits,
      overageRatePaise: ratePaise,
      overageAmountPaise,
    });
  }

  return overages;
}

/**
 * Persist overage calculations and return total amount.
 */
export async function persistOverages(orgId: string): Promise<bigint> {
  const overages = await calculateOverages(orgId);
  if (overages.length === 0) return BigInt(0);

  const account = await db.billingAccount.findUnique({ where: { orgId } });
  if (!account) return BigInt(0);

  const { periodMonth } = getCurrentPeriod();
  let totalPaise = BigInt(0);

  for (const overage of overages) {
    await db.overageLine.upsert({
      where: {
        billingAccountId_resource_periodMonth: {
          billingAccountId: account.id,
          resource: overage.resource,
          periodMonth,
        },
      },
      update: {
        usedUnits: overage.usedUnits,
        overageUnits: overage.overageUnits,
        overageRate: overage.overageRatePaise,
        overageAmount: overage.overageAmountPaise,
      },
      create: {
        billingAccountId: account.id,
        resource: overage.resource,
        periodMonth,
        includedUnits: overage.includedUnits,
        usedUnits: overage.usedUnits,
        overageUnits: overage.overageUnits,
        overageRate: overage.overageRatePaise,
        overageAmount: overage.overageAmountPaise,
      },
    });

    totalPaise += overage.overageAmountPaise;
  }

  return totalPaise;
}

/**
 * Check if usage is approaching the threshold (80%) for warning.
 */
export async function getUsageWarnings(orgId: string): Promise<Array<{ resource: string; percent: number }>> {
  const usage = await getCurrentUsage(orgId);
  const { limits } = await getOrgPlan(orgId);
  const warnings: Array<{ resource: string; percent: number }> = [];

  for (const [resource, limitField] of Object.entries(RESOURCE_LIMIT_MAP)) {
    const limit = (limits as unknown as Record<string, number>)[limitField] ?? -1;
    if (limit === -1) continue;

    const current = usage[resource] ?? 0;
    const percent = limit > 0 ? Math.round((current / limit) * 100) : 0;
    if (percent >= 80) {
      warnings.push({ resource, percent });
    }
  }

  return warnings;
}
