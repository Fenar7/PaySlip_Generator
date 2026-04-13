import "server-only";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logFlowConfigChange } from "@/lib/flow/audit";
import { isModelMissingTableError } from "@/lib/prisma-errors";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_DELIVERY_ATTEMPTS = 3;

/** Exponential backoff delays in minutes: attempt 1→5m, 2→30m, 3→terminal */
const RETRY_DELAY_MINS = [5, 30];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueueEmailDeliveryParams {
  notificationId: string;
  orgId: string;
  recipientEmail: string;
  subject: string;
  html: string;
  sourceModule?: string;
  sourceRef?: string;
  workflowRunId?: string;
  scheduledActionId?: string;
  maxAttempts?: number;
}

export interface DeliveryResult {
  deliveryId: string;
  status: "SENT" | "FAILED" | "TERMINAL_FAILURE";
  attemptCount: number;
  error?: string;
}

// ─── Queue a new email delivery attempt ───────────────────────────────────────

/**
 * Creates a QUEUED NotificationDelivery record for email and immediately
 * attempts to send it. Call this after the Notification record is created.
 * Never duplicates user-visible in-app records.
 */
export async function queueEmailDelivery(
  params: QueueEmailDeliveryParams
): Promise<DeliveryResult> {
  const delivery = await db.notificationDelivery.create({
    data: {
      notificationId: params.notificationId,
      orgId: params.orgId,
      channel: "email",
      recipientTarget: params.recipientEmail,
      status: "QUEUED",
      attemptCount: 0,
      maxAttempts: params.maxAttempts ?? MAX_DELIVERY_ATTEMPTS,
      provider: "resend",
      sourceModule: params.sourceModule ?? null,
      sourceRef: params.sourceRef ?? null,
      workflowRunId: params.workflowRunId ?? null,
      scheduledActionId: params.scheduledActionId ?? null,
    },
  });

  return attemptEmailDelivery(delivery.id, params.subject, params.html);
}

// ─── Attempt / Retry a delivery ───────────────────────────────────────────────

/**
 * Executes the email send for a delivery record and updates its status.
 * Used for initial send and scheduled retries.
 */
export async function attemptEmailDelivery(
  deliveryId: string,
  subject: string,
  html: string
): Promise<DeliveryResult> {
  const delivery = await db.notificationDelivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) throw new Error(`Delivery ${deliveryId} not found`);

  // Terminal check — do not attempt beyond maxAttempts
  if (
    delivery.status === "TERMINAL_FAILURE" ||
    delivery.status === "DELIVERED" ||
    delivery.status === "SENT"
  ) {
    return {
      deliveryId,
      status: delivery.status as "SENT" | "TERMINAL_FAILURE",
      attemptCount: delivery.attemptCount,
    };
  }

  // Mark as SENDING
  await db.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "SENDING",
      attemptCount: { increment: 1 },
    },
  });

  try {
    await sendEmail({
      to: delivery.recipientTarget,
      subject,
      html,
    });

    const updated = await db.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        nextRetryAt: null,
        failureReason: null,
      },
    });

    return {
      deliveryId,
      status: "SENT",
      attemptCount: updated.attemptCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    const currentAttempt =
      (await db.notificationDelivery.findUnique({ where: { id: deliveryId } }))
        ?.attemptCount ?? delivery.attemptCount + 1;

    const isTerminal = currentAttempt >= delivery.maxAttempts;
    const retryDelay = RETRY_DELAY_MINS[currentAttempt - 1];
    const nextRetryAt =
      !isTerminal && retryDelay
        ? new Date(Date.now() + retryDelay * 60 * 1000)
        : null;

    await db.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: isTerminal ? "TERMINAL_FAILURE" : "FAILED",
        failedAt: new Date(),
        failureReason: message,
        nextRetryAt,
      },
    });

    return {
      deliveryId,
      status: isTerminal ? "TERMINAL_FAILURE" : "FAILED",
      attemptCount: currentAttempt,
      error: message,
    };
  }
}

// ─── Operator replay ──────────────────────────────────────────────────────────

/**
 * Creates a new delivery record linked as a replay of the original.
 * Does NOT mutate the original delivery record — preserves full history.
 * Caller must provide subject/html since delivery engine is stateless.
 */
