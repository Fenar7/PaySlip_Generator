import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";
import { retryPendingWebhookDeliveries } from "@/lib/webhook/deliver";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const result = await retryPendingWebhookDeliveries();

    await db.jobLog.create({
      data: {
        jobName: "webhook-retry-v2",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: result,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "webhook-retry-v2",
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
