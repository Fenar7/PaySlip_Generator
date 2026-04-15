"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { logAudit } from "@/lib/audit";
import { getPartnerMetrics } from "@/lib/partners/reporting";
import {
  withPartnerClientAccess,
  PartnerAccessError,
} from "@/lib/partners/access";
import crypto from "crypto";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_SCOPES = new Set([
  "view_invoices",
  "manage_documents",
  "view_payments",
  "create_payslips",
  "view_gst_filings",
  "manage_gst_filings",
]);

function validateScopes(scope: string[]): string | null {
  for (const s of scope) {
    if (!VALID_SCOPES.has(s)) {
      return `Invalid scope: '${s}'. Valid scopes: ${[...VALID_SCOPES].join(", ")}`;
    }
  }
  return null;
}

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

/**
 * SEC-01: Partner submits an access request to manage a client org.
 * Creates a PENDING PartnerClientAccessRequest — does NOT create an active assignment.
 * The client org admin must explicitly approve before any cross-org access is granted.
 * Scope must be non-empty; empty scope is invalid per platform policy.
 */
export async function requestClientAccess(
  clientOrgId: string,
  scope: string[],
  notes?: string
): Promise<ActionResult<{ requestId: string }>> {
  const { orgId, userId } = await requireRole("admin");
  await checkFeature(orgId, "partnerProgram");

  if (scope.length === 0) {
    return {
      success: false,
      error: "At least one permission scope is required when requesting client access",
    };
  }

  const scopeError = validateScopes(scope);
  if (scopeError) return { success: false, error: scopeError };

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile || profile.status !== "APPROVED") {
    return {
      success: false,
      error: "Partner must be in APPROVED status to request client access",
    };
  }

  const activeAssignment = await db.partnerManagedOrg.findUnique({
    where: { partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId } },
    select: { id: true, revokedAt: true },
  });
  if (activeAssignment && activeAssignment.revokedAt === null) {
    return { success: false, error: "Already managing this organization" };
  }

  const pendingRequest = await db.partnerClientAccessRequest.findFirst({
    where: { partnerId: profile.id, clientOrgId, status: "PENDING" },
    select: { id: true },
  });
  if (pendingRequest) {
    return {
      success: false,
      error: "A pending access request already exists for this organization",
    };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const request = await db.partnerClientAccessRequest.create({
    data: {
      partnerId: profile.id,
      clientOrgId,
      requestedByUserId: userId,
      scope,
      notes: notes ?? null,
      expiresAt,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "partner.access_requested",
    entityType: "partner_client_access_request",
    entityId: request.id,
    metadata: { clientOrgId, scope },
  });

  return { success: true, data: { requestId: request.id } };
}

/**
 * Partner cancels a pending access request before the client responds.
 */
export async function cancelClientAccessRequest(
  requestId: string
): Promise<ActionResult<null>> {
  const { orgId, userId } = await requireRole("admin");

  const profile = await db.partnerProfile.findUnique({ where: { orgId } });
  if (!profile) return { success: false, error: "Not a partner" };

  const request = await db.partnerClientAccessRequest.findUnique({
    where: { id: requestId },
    select: { id: true, partnerId: true, status: true, clientOrgId: true },
  });

  if (!request || request.partnerId !== profile.id) {
    return { success: false, error: "Request not found" };
  }
  if (request.status !== "PENDING") {
    return {
      success: false,
      error: `Request is already ${request.status.toLowerCase()}`,
    };
  }

  await db.partnerClientAccessRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "partner.access_request_cancelled",
    entityType: "partner_client_access_request",
    entityId: requestId,
    metadata: { clientOrgId: request.clientOrgId },
  });

  return { success: true, data: null };
}

/**
 * SEC-04 (client-side): Client org admin lists pending partner access requests.
 * Only requests from currently APPROVED partners are surfaced.
 */
export async function getPendingPartnerAccessRequests(): Promise<
  ActionResult<
    {
      requestId: string;
      partnerCode: string;
      companyName: string;
      type: string;
      scope: string[];
      notes: string | null;
      expiresAt: Date | null;
      createdAt: Date;
    }[]
  >
