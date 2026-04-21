import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  getAccountsPayableAging,
  getAccountsReceivableAging,
  getCashFlowStatement,
  getGstTieOut,
  getProfitAndLoss,
  getTdsTieOut,
} from "./finance-reports";
import { listJournalEntries } from "./journals";
import { getGeneralLedger, getTrialBalance } from "./reports";

type CloseTaskCode =
  | "journals_posted"
  | "bank_reconciliation_complete"
  | "ar_aging_reviewed"
  | "ap_aging_reviewed"
  | "payroll_posted"
  | "gst_tie_out_reviewed"
  | "tds_tie_out_reviewed"
  | "approval_exceptions_resolved";

type TxClient = Prisma.TransactionClient;

const CLOSE_TASK_DEFINITIONS: Array<{
  code: CloseTaskCode;
  label: string;
  description: string;
  severity: "blocker" | "warning";
  manual: boolean;
}> = [
  {
    code: "journals_posted",
    label: "All journals posted",
    description: "Draft journals must be posted or reversed before close.",
    severity: "blocker",
    manual: false,
  },
  {
    code: "bank_reconciliation_complete",
    label: "Bank reconciliation complete",
    description: "Unmatched and partially matched bank lines must be resolved for the period.",
    severity: "blocker",
    manual: false,
  },
  {
    code: "ar_aging_reviewed",
    label: "AR aging reviewed",
    description: "Review receivables aging and confirm the AR tie-out.",
    severity: "blocker",
    manual: true,
  },
  {
    code: "ap_aging_reviewed",
    label: "AP aging reviewed",
    description: "Review payables aging and confirm the AP tie-out.",
    severity: "blocker",
    manual: true,
  },
  {
    code: "payroll_posted",
    label: "Payroll posted",
    description: "Released salary slips for the period must be posted to the ledger.",
    severity: "blocker",
    manual: false,
  },
  {
    code: "gst_tie_out_reviewed",
    label: "GST tie-out reviewed",
    description: "GST control accounts must tie to the operational tax totals.",
    severity: "blocker",
    manual: true,
  },
  {
    code: "tds_tie_out_reviewed",
    label: "TDS tie-out reviewed",
    description: "TDS receivable and payable ledgers must be reviewed.",
    severity: "blocker",
    manual: true,
  },
  {
    code: "approval_exceptions_resolved",
    label: "Approval exceptions resolved",
    description: "Pending approval requests must be cleared before period close.",
    severity: "blocker",
    manual: false,
  },
];

function monthYearKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toJsonValue(value: unknown) {
  return value as Parameters<typeof db.closeTask.upsert>[0]["create"]["metadata"];
}

const RECONCILIATION_AUDIT_ACTIONS = [
  "books.reconciliation.confirmed",
  "books.reconciliation.rejected",
  "books.reconciliation.ignored",
  "books.reconciliation_confirmed",
  "books.reconciliation_rejected",
  "books.reconciliation_ignored",
] as const;

function normalizeReconciliationAuditAction(action: string) {
  return action.replace("books.reconciliation_", "books.reconciliation.");
}

export interface FiscalPeriodReopenImpact {
  journalCount: number;
  postedJournalCount: number;
  draftJournalCount: number;
  affectedAccountCount: number;
  affectedAccounts: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  earliestEntryDate: string | null;
  latestEntryDate: string | null;
  closeCompletedAt: string | null;
  sampleEntries: Array<{
    id: string;
    entryNumber: string;
    entryDate: string;
    status: string;
    source: string;
    sourceRef: string | null;
  }>;
}

