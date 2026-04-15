"use server";

import { requireOrgContext } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import {
  getCustomerHealthSnapshot,
  computeCustomerHealth,
  getCollectionQueue,
} from "@/lib/intel/customer-health";
import { db } from "@/lib/db";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

async function assertHealthPlan(orgId: string): Promise<{ allowed: boolean; error?: string }> {
  const plan = await getOrgPlan(orgId);
  if (!plan.limits.customerHealthScores) {
    return { allowed: false, error: "Customer Health Intelligence requires a Pro or Enterprise plan." };
  }
  return { allowed: true };
}

export async function getCustomerHealthAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCustomerHealthSnapshot>>>> {
  const { orgId } = await requireOrgContext();
  const gate = await assertHealthPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const data = await getCustomerHealthSnapshot(orgId, customerId);
  return { success: true, data };
}

export async function refreshCustomerHealthAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof computeCustomerHealth>>>> {
  const { orgId } = await requireOrgContext();
  const gate = await assertHealthPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const data = await computeCustomerHealth(orgId, customerId);
  return { success: true, data };
}

export async function getCollectionQueueAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getCollectionQueue>>>
> {
  const { orgId } = await requireOrgContext();
  const gate = await assertHealthPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const data = await getCollectionQueue(orgId);
  return { success: true, data };
}

export async function listCustomersWithHealthAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      score: number | null;
      riskBand: string | null;
      snapshotAge: string | null;
    }>
  >
> {
  const { orgId } = await requireOrgContext();
  const gate = await assertHealthPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const customers = await db.customer.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  const now = new Date();
  const snapshots = await db.customerHealthSnapshot.findMany({
    where: { orgId, validUntil: { gt: now } },
    orderBy: { calculatedAt: "desc" },
    distinct: ["customerId"],
    select: {
      customerId: true,
      score: true,
      riskBand: true,
      calculatedAt: true,
    },
  });

  const snapshotMap = new Map(snapshots.map((s) => [s.customerId, s]));
  const ONE_DAY = 1000 * 60 * 60 * 24;

  const result = customers.map((c) => {
    const snap = snapshotMap.get(c.id);
    const ageDays = snap
      ? Math.floor((now.getTime() - snap.calculatedAt.getTime()) / ONE_DAY)
      : null;
    return {
      id: c.id,
      name: c.name,
      score: snap?.score ?? null,
      riskBand: snap?.riskBand ?? null,
      snapshotAge: ageDays !== null ? `${ageDays}d ago` : null,
    };
  });

  return { success: true, data: result };
}
