import "server-only";

import { db } from "@/lib/db";
import { hasPermission, type Action, type Module } from "@/lib/permissions";

export async function requirePermission(
  orgId: string,
  userId: string,
  module: Module,
  action: Action
): Promise<void> {
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true },
  });

  if (!member) {
    throw new Error("Not a member of this organization");
  }

  if (!hasPermission(member.role, module, action)) {
    throw new Error(
      `Permission denied: ${action} on ${module} requires a higher role`
    );
  }
}
