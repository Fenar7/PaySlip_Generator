import "server-only";

import { db } from "@/lib/db";
import { isModelMissingTableError } from "@/lib/prisma-errors";

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
  try {
    return await db.notification.create({
      data: {
        userId: params.userId,
        orgId: params.orgId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      },
    });
  } catch (error) {
    if (isModelMissingTableError(error, "Notification")) {
      console.warn(
        "createNotification skipped: notification table missing during local/runtime schema drift",
      );
      return null;
    }
    throw error;
  }
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

  try {
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
  } catch (error) {
    if (isModelMissingTableError(error, "Notification")) {
      console.warn(
        "notifyOrgAdmins skipped: notification table missing during local/runtime schema drift",
      );
      return;
    }
    throw error;
  }
}
