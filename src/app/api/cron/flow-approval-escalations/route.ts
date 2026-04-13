import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { notifyOrgAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * flow.process-approval-escalations
 * Scans pending approvals past their dueAt threshold and escalates them.
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();
  const now = new Date();

  let escalatedCount = 0;
  let reminderCount = 0;

  try {
    // Find pending approvals that are past their dueAt and not yet escalated
    const overdueApprovals = await db.approvalRequest.findMany({
      where: {
        status: "PENDING",
        dueAt: { not: null, lte: now },
        escalatedAt: null,
      },
    });

    for (const approval of overdueApprovals) {
      await db.approvalRequest.update({
        where: { id: approval.id },
        data: {
          escalatedAt: now,
          escalationLevel: { increment: 1 },
        },
      });

      await notifyOrgAdmins({
        orgId: approval.orgId,
        type: "approval_escalated",
        title: "Approval Escalated",
        body: `An approval request for ${approval.docType} has been pending past its deadline and has been escalated.`,
        link: `/app/flow/approvals/${approval.id}`,
      });

      escalatedCount++;
    }

    // Send reminders for approvals approaching their deadline (within 2 hours)
    const reminderThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const approachingApprovals = await db.approvalRequest.findMany({
      where: {
        status: "PENDING",
        dueAt: { not: null, gte: now, lte: reminderThreshold },
        lastReminderAt: null,
      },
    });

    for (const approval of approachingApprovals) {
      await db.approvalRequest.update({
        where: { id: approval.id },
        data: { lastReminderAt: now },
      });

      await notifyOrgAdmins({
        orgId: approval.orgId,
        type: "approval_reminder",
        title: "Approval Reminder",
        body: `An approval request for ${approval.docType} is approaching its deadline. Please review promptly.`,
        link: `/app/flow/approvals/${approval.id}`,
      });

      reminderCount++;
    }

    await db.jobLog.create({
      data: {
        jobName: "flow.process-approval-escalations",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, escalatedCount, reminderCount });
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
