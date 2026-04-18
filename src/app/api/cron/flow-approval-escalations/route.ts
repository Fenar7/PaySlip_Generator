import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { processApprovalEscalations } from "@/lib/flow/approvals";

export const dynamic = "force-dynamic";

/**
 * flow.process-approval-escalations
 * Advances pending approvals past their per-rule escalateAfterHours SLA,
 * or sends approaching-deadline reminders.
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const { escalated, reminded } = await processApprovalEscalations();

    await db.jobLog.create({
      data: {
        jobName: "flow.process-approval-escalations",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, escalated, reminded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "flow.process-approval-escalations",
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
