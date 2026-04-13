"use server";

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function resolveDeadLetterAction(id: string) {
  const { orgId, userId } = await requireOrgContext();

  await db.deadLetterAction.update({
    where: { id, orgId },
    data: {
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });

  revalidatePath("/app/flow/dead-letter");
  return { success: true };
}