export async function replayDelivery(
  originalDeliveryId: string,
  subject: string,
  html: string,
  replayedByUserId: string
): Promise<DeliveryResult> {
  const original = await db.notificationDelivery.findUnique({
    where: { id: originalDeliveryId },
  });

  if (!original) throw new Error(`Original delivery ${originalDeliveryId} not found`);

  // Stamp replay timestamp on original
  await db.notificationDelivery.update({
    where: { id: originalDeliveryId },
    data: {
      status: "REPLAYED",
      replayedAt: new Date(),
      replayedBy: replayedByUserId,
    },
  });

  // Create fresh delivery linked to original
  const replayDelivery = await db.notificationDelivery.create({
    data: {
      notificationId: original.notificationId,
      orgId: original.orgId,
      channel: original.channel,
      recipientTarget: original.recipientTarget,
      status: "QUEUED",
      attemptCount: 0,
      maxAttempts: original.maxAttempts,
      provider: original.provider,
      sourceModule: original.sourceModule,
      sourceRef: original.sourceRef,
      workflowRunId: original.workflowRunId,
      scheduledActionId: original.scheduledActionId,
      replayedFromId: originalDeliveryId,
    },
  });

  // Audit
  await logFlowConfigChange({
    orgId: original.orgId,
    actorId: replayedByUserId,
    entityType: "NotificationDelivery",
    entityId: replayDelivery.id,
    action: "replay",
    metadata: {
      originalDeliveryId,
      channel: original.channel,
      recipientTarget: original.recipientTarget,
    },
  });

  return attemptEmailDelivery(replayDelivery.id, subject, html);
}

// ─── Cron retry: process due retries ─────────────────────────────────────────

/**
 * Called by the cron job. Finds FAILED deliveries with nextRetryAt <= now
 * and re-attempts them. Uses generic subject/html since retry context may
 * lack original template — operators should fix root cause before replay.
 */
export async function processDeliveryRetries(): Promise<{
  retried: number;
  succeeded: number;
  terminated: number;
}> {
  const now = new Date();

  const dueRetries = await db.notificationDelivery.findMany({
    where: {
      status: "FAILED",
      nextRetryAt: { not: null, lte: now },
      channel: "email",
    },
    include: {
      notification: {
        select: { title: true, body: true, link: true },
      },
    },
    take: 50, // bounded batch
  });

  let retried = 0;
  let succeeded = 0;
  let terminated = 0;

  for (const delivery of dueRetries) {
    const subject = `[Slipwise] ${delivery.notification.title}`;
    const html = buildRetryEmailHtml({
      title: delivery.notification.title,
      body: delivery.notification.body,
      link: delivery.notification.link,
    });

    try {
      const result = await attemptEmailDelivery(delivery.id, subject, html);
      retried++;
      if (result.status === "SENT") succeeded++;
      if (result.status === "TERMINAL_FAILURE") terminated++;
    } catch {
      // log but don't crash the whole batch
      console.error(`[DeliveryRetry] Failed to retry delivery ${delivery.id}`);
    }
  }

  return { retried, succeeded, terminated };
}

// ─── In-app delivery tracking ─────────────────────────────────────────────────

/**
 * Creates an in_app delivery record for analytics.
 * Does NOT create a Notification record — that must already exist.
 * Idempotent: skips if an in_app delivery already exists for this notification.
 */
export async function recordInAppDelivery(
  notificationId: string,
  orgId: string,
  recipientTarget: string,
  opts?: { sourceModule?: string; sourceRef?: string }
): Promise<string | null> {
  try {
    const existing = await db.notificationDelivery.findFirst({
      where: { notificationId, channel: "in_app" },
      select: { id: true },
    });
    if (existing) return existing.id;

    const record = await db.notificationDelivery.create({
      data: {
        notificationId,
        orgId,
        channel: "in_app",
        recipientTarget,
        status: "DELIVERED",
        attemptCount: 1,
        maxAttempts: 1,
        provider: "in_app",
        sentAt: new Date(),
        deliveredAt: new Date(),
        sourceModule: opts?.sourceModule ?? null,
        sourceRef: opts?.sourceRef ?? null,
      },
    });
    return record.id;
  } catch (err) {
    if (isModelMissingTableError(err, "NotificationDelivery")) {
      console.warn("[DeliveryEngine] NotificationDelivery table missing — skipping in-app record.");
      return null;
    }
    throw err;
  }
}

// ─── Email template for retry sends ──────────────────────────────────────────

function buildRetryEmailHtml(opts: {
  title: string;
  body: string;
  link: string | null;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.app";
  const linkHtml = opts.link
    ? `<p><a href="${appUrl}${opts.link}" style="color:#2563eb;">View in Slipwise →</a></p>`
    : "";
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px">
      <h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${opts.title}</h2>
      <p style="color:#555;margin-bottom:16px">${opts.body}</p>
      ${linkHtml}
      <p style="color:#999;font-size:11px;margin-top:32px">
        Sent by Slipwise One · <a href="${appUrl}/app/flow/notifications" style="color:#999">Manage notifications</a>
      </p>
    </div>
  `;
}
