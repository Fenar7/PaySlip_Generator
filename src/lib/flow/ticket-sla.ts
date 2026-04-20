import "server-only";

import { db } from "@/lib/db";

export async function computeTicketSlaDeadlines(
  orgId: string,
  priority?: string | null,
  createdAt?: Date,
): Promise<{ firstResponseDueAt: Date | null; resolutionDueAt: Date | null }> {
  const base = createdAt ?? new Date();

  const policy = await db.ticketSlaPolicy.findFirst({
    where: {
      orgId,
      OR: [
        { priority: priority ?? null },
        { priority: null, isDefault: true },
      ],
    },
    orderBy: [{ priority: "asc" }, { isDefault: "desc" }],
  });

  if (!policy) {
    return { firstResponseDueAt: null, resolutionDueAt: null };
  }

  return {
    firstResponseDueAt: new Date(base.getTime() + policy.firstResponseTargetMins * 60 * 1000),
    resolutionDueAt: new Date(base.getTime() + policy.resolutionTargetMins * 60 * 1000),
  };
}
