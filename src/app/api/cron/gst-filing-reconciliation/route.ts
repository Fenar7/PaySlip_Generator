import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { summarizePendingGstFilingQueue } from "@/lib/gst/filings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const summary = await summarizePendingGstFilingQueue();

    await db.jobLog.create({
      data: {
        jobName: "gst-filing-reconciliation",
        jobId,
        status: summary.agedRuns.length > 0 ? "partial" : "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: summary,
        error:
          summary.agedRuns.length > 0
            ? `${summary.agedRuns.length} filing run(s) require operator follow-up.`
            : null,
      },
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "gst-filing-reconciliation",
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
