/**
 * Cross-org access guard for partner-managed operations.
 *
 * All partner cross-org operations must pass through requirePartnerClientAccess()
 * before touching client-org data. This prevents:
 *   - unapproved partners from accessing client orgs
 *   - revoked/suspended partners from continuing access
 *   - partners accessing orgs they are not explicitly assigned to
 *   - scope violations where the partner's assignment does not cover the action
 *
 * Never scatter ad-hoc partner checks through the app — route through this module.
 */

import "server-only";
import { db } from "@/lib/db";
import { logPartnerActivity } from "./reporting";

export class PartnerAccessError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_A_PARTNER"
      | "PARTNER_NOT_APPROVED"
      | "NOT_ASSIGNED"
      | "SCOPE_DENIED"
  ) {
    super(message);
    this.name = "PartnerAccessError";
  }
}

interface PartnerAccessContext {
  partnerProfileId: string;
  managedOrgId: string;
  partnerOrgId: string;
  clientOrgId: string;
}

/**
 * Verify that the acting org is an approved partner with an active assignment
 * to the target client org, and that the requested scope is permitted.
 *
 * Throws PartnerAccessError if any check fails — caller should surface safely.
 * Returns a context object for use in downstream attribution logging.
 */
export async function requirePartnerClientAccess(
  partnerOrgId: string,
  clientOrgId: string,
  requiredScope: string
): Promise<PartnerAccessContext> {
  const profile = await db.partnerProfile.findUnique({
    where: { orgId: partnerOrgId },
    select: { id: true, status: true },
  });

  if (!profile) {
    throw new PartnerAccessError(
      "Organization is not a registered partner",
      "NOT_A_PARTNER"
    );
  }

  if (profile.status !== "APPROVED") {
    throw new PartnerAccessError(
      `Partner access denied: partner status is ${profile.status}`,
      "PARTNER_NOT_APPROVED"
    );
  }

  const assignment = await db.partnerManagedOrg.findUnique({
    where: {
      partnerId_orgId: { partnerId: profile.id, orgId: clientOrgId },
    },
    select: { id: true, scope: true, revokedAt: true },
  });

  if (!assignment || assignment.revokedAt !== null) {
    throw new PartnerAccessError(
      "Partner does not have an active assignment to this client organization",
      "NOT_ASSIGNED"
    );
  }

  if (!assignment.scope.includes(requiredScope)) {
    throw new PartnerAccessError(
      `Partner assignment scope does not include '${requiredScope}'`,
      "SCOPE_DENIED"
    );
  }

  return {
    partnerProfileId: profile.id,
    managedOrgId: assignment.id,
    partnerOrgId,
    clientOrgId,
  };
}

/**
 * Convenience wrapper: check access and log the action atomically.
 * Use this for any partner cross-org action that mutates or reads sensitive data.
 */
export async function withPartnerClientAccess<T>(
  partnerOrgId: string,
  actorUserId: string,
  clientOrgId: string,
  requiredScope: string,
  action: string,
  entityType: string | undefined,
  entityId: string | undefined,
  fn: (ctx: PartnerAccessContext) => Promise<T>
): Promise<T> {
  const ctx = await requirePartnerClientAccess(
    partnerOrgId,
    clientOrgId,
    requiredScope
  );

  const result = await fn(ctx);

  // Fire-and-forget attribution — never block the user action
  logPartnerActivity({
    partnerId: ctx.partnerProfileId,
    actorUserId,
    managedOrgId: ctx.managedOrgId,
    clientOrgId,
    action,
    entityType,
    entityId,
  }).catch((err) => console.error("[PARTNER_ACCESS] Activity log failed:", err));

  return result;
}
