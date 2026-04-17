import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { getOrgRazorpayClient } from "@/lib/razorpay/client";

export const dynamic = "force-dynamic";

/**
 * Daily cron job: close virtual accounts that have been inactive for 90+ days.
 * A virtual account is considered dormant if no unmatched payment has been
 * received against it in the past 90 days.
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const dormancyThreshold = new Date();
    dormancyThreshold.setDate(dormancyThreshold.getDate() - 90);

    // Find active VAs with no payment in the past 90 days
    const dormantVas = await db.customerVirtualAccount.findMany({
      where: {
        isActive: true,
        createdAt: { lt: dormancyThreshold },
      },
      select: { id: true, orgId: true, razorpayVaId: true },
    });

    // Filter those with no recent incoming payments
    const toClose: typeof dormantVas = [];
    for (const va of dormantVas) {
      const recentPayment = await db.unmatchedPayment.findFirst({
        where: { virtualAccountId: va.id, receivedAt: { gt: dormancyThreshold } },
        select: { id: true },
      });
      if (!recentPayment) toClose.push(va);
    }

    let closedCount = 0;
    let errorCount = 0;

    for (const va of toClose) {
      try {
        const razorpay = await getOrgRazorpayClient(va.orgId);
        const closeFn = (razorpay.virtualAccounts as unknown as {
          close?: (id: string) => Promise<unknown>;
        }).close;
        if (typeof closeFn === "function") {
          await closeFn.call(razorpay.virtualAccounts, va.razorpayVaId);
        }

        await db.customerVirtualAccount.update({
          where: { id: va.id },
          data: { isActive: false, closedAt: new Date() },
        });
        closedCount++;
      } catch (err) {
        console.error(`[cron/va-close] failed for VA ${va.id}:`, err);
        errorCount++;
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "virtual-account-close-check",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: {
          dormantVasFound: toClose.length,
          closedCount,
          errorCount,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      dormantVasFound: toClose.length,
      closedCount,
      errorCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.jobLog.create({
      data: {
        jobName: "virtual-account-close-check",
        jobId,
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
