import "server-only";

import { db } from "@/lib/db";
import type {
  IntelInsightStatus,
  IntelInsightSeverity,
  IntelInsightCategory,
  InsightSourceType,
} from "@/generated/prisma/client";

export type { IntelInsightStatus, IntelInsightSeverity, IntelInsightCategory, InsightSourceType };

export interface InsightFilters {
  status?: IntelInsightStatus[];
  category?: IntelInsightCategory[];
  severity?: IntelInsightSeverity[];
}

export interface InsightListItem {
  id: string;
  category: IntelInsightCategory;
  severity: IntelInsightSeverity;
  status: IntelInsightStatus;
  title: string;
  summary: string;
  sourceType: InsightSourceType;
  recommendedActionType: string | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  expiresAt: Date | null;
}

export interface InsightDetail extends InsightListItem {
  evidence: unknown;
  sourceRecordType: string | null;
  sourceRecordId: string | null;
  assignedRole: string | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  dismissedAt: Date | null;
  dismissedReason: string | null;
  events: Array<{
    id: string;
    eventType: string;
    actorLabel: string | null;
    metadata: unknown;
    createdAt: Date;
  }>;
}

export interface UpsertInsightParams {
  orgId: string;
  category: IntelInsightCategory;
  severity: IntelInsightSeverity;
  title: string;
  summary: string;
  evidence?: unknown;
  sourceType: InsightSourceType;
  sourceRecordType?: string;
  sourceRecordId?: string;
  recommendedActionType?: string;
  assignedRole?: string;
  createdByJobId?: string;
  /** If provided, only one active insight with this key per org (deduplication) */
  dedupeKey?: string;
  expiresAt?: Date;
}

export interface UpsertInsightResult {
  id: string;
  /** True when a new insight record was created; false when an existing one was refreshed. */
  wasCreated: boolean;
}

/**
 * Create a new insight, or refresh an existing active one by dedupeKey.
 * Emits CREATED or UPDATED events accordingly.
 * Returns the insight ID and whether it was newly created vs refreshed.
 */
export async function upsertInsight(params: UpsertInsightParams): Promise<UpsertInsightResult> {
  const now = new Date();

  if (params.dedupeKey) {
    const existing = await db.intelInsight.findFirst({
      where: { orgId: params.orgId, dedupeKey: params.dedupeKey },
      select: { id: true, status: true },
    });

    if (existing && existing.status !== "RESOLVED" && existing.status !== "DISMISSED" && existing.status !== "EXPIRED") {
      await db.intelInsight.update({
        where: { id: existing.id },
        data: {
          severity: params.severity,
          title: params.title,
          summary: params.summary,
          evidence: params.evidence as object | undefined,
          lastDetectedAt: now,
          expiresAt: params.expiresAt,
          updatedAt: now,
        },
      });
      await db.insightEvent.create({
        data: { insightId: existing.id, eventType: "UPDATED" },
      });
      return { id: existing.id, wasCreated: false };
    }
  }

  const insight = await db.intelInsight.create({
    data: {
      orgId: params.orgId,
      category: params.category,
      severity: params.severity,
      status: "ACTIVE",
      title: params.title,
      summary: params.summary,
      evidence: params.evidence as object | undefined,
      sourceType: params.sourceType,
      sourceRecordType: params.sourceRecordType,
      sourceRecordId: params.sourceRecordId,
      recommendedActionType: params.recommendedActionType,
      assignedRole: params.assignedRole,
      createdByJobId: params.createdByJobId,
      dedupeKey: params.dedupeKey,
      firstDetectedAt: now,
      lastDetectedAt: now,
      expiresAt: params.expiresAt,
    },
    select: { id: true },
  });

  await db.insightEvent.create({
    data: { insightId: insight.id, eventType: "CREATED" },
  });

  return { id: insight.id, wasCreated: true };
}

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

/** List active insights for an org with optional filters, sorted by severity weight desc. */
export async function listInsights(
  orgId: string,
  filters: InsightFilters = {},
): Promise<InsightListItem[]> {
  const now = new Date();

  const rows = await db.intelInsight.findMany({
    where: {
      orgId,
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
      ...(filters.category?.length ? { category: { in: filters.category } } : {}),
      ...(filters.severity?.length ? { severity: { in: filters.severity } } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ lastDetectedAt: "desc" }],
    select: {
      id: true,
      category: true,
      severity: true,
      status: true,
      title: true,
      summary: true,
      sourceType: true,
      recommendedActionType: true,
      firstDetectedAt: true,
      lastDetectedAt: true,
      expiresAt: true,
    },
    take: 200,
  });

  // Sort by severity weight desc, then lastDetectedAt desc
  return rows.sort((a, b) => {
    const weightDiff = (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0);
    if (weightDiff !== 0) return weightDiff;
    return b.lastDetectedAt.getTime() - a.lastDetectedAt.getTime();
  });
}

