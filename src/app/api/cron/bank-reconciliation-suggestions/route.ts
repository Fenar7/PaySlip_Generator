import { NextResponse } from "next/server";
import { refreshReconciliationSuggestions } from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? undefined;
    const bankAccountId = url.searchParams.get("bankAccountId") ?? undefined;
    const importId = url.searchParams.get("importId") ?? undefined;

    const orgIds =
      orgId
        ? [orgId]
        : (
            await db.bankTransaction.findMany({
              where: {
                status: { in: ["UNMATCHED", "SUGGESTED", "PARTIALLY_MATCHED"] },
              },
              select: { orgId: true },
              distinct: ["orgId"],
            })
          ).map((row) => row.orgId);

    let refreshedTransactions = 0;
    for (const currentOrgId of orgIds) {
      const result = await refreshReconciliationSuggestions(currentOrgId, {
        bankAccountId,
        importId,
      });
      refreshedTransactions += result.refreshed;
    }

    await db.jobLog.create({
      data: {
        jobName: "bank-reconciliation-suggestions-refresh",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      orgsProcessed: orgIds.length,
      refreshedTransactions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "bank-reconciliation-suggestions-refresh",
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
