import crypto from 'crypto';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { isWebhookEventSubscribed } from './constants';
import { generateSignatureHeaders } from './signature';

type EndpointRecord = {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecret: string | null;
  maxRetries: number | null;
  autoDisableAt: number | null;
  consecutiveFails: number | null;
};

type DeliverWebhookOptions = {
  attempt?: number;
};

type DeliveryOutcome = 'success' | 'retry_scheduled' | 'dead_lettered';

function clonePayload(
  payload: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const normalized =
    payload === undefined ? null : JSON.parse(JSON.stringify(payload));

  return normalized === null
    ? Prisma.JsonNull
    : (normalized as Prisma.InputJsonValue);
}

async function markEndpointFailure(endpointId: string) {
  const endpoint = await db.apiWebhookEndpoint.update({
    where: { id: endpointId },
    data: { consecutiveFails: { increment: 1 }, lastDeliveryAt: new Date() },
  });

  if ((endpoint.consecutiveFails ?? 0) >= (endpoint.autoDisableAt ?? 10)) {
    await db.apiWebhookEndpoint.update({
      where: { id: endpointId },
      data: { isActive: false },
    });
  }
}

async function deliverToEndpoint(
  endpoint: EndpointRecord,
  event: string,
  payload: unknown,
  attempt: number,
): Promise<DeliveryOutcome> {
  const requestPayload = clonePayload(payload);
  const body = JSON.stringify(requestPayload);
  const deliveryId = crypto.randomUUID();
  const maxRetries = endpoint.maxRetries ?? 5;

  await db.apiWebhookDelivery.create({
    data: {
      id: deliveryId,
      endpointId: endpoint.id,
      eventType: event,
      success: false,
      payload: requestPayload,
      requestBody: requestPayload,
      attempt,
    },
  });

  if (!endpoint.signingSecret) {
    await db.apiWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        success: false,
        responseBody:
          'Signing secret is missing for this endpoint. Rotate the secret before resuming deliveries.',
        durationMs: 0,
        deliveredAt: new Date(),
        nextRetryAt: null,
      },
    });
    await markEndpointFailure(endpoint.id);
    return 'dead_lettered';
  }

  const headers = generateSignatureHeaders(endpoint.signingSecret, body, deliveryId, event);
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
        success: response.ok,
        responseStatus: response.status,
        responseBody: responseBody.slice(0, 4000),
        durationMs,
        deliveredAt: new Date(),
        nextRetryAt: response.ok
          ? null
          : attempt < maxRetries
            ? getNextRetryTime(attempt)
            : null,
      },
    });

    if (response.ok) {
      await db.apiWebhookEndpoint.update({
        where: { id: endpoint.id },
        data: { consecutiveFails: 0, lastDeliveryAt: new Date(), lastSuccessAt: new Date() },
      });
      return 'success';
    }

    await markEndpointFailure(endpoint.id);
    return attempt < maxRetries ? 'retry_scheduled' : 'dead_lettered';
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await db.apiWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        success: false,
        responseBody: (error instanceof Error ? error.message : 'Unknown error').slice(0, 4000),
        durationMs,
        deliveredAt: new Date(),
        nextRetryAt: attempt < maxRetries ? getNextRetryTime(attempt) : null,
      },
    });
    await markEndpointFailure(endpoint.id);
    return attempt < maxRetries ? 'retry_scheduled' : 'dead_lettered';
  }
}

export async function deliverWebhook(
  endpointId: string,
  event: string,
  payload: unknown,
  options: DeliverWebhookOptions = {},
): Promise<void> {
  const endpoint = await db.apiWebhookEndpoint.findUnique({
    where: { id: endpointId },
    select: {
      id: true,
      orgId: true,
      url: true,
      events: true,
      isActive: true,
      signingSecret: true,
      maxRetries: true,
      autoDisableAt: true,
      consecutiveFails: true,
    },
  });

  if (!endpoint || !endpoint.isActive) {
    return;
  }

  await deliverToEndpoint(endpoint, event, payload, options.attempt ?? 1);
}

export async function dispatchEvent(
  orgId: string,
  eventType: string,
  payload: unknown,
): Promise<void> {
  const endpoints = await db.apiWebhookEndpoint.findMany({
    where: {
      orgId,
      isActive: true,
    },
    select: {
      id: true,
      orgId: true,
      url: true,
      events: true,
      isActive: true,
      signingSecret: true,
      maxRetries: true,
      autoDisableAt: true,
      consecutiveFails: true,
    },
  });

  const matchedEndpoints = endpoints.filter((endpoint) =>
    isWebhookEventSubscribed(endpoint.events, eventType),
  );

  await Promise.allSettled(
    matchedEndpoints.map((endpoint) => deliverToEndpoint(endpoint, eventType, payload, 1)),
  );
}

// Retry schedule: 1m, 5m, 15m, 1h, 4h
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000, 14_400_000];

export function getNextRetryTime(attempt: number): Date | null {
  if (attempt > 5) return null;
  const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  return new Date(Date.now() + delayMs);
}

export async function retryPendingWebhookDeliveries(
  now = new Date(),
): Promise<{ due: number; retried: number; deadLettered: number; skipped: number }> {
  const dueDeliveries = await db.apiWebhookDelivery.findMany({
    where: {
      success: false,
      nextRetryAt: { lte: now },
    },
    orderBy: { nextRetryAt: 'asc' },
    include: {
      endpoint: {
        select: {
          id: true,
          orgId: true,
          url: true,
          events: true,
          isActive: true,
          signingSecret: true,
          maxRetries: true,
          autoDisableAt: true,
          consecutiveFails: true,
        },
      },
    },
  });

  let retried = 0;
  let deadLettered = 0;
  let skipped = 0;

  for (const delivery of dueDeliveries) {
    await db.apiWebhookDelivery.update({
      where: { id: delivery.id },
      data: { nextRetryAt: null },
    });

    if (!delivery.endpoint || !delivery.endpoint.isActive) {
      skipped += 1;
      continue;
    }

    const maxRetries = delivery.endpoint.maxRetries ?? 5;
    if (delivery.attempt >= maxRetries) {
      deadLettered += 1;
      continue;
    }

    const outcome = await deliverToEndpoint(
      delivery.endpoint,
      delivery.eventType,
      delivery.requestBody ?? delivery.payload,
      delivery.attempt + 1,
    );

    if (outcome === 'dead_lettered') {
      deadLettered += 1;
    } else {
      retried += 1;
    }
  }

  return {
    due: dueDeliveries.length,
    retried,
    deadLettered,
    skipped,
  };
}
