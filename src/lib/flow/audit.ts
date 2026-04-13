import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * Logs a Flow configuration change to the AuditLog table.
 * Used by all Sprint 18.1 admin configuration actions for compliance tracking.
 *
 * IMPORTANT: Call this OUTSIDE of db.$transaction() blocks.
 */
export async function logFlowConfigChange(params: {
  orgId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        orgId: params.orgId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.DbNull,
      },
    });
  } catch (error) {
    // Log but don't fail the primary operation if audit logging fails
    console.error("[Flow Audit] Failed to log config change:", error);
  }
}
