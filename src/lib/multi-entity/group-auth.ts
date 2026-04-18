import "server-only";

import { db } from "@/lib/db";
import { requireOrgContext, type OrgContext } from "@/lib/auth/require-org";

export interface GroupAdminContext extends OrgContext {
  entityGroupId: string;
  entityGroupName: string;
}

/**
 * Require the current org context AND that the caller's org is the
 * admin of the specified entity group. Throws on insufficient access.
 */
export async function requireGroupAdmin(
  entityGroupId: string,
): Promise<GroupAdminContext> {
  const ctx = await requireOrgContext();

  const group = await db.entityGroup.findUnique({
    where: { id: entityGroupId },
    select: { id: true, name: true, adminOrgId: true },
  });

  if (!group) {
    throw new Error("Entity group not found");
  }

  if (group.adminOrgId !== ctx.orgId) {
    throw new Error(
      "Only the group admin organisation may perform this operation",
    );
  }

  return {
    ...ctx,
    entityGroupId: group.id,
    entityGroupName: group.name,
  };
}

/**
 * Require the current org context AND that the caller's org belongs to
 * the specified entity group (either as admin or as a member).
 */
export async function requireGroupMember(
  entityGroupId: string,
): Promise<GroupAdminContext> {
  const ctx = await requireOrgContext();

  const group = await db.entityGroup.findUnique({
    where: { id: entityGroupId },
    select: {
      id: true,
      name: true,
      adminOrgId: true,
      members: { select: { id: true } },
    },
  });

  if (!group) {
    throw new Error("Entity group not found");
  }

  const isMember =
    group.adminOrgId === ctx.orgId ||
    group.members.some((m) => m.id === ctx.orgId);

  if (!isMember) {
    throw new Error("Org is not a member of this entity group");
  }

  return {
    ...ctx,
    entityGroupId: group.id,
    entityGroupName: group.name,
  };
}
