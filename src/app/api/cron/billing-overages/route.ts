import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { recordBillingEvent } from "@/lib/billing/engine";
import { generateOverageInvoice } from "@/lib/billing/invoicing";
import { getCurrentPeriod, persistOverages } from "@/lib/billing/metering";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const { periodMonth } = getCurrentPeriod();
    const accounts = await db.billingAccount.findMany({
      where: { status: "ACTIVE" },
      select: { orgId: true, currency: true },
    });

    const invoiceIds: string[] = [];

    for (const account of accounts) {
      const totalPaise = await persistOverages(account.orgId);
      if (totalPaise <= BigInt(0)) {
        continue;
      }

      const invoiceId = await generateOverageInvoice(account.orgId, totalPaise);
      if (!invoiceId) {
        continue;
      }

      await db.overageLine.updateMany({
        where: {
          billingAccount: { orgId: account.orgId },
          periodMonth,
          settledAt: null,
        },
        data: { settledAt: new Date() },
      });

      await recordBillingEvent({
        orgId: account.orgId,
        type: "OVERAGE_CHARGED",
        gatewayEventId: `overage_${account.orgId}_${periodMonth}`,
        amountPaise: totalPaise,
        currency: account.currency,
        metadata: { invoiceId, periodMonth },
      });

      await logAudit({
        orgId: account.orgId,
        actorId: "system",
        action: "billing.overage_invoiced",
        entityType: "BillingInvoice",
        entityId: invoiceId,
        metadata: {
          periodMonth,
          amountPaise: totalPaise.toString(),
        },
      });

      invoiceIds.push(invoiceId);
    }

    await db.jobLog.create({
      data: {
        jobName: "billing-overages",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      processed: invoiceIds.length,
      invoiceIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "billing-overages",
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
