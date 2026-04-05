"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const PAGE_SIZE = 20;

// ─── List Notifications ───────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListResult {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

export async function listNotifications(
  params?: { page?: number; unreadOnly?: boolean }
): Promise<ActionResult<NotificationListResult>> {
  try {
    const { userId, orgId } = await requireOrgContext();
    const page = params?.page ?? 0;

    const where = {
      userId,
      orgId,
      ...(params?.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, orgId, isRead: false } }),
    ]);

    return {
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
        total,
        unreadCount,
      },
    };
  } catch (error) {
    console.error("listNotifications error:", error);
    return { success: false, error: "Failed to list notifications" };
  }
}

// ─── Get Unread Count ─────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<ActionResult<number>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const count = await db.notification.count({
      where: { userId, orgId, isRead: false },
    });

    return { success: true, data: count };
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return { success: false, error: "Failed to get unread count" };
  }
}

// ─── Mark Notification Read ───────────────────────────────────────────────────

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult<undefined>> {
  try {
    const { userId } = await requireOrgContext();

    const notification = await db.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    revalidatePath("/app/flow/notifications");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("markNotificationRead error:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}

// ─── Mark All Read ────────────────────────────────────────────────────────────

export async function markAllRead(): Promise<ActionResult<undefined>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    await db.notification.updateMany({
      where: { userId, orgId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/app/flow/notifications");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("markAllRead error:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}
