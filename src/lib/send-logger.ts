import "server-only";

import { db } from "@/lib/db";

type LogSendParams = {
  orgId: string;
  type: "invoice_send" | "scheduled_send" | "reminder" | "notification";
  recipientEmail: string;
  subject?: string;
  status?: "sent" | "failed" | "bounced";
  errorMessage?: string;
  docType?: string;
  docId?: string;
};

export async function logSend(params: LogSendParams): Promise<void> {
  try {
    await db.sendLog.create({
      data: {
        orgId: params.orgId,
        type: params.type,
        recipientEmail: params.recipientEmail,
        subject: params.subject,
        status: params.status ?? "sent",
        errorMessage: params.errorMessage,
        docType: params.docType,
        docId: params.docId,
      },
    });
  } catch (error) {
    console.error("[send-logger] Failed to log send:", error);
  }
}

export async function getSendLogs(
  orgId: string,
  filters?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: Awaited<ReturnType<typeof db.sendLog.findMany>>; total: number }> {
  const where = {
    orgId,
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const [logs, total] = await Promise.all([
    db.sendLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    db.sendLog.count({ where }),
  ]);

  return { logs, total };
}
