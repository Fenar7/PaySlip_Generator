import { processScheduledActions } from "@/lib/flow/scheduler";
import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();
  try {
    const result = await processScheduledActions();
    
    await db.jobLog.create({
      data: {
        jobName: "flow.process-scheduled-actions",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    
    await db.jobLog.create({
      data: {
        jobName: "flow.process-scheduled-actions",
        jobId,
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: message,
      },
    }).catch(() => {});
    
    console.error("[FlowScheduler] cron failed: ", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
