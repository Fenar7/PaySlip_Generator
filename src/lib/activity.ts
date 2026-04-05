import { db } from "@/lib/db";

export async function logActivity(params: {
  orgId: string;
  actorId?: string;
  actorName: string;
  event: string;
  docType?: string;
  docId?: string;
  meta?: Record<string, unknown>;
}) {
  return db.activityLog.create({
    data: {
      orgId: params.orgId,
      actorId: params.actorId ?? null,
      actorName: params.actorName,
      event: params.event,
      docType: params.docType ?? null,
      docId: params.docId ?? null,
      meta: (params.meta as Record<string, string | number | boolean | null>) ?? undefined,
    },
  });
}
