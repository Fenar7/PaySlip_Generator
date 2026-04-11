import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    // Dynamic import to avoid loading IRP client at build time
    const { refreshIrpSession } = await import("@/lib/irp-client");
    const result = await refreshIrpSession();

    await db.jobLog.create({
      data: {
        jobName: "irp-session-refresh",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: { expiresAt: result.expiresAt.toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      message: "IRP session refreshed",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "irp-session-refresh",
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
