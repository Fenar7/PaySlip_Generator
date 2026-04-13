import "server-only";

import { db } from "@/lib/db";
import { isModelMissingTableError } from "@/lib/prisma-errors";
import { queueEmailDelivery, recordInAppDelivery } from "@/lib/flow/delivery-engine";
import { buildNotificationEmailHtml } from "@/lib/flow/delivery-templates";

// ─── Notification Utility ─────────────────────────────────────────────────────

export interface CreateNotificationParams {
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  // Sprint 18.2 delivery options (all optional — backward-compatible)
  emailRequested?: boolean;
  recipientEmail?: string;
  sourceModule?: string;
  sourceRef?: string;
  workflowRunId?: string;
  scheduledActionId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: params.userId,
        orgId: params.orgId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
        emailRequested: params.emailRequested ?? false,
        recipientEmail: params.recipientEmail ?? null,
        sourceModule: params.sourceModule ?? null,
        sourceRef: params.sourceRef ?? null,
      },
    });

    // Record in-app delivery for analytics (idempotent)
    await recordInAppDelivery(notification.id, params.orgId, params.userId, {
      sourceModule: params.sourceModule,
      sourceRef: params.sourceRef,
    }).catch(() => {}); // never fail the notification itself

    // Queue email delivery if requested and recipient provided
    if (params.emailRequested && params.recipientEmail) {
      const subject = `[Slipwise] ${params.title}`;
      const html = buildNotificationEmailHtml({
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      });
      await queueEmailDelivery({
        notificationId: notification.id,
        orgId: params.orgId,
        recipientEmail: params.recipientEmail,
        subject,
        html,
        sourceModule: params.sourceModule,
        sourceRef: params.sourceRef,
        workflowRunId: params.workflowRunId,
        scheduledActionId: params.scheduledActionId,
      }).catch((err) => {
        // Log but don't fail notification creation
        console.error("[createNotification] Email delivery failed:", err);
      });
    }

    return notification;
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
    include: { user: { select: { email: true } } },
  });

  if (admins.length === 0) return;

  try {
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.userId,
          orgId: params.orgId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link ?? undefined,
          emailRequested: Boolean(admin.user.email),
          recipientEmail: admin.user.email ?? undefined,
          sourceModule: "flow",
          sourceRef: params.type,
        })
      )
    );
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
