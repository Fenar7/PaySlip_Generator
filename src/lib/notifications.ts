import "server-only";

import { db } from "@/lib/db";

// ─── Notification Utility ─────────────────────────────────────────────────────

export interface CreateNotificationParams {
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return db.notification.create({
    data: {
      userId: params.userId,
      orgId: params.orgId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
    },
  });
}

export interface NotifyOrgAdminsParams {
  orgId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  excludeUserId?: string;
}

export async function notifyOrgAdmins(params: NotifyOrgAdminsParams) {
  const admins = await db.member.findMany({
    where: {
      organizationId: params.orgId,
      role: { in: ["admin", "owner"] },
      ...(params.excludeUserId ? { userId: { not: params.excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  if (admins.length === 0) return;

  await db.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.userId,
      orgId: params.orgId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
    })),
  });
}
