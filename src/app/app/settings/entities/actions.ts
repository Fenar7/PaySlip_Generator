"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth/require-org";
import { requireGroupAdmin } from "@/lib/multi-entity/group-auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { EntityType } from "@/generated/prisma/client";

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Create EntityGroup ──────────────────────────────────────────────────────

export async function createEntityGroup(input: {
  name: string;
  description?: string;
  currency?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, orgId } = await requireRole("admin");

    const existing = await db.entityGroup.findUnique({
      where: { adminOrgId: orgId },
    });
    if (existing) {
      return { success: false, error: "This organisation is already an admin of an entity group" };
    }

    const group = await db.$transaction(async (tx) => {
      const g = await tx.entityGroup.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          currency: input.currency ?? "INR",
          adminOrgId: orgId,
        },
      });

      // The admin org becomes the holding entity and joins its own group
      await tx.organization.update({
        where: { id: orgId },
        data: {
          entityType: "HOLDING",
          entityGroupId: null, // admin org is linked via adminEntityGroup, not entityGroup
          consolidationCurrency: input.currency ?? "INR",
        },
      });

      return g;
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "entity_group.created",
      entityType: "EntityGroup",
      entityId: group.id,
      metadata: { name: group.name },
    });

    revalidatePath("/app/settings/entities");
    return { success: true, data: { id: group.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create entity group";
    return { success: false, error: message };
  }
}

// ─── Add entity to group ─────────────────────────────────────────────────────

export async function addEntityToGroup(input: {
  entityGroupId: string;
  targetOrgId: string;
  entityType?: EntityType;
}): Promise<ActionResult<null>> {
  try {
    const { userId, orgId } = await requireGroupAdmin(input.entityGroupId);

    if (input.targetOrgId === orgId) {
      return { success: false, error: "The admin organisation cannot be added as a member entity" };
    }

    const targetOrg = await db.organization.findUnique({
      where: { id: input.targetOrgId },
      select: { id: true, name: true, entityGroupId: true, adminEntityGroup: { select: { id: true } } },
    });

    if (!targetOrg) {
      return { success: false, error: "Target organisation not found" };
    }

    if (targetOrg.entityGroupId || targetOrg.adminEntityGroup) {
      return {
        success: false,
        error: "Target organisation already belongs to an entity group",
      };
    }

    await db.$transaction([
      db.organization.update({
        where: { id: input.targetOrgId },
        data: {
          entityGroupId: input.entityGroupId,
          entityType: input.entityType ?? "SUBSIDIARY",
        },
      }),
    ]);

    await logAudit({
      orgId,
      actorId: userId,
      action: "entity_group.member_added",
      entityType: "EntityGroup",
      entityId: input.entityGroupId,
      metadata: { targetOrgId: input.targetOrgId, entityType: input.entityType },
    });

    revalidatePath("/app/settings/entities");
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add entity";
    return { success: false, error: message };
  }
}

// ─── Remove entity from group ────────────────────────────────────────────────

export async function removeEntityFromGroup(input: {
  entityGroupId: string;
  targetOrgId: string;
}): Promise<ActionResult<null>> {
  try {
    const { userId, orgId } = await requireGroupAdmin(input.entityGroupId);

    const pendingTransfers = await db.interCompanyTransfer.count({
      where: {
        entityGroupId: input.entityGroupId,
        status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] },
        OR: [
          { sourceOrgId: input.targetOrgId },
          { destinationOrgId: input.targetOrgId },
        ],
      },
    });

    if (pendingTransfers > 0) {
      return {
        success: false,
        error: `Cannot remove entity: ${pendingTransfers} pending inter-company transfer(s) must be resolved first`,
      };
    }

    await db.organization.update({
      where: { id: input.targetOrgId, entityGroupId: input.entityGroupId },
      data: { entityGroupId: null, entityType: "STANDALONE" },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "entity_group.member_removed",
      entityType: "EntityGroup",
      entityId: input.entityGroupId,
      metadata: { targetOrgId: input.targetOrgId },
    });

    revalidatePath("/app/settings/entities");
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove entity";
    return { success: false, error: message };
  }
}

// ─── Get entity group detail ─────────────────────────────────────────────────

export async function getEntityGroupDetail(
  entityGroupId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof fetchEntityGroupDetail>>>> {
  try {
    const { orgId } = await requireOrgContext();

    // Both admin and members may view the group they belong to
    const group = await fetchEntityGroupDetail(entityGroupId);
    if (!group) return { success: false, error: "Entity group not found" };

    const isAdmin = group.adminOrgId === orgId;
    const isMember = group.members.some((m) => m.id === orgId);
    if (!isAdmin && !isMember) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: group };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch entity group";
    return { success: false, error: message };
  }
}

async function fetchEntityGroupDetail(entityGroupId: string) {
  return db.entityGroup.findUnique({
    where: { id: entityGroupId },
    include: {
      adminOrg: { select: { id: true, name: true, slug: true, entityType: true } },
      members: { select: { id: true, name: true, slug: true, entityType: true } },
    },
  });
}

// ─── List entity groups for current org ─────────────────────────────────────

export async function listOrgEntityGroups(): Promise<
  ActionResult<{ asAdmin: Awaited<ReturnType<typeof fetchAdminGroups>>; asMember: Awaited<ReturnType<typeof fetchMemberGroup>> }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const [asAdmin, asMember] = await Promise.all([
      fetchAdminGroups(orgId),
      fetchMemberGroup(orgId),
    ]);

    return { success: true, data: { asAdmin, asMember } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list entity groups";
    return { success: false, error: message };
  }
}

async function fetchAdminGroups(adminOrgId: string) {
  return db.entityGroup.findMany({
    where: { adminOrgId },
    include: {
      members: { select: { id: true, name: true, slug: true, entityType: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchMemberGroup(orgId: string) {
  return db.organization.findUnique({
    where: { id: orgId },
    select: {
      entityGroup: {
        include: {
          adminOrg: { select: { id: true, name: true, slug: true, entityType: true } },
          members: { select: { id: true, name: true, slug: true, entityType: true } },
        },
      },
    },
  });
}
