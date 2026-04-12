import { NextResponse } from "next/server";
import { getCloseWorkspace } from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";
import { notifyOrgAdmins } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => null)) as { orgId?: string } | null;
    const orgId = body?.orgId ?? url.searchParams.get("orgId") ?? undefined;
    const today = todayIsoDate();

    const periods = await db.fiscalPeriod.findMany({
      where: {
        ...(orgId ? { orgId } : {}),
        status: "OPEN",
        endDate: {
          lte: today,
        },
      },
      select: {
        id: true,
        orgId: true,
        label: true,
      },
      orderBy: [{ endDate: "asc" }],
    });

    let remindersSent = 0;
    let blockedPeriods = 0;

    for (const period of periods) {
      const workspace = await getCloseWorkspace(period.orgId, period.id);
      if (workspace.closeRun.blockerCount <= 0) {
        continue;
      }

      blockedPeriods += 1;
      remindersSent += 1;

      await notifyOrgAdmins({
        orgId: period.orgId,
        type: "books.close.reminder",
        title: `Close blockers remain for ${period.label}`,
        body: `${workspace.closeRun.blockerCount} close checklist blocker(s) remain for ${period.label}.`,
        link: `/app/books/close?fiscalPeriodId=${period.id}`,
      });
    }

    await db.jobLog.create({
      data: {
        jobName: "books-close-reminders",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      periodsReviewed: periods.length,
      blockedPeriods,
      remindersSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "books-close-reminders",
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
