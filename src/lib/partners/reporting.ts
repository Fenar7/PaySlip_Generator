/**
 * Partner reporting and metrics.
 *
 * Provides efficient, non-N+1 query helpers for:
 *   - partner-facing dashboard metrics
 *   - platform-admin partner oversight
 *   - partner activity attribution logging
 *
 * All aggregations are database-side to keep page loads fast.
 */

import "server-only";
import { db } from "@/lib/db";
import { PartnerStatus } from "@/generated/prisma/client";

// ─── Activity attribution ────────────────────────────────────────────────────

interface ActivityParams {
  partnerId: string;
  actorUserId: string;
  managedOrgId?: string;
  clientOrgId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/** Write a partner activity log entry. Fire-and-forget safe — never throws publicly. */
export async function logPartnerActivity(params: ActivityParams): Promise<void> {
  await db.partnerActivityLog.create({
    data: {
      partnerId: params.partnerId,
      actorUserId: params.actorUserId,
      managedOrgId: params.managedOrgId ?? null,
      clientOrgId: params.clientOrgId ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      metadata: (params.metadata ?? null) as Parameters<typeof db.partnerActivityLog.create>[0]["data"]["metadata"],
    },
  });
}

// ─── Partner-facing metrics ───────────────────────────────────────────────────

export interface PartnerMetrics {
  managedClientCount: number;
  activeAssignmentCount: number; // assignments not revoked
  recentActivityCount: number;   // last 30 days
  recentActivity: {
    id: string;
    action: string;
    clientOrgId: string | null;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
  }[];
}

export async function getPartnerMetrics(
  partnerOrgId: string
): Promise<PartnerMetrics | null> {
  const profile = await db.partnerProfile.findUnique({
    where: { orgId: partnerOrgId },
    select: { id: true },
  });
  if (!profile) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [managedClientCount, activeAssignmentCount, recentActivityCount, recentActivity] =
    await Promise.all([
      db.partnerManagedOrg.count({ where: { partnerId: profile.id } }),
      db.partnerManagedOrg.count({
        where: { partnerId: profile.id, revokedAt: null },
      }),
      db.partnerActivityLog.count({
        where: { partnerId: profile.id, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.partnerActivityLog.findMany({
        where: { partnerId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          clientOrgId: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      }),
    ]);

  return {
    managedClientCount,
    activeAssignmentCount,
    recentActivityCount,
    recentActivity,
  };
}

// ─── Platform admin oversight ─────────────────────────────────────────────────

export interface PartnerAdminOverview {
  byStatus: Partial<Record<PartnerStatus, number>>;
  totalPartners: number;
  recentApplications: {
    id: string;
    companyName: string;
    type: string;
    status: PartnerStatus;
    createdAt: Date;
  }[];
}

export async function getPartnerAdminOverview(): Promise<PartnerAdminOverview> {
  const [statusGroups, recentApplications] = await Promise.all([
    db.partnerProfile.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    db.partnerProfile.findMany({
      where: {
        status: { in: ["PENDING", "UNDER_REVIEW"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        companyName: true,
        type: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const byStatus: Partial<Record<PartnerStatus, number>> = {};
  let totalPartners = 0;
  for (const group of statusGroups) {
    byStatus[group.status] = group._count.id;
    totalPartners += group._count.id;
  }

  return { byStatus, totalPartners, recentApplications };
}

export interface PartnerAdminDetail {
  profile: {
    id: string;
    companyName: string;
    type: string;
    status: PartnerStatus;
    partnerCode: string;
    revenueShare: string;
    website: string | null;
    description: string | null;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    suspendedAt: Date | null;
    suspendedReason: string | null;
    revokedAt: Date | null;
    revokedReason: string | null;
    createdAt: Date;
    managedOrgCount: number;
  };
  managedOrgs: {
    id: string;
    orgId: string;
    addedAt: Date;
    scope: string[];
    revokedAt: Date | null;
    org: { id: string; name: string; slug: string };
  }[];
  reviewHistory: {
    id: string;
    actorUserId: string;
    fromStatus: PartnerStatus;
    toStatus: PartnerStatus;
    notes: string | null;
    createdAt: Date;
  }[];
}

export async function getPartnerAdminDetail(
  partnerId: string
): Promise<PartnerAdminDetail | null> {
  const profile = await db.partnerProfile.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      companyName: true,
      type: true,
      status: true,
      partnerCode: true,
      revenueShare: true,
      website: true,
      description: true,
      reviewedByUserId: true,
      reviewedAt: true,
      reviewNotes: true,
      suspendedAt: true,
      suspendedReason: true,
      revokedAt: true,
      revokedReason: true,
      createdAt: true,
      managedOrgCount: true,
      managedOrgs: {
        include: { org: { select: { id: true, name: true, slug: true } } },
        orderBy: { addedAt: "desc" },
      },
      reviewEvents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actorUserId: true,
          fromStatus: true,
          toStatus: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) return null;

  return {
    profile: {
      ...profile,
      revenueShare: profile.revenueShare.toString(),
    },
    managedOrgs: profile.managedOrgs,
    reviewHistory: profile.reviewEvents,
  };
}

/** Efficient list query for admin partner list page. */
export async function listPartnersForAdmin(filter?: {
  status?: PartnerStatus;
}): Promise<
  {
    id: string;
    companyName: string;
    type: string;
    status: PartnerStatus;
    partnerCode: string;
    managedOrgCount: number;
    createdAt: Date;
    orgId: string;
  }[]
> {
  return db.partnerProfile.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      type: true,
      status: true,
      partnerCode: true,
      managedOrgCount: true,
      createdAt: true,
      orgId: true,
    },
  });
}
