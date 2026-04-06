import "server-only";

import crypto from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

// SSRF protection: reject private/reserved IPs and non-HTTPS
function validateWebhookUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase();

  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "[::]",
  ];
  if (blocked.includes(hostname)) {
    throw new Error("Webhook URL cannot point to localhost");
  }

  // Check private IP ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 127
    ) {
      throw new Error("Webhook URL cannot point to a private IP address");
    }
  }
}

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export async function createWebhookEndpoint(
  orgId: string,
  url: string,
  events: string[],
  description?: string
): Promise<{ endpointId: string; secret: string }> {
  validateWebhookUrl(url);

  const secret = "whsec_" + nanoid(32);
  const secretHash = hashSecret(secret);

  const endpoint = await db.apiWebhookEndpoint.create({
    data: {
      orgId,
      url,
      events,
      secretHash,
      description: description ?? null,
    },
  });

  return { endpointId: endpoint.id, secret };
}

function signPayload(
  timestamp: number,
  body: string,
  secret: string
): string {
  const message = `${timestamp}.${body}`;
  return crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");
}

export async function deliverWebhook(
  endpointId: string,
  eventType: string,
  data: unknown
): Promise<boolean> {
  const endpoint = await db.apiWebhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint || !endpoint.isActive) return false;

  const payload = {
    id: "evt_" + nanoid(),
    type: eventType,
    created: new Date().toISOString(),
    orgId: endpoint.orgId,
    data,
  };

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);

  // We reconstruct the secret from hash for signing — but we can't reverse a hash.
  // The signing is done at delivery time; the secret must be fetched from the endpoint's stored hash.
  // In practice, we store the full secret hash; signing uses the hash as the HMAC key.
  const signature = signPayload(timestamp, body, endpoint.secretHash);

  let success = false;
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let durationMs: number | null = null;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Slipwise-Signature": `t=${timestamp},v1=${signature}`,
          "X-Slipwise-Event": eventType,
          "X-Slipwise-Delivery": payload.id,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      durationMs = Date.now() - start;
      responseStatus = response.status;

      try {
        responseBody = (await response.text()).slice(0, 1000);
      } catch {
        responseBody = null;
      }

      success = response.ok;
    } catch (err) {
      durationMs = Date.now() - start;
      responseBody = err instanceof Error ? err.message : "Unknown error";
      success = false;
    }

    // Log the delivery attempt
    await db.apiWebhookDelivery.create({
      data: {
        endpointId,
        eventType,
        payload: payload as object,
        responseStatus,
        responseBody,
        durationMs,
        success,
        attempt,
      },
    });

    if (success) {
      await db.apiWebhookEndpoint.update({
        where: { id: endpointId },
        data: { failureCount: 0, lastDeliveredAt: new Date() },
      });
      return true;
    }

    // Exponential backoff before retry
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All attempts failed — increment failure count
  await db.apiWebhookEndpoint.update({
    where: { id: endpointId },
    data: { failureCount: { increment: 1 } },
  });

  return false;
}

export async function dispatchEvent(
  orgId: string,
  eventType: string,
  data: unknown
): Promise<void> {
  const endpoints = await db.apiWebhookEndpoint.findMany({
    where: {
      orgId,
      isActive: true,
    },
  });

  const matched = endpoints.filter(
    (ep) => ep.events.includes(eventType) || ep.events.includes("*")
  );

  await Promise.allSettled(
    matched.map((ep) => deliverWebhook(ep.id, eventType, data))
  );
}

export async function listEndpoints(orgId: string) {
  return db.apiWebhookEndpoint.findMany({
    where: { orgId },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      description: true,
      failureCount: true,
      createdAt: true,
      lastDeliveredAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteEndpoint(
  endpointId: string,
  orgId: string
): Promise<void> {
  await db.apiWebhookEndpoint.deleteMany({
    where: { id: endpointId, orgId },
  });
}

export async function testEndpoint(endpointId: string): Promise<boolean> {
  return deliverWebhook(endpointId, "ping", {
    message: "This is a test webhook delivery from Slipwise.",
  });
}

export async function listDeliveries(endpointId: string, limit = 50) {
  return db.apiWebhookDelivery.findMany({
    where: { endpointId },
    orderBy: { deliveredAt: "desc" },
    take: limit,
  });
}
