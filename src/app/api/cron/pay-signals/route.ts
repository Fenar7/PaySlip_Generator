import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { evaluateCollectionSignals } from "@/lib/pay/pay-signals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const orgs = await db.organization.findMany({ select: { id: true } });
    let processed = 0;
    let failed = 0;

    for (const { id: orgId } of orgs) {
      try {
        await evaluateCollectionSignals(orgId);
        processed++;
      } catch {
        failed++;
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "pay-signals",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: { processed, failed },
      },
    });

    return NextResponse.json({ ok: true, processed, failed });
  } catch (err) {
    await db.jobLog.create({
      data: {
        jobName: "pay-signals",
        jobId,
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
