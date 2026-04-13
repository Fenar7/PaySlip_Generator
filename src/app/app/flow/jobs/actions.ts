"use server";

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function replayAction(id: string) {
  const { orgId } = await requireOrgContext();

  const action = await db.scheduledAction.findUnique({
    where: { id, orgId }
  });

  if (!action) throw new Error("Action not found");

  await db.scheduledAction.update({
    where: { id },
    data: {
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: new Date(),
    }
  });

  revalidatePath("/app/flow/jobs");
  return { success: true };
}

export async function cancelAction(id: string) {
  const { orgId } = await requireOrgContext();

  await db.scheduledAction.update({
    where: { id, orgId },
    data: {
      status: "CANCELLED",
    }
  });

  revalidatePath("/app/flow/jobs");
  return { success: true };
}
