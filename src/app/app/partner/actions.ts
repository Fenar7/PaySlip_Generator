"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { logAudit } from "@/lib/audit";
import { getPartnerMetrics } from "@/lib/partners/reporting";
import crypto from "crypto";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function applyForPartner(data: {
  type: "ACCOUNTANT" | "TECHNOLOGY" | "RESELLER";
  companyName: string;
  website?: string;
  description?: string;
}): Promise<ActionResult<{ profileId: string; partnerCode: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const existing = await db.partnerProfile.findUnique({ where: { orgId } });
  if (existing)
    return { success: false, error: "Partner application already exists" };

  const partnerCode = `PTR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  const profile = await db.partnerProfile.create({
    data: {
      orgId,
      type: data.type,
      companyName: data.companyName,
      website: data.website,
      description: data.description,
      partnerCode,
      revenueShare: 20.0,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "partner.applied",
    entityType: "partner",
    entityId: profile.id,
  });

  return { success: true, data: { profileId: profile.id, partnerCode } };
}

export async function getPartnerDashboard(): Promise<
  ActionResult<{
    profile: Record<string, unknown>;
    managedOrgCount: number;
    managedOrgs: Record<string, unknown>[];
  }>
> {
  const { orgId } = await requireOrgContext();

  const profile = await db.partnerProfile.findUnique({
    where: { orgId },
    include: {
      managedOrgs: {
        where: { revokedAt: null },
        include: {
          org: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!profile) return { success: false, error: "Not a partner" };

  return {
    success: true,
    data: {
      profile,
      managedOrgCount: profile.managedOrgs.length,
      managedOrgs: profile.managedOrgs,
    },
  };
}

export async function inviteClientOrg(
  clientOrgId: string,
  scope: string[] = []
): Promise<ActionResult<{ managedOrgId: string }>> {
  const { orgId, userId } = await requireRole("admin");
  await checkFeature(orgId, "partnerProgram");

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile || profile.status !== "APPROVED")
    return { success: false, error: "Partner not approved" };

  const existing = await db.partnerManagedOrg.findUnique({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
  });
  if (existing) {
    if (existing.revokedAt === null) {
      return { success: false, error: "Already managing this organization" };
    }
    // Previously revoked — do not silently re-activate; require admin re-approval
    return {
      success: false,
      error:
        "This client relationship was previously revoked. Contact platform admin to reinstate.",
    };
  }

  const managed = await db.partnerManagedOrg.create({
    data: {
      partnerId: profile.id,
      orgId: clientOrgId,
      addedByUserId: userId,
      scope,
    },
  });

  await db.partnerProfile.update({
    where: { id: profile.id },
    data: { managedOrgCount: { increment: 1 } },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "partner.client_assigned",
    entityType: "partner_managed_org",
    entityId: managed.id,
    metadata: { clientOrgId, scope },
  });

  return { success: true, data: { managedOrgId: managed.id } };
}

export async function removeClientOrg(
  clientOrgId: string
): Promise<ActionResult<null>> {
  const { orgId, userId } = await requireRole("admin");

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile) return { success: false, error: "Not a partner" };

  const assignment = await db.partnerManagedOrg.findUnique({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
  });

  if (!assignment || assignment.revokedAt !== null) {
    return { success: false, error: "Client assignment not found or already removed" };
  }

  // Soft-revoke so history is preserved
  await db.partnerManagedOrg.update({
    where: { id: assignment.id },
    data: { revokedAt: new Date(), revokedBy: userId },
  });

  await db.partnerProfile.update({
    where: { id: profile.id },
    data: { managedOrgCount: { decrement: 1 } },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "partner.client_revoked",
    entityType: "partner_managed_org",
    entityId: assignment.id,
    metadata: { clientOrgId },
  });

  return { success: true, data: null };
}

export async function getManagedClientInvoices(
  clientOrgId: string
): Promise<ActionResult<Record<string, unknown>[]>> {
  const { orgId, userId } = await requireOrgContext();

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile || profile.status !== "APPROVED")
    return { success: false, error: "Partner not approved" };

  const managed = await db.partnerManagedOrg.findUnique({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
    select: { id: true, revokedAt: true, scope: true },
  });
  if (!managed || managed.revokedAt !== null)
    return { success: false, error: "Not managing this organization" };

  if (managed.scope.length > 0 && !managed.scope.includes("view_invoices")) {
    return { success: false, error: "Scope does not permit viewing invoices" };
  }

  const invoices = await db.invoice.findMany({
    where: { organizationId: clientOrgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fire-and-forget activity log
  db.partnerActivityLog
    .create({
      data: {
        partnerId: profile.id,
        actorUserId: userId,
        managedOrgId: managed.id,
        clientOrgId,
        action: "view_invoices",
        entityType: "invoice",
      },
    })
    .catch((err) => console.error("[PARTNER] Activity log failed:", err));

  return { success: true, data: invoices };
}

export async function getPartnerProfile(): Promise<
  ActionResult<Record<string, unknown> | null>
> {
  const { orgId } = await requireOrgContext();
  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  return { success: true, data: profile };
}

/** Partner-facing performance metrics for the reports page. */
export async function getPartnerReports(): Promise<
  ActionResult<Awaited<ReturnType<typeof getPartnerMetrics>>>
> {
  const { orgId } = await requireOrgContext();
  const metrics = await getPartnerMetrics(orgId);
  if (!metrics) return { success: false, error: "Not a partner" };
  return { success: true, data: metrics };
}

/**
 * Allow a client org admin to see which partners have active access to their org.
 * Returns assignments that are not revoked.
 */
export async function getClientOrgPartnerAccess(): Promise<
  ActionResult<
    {
      managedOrgId: string;
      partnerCode: string;
      companyName: string;
      type: string;
      scope: string[];
      addedAt: Date;
    }[]
  >
> {
  const { orgId } = await requireRole("admin");

  const assignments = await db.partnerManagedOrg.findMany({
    where: { orgId, revokedAt: null },
    include: {
      partner: {
        select: {
          id: true,
          partnerCode: true,
          companyName: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  return {
    success: true,
    data: assignments.map((a) => ({
      managedOrgId: a.id,
      partnerCode: a.partner.partnerCode,
      companyName: a.partner.companyName,
      type: a.partner.type,
      scope: a.scope,
      addedAt: a.addedAt,
    })),
  };
}
