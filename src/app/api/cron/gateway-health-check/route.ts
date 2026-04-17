import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { upsertInsight } from "@/lib/intel/insights";

export const dynamic = "force-dynamic";

/** Alert if an active Razorpay integration hasn't produced any webhook events in 24 hours. */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const activeGateways = await db.orgIntegration.findMany({
      where: { provider: "razorpay", isActive: true },
      select: { orgId: true, lastSyncAt: true },
    });

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let alerted = 0;
    let healthy = 0;

    for (const { orgId, lastSyncAt } of activeGateways) {
      const stale = !lastSyncAt || lastSyncAt < cutoff;
      if (stale) {
        await upsertInsight({
          orgId,
          category: "OPERATIONS",
          severity: "HIGH",
          sourceType: "SYSTEM",
          title: "Razorpay gateway health warning",
          summary: lastSyncAt
            ? `No Razorpay webhook activity in the last 24 hours. Last sync: ${lastSyncAt.toISOString()}. Verify your webhook URL is registered in the Razorpay dashboard.`
            : "Razorpay integration has never synced. Verify your webhook URL is registered in the Razorpay dashboard.",
          dedupeKey: `razorpay-gateway-health-${orgId}`,
        });
        alerted++;
      } else {
        healthy++;
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "gateway-health-check",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: { checked: activeGateways.length, healthy, alerted },
      },
    });

    return NextResponse.json({ ok: true, checked: activeGateways.length, healthy, alerted });
  } catch (err) {
    await db.jobLog.create({
      data: {
        jobName: "gateway-health-check",
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
