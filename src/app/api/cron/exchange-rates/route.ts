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
    const { fetchAndStoreRates } = await import(
      "@/lib/currency/exchange-rate"
    );
    await fetchAndStoreRates();

    await db.jobLog.create({
      data: {
        jobName: "exchange-rate-refresh",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: { currencies: ["USD", "EUR", "GBP", "AED", "SGD", "AUD", "SAR"] },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Exchange rates refreshed",
      currencies: ["USD", "EUR", "GBP", "AED", "SGD", "AUD", "SAR"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "exchange-rate-refresh",
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
