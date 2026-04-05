import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { headers } from "next/headers";

interface AuditParams {
  orgId: string;
  actorId: string;
  representedId?: string;
  proxyGrantId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const hdrs = await headers();
    const ipAddress =
      hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || null;
    const userAgent = hdrs.get("user-agent") || null;

    await db.auditLog.create({
      data: {
        orgId: params.orgId,
        actorId: params.actorId,
        representedId: params.representedId ?? null,
        proxyGrantId: params.proxyGrantId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata:
          (params.metadata as Prisma.InputJsonValue) ?? Prisma.DbNull,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Fire-and-forget: never block the user action
    console.error("[AUDIT] Failed to log:", error);
  }
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "member.invited": "Invited team member",
  "member.role_changed": "Changed member role",
  "member.deactivated": "Deactivated member",
  "member.removed": "Removed member",
  "proxy.granted": "Granted proxy access",
  "proxy.revoked": "Revoked proxy access",
  "proxy.action": "Acted via proxy",
  "invoice.issued": "Issued invoice",
  "invoice.cancelled": "Cancelled invoice",
  "invoice.reissued": "Reissued invoice",
  "invoice.paid": "Marked invoice paid",
  "proof.accepted": "Accepted payment proof",
  "proof.rejected": "Rejected payment proof",
  "salary.released": "Released salary slip",
  "approval.approved": "Approved request",
  "approval.rejected": "Rejected request",
  "org.settings_changed": "Updated organization settings",
  "org.branding_changed": "Updated branding",
  "cron.executed": "CRON job executed",
  "send.scheduled": "Scheduled send",
  "send.completed": "Send completed",
  "recurring.generated": "Generated recurring invoice",
};

export function getAuditCategory(action: string): string {
  if (action.startsWith("member.") || action.startsWith("proxy."))
    return "Access";
  if (
    action.startsWith("invoice.") ||
    action.startsWith("proof.") ||
    action.startsWith("salary.") ||
    action.startsWith("approval.")
  )
    return "Documents";
  if (action.startsWith("org.")) return "Settings";
  if (
    action.startsWith("cron.") ||
    action.startsWith("send.") ||
    action.startsWith("recurring.")
  )
    return "System";
  return "Other";
}