async function listReconciliationEvidence(orgId: string, startDate: Date, endDate: Date) {
  const events = await db.auditLog.findMany({
    where: {
      orgId,
      action: {
        in: [...RECONCILIATION_AUDIT_ACTIONS],
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      actorId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return events.map((event) => ({
    id: event.id,
    action: normalizeReconciliationAuditAction(event.action),
    actorId: event.actorId,
    entityType: event.entityType,
    entityId: event.entityId,
    createdAt: event.createdAt.toISOString(),
    metadata: event.metadata ?? null,
  }));
}

export async function getFiscalPeriodReopenImpact(
  orgId: string,
  fiscalPeriodId: string,
): Promise<FiscalPeriodReopenImpact> {
  const [journals, closeRun] = await Promise.all([
    db.journalEntry.findMany({
      where: {
        orgId,
        fiscalPeriodId,
      },
      select: {
        id: true,
        entryNumber: true,
        entryDate: true,
        status: true,
        source: true,
        sourceRef: true,
        lines: {
          select: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    }),
    db.closeRun.findFirst({
      where: {
        orgId,
        fiscalPeriodId,
      },
      select: {
        completedAt: true,
      },
    }),
  ]);

  const affectedAccounts = new Map<string, { id: string; code: string; name: string }>();

  for (const journal of journals) {
    for (const line of journal.lines) {
      if (!affectedAccounts.has(line.account.id)) {
        affectedAccounts.set(line.account.id, {
          id: line.account.id,
          code: line.account.code,
          name: line.account.name,
        });
      }
    }
  }

  const sortedAccounts = Array.from(affectedAccounts.values()).sort((left, right) =>
    left.code.localeCompare(right.code),
  );
  const sortedJournalDates = journals
    .map((journal) => journal.entryDate)
    .sort((left, right) => left.getTime() - right.getTime());

  return {
    journalCount: journals.length,
    postedJournalCount: journals.filter((journal) => journal.status === "POSTED").length,
    draftJournalCount: journals.filter((journal) => journal.status === "DRAFT").length,
    affectedAccountCount: sortedAccounts.length,
    affectedAccounts: sortedAccounts.slice(0, 8),
    earliestEntryDate: sortedJournalDates[0]?.toISOString() ?? null,
    latestEntryDate: sortedJournalDates.at(-1)?.toISOString() ?? null,
    closeCompletedAt: closeRun?.completedAt?.toISOString() ?? null,
    sampleEntries: journals.slice(0, 5).map((journal) => ({
      id: journal.id,
      entryNumber: journal.entryNumber,
      entryDate: journal.entryDate.toISOString(),
      status: journal.status,
      source: journal.source,
      sourceRef: journal.sourceRef ?? null,
    })),
  };
}

async function getOrCreateCloseRun(orgId: string, fiscalPeriodId: string, actorId?: string) {
  const existing = await db.closeRun.findFirst({
    where: { orgId, fiscalPeriodId },
    include: {
      fiscalPeriod: true,
      tasks: true,
    },
  });

  if (existing) {
    return existing;
  }

  return db.closeRun.create({
    data: {
      orgId,
      fiscalPeriodId,
      startedByUserId: actorId,
    },
    include: {
      fiscalPeriod: true,
      tasks: true,
    },
  });
}

async function countPayrollExceptions(orgId: string, startDate: Date, endDate: Date) {
  const slips = await db.salarySlip.findMany({
    where: {
      organizationId: orgId,
      archivedAt: null,
    },
    select: {
      id: true,
      month: true,
      year: true,
      status: true,
      accountingStatus: true,
    },
  });

  const periodKeys = new Set<string>();
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

  while (cursor <= endCursor) {
    periodKeys.add(monthYearKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return slips.filter((slip) => {
    const key = `${slip.year}-${String(slip.month).padStart(2, "0")}`;
    if (!periodKeys.has(key)) {
      return false;
    }

    return slip.status === "released" && slip.accountingStatus !== "POSTED";
  }).length;
}

function blockerStatus(
  passed: boolean,
  blockerReason: string | null,
  manual: boolean,
  previousStatus?: string,
) {
  if (!passed) {
    return "BLOCKED" as const;
  }

  if (!manual) {
    return "PASSED" as const;
  }

  return previousStatus === "PASSED" || previousStatus === "WAIVED" ? (previousStatus as "PASSED" | "WAIVED") : "PENDING";
}

export async function getCloseWorkspace(orgId: string, fiscalPeriodId?: string) {
  const period =
    fiscalPeriodId
      ? await db.fiscalPeriod.findFirst({
          where: { id: fiscalPeriodId, orgId },
        })
      : await db.fiscalPeriod.findFirst({
          where: { orgId },
          orderBy: { startDate: "desc" },
        });

  if (!period) {
    throw new Error("Fiscal period not found.");
  }

  const closeRun = await getOrCreateCloseRun(orgId, period.id);
  const existingTaskByCode = new Map(closeRun.tasks.map((task) => [task.code as CloseTaskCode, task]));
  const periodStart = period.startDate.toISOString().slice(0, 10);
  const periodEnd = period.endDate.toISOString().slice(0, 10);

  const [draftJournalCount, bankExceptionCount, pendingApprovalCount, payrollExceptionCount, arAging, apAging, gstTieOut, tdsTieOut, profitLoss, cashFlow] =
    await Promise.all([
      db.journalEntry.count({
        where: {
          orgId,
          fiscalPeriodId: period.id,
          status: "DRAFT",
        },
      }),
      db.bankTransaction.count({
        where: {
          orgId,
          txnDate: {
            gte: period.startDate,
            lte: period.endDate,
          },
          status: {
            in: ["UNMATCHED", "SUGGESTED", "PARTIALLY_MATCHED"],
          },
        },
      }),
      db.approvalRequest.count({
        where: {
          orgId,
          status: "PENDING",
          createdAt: {
            lte: period.endDate,
          },
        },
      }),
      countPayrollExceptions(orgId, period.startDate, period.endDate),
      getAccountsReceivableAging(orgId, { asOfDate: periodEnd }),
      getAccountsPayableAging(orgId, { asOfDate: periodEnd }),
      getGstTieOut(orgId, { startDate: periodStart, endDate: periodEnd }),
      getTdsTieOut(orgId, { startDate: periodStart, endDate: periodEnd }),
      getProfitAndLoss(orgId, { startDate: periodStart, endDate: periodEnd }),
      getCashFlowStatement(orgId, { startDate: periodStart, endDate: periodEnd }),
    ]);

  const taskEvaluations: Array<{
    code: CloseTaskCode;
    status: "PENDING" | "PASSED" | "BLOCKED" | "WAIVED";
    blockerReason: string | null;
    metadata: unknown;
  }> = [
    {
      code: "journals_posted",
      status: blockerStatus(
        draftJournalCount === 0,
        draftJournalCount === 0 ? null : `${draftJournalCount} draft journal${draftJournalCount === 1 ? "" : "s"} remain.`,
        false,
        existingTaskByCode.get("journals_posted")?.status,
      ),
      blockerReason:
        draftJournalCount === 0 ? null : `${draftJournalCount} draft journal${draftJournalCount === 1 ? "" : "s"} remain.`,
      metadata: { count: draftJournalCount },
    },
    {
      code: "bank_reconciliation_complete",
      status: blockerStatus(
        bankExceptionCount === 0,
        bankExceptionCount === 0
          ? null
          : `${bankExceptionCount} bank transaction${bankExceptionCount === 1 ? "" : "s"} still need reconciliation.`,
        false,
        existingTaskByCode.get("bank_reconciliation_complete")?.status,
      ),
      blockerReason:
        bankExceptionCount === 0
          ? null
          : `${bankExceptionCount} bank transaction${bankExceptionCount === 1 ? "" : "s"} still need reconciliation.`,
      metadata: { count: bankExceptionCount },
    },
    {
      code: "ar_aging_reviewed",
      status: blockerStatus(
        Math.abs(arAging.variance) <= 0.01,
        Math.abs(arAging.variance) <= 0.01
          ? null
          : `AR aging differs from the receivables ledger by ${arAging.variance.toFixed(2)}.`,
        true,
        existingTaskByCode.get("ar_aging_reviewed")?.status,
      ),
      blockerReason:
        Math.abs(arAging.variance) <= 0.01
          ? null
          : `AR aging differs from the receivables ledger by ${arAging.variance.toFixed(2)}.`,
      metadata: {
        totalOutstanding: arAging.totalOutstanding,
        glBalance: arAging.glBalance,
        variance: arAging.variance,
      },
    },
    {
      code: "ap_aging_reviewed",
      status: blockerStatus(
        Math.abs(apAging.variance) <= 0.01,
        Math.abs(apAging.variance) <= 0.01
          ? null
          : `AP aging differs from the payables ledger by ${apAging.variance.toFixed(2)}.`,
        true,
        existingTaskByCode.get("ap_aging_reviewed")?.status,
      ),
      blockerReason:
        Math.abs(apAging.variance) <= 0.01
          ? null
          : `AP aging differs from the payables ledger by ${apAging.variance.toFixed(2)}.`,
      metadata: {
        totalOutstanding: apAging.totalOutstanding,
        glBalance: apAging.glBalance,
        variance: apAging.variance,
      },
    },
    {
      code: "payroll_posted",
      status: blockerStatus(
        payrollExceptionCount === 0,
        payrollExceptionCount === 0
          ? null
          : `${payrollExceptionCount} released salary slip${payrollExceptionCount === 1 ? "" : "s"} are not posted.`,
        false,
        existingTaskByCode.get("payroll_posted")?.status,
      ),
      blockerReason:
        payrollExceptionCount === 0
          ? null
          : `${payrollExceptionCount} released salary slip${payrollExceptionCount === 1 ? "" : "s"} are not posted.`,
      metadata: {
        count: payrollExceptionCount,
      },
    },
    {
      code: "gst_tie_out_reviewed",
      status: blockerStatus(
        Math.abs(gstTieOut.outputTax.variance) <= 0.01 && Math.abs(gstTieOut.inputTax.variance) <= 0.01,
        Math.abs(gstTieOut.outputTax.variance) <= 0.01 && Math.abs(gstTieOut.inputTax.variance) <= 0.01
          ? null
          : "GST ledger balances do not tie to the operational GST totals.",
        true,
        existingTaskByCode.get("gst_tie_out_reviewed")?.status,
      ),
      blockerReason:
        Math.abs(gstTieOut.outputTax.variance) <= 0.01 && Math.abs(gstTieOut.inputTax.variance) <= 0.01
          ? null
          : "GST ledger balances do not tie to the operational GST totals.",
      metadata: gstTieOut,
    },
    {
      code: "tds_tie_out_reviewed",
      status: blockerStatus(
        Math.abs(tdsTieOut.receivable.variance) <= 0.01,
        Math.abs(tdsTieOut.receivable.variance) <= 0.01
          ? null
          : "TDS receivable does not tie to the operational TDS records.",
        true,
        existingTaskByCode.get("tds_tie_out_reviewed")?.status,
      ),
      blockerReason:
        Math.abs(tdsTieOut.receivable.variance) <= 0.01
          ? null
          : "TDS receivable does not tie to the operational TDS records.",
      metadata: tdsTieOut,
    },
    {
      code: "approval_exceptions_resolved",
      status: blockerStatus(
        pendingApprovalCount === 0,
        pendingApprovalCount === 0
          ? null
          : `${pendingApprovalCount} approval request${pendingApprovalCount === 1 ? "" : "s"} remain pending.`,
        false,
        existingTaskByCode.get("approval_exceptions_resolved")?.status,
      ),
      blockerReason:
        pendingApprovalCount === 0
          ? null
          : `${pendingApprovalCount} approval request${pendingApprovalCount === 1 ? "" : "s"} remain pending.`,
      metadata: {
        count: pendingApprovalCount,
      },
    },
  ];

  for (const definition of CLOSE_TASK_DEFINITIONS) {
    const evaluation = taskEvaluations.find((task) => task.code === definition.code);
    if (!evaluation) {
      continue;
    }

    await db.closeTask.upsert({
      where: {
        closeRunId_code: {
          closeRunId: closeRun.id,
          code: definition.code,
        },
      },
      create: {
        closeRunId: closeRun.id,
        orgId,
        code: definition.code,
        label: definition.label,
        description: definition.description,
        severity: definition.severity,
        status: evaluation.status,
        blockerReason: evaluation.blockerReason,
        metadata: toJsonValue(evaluation.metadata),
        ...(evaluation.status === "PASSED" || evaluation.status === "WAIVED"
          ? { resolvedAt: new Date() }
          : {}),
      },
      update: {
        label: definition.label,
        description: definition.description,
        severity: definition.severity,
        status: evaluation.status,
        blockerReason: evaluation.blockerReason,
        metadata: toJsonValue(evaluation.metadata),
        resolvedAt:
          evaluation.status === "PASSED" || evaluation.status === "WAIVED"
            ? new Date()
            : null,
      },
    });
  }

  const tasks = await db.closeTask.findMany({
    where: { closeRunId: closeRun.id },
    orderBy: [{ createdAt: "asc" }],
  });
  const blockerCount = tasks.filter(
    (task) => task.severity === "blocker" && task.status !== "PASSED" && task.status !== "WAIVED",
  ).length;
  const updatedRun = await db.closeRun.update({
    where: { id: closeRun.id },
    data: {
      blockerCount,
      status: blockerCount === 0 ? "READY" : "BLOCKED",
      summary: toJsonValue({
        draftJournalCount,
        bankExceptionCount,
        pendingApprovalCount,
        payrollExceptionCount,
        netProfit: profitLoss.current.totals.netProfit,
        cashMovement: cashFlow.actualNetCashMovement,
      }),
    },
    include: {
      fiscalPeriod: true,
      tasks: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  return {
    period,
    closeRun: updatedRun,
    reports: {
      profitLoss: profitLoss.current,
      cashFlow,
      arAging,
      apAging,
      gstTieOut,
      tdsTieOut,
    },
  };
}

export async function completeCloseRun(input: {
  orgId: string;
  fiscalPeriodId: string;
  actorId: string;
  notes?: string | null;
}) {
  const workspace = await getCloseWorkspace(input.orgId, input.fiscalPeriodId);

  if (workspace.closeRun.blockerCount > 0) {
    throw new Error("Close checklist is not complete. Resolve all blockers before closing the period.");
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    await tx.fiscalPeriod.update({
      where: { id: input.fiscalPeriodId },
      data: {
        status: "LOCKED",
        lockedAt: now,
        lockedBy: input.actorId,
        closedAt: now,
        closedBy: input.actorId,
      },
    });

    const closeRun = await tx.closeRun.update({
      where: { id: workspace.closeRun.id },
      data: {
        status: "CLOSED",
        blockerCount: 0,
        notes: input.notes?.trim() || undefined,
        completedAt: now,
        completedByUserId: input.actorId,
      },
      include: {
        fiscalPeriod: true,
        tasks: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.close.completed",
        entityType: "close_run",
        entityId: closeRun.id,
        metadata: {
          fiscalPeriodId: input.fiscalPeriodId,
          label: workspace.period.label,
        },
      },
    });

    return closeRun;
  });
}

export async function updateCloseTaskStatus(input: {
  orgId: string;
  fiscalPeriodId: string;
  code: CloseTaskCode;
  actorId: string;
  status: "PASSED" | "WAIVED";
  note?: string | null;
}) {
  const definition = CLOSE_TASK_DEFINITIONS.find((task) => task.code === input.code);
  if (!definition || !definition.manual) {
    throw new Error("Only review tasks can be updated manually.");
  }

  const workspace = await getCloseWorkspace(input.orgId, input.fiscalPeriodId);
  const task = workspace.closeRun.tasks.find((item) => item.code === input.code);

  if (!task) {
    throw new Error("Close task not found.");
  }

  await db.closeTask.update({
    where: { id: task.id },
    data: {
      status: input.status,
      resolvedAt: new Date(),
      metadata: toJsonValue({
        ...(typeof task.metadata === "object" && task.metadata ? (task.metadata as Record<string, unknown>) : {}),
        note: input.note?.trim() || null,
        updatedBy: input.actorId,
      }),
    },
  });

  await db.auditLog.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId,
      action: "books.close.task_updated",
      entityType: "close_task",
      entityId: task.id,
      metadata: {
        code: input.code,
        status: input.status,
        note: input.note?.trim() || null,
      },
    },
  });

  return getCloseWorkspace(input.orgId, input.fiscalPeriodId);
}

export async function markCloseRunReopened(input: {
  orgId: string;
  fiscalPeriodId: string;
  actorId: string;
  reason: string;
}) {
  return db.$transaction((tx) => markCloseRunReopenedTx(tx, input));
}

export async function markCloseRunReopenedTx(
  tx: TxClient,
  input: {
    orgId: string;
    fiscalPeriodId: string;
    actorId: string;
    reason: string;
  },
) {
  const closeRun = await tx.closeRun.findFirst({
    where: {
      orgId: input.orgId,
      fiscalPeriodId: input.fiscalPeriodId,
    },
  });

  if (!closeRun) {
    return null;
  }

  return tx.closeRun.update({
    where: { id: closeRun.id },
    data: {
      status: "REOPENED",
      reopenedAt: new Date(),
      reopenedByUserId: input.actorId,
      notes: input.reason.trim(),
    },
  });
}

export async function buildAuditPackage(orgId: string, fiscalPeriodId: string) {
  const workspace = await getCloseWorkspace(orgId, fiscalPeriodId);
  const periodStart = workspace.period.startDate.toISOString().slice(0, 10);
  const periodEnd = workspace.period.endDate.toISOString().slice(0, 10);

  const [journalRegister, trialBalance, generalLedger, attachments, reopenedPeriods, reconciliationEvidence] = await Promise.all([
    listJournalEntries(orgId, {
      startDate: periodStart,
      endDate: periodEnd,
    }),
    getTrialBalance(orgId, {
      startDate: periodStart,
      endDate: periodEnd,
      includeInactive: true,
    }),
    getGeneralLedger(orgId, {
      startDate: periodStart,
      endDate: periodEnd,
    }),
    db.fileAttachment.findMany({
      where: {
        organizationId: orgId,
        createdAt: {
          lte: workspace.period.endDate,
        },
        entityType: {
          in: ["vendor_bill", "journal_entry"],
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    db.fiscalPeriod.findMany({
      where: {
        orgId,
        reopenedAt: { not: null },
      },
      orderBy: [{ reopenedAt: "desc" }],
      select: {
        id: true,
        label: true,
        reopenReason: true,
        reopenedAt: true,
      },
    }),
    listReconciliationEvidence(orgId, workspace.period.startDate, workspace.period.endDate),
  ]);

  return {
    generatedAt: workspace.closeRun.completedAt?.toISOString() ?? workspace.period.endDate.toISOString(),
    packageVersion: 2,
    orgId,
    fiscalPeriod: {
      id: workspace.period.id,
      label: workspace.period.label,
      startDate: periodStart,
      endDate: periodEnd,
      status: workspace.period.status,
    },
    closeRun: {
      id: workspace.closeRun.id,
      status: workspace.closeRun.status,
      blockerCount: workspace.closeRun.blockerCount,
      completedAt: workspace.closeRun.completedAt?.toISOString() ?? null,
      tasks: [...workspace.closeRun.tasks].sort((left, right) => left.code.localeCompare(right.code)),
    },
    reports: workspace.reports,
    journalRegister,
    trialBalance,
    generalLedger,
    reopenedPeriods,
    reconciliationEvidence: {
      eventCount: reconciliationEvidence.length,
      events: reconciliationEvidence,
    },
    attachmentIndex: attachments.map((attachment) => ({
      id: attachment.id,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      storageKey: attachment.storageKey,
      createdAt: attachment.createdAt.toISOString(),
    })),
  };
}
