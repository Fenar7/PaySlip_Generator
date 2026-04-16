import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { computeAndUpsertSnapshot } from "@/lib/usage-metering";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const orgs = await db.organization.findMany({
      select: { id: true },
    });

    let processed = 0;
    let failed = 0;

    for (const { id: orgId } of orgs) {
      try {
        await computeAndUpsertSnapshot(orgId);
        processed++;
      } catch {
        failed++;
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "usage-snapshot",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, processed, failed, total: orgs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "usage-snapshot",
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
