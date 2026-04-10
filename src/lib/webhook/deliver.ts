import crypto from 'crypto';
import { db } from '@/lib/db';
import { generateSignatureHeaders } from './signature';

export async function deliverWebhook(endpointId: string, event: string, payload: unknown): Promise<void> {
  const endpoint = await db.apiWebhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint || !endpoint.isActive) return;

  const body = JSON.stringify(payload);
  const deliveryId = crypto.randomUUID();
  const headers: Record<string, string> = endpoint.signingSecret
    ? generateSignatureHeaders(endpoint.signingSecret, body, deliveryId, event)
    : { 'X-Slipwise-Delivery': deliveryId, 'X-Slipwise-Event': event };

  await db.apiWebhookDelivery.create({
    data: {
      id: deliveryId,
      endpointId,
      event,
      status: 'pending',
      payload: body,
      requestBody: payload as Record<string, unknown>,
      attempt: 1,
    },
  });

  const startTime = Date.now();
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    await db.apiWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: response.ok ? 'delivered' : 'failed',
        responseStatus: response.status,
        responseBody,
        durationMs,
        deliveredAt: response.ok ? new Date() : null,
        nextRetryAt: response.ok ? null : getNextRetryTime(1),
      },
    });

    if (response.ok) {
      await db.apiWebhookEndpoint.update({
        where: { id: endpointId },
        data: { consecutiveFails: 0, lastDeliveryAt: new Date(), lastSuccessAt: new Date() },
      });
    } else {
      await handleDeliveryFailure(endpointId);
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await db.apiWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'failed',
        responseBody: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
        nextRetryAt: getNextRetryTime(1),
      },
    });
    await handleDeliveryFailure(endpointId);
  }
}

async function handleDeliveryFailure(endpointId: string) {
  const endpoint = await db.apiWebhookEndpoint.update({
    where: { id: endpointId },
    data: { consecutiveFails: { increment: 1 }, lastDeliveryAt: new Date() },
  });
  if (endpoint.consecutiveFails >= (endpoint.autoDisableAt ?? 10)) {
    await db.apiWebhookEndpoint.update({
      where: { id: endpointId },
      data: { isActive: false },
    });
  }
}

// Retry schedule: 1m, 5m, 15m, 1h, 4h
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000, 14_400_000];

export function getNextRetryTime(attempt: number): Date | null {
  if (attempt > 5) return null;
  const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  return new Date(Date.now() + delayMs);
}
