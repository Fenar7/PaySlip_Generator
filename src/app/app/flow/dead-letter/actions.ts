"use server";

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function resolveDeadLetterAction(id: string) {
  const { orgId, userId } = await requireOrgContext();

  const dl = await db.deadLetterAction.findFirst({
    where: { id, orgId },
  });

  if (!dl) {
    return { success: false, error: "Dead letter not found" };
  }

  if (dl.resolvedAt) {
    return { success: true }; // Already resolved, idempotent
  }

  const updated = await db.deadLetterAction.updateMany({
    where: { id, orgId, resolvedAt: null },
    data: {
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });

  if (updated.count > 0) {
    const { logActivity } = await import("@/lib/activity");
    const member = await db.member.findFirst({
      where: { userId, organizationId: orgId },
      include: { user: { select: { email: true } } },
    });
    
    await logActivity({
      orgId,
      actorId: userId,
      actorName: member?.user?.email ?? "Staff",
      event: "dead_letter_resolved",
      docType: "dead_letter",
      docId: id,
    });
  }

  revalidatePath("/app/flow/dead-letter");
  return { success: true };
}
