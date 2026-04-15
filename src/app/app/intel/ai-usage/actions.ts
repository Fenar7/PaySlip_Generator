"use server";

import { requireOrgContext } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { getUsageSummary, checkProviderHealth } from "@/lib/ai/governance";

export type AiUsageSummaryResult = {
  success: true;
  data: {
    totalThisMonth: number;
    successRate: number;
    byFeature: Array<{ feature: string; count: number; successRate: number }>;
    providerHealth: Awaited<ReturnType<typeof checkProviderHealth>>;
    planLimits: { aiRunsPerMonth: number; documentIntelligence: boolean; aiInsights: boolean; anomalyDetection: boolean };
    currentMonthUsage: number;
  };
} | { success: false; error: string };

export async function getAiUsageDashboardAction(): Promise<AiUsageSummaryResult> {
  const ctx = await requireOrgContext();
  await requireRole("admin");

  const plan = await getOrgPlan(ctx.orgId);
  if (!plan.limits.aiInsights && !plan.limits.documentIntelligence && !plan.limits.anomalyDetection) {
    return { success: false, error: "AI features are not available on your current plan." };
  }

  const [summary, health] = await Promise.all([
    getUsageSummary(ctx.orgId),
    checkProviderHealth(),
  ]);

  return {
    success: true,
    data: {
      totalThisMonth: summary.totalThisMonth,
      successRate: summary.successRate,
      byFeature: summary.byFeature,
      providerHealth: health,
      planLimits: {
        aiRunsPerMonth: plan.limits.aiRunsPerMonth,
        documentIntelligence: plan.limits.documentIntelligence,
        aiInsights: plan.limits.aiInsights,
        anomalyDetection: plan.limits.anomalyDetection,
      },
      currentMonthUsage: summary.totalThisMonth,
    },
  };
}

export type RecentAiJobsResult = {
  success: true;
  jobs: Array<{
    id: string;
    feature: string;
    provider: string;
    model: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
  }>;
} | { success: false; error: string };

export async function listRecentAiJobsAction(): Promise<RecentAiJobsResult> {
  const ctx = await requireOrgContext();
  await requireRole("admin");

  const jobs = await db.aiJob.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      feature: true,
      provider: true,
      model: true,
      status: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  return { success: true, jobs };
}
