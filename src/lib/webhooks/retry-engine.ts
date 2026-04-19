/**
 * Webhook Retry Engine — Phase 28 Sprint 28.4
 *
 * Implements exponential backoff retry for failed webhook deliveries.
 * Failed deliveries beyond max attempts are moved to the dead letter queue.
 *
 * Backoff schedule: 30s, 2m, 10m, 1h, 4h (5 attempts default)
 */

import { createHmac } from "crypto";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  webhookId: string;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  durationMs: number;
}

// ─── Backoff Schedule ─────────────────────────────────────────────────────────

const BACKOFF_DELAYS_MS = [
  300_000,      // 5 minutes
  1_800_000,    // 30 minutes
  7_200_000,    // 2 hours
  43_200_000,   // 12 hours
  86_400_000,   // 24 hours
];

/**
 * Calculate the next retry delay using exponential backoff.
 */
export function getBackoffDelay(attempt: number): number {
  const index = Math.min(attempt, BACKOFF_DELAYS_MS.length - 1);
  return BACKOFF_DELAYS_MS[index];
}

// ─── Webhook Signing ──────────────────────────────────────────────────────────

/**
 * Generate an HMAC-SHA256 signature for webhook payload verification.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Generate webhook delivery headers including signature.
 */
export function getDeliveryHeaders(
  payload: string,
  secret: string,
  deliveryId: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureInput = `${timestamp}.${payload}`;
  const signature = signWebhookPayload(signatureInput, secret);

  return {
    "Content-Type": "application/json",
    "X-Webhook-ID": deliveryId,
    "X-Webhook-Timestamp": timestamp,
    "X-Webhook-Signature": `v1=${signature}`,
    "User-Agent": "Slipwise-Webhooks/1.0",
  };
}

// ─── Delivery Attempt ─────────────────────────────────────────────────────────

/**
 * Attempt to deliver a webhook payload to the target URL.
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string,
  deliveryId: string
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload);
  const headers = getDeliveryHeaders(body, secret, deliveryId);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(30_000), // 30s timeout
    });

    const durationMs = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    return {
      success,
      statusCode: response.status,
      durationMs,
      error: success ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const error = err instanceof Error ? err.message : "Network error";
    return { success: false, durationMs, error };
  }
}

// ─── Retry Processing ─────────────────────────────────────────────────────────

/**
 * Process all pending webhook retries that are due.
 * Called by the cron handler.
 *
 * @returns Summary of processed retries
 */
export async function processWebhookRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}> {
  const now = new Date();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let deadLettered = 0;

  // Find due retries
  const pendingRetries = await db.webhookDeadLetter.findMany({
    where: {
      status: { in: ["pending", "retrying"] },
      nextRetryAt: { lte: now },
    },
    include: {
      endpoint: {
        select: { url: true, signingSecret: true, isActive: true },
      },
    },
    take: 50, // Process in batches
    orderBy: { nextRetryAt: "asc" },
  });

  for (const entry of pendingRetries) {
    processed++;

    // Skip if endpoint was disabled
    if (!entry.endpoint.isActive) {
      await db.webhookDeadLetter.update({
        where: { id: entry.id },
        data: { status: "exhausted", lastError: "Endpoint disabled" },
      });
      deadLettered++;
      continue;
    }

    const payload = entry.payload as unknown as WebhookPayload;
    const secret = entry.endpoint.signingSecret || "";
    const result = await deliverWebhook(entry.endpoint.url, payload, secret, entry.id);

    if (result.success) {
      await db.webhookDeadLetter.update({
        where: { id: entry.id },
        data: {
          status: "resolved",
          resolvedAt: now,
          lastAttemptAt: now,
          attempts: entry.attempts + 1,
        },
      });
      succeeded++;
    } else {
      const newAttempts = entry.attempts + 1;

      if (newAttempts >= entry.maxAttempts) {
        // Move to exhausted (permanent failure)
        await db.webhookDeadLetter.update({
          where: { id: entry.id },
          data: {
            status: "exhausted",
            attempts: newAttempts,
            lastAttemptAt: now,
            lastError: result.error || "Max retries exceeded",
            lastStatus: result.statusCode,
          },
        });
        deadLettered++;
      } else {
        // Schedule next retry
        const nextDelay = getBackoffDelay(newAttempts);
        await db.webhookDeadLetter.update({
          where: { id: entry.id },
          data: {
            status: "retrying",
            attempts: newAttempts,
            lastAttemptAt: now,
            nextRetryAt: new Date(now.getTime() + nextDelay),
            lastError: result.error,
            lastStatus: result.statusCode,
          },
        });
        failed++;
      }
    }
  }

  return { processed, succeeded, failed, deadLettered };
}

// ─── Dead Letter Management ───────────────────────────────────────────────────

/**
 * Manually retry a dead-lettered webhook.
 * Resets attempt count and schedules immediate retry.
 */
export async function retryDeadLetter(deadLetterId: string, orgId: string): Promise<boolean> {
  const entry = await db.webhookDeadLetter.findFirst({
    where: { id: deadLetterId, orgId, status: "exhausted" },
  });

  if (!entry) return false;

  await db.webhookDeadLetter.update({
    where: { id: deadLetterId },
    data: {
      status: "pending",
      attempts: 0,
      nextRetryAt: new Date(),
      lastError: null,
      resolvedAt: null,
    },
  });

  return true;
}

/**
 * Enqueue a failed delivery to the dead letter queue for retry.
 */
export async function enqueueForRetry(input: {
  endpointId: string;
  orgId: string;
  eventType: string;
  payload: WebhookPayload;
  error: string;
  statusCode?: number;
}): Promise<string> {
  const firstRetryDelay = getBackoffDelay(0);

  const entry = await db.webhookDeadLetter.create({
    data: {
      endpointId: input.endpointId,
      orgId: input.orgId,
      eventType: input.eventType,
      payload: JSON.parse(JSON.stringify(input.payload)),
      attempts: 1,
      lastAttemptAt: new Date(),
      nextRetryAt: new Date(Date.now() + firstRetryDelay),
      lastError: input.error,
      lastStatus: input.statusCode,
      status: "retrying",
    },
  });

  return entry.id;
}
