"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import {
  listInsights,
  getInsightDetail,
  acknowledgeInsight,
  dismissInsight,
  resolveInsight,
  getInsightSummary,
  type InsightFilters,
} from "@/lib/intel/insights";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

async function assertAiInsightsPlan(orgId: string): Promise<{ allowed: boolean; error?: string }> {
  const plan = await getOrgPlan(orgId);
  if (!plan.limits.aiInsights) {
    return { allowed: false, error: "AI Insights require a Pro or Enterprise plan." };
  }
  return { allowed: true };
}

export async function listInsightsAction(
  filters: InsightFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof listInsights>>>> {
  const { orgId } = await requireOrgContext();
  const gate = await assertAiInsightsPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  try {
    const data = await listInsights(orgId, filters);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to load insights" };
  }
}

export async function getInsightDetailAction(
  insightId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getInsightDetail>>>> {
  const { orgId } = await requireOrgContext();
  const gate = await assertAiInsightsPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  try {
    const data = await getInsightDetail(orgId, insightId);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to load insight" };
  }
}

export async function getInsightSummaryAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getInsightSummary>>>
> {
  const { orgId } = await requireOrgContext();
  const gate = await assertAiInsightsPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  try {
    const data = await getInsightSummary(orgId);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to load insight summary" };
  }
}

export async function acknowledgeInsightAction(
  insightId: string,
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();
  const gate = await assertAiInsightsPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const result = await acknowledgeInsight(orgId, insightId, userId);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}

export async function dismissInsightAction(
  insightId: string,
  reason?: string,
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();
  const gate = await assertAiInsightsPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const result = await dismissInsight(orgId, insightId, userId, reason);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}

export async function resolveInsightAction(
  insightId: string,
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");
  const gate = await assertAiInsightsPlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const result = await resolveInsight(orgId, insightId, userId);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}
