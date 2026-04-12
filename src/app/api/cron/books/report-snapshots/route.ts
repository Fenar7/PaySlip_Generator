import { NextResponse } from "next/server";
import {
  getAccountsPayableAging,
  getAccountsReceivableAging,
  getBalanceSheet,
  getCashFlowStatement,
  getProfitAndLoss,
  getTrialBalance,
} from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
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
    const startDate = monthStartIsoDate();
    const endDate = todayIsoDate();

    const orgIds =
      orgId
        ? [orgId]
        : (
            await db.glAccount.findMany({
              select: { orgId: true },
              distinct: ["orgId"],
            })
          ).map((row) => row.orgId);

    let snapshotsCreated = 0;

    for (const currentOrgId of orgIds) {
      const [trialBalance, profitLoss, balanceSheet, cashFlow, arAging, apAging] = await Promise.all([
        getTrialBalance(currentOrgId, {
          startDate,
          endDate,
          includeInactive: true,
        }),
        getProfitAndLoss(currentOrgId, { startDate, endDate }),
        getBalanceSheet(currentOrgId, { asOfDate: endDate }),
        getCashFlowStatement(currentOrgId, { startDate, endDate }),
        getAccountsReceivableAging(currentOrgId, { asOfDate: endDate }),
        getAccountsPayableAging(currentOrgId, { asOfDate: endDate }),
      ]);

      await db.reportSnapshot.createMany({
        data: [
          {
            orgId: currentOrgId,
            reportType: "books.trial_balance",
            filters: { startDate, endDate, includeInactive: true },
            rowCount: trialBalance.rows.length,
            createdBy: "system-cron",
          },
          {
            orgId: currentOrgId,
            reportType: "books.profit_loss",
            filters: { startDate, endDate },
            rowCount: profitLoss.current.income.length + profitLoss.current.expenses.length,
            createdBy: "system-cron",
          },
          {
            orgId: currentOrgId,
            reportType: "books.balance_sheet",
            filters: { asOfDate: endDate },
            rowCount:
              balanceSheet.current.assets.length +
              balanceSheet.current.liabilities.length +
              balanceSheet.current.equity.length,
            createdBy: "system-cron",
          },
          {
            orgId: currentOrgId,
            reportType: "books.cash_flow",
            filters: { startDate, endDate },
            rowCount: cashFlow.adjustments.length + 4,
            createdBy: "system-cron",
          },
          {
            orgId: currentOrgId,
            reportType: "books.ar_aging",
            filters: { asOfDate: endDate },
            rowCount: arAging.rows.length,
            createdBy: "system-cron",
          },
          {
            orgId: currentOrgId,
            reportType: "books.ap_aging",
            filters: { asOfDate: endDate },
            rowCount: apAging.rows.length,
            createdBy: "system-cron",
          },
        ],
      });

      snapshotsCreated += 6;
    }

    await db.jobLog.create({
      data: {
        jobName: "books-report-snapshots",
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.jobLog
      .create({
        data: {
          jobName: "books-report-snapshots",
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
