"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logFlowConfigChange } from "@/lib/flow/audit";
import { replayDelivery } from "@/lib/flow/delivery-engine";
import { buildNotificationEmailHtml } from "@/lib/flow/delivery-templates";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const PAGE_SIZE = 25;

export type DeliveryFilter = {
  page?: number;
  status?: string;
  channel?: string;
  sourceModule?: string;
};

// ─── List Deliveries ──────────────────────────────────────────────────────────

export async function listDeliveries(
  filter: DeliveryFilter = {}
): Promise<
  ActionResult<{
    deliveries: Awaited<ReturnType<typeof fetchDeliveries>>;
    total: number;
    page: number;
  }>
> {
  const { orgId } = await requireRole("admin");
  const page = filter.page ?? 0;
  const skip = page * PAGE_SIZE;

  const where = buildWhere(orgId, filter);
  const [deliveries, total] = await Promise.all([
    fetchDeliveries(where, skip),
    db.notificationDelivery.count({ where }),
  ]);

  return { success: true, data: { deliveries, total, page } };
}

function buildWhere(orgId: string, filter: DeliveryFilter) {
  return {
    orgId,
    ...(filter.status ? { status: filter.status as never } : {}),
    ...(filter.channel ? { channel: filter.channel as never } : {}),
    ...(filter.sourceModule ? { sourceModule: filter.sourceModule } : {}),
  };
}

function fetchDeliveries(where: object, skip: number) {
  return db.notificationDelivery.findMany({
    where,
    orderBy: { queuedAt: "desc" },
    skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      channel: true,
      recipientTarget: true,
      status: true,
      attemptCount: true,
      maxAttempts: true,
      provider: true,
      sourceModule: true,
      sourceRef: true,
      queuedAt: true,
      sentAt: true,
      failedAt: true,
      nextRetryAt: true,
      failureReason: true,
      replayedAt: true,
      replayedFromId: true,
      notification: {
        select: { id: true, title: true, type: true, link: true },
      },
    },
  });
}

// ─── Operator Replay ──────────────────────────────────────────────────────────

export async function replayDeliveryAction(
  deliveryId: string
): Promise<ActionResult<{ newDeliveryId: string; status: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const delivery = await db.notificationDelivery.findFirst({
    where: { id: deliveryId, orgId },
    include: {
      notification: {
        select: { title: true, body: true, link: true },
      },
    },
  });

  if (!delivery) {
    return { success: false, error: "Delivery not found" };
  }

  if (!["FAILED", "TERMINAL_FAILURE"].includes(delivery.status)) {
    return {
      success: false,
      error: `Cannot replay a delivery with status ${delivery.status}. Only FAILED or TERMINAL_FAILURE deliveries can be replayed.`,
    };
  }

  if (delivery.channel !== "email") {
    return { success: false, error: "Only email deliveries can be replayed by operators." };
  }

  const subject = `[Slipwise] ${delivery.notification.title}`;
  const html = buildNotificationEmailHtml({
    title: delivery.notification.title,
    body: delivery.notification.body,
    link: delivery.notification.link,
  });

  try {
    const result = await replayDelivery(deliveryId, subject, html, userId);

    await logFlowConfigChange({
      orgId,
      actorId: userId,
      entityType: "NotificationDelivery",
      entityId: result.deliveryId,
      action: "operator_replay",
      metadata: { originalDeliveryId: deliveryId, newStatus: result.status },
    });

    revalidatePath("/app/flow/notifications/deliveries");
    return {
      success: true,
      data: { newDeliveryId: result.deliveryId, status: result.status },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Replay failed";
    return { success: false, error: message };
  }
}

// ─── Delivery Stats ───────────────────────────────────────────────────────────

export async function getDeliveryStats(): Promise<
  ActionResult<{
    total: number;
    queued: number;
    sent: number;
    failed: number;
    terminal: number;
    replayed: number;
  }>
> {
  const { orgId } = await requireRole("admin");

  const [total, queued, sent, failed, terminal, replayed] = await Promise.all([
    db.notificationDelivery.count({ where: { orgId } }),
    db.notificationDelivery.count({ where: { orgId, status: "QUEUED" } }),
    db.notificationDelivery.count({ where: { orgId, status: { in: ["SENT", "DELIVERED"] } } }),
    db.notificationDelivery.count({ where: { orgId, status: "FAILED" } }),
    db.notificationDelivery.count({ where: { orgId, status: "TERMINAL_FAILURE" } }),
    db.notificationDelivery.count({ where: { orgId, status: "REPLAYED" } }),
  ]);

  return { success: true, data: { total, queued, sent, failed, terminal, replayed } };
}
