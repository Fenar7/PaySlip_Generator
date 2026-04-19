/**
 * Custom Role Service — Phase 28 Sprint 28.3
 *
 * CRUD operations for organization-specific custom roles.
 * Custom roles allow granular permission sets beyond owner/admin/member.
 */
"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { validatePermissionSet, type PermissionSet } from "./permissions";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listCustomRoles(): Promise<
  ActionResult<Array<{ id: string; name: string; description: string | null; permissions: unknown; isSystem: boolean; memberCount: number }>>
> {
  const { orgId: organizationId } = await requireRole("admin");

  const roles = await db.customRole.findMany({
    where: { orgId: organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return {
    success: true,
    data: roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      isSystem: r.isSystem,
      memberCount: r._count.members,
    })),
  };
}

export async function getCustomRole(
  roleId: string
): Promise<ActionResult<{ id: string; name: string; description: string | null; permissions: unknown; isSystem: boolean }>> {
  const { orgId: organizationId } = await requireRole("admin");

  const role = await db.customRole.findFirst({
    where: { id: roleId, orgId: organizationId },
  });

  if (!role) {
    return { success: false, error: "Role not found" };
  }

  return {
    success: true,
    data: {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
    },
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createCustomRole(input: {
  name: string;
  description?: string;
  permissions: PermissionSet;
}): Promise<ActionResult<{ id: string }>> {
  const { orgId: organizationId } = await requireRole("admin");

  if (!input.name || input.name.trim().length < 2) {
    return { success: false, error: "Role name must be at least 2 characters" };
  }

  const validation = validatePermissionSet(input.permissions);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const existing = await db.customRole.findUnique({
    where: { orgId_name: { orgId: organizationId, name: input.name.trim() } },
  });

  if (existing) {
    return { success: false, error: "A role with this name already exists" };
  }

  const role = await db.customRole.create({
    data: {
      orgId: organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      permissions: JSON.parse(JSON.stringify(validation.data)),
    },
  });

  return { success: true, data: { id: role.id } };
}

export async function updateCustomRole(
  roleId: string,
  input: { name?: string; description?: string; permissions?: PermissionSet }
): Promise<ActionResult<{ id: string }>> {
  const { orgId: organizationId } = await requireRole("admin");

  const role = await db.customRole.findFirst({
    where: { id: roleId, orgId: organizationId },
  });

  if (!role) {
    return { success: false, error: "Role not found" };
  }

  if (role.isSystem) {
    return { success: false, error: "System roles cannot be modified" };
  }

  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (input.name.trim().length < 2) {
      return { success: false, error: "Role name must be at least 2 characters" };
    }
    const conflict = await db.customRole.findFirst({
      where: { orgId: organizationId, name: input.name.trim(), id: { not: roleId } },
    });
    if (conflict) {
      return { success: false, error: "A role with this name already exists" };
    }
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description.trim() || null;
  }

  if (input.permissions !== undefined) {
    const validation = validatePermissionSet(input.permissions);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    updateData.permissions = JSON.parse(JSON.stringify(validation.data));
  }

  await db.customRole.update({
    where: { id: roleId },
    data: updateData,
  });

  return { success: true, data: { id: roleId } };
}

export async function deleteCustomRole(roleId: string): Promise<ActionResult<void>> {
  const { orgId: organizationId } = await requireRole("admin");

  const role = await db.customRole.findFirst({
    where: { id: roleId, orgId: organizationId },
    include: { _count: { select: { members: true } } },
  });

  if (!role) {
    return { success: false, error: "Role not found" };
  }

  if (role.isSystem) {
    return { success: false, error: "System roles cannot be deleted" };
  }

  if (role._count.members > 0) {
    return {
      success: false,
      error: `Cannot delete role with ${role._count.members} assigned member(s). Reassign them first.`,
    };
  }

  await db.customRole.delete({ where: { id: roleId } });

  return { success: true, data: undefined };
}

// ─── Member Assignment ────────────────────────────────────────────────────────

export async function assignCustomRole(
  memberId: string,
  customRoleId: string | null
): Promise<ActionResult<void>> {
  const { orgId: organizationId } = await requireRole("admin");

  const member = await db.member.findFirst({
    where: { id: memberId, organizationId },
  });

  if (!member) {
    return { success: false, error: "Member not found" };
  }

  // Cannot assign custom roles to owners
  if (member.role === "owner") {
    return { success: false, error: "Cannot assign custom roles to owners" };
  }

  if (customRoleId) {
    const role = await db.customRole.findFirst({
      where: { id: customRoleId, orgId: organizationId },
    });
    if (!role) {
      return { success: false, error: "Custom role not found" };
    }
  }

  await db.member.update({
    where: { id: memberId },
    data: { customRoleId },
  });

  return { success: true, data: undefined };
}
