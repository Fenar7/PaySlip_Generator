"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { runAnomalyDetection, listAnomalyInsights, listAnomalyRuns } from "@/lib/intel/anomalies";
import { acknowledgeInsight, dismissInsight, resolveInsight, getInsightDetail } from "@/lib/intel/insights";
import { requirePartnerClientAccess, PartnerAccessError } from "@/lib/partners/access";

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

// ─── Partner-managed-client anomaly actions ───────────────────────────────────
//
// Partners access their managed clients' anomalies through a separate set of
// actions that enforce requirePartnerClientAccess() before touching any client
// org data. Normal own-org actions above are unchanged and remain org-scoped.

/**
 * Fetch anomaly dashboard for a partner-managed client org.
 * Requires the caller's org to be an approved partner with anomaly_read scope
 * for the given clientOrgId.
 */
export async function getPartnerClientAnomaliesAction(
  clientOrgId: string,
): Promise<
  ActionResult<{
    anomalies: Awaited<ReturnType<typeof listAnomalyInsights>>;
    recentRuns: Awaited<ReturnType<typeof listAnomalyRuns>>;
  }>
> {
  try {
    const ctx = await requireOrgContext();
    await requirePartnerClientAccess(ctx.orgId, clientOrgId, "anomaly_read");

    const [anomalies, recentRuns] = await Promise.all([
      listAnomalyInsights(clientOrgId),
      listAnomalyRuns(clientOrgId, 5),
    ]);
    return { success: true, data: { anomalies, recentRuns } };
  } catch (err) {
    if (err instanceof PartnerAccessError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to load client anomalies" };
  }
}

/**
 * Acknowledge an anomaly in a partner-managed client org.
 * Requires anomaly_write scope on the client org.
 */
export async function acknowledgePartnerClientAnomalyAction(
  clientOrgId: string,
  anomalyId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireOrgContext();
    await requirePartnerClientAccess(ctx.orgId, clientOrgId, "anomaly_write");
    const result = await acknowledgeInsight(clientOrgId, anomalyId, ctx.userId);
    if (!result.success) return { success: false, error: result.error ?? "Failed to acknowledge" };
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PartnerAccessError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to acknowledge anomaly" };
  }
}

/**
 * Dismiss an anomaly in a partner-managed client org.
 * Requires anomaly_write scope on the client org.
 */
export async function dismissPartnerClientAnomalyAction(
  clientOrgId: string,
  anomalyId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireOrgContext();
    await requirePartnerClientAccess(ctx.orgId, clientOrgId, "anomaly_write");
    const result = await dismissInsight(clientOrgId, anomalyId, ctx.userId, reason);
    if (!result.success) return { success: false, error: result.error ?? "Failed to dismiss" };
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PartnerAccessError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to dismiss anomaly" };
  }
}

// ─── Existing own-org actions (unchanged) ─────────────────────────────────────

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
