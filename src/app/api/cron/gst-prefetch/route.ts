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
    // Find orgs with Pro+ plans and high invoice volume
    const subscriptions = await db.subscription.findMany({
      where: {
        status: "active",
        planId: { in: ["pro", "enterprise"] },
      },
      select: { orgId: true },
    });

    let processedCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Get previous month date range
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

        const invoiceWhere = {
          organizationId: sub.orgId,
          invoiceDate: {
            gte: startDate.toISOString().split("T")[0],
            lte: endDate.toISOString().split("T")[0],
          },
          status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] as const },
        };

        const invoiceCount = await db.invoice.count({ where: invoiceWhere });

        // Only prefetch for orgs with > 50 invoices/month
        if (invoiceCount > 50) {
          const invoices = await db.invoice.findMany({
            where: invoiceWhere,
            select: {
              gstTotalCgst: true,
              gstTotalSgst: true,
              gstTotalIgst: true,
              gstTotalCess: true,
              totalAmount: true,
              customerGstin: true,
            },
          });

          const summary = {
            totalInvoices: invoices.length,
            b2bCount: invoices.filter((i) => i.customerGstin).length,
            b2cCount: invoices.filter((i) => !i.customerGstin).length,
            totalCgst: invoices.reduce((sum, i) => sum + (i.gstTotalCgst ?? 0), 0),
            totalSgst: invoices.reduce((sum, i) => sum + (i.gstTotalSgst ?? 0), 0),
            totalIgst: invoices.reduce((sum, i) => sum + (i.gstTotalIgst ?? 0), 0),
          };

          processedCount++;

          await db.jobLog.create({
            data: {
              jobName: "gst-report-prefetch",
              orgId: sub.orgId,
              status: "completed",
              triggeredAt,
              completedAt: new Date(),
              payload: summary,
            },
          });
        }
      } catch (err) {
        errors.push(
          `Org ${sub.orgId}: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "gst-report-prefetch",
        jobId,
        status: errors.length > 0 ? "partial" : "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: {
          processed: processedCount,
          total: subscriptions.length,
          errorCount: errors.length,
        },
        error: errors.length > 0 ? errors.join("; ") : null,
      },
    });

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: subscriptions.length,
      errors: errors.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "gst-report-prefetch",
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
