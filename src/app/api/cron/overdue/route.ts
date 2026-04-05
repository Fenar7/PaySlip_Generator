import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: { in: ["ISSUED", "VIEWED", "DUE"] },
        dueDate: { not: null, lt: todayStr },
        archivedAt: null,
      },
    });

    let markedCount = 0;
    for (const inv of overdueInvoices) {
      await db.$transaction([
        db.invoice.update({
          where: { id: inv.id },
          data: { status: "OVERDUE", overdueAt: new Date() },
        }),
        db.invoiceStateEvent.create({
          data: {
            invoiceId: inv.id,
            fromStatus: inv.status,
            toStatus: "OVERDUE",
            actorName: "System",
            reason: "Automatically marked overdue — past due date",
          },
        }),
      ]);
      markedCount++;
    }

    await db.jobLog.create({
      data: {
        jobName: "mark-overdue",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, markedOverdue: markedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog.create({
      data: {
        jobName: "mark-overdue",
        jobId,
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: message,
      },
    }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
