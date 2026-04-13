import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { notifyOrgAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * flow.reconcile-dead-letter-summary
 * Aggregates unresolved dead-letter items and notifies org admins if new ones exist.
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    // Find orgs with unresolved dead-lettered actions from the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newDeadLetters = await db.deadLetterAction.findMany({
      where: {
        resolvedAt: null,
        deadLetteredAt: { gte: since },
      },
    });

    // Group by org and notify
    const byOrg = newDeadLetters.reduce<Record<string, number>>((acc, dl) => {
      acc[dl.orgId] = (acc[dl.orgId] ?? 0) + 1;
      return acc;
    }, {});

    let notificationCount = 0;
    for (const [orgId, count] of Object.entries(byOrg)) {
      await notifyOrgAdmins({
        orgId,
        type: "dead_letter_summary",
        title: "Action Queue Alert",
        body: `${count} background action${count !== 1 ? "s" : ""} have failed and require intervention.`,
        link: `/app/flow/dead-letter`,
      });
      notificationCount++;
    }

    await db.jobLog.create({
      data: {
        jobName: "flow.reconcile-dead-letter-summary",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      newDeadLetterCount: newDeadLetters.length,
      orgsNotified: notificationCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "flow.reconcile-dead-letter-summary",
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
