"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { runAnomalyDetection, listAnomalyInsights, listAnomalyRuns } from "@/lib/intel/anomalies";
import { acknowledgeInsight, dismissInsight, resolveInsight, getInsightDetail } from "@/lib/intel/insights";

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

async function requireAnomalyAccess() {
  const ctx = await requireOrgContext();
  const plan = await getOrgPlan(ctx.orgId);
  if (!plan.limits.anomalyDetection) {
    throw new Error("Anomaly detection requires a Pro or Enterprise plan");
  }
  return ctx;
}

export async function getAnomalyDashboardAction(): Promise<
  ActionResult<{
    anomalies: Awaited<ReturnType<typeof listAnomalyInsights>>;
    recentRuns: Awaited<ReturnType<typeof listAnomalyRuns>>;
  }>
> {
  try {
    const ctx = await requireAnomalyAccess();
    const [anomalies, recentRuns] = await Promise.all([
      listAnomalyInsights(ctx.orgId),
      listAnomalyRuns(ctx.orgId, 5),
    ]);
    return { success: true, data: { anomalies, recentRuns } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load anomaly dashboard" };
  }
}

export async function triggerAnomalyDetectionAction(): Promise<
  ActionResult<{ runId: string; insightsCreated: number; rulesEvaluated: number }>
> {
  try {
    const ctx = await requireRole("admin");
    const plan = await getOrgPlan(ctx.orgId);
    if (!plan.limits.anomalyDetection) {
      return { success: false, error: "Anomaly detection requires a Pro or Enterprise plan" };
    }
    const result = await runAnomalyDetection(ctx.orgId);
    return {
      success: true,
      data: { runId: result.runId, insightsCreated: result.insightsCreated, rulesEvaluated: result.rulesEvaluated },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Anomaly detection run failed" };
  }
}

export async function getAnomalyDetailAction(anomalyId: string): Promise<
  ActionResult<Awaited<ReturnType<typeof getInsightDetail>>>
> {
  try {
    const ctx = await requireAnomalyAccess();
    const detail = await getInsightDetail(ctx.orgId, anomalyId);
    if (!detail) return { success: false, error: "Anomaly not found" };
    return { success: true, data: detail };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load anomaly" };
  }
}

export async function acknowledgeAnomalyAction(anomalyId: string): Promise<ActionResult> {
  try {
    const ctx = await requireAnomalyAccess();
    const result = await acknowledgeInsight(ctx.orgId, anomalyId, ctx.userId);
    if (!result.success) return { success: false, error: result.error ?? "Failed to acknowledge" };
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to acknowledge anomaly" };
  }
}

export async function dismissAnomalyAction(anomalyId: string, reason?: string): Promise<ActionResult> {
  try {
    const ctx = await requireAnomalyAccess();
    const result = await dismissInsight(ctx.orgId, anomalyId, ctx.userId, reason);
    if (!result.success) return { success: false, error: result.error ?? "Failed to dismiss" };
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to dismiss anomaly" };
  }
}

export async function resolveAnomalyAction(anomalyId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("admin");
    const result = await resolveInsight(ctx.orgId, anomalyId, ctx.userId);
    if (!result.success) return { success: false, error: result.error ?? "Failed to resolve" };
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to resolve anomaly" };
  }
}
