import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";
import { db } from "@/lib/db";
import { timingSafeStringEqual } from "@/lib/crypto/gateway-secrets";
import { getOrgConfigByRazorpayAccountId } from "@/lib/razorpay/client";
import { handleRazorpayEvent } from "@/lib/razorpay/event-handlers";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/webhooks/razorpay
 *
 * Receives and verifies Razorpay webhook events.
 * Security:
 *  - Raw body used for HMAC-SHA256 signature verification
 *  - Timing-safe comparison
 *  - RazorpayEvent idempotency (rejects re-delivery of already processed events)
 *  - Always returns 200 to prevent enumeration attacks on event ids
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Read raw body before any parsing — required for HMAC verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";

  if (!rawBody || !signature) {
    // Return 200 to avoid leaking validation logic to attackers
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const eventType = (payload.event as string) ?? "";
  const razorpayAccountId = (payload.account_id as string) ?? "";

  // 2. Identify the org from the Razorpay account ID embedded in the event
  //    Fall back to single-org env-var mode for backward compat
  let orgId: string | null = null;
  let webhookSecret: string | null = null;

  if (razorpayAccountId) {
    const orgConfig = await getOrgConfigByRazorpayAccountId(razorpayAccountId);
    if (orgConfig) {
      orgId = orgConfig.orgId;
      webhookSecret = orgConfig.webhookSecret;
    }
  }

  // Fallback: if the webhook secret env-var is set globally, try all active integrations
  if (!orgId || !webhookSecret) {
    const globalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (globalSecret) {
      webhookSecret = globalSecret;
      const integrations = await db.orgIntegration.findMany({
        where: { provider: "razorpay", isActive: true },
        select: { orgId: true },
        orderBy: { createdAt: "desc" },
        take: 2,
      });
      orgId = integrations.length === 1 ? integrations[0]?.orgId ?? null : null;
    }
  }

  if (!orgId || !webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 3. Verify HMAC-SHA256 signature
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (!timingSafeStringEqual(expectedSignature, signature)) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 4. Idempotency: prefer Razorpay event ids and fall back to a deterministic body hash.
  const stableEventId =
    eventId ||
    `${eventType}:${createHash("sha256").update(rawBody).digest("hex")}`;
  if (stableEventId) {
    const exists = await db.razorpayEvent.findUnique({
      where: { id: stableEventId },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  // 5. Persist event before processing (write-ahead for replay safety)
  const persistedId = stableEventId;
  try {
    await db.razorpayEvent.create({
      data: {
        id: persistedId,
        type: eventType,
        payload: payload as object,
      },
    });
  } catch {
    // Unique constraint violation = already processed (race condition guard)
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 6. Route to handler
  try {
    await handleRazorpayEvent(
      orgId,
      persistedId,
      eventType,
      (payload.payload as Record<string, unknown>) ?? {}
    );
    await logAudit({
      orgId,
      actorId: "system",
      action: "billing.razorpay_webhook_processed",
      entityType: "RazorpayEvent",
      entityId: persistedId,
      metadata: {
        eventType,
        razorpayAccountId: razorpayAccountId || null,
      },
    });
  } catch {
    // Handler errors are logged but we still return 200 to prevent Razorpay retries
    // from overwhelming the system. Unhandled events remain in RazorpayEvent for replay.
    console.error(`[razorpay-webhook] handler error for event ${persistedId}`);
  }

  return NextResponse.json({ ok: true });
}
