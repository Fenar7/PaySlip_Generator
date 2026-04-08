import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";

// Cron endpoint for dunning retry.
// Called every 5 minutes to retry failed dunning steps.
// Protected by CRON_SECRET header.
//
// Vercel Cron config (add to vercel.json):
//   { "crons": [{ "path": "/api/cron/dunning-retry", "schedule": "*/5 * * * *" }] }
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const { retryFailedSteps } = await import("@/lib/dunning");
    const result = await retryFailedSteps();

    const { db } = await import("@/lib/db");
    await db.jobLog.create({
      data: {
        jobName: "dunning-retry",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CRON] Dunning retry error:", message);

    try {
      const { db } = await import("@/lib/db");
      await db.jobLog.create({
        data: {
          jobName: "dunning-retry",
          jobId,
          status: "failed",
          triggeredAt,
          completedAt: new Date(),
          error: message,
        },
      });
    } catch {
      // Best-effort logging
    }

    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
