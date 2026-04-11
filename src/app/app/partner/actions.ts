"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
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
  const { orgId } = await requireRole("admin");

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
  clientOrgId: string
): Promise<ActionResult<{ managedOrgId: string }>> {
  const { orgId } = await requireRole("admin");
  await checkFeature(orgId, "partnerProgram");

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile || profile.status !== "APPROVED")
    return { success: false, error: "Partner not approved" };

  const existing = await db.partnerManagedOrg.findUnique({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
  });
  if (existing)
    return { success: false, error: "Already managing this organization" };

  const managed = await db.partnerManagedOrg.create({
    data: { partnerId: profile.id, orgId: clientOrgId },
  });

  await db.partnerProfile.update({
    where: { id: profile.id },
    data: { managedOrgCount: { increment: 1 } },
  });

  return { success: true, data: { managedOrgId: managed.id } };
}

export async function removeClientOrg(
  clientOrgId: string
): Promise<ActionResult<null>> {
  const { orgId } = await requireRole("admin");

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile) return { success: false, error: "Not a partner" };

  await db.partnerManagedOrg.delete({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
  });

  await db.partnerProfile.update({
    where: { id: profile.id },
    data: { managedOrgCount: { decrement: 1 } },
  });

  return { success: true, data: null };
}

export async function getManagedClientInvoices(
  clientOrgId: string
): Promise<ActionResult<Record<string, unknown>[]>> {
  const { orgId } = await requireOrgContext();

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile || profile.status !== "APPROVED")
    return { success: false, error: "Partner not approved" };

  const managed = await db.partnerManagedOrg.findUnique({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
  });
  if (!managed)
    return { success: false, error: "Not managing this organization" };

  const invoices = await db.invoice.findMany({
    where: { organizationId: clientOrgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { success: true, data: invoices };
}

export async function getPartnerProfile(): Promise<ActionResult<Record<string, unknown> | null>> {
  const { orgId } = await requireOrgContext();
  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  return { success: true, data: profile };
}
