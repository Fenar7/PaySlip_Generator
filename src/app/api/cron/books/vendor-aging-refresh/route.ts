import { NextResponse } from "next/server";
import { getAccountsPayableAging, refreshVendorBillOverdueStates } from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => null)) as { orgId?: string } | null;
    const orgId = body?.orgId ?? url.searchParams.get("orgId") ?? undefined;
    const asOfDate = todayIsoDate();

    const orgIds =
      orgId
        ? [orgId]
        : (
            await db.vendorBill.findMany({
              where: {
                archivedAt: null,
                status: { notIn: ["DRAFT", "CANCELLED", "PAID"] },
              },
              select: { orgId: true },
              distinct: ["orgId"],
            })
          ).map((row) => row.orgId);

    let snapshotsCreated = 0;
    let overdueBills = 0;

    for (const currentOrgId of orgIds) {
      await refreshVendorBillOverdueStates(currentOrgId);
      const aging = await getAccountsPayableAging(currentOrgId, { asOfDate });
      overdueBills += aging.rows.filter((row) => row.daysOverdue > 0).length;

      await db.reportSnapshot.create({
        data: {
          orgId: currentOrgId,
          reportType: "books.ap_aging_refresh",
          filters: { asOfDate },
          rowCount: aging.rows.length,
          createdBy: "system-cron",
        },
      });
      snapshotsCreated += 1;
    }

    await db.jobLog.create({
      data: {
        jobName: "books-vendor-aging-refresh",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      orgsProcessed: orgIds.length,
      snapshotsCreated,
      overdueBills,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "books-vendor-aging-refresh",
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
