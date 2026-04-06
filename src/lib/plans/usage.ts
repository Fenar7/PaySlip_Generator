import "server-only";

import { db } from "@/lib/db";

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function incrementUsage(
  orgId: string,
  resource: string,
  count: number = 1
): Promise<void> {
  const periodMonth = getCurrentPeriod();

  await db.usageRecord.upsert({
    where: {
      orgId_resource_periodMonth: { orgId, resource, periodMonth },
    },
    create: {
      orgId,
      resource,
      periodMonth,
      count,
    },
    update: {
      count: { increment: count },
    },
  });
}

export async function decrementUsage(
  orgId: string,
  resource: string,
  count: number = 1
): Promise<void> {
  const periodMonth = getCurrentPeriod();

  const existing = await db.usageRecord.findUnique({
    where: {
      orgId_resource_periodMonth: { orgId, resource, periodMonth },
    },
  });

  if (!existing) return;

  const newCount = Math.max(0, existing.count - count);

  await db.usageRecord.update({
    where: {
      orgId_resource_periodMonth: { orgId, resource, periodMonth },
    },
    data: { count: newCount },
  });
}

export async function getMonthlyUsage(
  orgId: string,
  resource: string
): Promise<number> {
  const periodMonth = getCurrentPeriod();

  const record = await db.usageRecord.findUnique({
    where: {
      orgId_resource_periodMonth: { orgId, resource, periodMonth },
    },
  });

  return record?.count ?? 0;
}

export async function getAllUsage(
  orgId: string
): Promise<Record<string, number>> {
  const periodMonth = getCurrentPeriod();

  const records = await db.usageRecord.findMany({
    where: { orgId, periodMonth },
  });

  const usage: Record<string, number> = {};
  for (const record of records) {
    usage[record.resource] = record.count;
  }
  return usage;
}

export async function resetMonthlyUsage(orgId: string): Promise<void> {
  const currentPeriod = getCurrentPeriod();

  await db.usageRecord.deleteMany({
    where: {
      orgId,
      periodMonth: { not: currentPeriod },
    },
  });
}
