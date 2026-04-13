import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { processDeliveryRetries } from "@/lib/flow/delivery-engine";

export const dynamic = "force-dynamic";

/**
 * flow.process-notification-retries
 * Finds FAILED email deliveries with nextRetryAt <= now and re-attempts them.
 * Idempotent: terminal failures are skipped automatically by the engine.
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const result = await processDeliveryRetries();

    await db.jobLog.create({
      data: {
        jobName: "flow.process-notification-retries",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "flow.process-notification-retries",
          jobId,
          status: "failed",
          triggeredAt,
          completedAt: new Date(),
          error: message,
        },
      })
      .catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
