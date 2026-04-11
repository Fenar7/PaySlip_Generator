"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";
import {
  validateWebhookEvents,
  validateWebhookUrl,
} from "@/lib/webhook/constants";
import { generateSigningSecret } from "@/lib/webhook/signature";
import { deliverWebhook } from "@/lib/webhook/deliver";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireWebhookFeature() {
  const ctx = await requireRole("admin");
  const allowed = await checkFeature(ctx.orgId, "webhookV2");
  if (!allowed) {
    throw new Error("Webhook v2 requires an upgraded plan.");
  }
  return ctx;
}

export async function createWebhookEndpoint(input: {
  url: string;
  events: string[];
  autoDisableAt?: number;
}): Promise<ActionResult<{ id: string; signingSecret: string }>> {
  try {
    const ctx = await requireWebhookFeature();
    const url = input.url.trim();

    if (!url) {
      return { success: false, error: "URL is required." };
    }

    validateWebhookUrl(url);
    validateWebhookEvents(input.events);

    const signingSecret = generateSigningSecret();

    const endpoint = await db.apiWebhookEndpoint.create({
      data: {
        orgId: ctx.orgId,
        url,
        events: input.events,
        secretHash: "",
        apiVersion: "v2",
        signingSecret,
        maxRetries: 5,
        retryBackoff: "exponential",
        isActive: true,
        consecutiveFails: 0,
        autoDisableAt: input.autoDisableAt ?? 10,
      },
    });

    revalidatePath("/app/settings/developer/webhooks/v2");
    return { success: true, data: { id: endpoint.id, signingSecret } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create endpoint." };
  }
}

export async function listWebhookEndpoints(): Promise<
  ActionResult<
    Array<{
      id: string;
      url: string;
      events: string[];
      isActive: boolean;
      requiresSecretRotation: boolean;
      consecutiveFails: number;
      lastDeliveryAt: Date | null;
      lastSuccessAt: Date | null;
      createdAt: Date;
    }>
  >
> {
  try {
    const ctx = await requireWebhookFeature();

    const endpoints = await db.apiWebhookEndpoint.findMany({
      where: { orgId: ctx.orgId, apiVersion: "v2" },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        signingSecret: true,
        consecutiveFails: true,
        lastDeliveryAt: true,
        lastSuccessAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: endpoints.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive,
        requiresSecretRotation: !endpoint.signingSecret,
        consecutiveFails: endpoint.consecutiveFails,
        lastDeliveryAt: endpoint.lastDeliveryAt,
        lastSuccessAt: endpoint.lastSuccessAt,
        createdAt: endpoint.createdAt,
      })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to list endpoints." };
  }
}

export async function getWebhookEndpoint(
  endpointId: string,
): Promise<
  ActionResult<{
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    consecutiveFails: number;
    maxRetries: number;
    autoDisableAt: number | null;
    lastDeliveryAt: Date | null;
    lastSuccessAt: Date | null;
    createdAt: Date;
    _count: { deliveries: number };
  }>
> {
  try {
    const ctx = await requireWebhookFeature();

    const endpoint = await db.apiWebhookEndpoint.findFirst({
      where: { id: endpointId, orgId: ctx.orgId, apiVersion: "v2" },
      include: { _count: { select: { deliveries: true } } },
    });

    if (!endpoint) {
      return { success: false, error: "Webhook endpoint not found." };
    }

    return {
      success: true,
      data: {
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive ?? true,
        consecutiveFails: endpoint.consecutiveFails ?? 0,
        maxRetries: endpoint.maxRetries ?? 5,
        autoDisableAt: endpoint.autoDisableAt ?? null,
        lastDeliveryAt: endpoint.lastDeliveryAt ?? null,
        lastSuccessAt: endpoint.lastSuccessAt ?? null,
        createdAt: endpoint.createdAt,
        _count: endpoint._count,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to get endpoint." };
  }
}

export async function updateWebhookEndpoint(
  endpointId: string,
  input: { url?: string; events?: string[]; isActive?: boolean },
): Promise<ActionResult<null>> {
  try {
    const ctx = await requireWebhookFeature();

    const endpoint = await db.apiWebhookEndpoint.findFirst({
      where: { id: endpointId, orgId: ctx.orgId, apiVersion: "v2" },
    });
    if (!endpoint) {
      return { success: false, error: "Webhook endpoint not found." };
    }
    if (input.url !== undefined) {
      validateWebhookUrl(input.url.trim());
    }
    if (input.events !== undefined) {
      validateWebhookEvents(input.events);
    }
    if (input.isActive && !endpoint.signingSecret) {
      return {
        success: false,
        error: "Rotate the signing secret before re-enabling this endpoint.",
      };
    }

    await db.apiWebhookEndpoint.update({
      where: { id: endpointId },
      data: {
        ...(input.url !== undefined && { url: input.url.trim() }),
        ...(input.events !== undefined && { events: input.events }),
        ...(input.isActive !== undefined && {
          isActive: input.isActive,
          consecutiveFails: input.isActive ? 0 : undefined,
        }),
      },
    });

    revalidatePath("/app/settings/developer/webhooks/v2");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update endpoint." };
  }
}

export async function rotateSigningSecret(
  endpointId: string,
): Promise<ActionResult<{ signingSecret: string }>> {
  try {
    const ctx = await requireWebhookFeature();

    const endpoint = await db.apiWebhookEndpoint.findFirst({
      where: { id: endpointId, orgId: ctx.orgId, apiVersion: "v2" },
    });
    if (!endpoint) {
      return { success: false, error: "Webhook endpoint not found." };
    }

    const signingSecret = generateSigningSecret();
    await db.apiWebhookEndpoint.update({
      where: { id: endpointId },
      data: { signingSecret, isActive: true, consecutiveFails: 0 },
    });

    revalidatePath("/app/settings/developer/webhooks/v2");
    return { success: true, data: { signingSecret } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to rotate secret." };
  }
}

export async function deleteWebhookEndpoint(endpointId: string): Promise<ActionResult<null>> {
  try {
    const ctx = await requireWebhookFeature();

    const endpoint = await db.apiWebhookEndpoint.findFirst({
      where: { id: endpointId, orgId: ctx.orgId, apiVersion: "v2" },
    });
    if (!endpoint) {
      return { success: false, error: "Webhook endpoint not found." };
    }

    await db.apiWebhookDelivery.deleteMany({ where: { endpointId } });
    await db.apiWebhookEndpoint.delete({ where: { id: endpointId } });

    revalidatePath("/app/settings/developer/webhooks/v2");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete endpoint." };
  }
}

export async function getDeliveryLog(
  endpointId: string,
  page = 1,
): Promise<
  ActionResult<{
    deliveries: Array<{
      id: string;
      eventType: string;
      success: boolean;
      attempt: number;
      nextRetryAt: Date | null;
      responseStatus: number | null;
      durationMs: number | null;
      deliveredAt: Date | null;
      requestBody: unknown;
      responseBody: string | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  try {
    const ctx = await requireWebhookFeature();

    const endpoint = await db.apiWebhookEndpoint.findFirst({
      where: { id: endpointId, orgId: ctx.orgId, apiVersion: "v2" },
    });
    if (!endpoint) {
      return { success: false, error: "Webhook endpoint not found." };
    }

    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const [deliveries, total] = await Promise.all([
      db.apiWebhookDelivery.findMany({
        where: { endpointId },
        orderBy: { deliveredAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          eventType: true,
          success: true,
          attempt: true,
          nextRetryAt: true,
          responseStatus: true,
          durationMs: true,
          deliveredAt: true,
          requestBody: true,
          responseBody: true,
        },
      }),
      db.apiWebhookDelivery.count({ where: { endpointId } }),
    ]);

    return { success: true, data: { deliveries, total, page, pageSize } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch deliveries." };
  }
}

export async function replayDelivery(deliveryId: string): Promise<ActionResult<null>> {
  try {
    const ctx = await requireWebhookFeature();

    const delivery = await db.apiWebhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });

    if (!delivery || delivery.endpoint.orgId !== ctx.orgId) {
      return { success: false, error: "Delivery not found." };
    }

    await deliverWebhook(delivery.endpointId, delivery.eventType, delivery.requestBody ?? delivery.payload);

    revalidatePath(`/app/settings/developer/webhooks/${delivery.endpointId}/deliveries`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to replay delivery." };
  }
}