> {
  const { orgId } = await requireRole("admin");

  const requests = await db.partnerClientAccessRequest.findMany({
    where: { clientOrgId: orgId, status: "PENDING" },
    include: {
      partner: {
        select: {
          partnerCode: true,
          companyName: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: requests
      .filter((r) => r.partner.status === "APPROVED")
      .map((r) => ({
        requestId: r.id,
        partnerCode: r.partner.partnerCode,
        companyName: r.partner.companyName,
        type: r.partner.type,
        scope: r.scope,
        notes: r.notes,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
  };
}

/**
 * SEC-04 (client-side): Client org admin approves or rejects a partner access request.
 * On APPROVED: creates an active PartnerManagedOrg assignment.
 * On REJECTED: records the decision; partner may submit a new request.
 */
export async function reviewPartnerAccessRequest(
  requestId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<ActionResult<null>> {
  const { orgId, userId } = await requireRole("admin");

  const request = await db.partnerClientAccessRequest.findUnique({
    where: { id: requestId },
    include: {
      partner: { select: { id: true, status: true } },
    },
  });

  if (!request) return { success: false, error: "Request not found" };
  if (request.clientOrgId !== orgId) {
    return {
      success: false,
      error: "Request does not belong to your organization",
    };
  }
  if (request.status !== "PENDING") {
    return {
      success: false,
      error: `Request is already ${request.status.toLowerCase()}`,
    };
  }
  if (request.partner.status !== "APPROVED") {
    return { success: false, error: "Partner is no longer active" };
  }

  const now = new Date();

  if (request.expiresAt && request.expiresAt < now) {
    await db.partnerClientAccessRequest.update({
      where: { id: requestId },
      data: { status: "EXPIRED", reviewedByUserId: userId, reviewedAt: now },
    });
    return { success: false, error: "This access request has expired" };
  }

  if (decision === "APPROVED") {
    const existingAssignment = await db.partnerManagedOrg.findUnique({
      where: { partnerId_orgId: { partnerId: request.partnerId, orgId } },
      select: { id: true, revokedAt: true },
    });

    if (existingAssignment && existingAssignment.revokedAt === null) {
      return { success: false, error: "This partner already has active access" };
    }

    await db.$transaction([
      db.partnerClientAccessRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedByUserId: userId, reviewedAt: now },
      }),
      ...(existingAssignment
        ? [
            db.partnerManagedOrg.update({
              where: { id: existingAssignment.id },
              data: {
                revokedAt: null,
                revokedBy: null,
                scope: request.scope,
                addedByUserId: userId,
                addedAt: now,
              },
            }),
          ]
        : [
            db.partnerManagedOrg.create({
              data: {
                partnerId: request.partnerId,
                orgId,
                addedByUserId: userId,
                scope: request.scope,
              },
            }),
            db.partnerProfile.update({
              where: { id: request.partnerId },
              data: { managedOrgCount: { increment: 1 } },
            }),
          ]),
    ]);

    await logAudit({
      orgId,
      actorId: userId,
      action: "partner.access_approved",
      entityType: "partner_client_access_request",
      entityId: requestId,
      metadata: { partnerId: request.partnerId, scope: request.scope },
    });
  } else {
    await db.partnerClientAccessRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedByUserId: userId, reviewedAt: now },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "partner.access_rejected",
      entityType: "partner_client_access_request",
      entityId: requestId,
      metadata: { partnerId: request.partnerId },
    });
  }

  return { success: true, data: null };
}

/**
 * Partner explicitly removes a client org from their managed list.
 */
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
    return {
      success: false,
      error: "Client assignment not found or already removed",
    };
  }

  await db.$transaction([
    db.partnerManagedOrg.update({
      where: { id: assignment.id },
      data: { revokedAt: new Date(), revokedBy: userId },
    }),
    db.partnerProfile.update({
      where: { id: profile.id },
      data: { managedOrgCount: { decrement: 1 } },
    }),
  ]);

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

/**
 * SEC-03/02: Partner reads invoices for a managed client org.
 * Routes through the centralized access guard which:
 *   - validates partner APPROVED status
 *   - validates active (non-revoked) assignment
 *   - validates explicit scope — empty scope is denied
 * This replaces the inline auth+scope check that had an empty-scope bypass.
 */
export async function getManagedClientInvoices(
  clientOrgId: string
): Promise<ActionResult<Record<string, unknown>[]>> {
  const { orgId, userId } = await requireOrgContext();

  try {
    const invoices = await withPartnerClientAccess(
      orgId,
      userId,
      clientOrgId,
      "view_invoices",
      "view_invoices",
      "invoice",
      undefined,
      async () =>
        db.invoice.findMany({
          where: { organizationId: clientOrgId },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
    );

    return { success: true, data: invoices };
  } catch (err) {
    if (err instanceof PartnerAccessError) {
      return { success: false, error: err.message };
    }
    throw err;
  }
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
 * Client org admin: list partners with active (non-revoked) assignments.
 * SEC-04: includes partnerStatus so the UI can surface SUSPENDED access correctly.
 * SEC-02: scope is returned as-is; empty scope means no explicit permissions.
 */
export async function getClientOrgPartnerAccess(): Promise<
  ActionResult<
    {
      managedOrgId: string;
      partnerCode: string;
      companyName: string;
      type: string;
      partnerStatus: string;
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
      partnerStatus: a.partner.status,
      scope: a.scope,
      addedAt: a.addedAt,
    })),
  };
}

/**
 * SEC-04: Client org admin revokes an active partner access assignment.
 * Takes effect immediately — all subsequent partner cross-org operations will fail.
 */
export async function revokeClientPartnerAccess(
  managedOrgId: string
): Promise<ActionResult<null>> {
  const { orgId, userId } = await requireRole("admin");

  const assignment = await db.partnerManagedOrg.findUnique({
    where: { id: managedOrgId },
    select: { id: true, orgId: true, partnerId: true, revokedAt: true },
  });

  if (!assignment) {
    return { success: false, error: "Partner access record not found" };
  }
  if (assignment.orgId !== orgId) {
    return {
      success: false,
      error: "Access record does not belong to your organization",
    };
  }
  if (assignment.revokedAt !== null) {
    return { success: false, error: "Partner access is already revoked" };
  }

  await db.$transaction([
    db.partnerManagedOrg.update({
      where: { id: managedOrgId },
      data: { revokedAt: new Date(), revokedBy: userId },
    }),
    db.partnerProfile.update({
      where: { id: assignment.partnerId },
      data: { managedOrgCount: { decrement: 1 } },
    }),
  ]);

  await logAudit({
    orgId,
    actorId: userId,
    action: "partner.access_revoked_by_client",
    entityType: "partner_managed_org",
    entityId: managedOrgId,
    metadata: { partnerId: assignment.partnerId },
  });

  return { success: true, data: null };
}
