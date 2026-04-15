"use server";

import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  executePartnerTransition,
  type PartnerLifecycleAction,
} from "@/lib/partners/lifecycle";
import {
  getPartnerAdminOverview,
  getPartnerAdminDetail,
  listPartnersForAdmin,
} from "@/lib/partners/reporting";
import { PartnerStatus } from "@/generated/prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function adminGetPartnerOverview(): Promise<
  ActionResult<Awaited<ReturnType<typeof getPartnerAdminOverview>>>
> {
  await requirePlatformAdmin();
  const data = await getPartnerAdminOverview();
  return { success: true, data };
}

export async function adminListPartners(filter?: {
  status?: PartnerStatus;
}): Promise<ActionResult<Awaited<ReturnType<typeof listPartnersForAdmin>>>> {
  await requirePlatformAdmin();
  const data = await listPartnersForAdmin(filter);
  return { success: true, data };
}

export async function adminGetPartnerDetail(
  partnerId: string
): Promise<ActionResult<Awaited<ReturnType<typeof getPartnerAdminDetail>>>> {
  await requirePlatformAdmin();
  const data = await getPartnerAdminDetail(partnerId);
  if (!data) return { success: false, error: "Partner not found" };
  return { success: true, data };
}

// ─── Lifecycle mutations ──────────────────────────────────────────────────────

async function performTransition(
  partnerId: string,
  action: PartnerLifecycleAction,
  notes?: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  const { userId } = await requirePlatformAdmin();

  const result = await executePartnerTransition(partnerId, userId, action, notes);
  if (!result.success) return result;

  const auditActionMap: Record<PartnerLifecycleAction, string> = {
    begin_review: "partner.review_started",
    approve:      "partner.approved",
    reject:       "partner.rejected",
    suspend:      "partner.suspended",
    reinstate:    "partner.reinstated",
    revoke:       "partner.revoked",
  };

  // Best-effort audit — look up orgId for the partner
  const profile = await db.partnerProfile.findUnique({
    where: { id: partnerId },
    select: { orgId: true },
  });

  if (profile) {
    await logAudit({
      orgId: profile.orgId,
      actorId: userId,
      action: auditActionMap[action],
      entityType: "partner",
      entityId: partnerId,
      metadata: { action, notes: notes ?? null, newStatus: result.newStatus },
    });
  }

  return { success: true, data: { newStatus: result.newStatus } };
}

export async function adminBeginPartnerReview(
  partnerId: string,
  notes?: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  return performTransition(partnerId, "begin_review", notes);
}

export async function adminApprovePartner(
  partnerId: string,
  notes?: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  return performTransition(partnerId, "approve", notes);
}

export async function adminRejectPartner(
  partnerId: string,
  notes?: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  return performTransition(partnerId, "reject", notes);
}

export async function adminSuspendPartner(
  partnerId: string,
  reason: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  if (!reason?.trim()) {
    return { success: false, error: "Suspension reason is required" };
  }
  return performTransition(partnerId, "suspend", reason);
}

export async function adminReinstatePartner(
  partnerId: string,
  notes?: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  return performTransition(partnerId, "reinstate", notes);
}

export async function adminRevokePartner(
  partnerId: string,
  reason: string
): Promise<ActionResult<{ newStatus: PartnerStatus }>> {
  if (!reason?.trim()) {
    return { success: false, error: "Revocation reason is required" };
  }
  return performTransition(partnerId, "revoke", reason);
}

// ─── Managed client assignment controls ──────────────────────────────────────

export async function adminRevokePartnerClientAssignment(
  managedOrgId: string,
  reason?: string
): Promise<ActionResult<null>> {
  const { userId } = await requirePlatformAdmin();

  const assignment = await db.partnerManagedOrg.findUnique({
    where: { id: managedOrgId },
    select: { id: true, revokedAt: true, partnerId: true, orgId: true },
  });

  if (!assignment) return { success: false, error: "Assignment not found" };
  if (assignment.revokedAt !== null) {
    return { success: false, error: "Assignment is already revoked" };
  }

  await db.partnerManagedOrg.update({
    where: { id: managedOrgId },
    data: { revokedAt: new Date(), revokedBy: userId },
  });

  const partner = await db.partnerProfile.findUnique({
    where: { id: assignment.partnerId },
    select: { orgId: true },
  });

  if (partner) {
    await logAudit({
      orgId: partner.orgId,
      actorId: userId,
      action: "partner.client_revoked",
      entityType: "partner_managed_org",
      entityId: managedOrgId,
      metadata: { clientOrgId: assignment.orgId, reason: reason ?? null },
    });
  }

  return { success: true, data: null };
}
