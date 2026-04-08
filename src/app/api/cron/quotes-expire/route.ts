import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const { expireOverdueQuotes } = await import("@/lib/quotes");
    const result = await expireOverdueQuotes();

    const { db } = await import("@/lib/db");
    await db.jobLog.create({
      data: {
        jobName: "quotes-expire",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CRON] Quotes expire error:", message);

    try {
      const { db } = await import("@/lib/db");
      await db.jobLog.create({
        data: {
          jobName: "quotes-expire",
          jobId,
          status: "failed",
          triggeredAt,
          completedAt: new Date(),
          error: message,
        },
      });
    } catch {
      // Best-effort logging
    }

    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
