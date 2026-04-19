import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";
import { processDunningBatch } from "@/lib/billing/dunning";
import { db } from "@/lib/db";

/**
 * POST /api/cron/billing-dunning
 *
 * Automated dunning cron: retries failed payments on a schedule.
 * Runs daily via Vercel Cron or external scheduler.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const result = await processDunningBatch();

    await db.jobLog.create({
      data: {
        id: jobId,
        jobName: "billing-dunning",
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: JSON.parse(JSON.stringify(result)),
      },
    });

    return NextResponse.json({ jobId, ...result });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog.create({
      data: {
        id: jobId,
        jobName: "billing-dunning",
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: errMsg,
      },
    });

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