/** Get full insight detail with events. */
export async function getInsightDetail(orgId: string, insightId: string): Promise<InsightDetail | null> {
  const row = await db.intelInsight.findFirst({
    where: { id: insightId, orgId },
    include: {
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true, eventType: true, actorLabel: true, metadata: true, createdAt: true },
      },
    },
  });
  if (!row) return null;
  return row as InsightDetail;
}

/** Acknowledge an insight — idempotent. */
export async function acknowledgeInsight(
  orgId: string,
  insightId: string,
  userId: string,
  actorLabel?: string,
): Promise<{ success: boolean; error?: string }> {
  const insight = await db.intelInsight.findFirst({
    where: { id: insightId, orgId },
    select: { status: true },
  });
  if (!insight) return { success: false, error: "Insight not found" };
  if (insight.status === "ACKNOWLEDGED") return { success: true }; // idempotent
  if (insight.status === "DISMISSED" || insight.status === "RESOLVED") {
    return { success: false, error: `Insight is already ${insight.status}` };
  }

  const now = new Date();
  await db.intelInsight.update({
    where: { id: insightId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: now,
      acknowledgedByUserId: userId,
      updatedAt: now,
    },
  });
  await db.insightEvent.create({
    data: { insightId, eventType: "ACKNOWLEDGED", actorId: userId, actorLabel },
  });
  return { success: true };
}

/** Dismiss an insight with an optional reason. */
export async function dismissInsight(
  orgId: string,
  insightId: string,
  userId: string,
  reason?: string,
  actorLabel?: string,
): Promise<{ success: boolean; error?: string }> {
  const insight = await db.intelInsight.findFirst({
    where: { id: insightId, orgId },
    select: { status: true },
  });
  if (!insight) return { success: false, error: "Insight not found" };
  if (insight.status === "RESOLVED" || insight.status === "DISMISSED") {
    return { success: false, error: `Insight is already ${insight.status}` };
  }

  const now = new Date();
  await db.intelInsight.update({
    where: { id: insightId },
    data: {
      status: "DISMISSED",
      dismissedAt: now,
      dismissedByUserId: userId,
      dismissedReason: reason ?? null,
      updatedAt: now,
    },
  });
  await db.insightEvent.create({
    data: { insightId, eventType: "DISMISSED", actorId: userId, actorLabel, metadata: { reason } },
  });
  return { success: true };
}

/** Resolve an insight. */
export async function resolveInsight(
  orgId: string,
  insightId: string,
  userId: string,
  actorLabel?: string,
): Promise<{ success: boolean; error?: string }> {
  const insight = await db.intelInsight.findFirst({
    where: { id: insightId, orgId },
    select: { status: true },
  });
  if (!insight) return { success: false, error: "Insight not found" };
  if (insight.status === "RESOLVED") return { success: true }; // idempotent
  if (insight.status === "DISMISSED") {
    return { success: false, error: "Insight is DISMISSED — cannot resolve" };
  }

  const now = new Date();
  await db.intelInsight.update({
    where: { id: insightId },
    data: {
      status: "RESOLVED",
      resolvedAt: now,
      resolvedByUserId: userId,
      updatedAt: now,
    },
  });
  await db.insightEvent.create({
    data: { insightId, eventType: "RESOLVED", actorId: userId, actorLabel },
  });
  return { success: true };
}

/** Mark expired insights based on expiresAt. Run periodically or on-demand. */
export async function expireStaleInsights(orgId: string): Promise<number> {
  const now = new Date();
  const result = await db.intelInsight.updateMany({
    where: {
      orgId,
      expiresAt: { lte: now },
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
    data: { status: "EXPIRED", updatedAt: now },
  });
  return result.count;
}

/** Summary counts by severity for the insights dashboard header. */
export async function getInsightSummary(orgId: string): Promise<{
  bySeverity: Record<string, number>;
  total: number;
}> {
  const now = new Date();
  const counts = await db.intelInsight.groupBy({
    by: ["severity"],
    where: {
      orgId,
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    _count: { id: true },
  });

  const bySeverity: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const row of counts) {
    bySeverity[row.severity] = row._count.id;
  }

  return {
    bySeverity,
    total: Object.values(bySeverity).reduce((a, b) => a + b, 0),
  };
}
