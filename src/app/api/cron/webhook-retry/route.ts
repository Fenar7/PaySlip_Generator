/**
 * Webhook Retry Cron Route — Phase 28 Sprint 28.4
 *
 * Processes pending webhook retries on a schedule.
 * Should be invoked every 1 minute by the cron scheduler.
 */
import { NextRequest, NextResponse } from "next/server";
import { processWebhookRetries } from "@/lib/webhooks/retry-engine";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWebhookRetries();

    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
