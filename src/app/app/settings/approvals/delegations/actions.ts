"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface DelegationInput {
  toUserId: string;
  reason?: string;
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
}

// ─── Create Delegation ────────────────────────────────────────────────────────

export async function createDelegation(
  input: DelegationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("member");

    const validFrom = new Date(input.validFrom);
    const validUntil = new Date(input.validUntil);

    if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) {
      return { success: false, error: "Invalid date values" };
    }
    if (validFrom >= validUntil) {
      return { success: false, error: "validFrom must be before validUntil" };
    }
    if (input.toUserId === userId) {
      return { success: false, error: "Cannot delegate to yourself" };
    }

    // Deactivate any existing active delegations from this user before creating new
    await db.approvalDelegation.updateMany({
      where: { orgId, fromUserId: userId, isActive: true },
      data: { isActive: false },
    });

    const delegation = await db.approvalDelegation.create({
      data: {
        orgId,
        fromUserId: userId,
        toUserId: input.toUserId,
        reason: input.reason?.trim() || null,
        validFrom,
        validUntil,
        isActive: true,
      },
    });

    revalidatePath("/app/settings/approvals/delegations");
    return { success: true, data: { id: delegation.id } };
  } catch (error) {
    console.error("createDelegation error:", error);
    return { success: false, error: "Failed to create delegation" };
  }
}

// ─── Revoke Delegation ────────────────────────────────────────────────────────

export async function revokeDelegation(delegationId: string): Promise<ActionResult<undefined>> {
  try {
    const { orgId, userId } = await requireRole("member");

    const delegation = await db.approvalDelegation.findFirst({
      where: { id: delegationId, orgId, fromUserId: userId },
    });

    if (!delegation) {
      return { success: false, error: "Delegation not found" };
    }

    await db.approvalDelegation.update({
      where: { id: delegationId },
      data: { isActive: false },
    });

    revalidatePath("/app/settings/approvals/delegations");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("revokeDelegation error:", error);
    return { success: false, error: "Failed to revoke delegation" };
  }
}

// ─── List Delegations ─────────────────────────────────────────────────────────

export interface DelegationRow {
  id: string;
  toUserId: string;
  toUserName: string | null;
  reason: string | null;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
}

export async function listMyDelegations(): Promise<ActionResult<DelegationRow[]>> {
  try {
    const { orgId, userId } = await requireRole("member");

    const rows = await db.approvalDelegation.findMany({
      where: { orgId, fromUserId: userId },
      orderBy: { createdAt: "desc" },
    });

    const toUserIds = [...new Set(rows.map((r) => r.toUserId))];
    const profiles = await db.profile.findMany({
      where: { id: { in: toUserIds } },
      select: { id: true, name: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

    const data: DelegationRow[] = rows.map((r) => ({
      id: r.id,
      toUserId: r.toUserId,
      toUserName: profileMap.get(r.toUserId) ?? null,
      reason: r.reason,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("listMyDelegations error:", error);
    return { success: false, error: "Failed to load delegations" };
  }
}
