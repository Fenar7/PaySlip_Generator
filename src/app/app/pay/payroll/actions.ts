"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { nextDocumentNumber } from "@/lib/docs";
import { dispatchEvent } from "@/lib/webhook/deliver";
import {
  computePayrollItem,
  MAHARASHTRA_PT_SLABS,
  type PtSlab,
} from "@/lib/payroll/calculator";
import { Prisma, PayrollStatus } from "@/generated/prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Create Payroll Run ───────────────────────────────────────────────────────

export interface CreatePayrollRunInput {
  period: string; // "YYYY-MM"
  workingDays?: number;
}

export async function createPayrollRun(
  input: CreatePayrollRunInput
): Promise<ActionResult<{ id: string; period: string }>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");

  const existing = await db.payrollRun.findUnique({
    where: { orgId_period: { orgId, period: input.period } },
  });
  if (existing) {
    return {
      success: false,
      error: `A payroll run for ${input.period} already exists (status: ${existing.status})`,
    };
  }

  const run = await db.payrollRun.create({
    data: {
      orgId,
      period: input.period,
      workingDays: input.workingDays ?? 26,
      createdBy: userId,
      status: PayrollStatus.DRAFT,
    },
    select: { id: true, period: true },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "payroll.run.created",
    entityType: "payrollRun",
    entityId: run.id,
    metadata: { period: input.period },
  });

  return { success: true, data: run };
}

// ─── Process Payroll Run (compute all items) ──────────────────────────────────

/**
 * Convert the settings UI slab format `{ upTo, ptMonthly }` into the
 * calculator's `PtSlab` format `{ minSalary, maxSalary, monthlyTax }`.
 * The settings UI stores only an upper-bound per tier; we derive minSalary
 * from the previous tier's upper-bound + 1 (first tier always starts at 0).
 */
function toCalculatorPtSlabs(
  stored: Array<{ upTo: number | null; ptMonthly: number }>
): PtSlab[] {
  return stored.map((slab, idx) => ({
    minSalary: idx === 0 ? 0 : (stored[idx - 1].upTo ?? 0) + 1,
    maxSalary: slab.upTo,
    monthlyTax: slab.ptMonthly,
  }));
}

export async function processPayrollRun(
  runId: string
): Promise<ActionResult<{ computed: number; skipped: number }>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");

  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId },
    select: { id: true, period: true, status: true, workingDays: true },
  });
  if (!run) return { success: false, error: "Payroll run not found" };
  const allowedStatuses: PayrollStatus[] = [PayrollStatus.DRAFT, PayrollStatus.REVIEW];
  if (!allowedStatuses.includes(run.status))
    return {
      success: false,
      error: `Cannot process a run in ${run.status} state`,
    };

  // Load all active employees with CTC components
  const employees = await db.employee.findMany({
    where: { organizationId: orgId },
    include: {
      ctcComponents: { where: { isActive: true } },
    },
  });

  // Load org payroll settings for PT slabs
  const settings = await db.payrollSettings.findUnique({
    where: { orgId },
    select: { pfEnabled: true, esiEnabled: true, professionalTaxSlabs: true },
  });
  const rawSlabs1 = settings?.professionalTaxSlabs as Array<{
    upTo: number | null;
    ptMonthly: number;
  }> | null;
  const ptSlabs: PtSlab[] =
    rawSlabs1 && rawSlabs1.length > 0
      ? toCalculatorPtSlabs(rawSlabs1)
      : MAHARASHTRA_PT_SLABS;

  let computed = 0;
  let skipped = 0;

  // Delete existing draft items before recomputing (idempotent reprocess)
  await db.payrollRunItem.deleteMany({
    where: { runId, status: "draft" },
  });

  const creates: Prisma.PayrollRunItemCreateManyInput[] = [];

  for (const emp of employees) {
    const ctcAnnual = emp.ctcAnnual ? Number(emp.ctcAnnual) : null;
    if (!ctcAnnual || ctcAnnual <= 0) {
      skipped++;
      continue;
    }

    const item = computePayrollItem({
      ctcAnnual,
      employmentType: emp.employmentType ?? undefined,
      pfOptOut: settings?.pfEnabled === false ? true : (emp.pfOptOut ?? false),
      esiOptOut:
        settings?.esiEnabled === false ? true : (emp.esiOptOut ?? false),
      taxRegime: (emp.taxRegime as "old" | "new") ?? "new",
      ptSlabs,
      panNumber: emp.panNumber ?? undefined,
      workingDays: run.workingDays,
    });

    creates.push({
      runId: run.id,
      employeeId: emp.id,
      attendedDays: run.workingDays,
      lossOfPayDays: 0,
      grossPay: new Prisma.Decimal(item.grossPay),
      basicPay: new Prisma.Decimal(item.basicPay),
      hra: new Prisma.Decimal(item.hra),
      specialAllowance: new Prisma.Decimal(item.specialAllowance),
      pfEmployee: new Prisma.Decimal(item.pfEmployee),
      esiEmployee: new Prisma.Decimal(item.esiEmployee),
      tdsDeduction: new Prisma.Decimal(item.tdsDeduction),
      professionalTax: new Prisma.Decimal(item.professionalTax),
      totalDeductions: new Prisma.Decimal(item.totalDeductions),
      netPay: new Prisma.Decimal(item.netPay),
      pfEmployer: new Prisma.Decimal(item.pfEmployer),
      esiEmployer: new Prisma.Decimal(item.esiEmployer),
      status: "draft",
    });
    computed++;
  }

  if (creates.length > 0) {
    await db.payrollRunItem.createMany({ data: creates });
  }

  // Update run totals + transition to PROCESSING
  const totals = creates.reduce(
    (acc, item) => ({
      gross: acc.gross + Number(item.grossPay),
      deductions: acc.deductions + Number(item.totalDeductions),
      net: acc.net + Number(item.netPay),
      pfEmployer: acc.pfEmployer + Number(item.pfEmployer),
      esiEmployer: acc.esiEmployer + Number(item.esiEmployer),
    }),
    { gross: 0, deductions: 0, net: 0, pfEmployer: 0, esiEmployer: 0 }
  );

  await db.payrollRun.update({
    where: { id: runId },
    data: {
      status: PayrollStatus.PROCESSING,
      totalGross: new Prisma.Decimal(totals.gross),
      totalDeductions: new Prisma.Decimal(totals.deductions),
      totalNetPay: new Prisma.Decimal(totals.net),
      totalPfEmployer: new Prisma.Decimal(totals.pfEmployer),
      totalEsiEmployer: new Prisma.Decimal(totals.esiEmployer),
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "payroll.run.processed",
    entityType: "payrollRun",
    entityId: runId,
    metadata: { computed, skipped },
  });

  return { success: true, data: { computed, skipped } };
}

// ─── Update Payroll Item (attendance adjustment) ──────────────────────────────

export interface UpdatePayrollItemInput {
  itemId: string;
  attendedDays?: number;
  lossOfPayDays?: number;
  otherEarnings?: number;
  otherDeductions?: number;
  holdReason?: string | null;
}

export async function updatePayrollItem(
  input: UpdatePayrollItemInput
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireOrgContext();

  const item = await db.payrollRunItem.findFirst({
    where: { id: input.itemId },
    include: {
      run: { select: { orgId: true, workingDays: true, status: true } },
      employee: { include: { ctcComponents: { where: { isActive: true } } } },
    },
  });

  if (!item) return { success: false, error: "Payroll item not found" };
  if (item.run.orgId !== orgId) return { success: false, error: "Forbidden" };
  if (item.run.status === PayrollStatus.FINALIZED)
    return { success: false, error: "Cannot modify a finalized run" };

  const ctcAnnual = item.employee.ctcAnnual
    ? Number(item.employee.ctcAnnual)
    : 0;

  const settings = await db.payrollSettings.findUnique({
    where: { orgId },
    select: { pfEnabled: true, esiEnabled: true, professionalTaxSlabs: true },
  });
  const rawSlabs2 = settings?.professionalTaxSlabs as Array<{
    upTo: number | null;
    ptMonthly: number;
  }> | null;
  const ptSlabs: PtSlab[] =
    rawSlabs2 && rawSlabs2.length > 0
      ? toCalculatorPtSlabs(rawSlabs2)
      : MAHARASHTRA_PT_SLABS;

  const attendedDays =
    input.attendedDays ?? Number(item.attendedDays);
  const lopDays = input.lossOfPayDays ?? Number(item.lossOfPayDays);
  const otherEarnings = input.otherEarnings ?? Number(item.otherEarnings);
  const otherDeductions =
    input.otherDeductions ?? Number(item.otherDeductions);
  const holdReason =
    input.holdReason !== undefined ? input.holdReason : item.holdReason;

  const recalc = computePayrollItem({
    ctcAnnual,
    pfOptOut: item.employee.pfOptOut,
    esiOptOut: item.employee.esiOptOut,
    taxRegime: (item.employee.taxRegime as "old" | "new") ?? "new",
    ptSlabs,
    panNumber: item.employee.panNumber ?? undefined,
    workingDays: item.run.workingDays,
    attendedDays,
    lossOfPayDays: lopDays,
  });

  const totalDeductions = recalc.totalDeductions + otherDeductions;
  const netPay = recalc.grossPay + otherEarnings - totalDeductions;

  const updated = await db.payrollRunItem.update({
    where: { id: input.itemId },
    data: {
      attendedDays,
      lossOfPayDays: lopDays,
      grossPay: new Prisma.Decimal(recalc.grossPay + otherEarnings),
      basicPay: new Prisma.Decimal(recalc.basicPay),
      hra: new Prisma.Decimal(recalc.hra),
      specialAllowance: new Prisma.Decimal(recalc.specialAllowance),
      otherEarnings: new Prisma.Decimal(otherEarnings),
      pfEmployee: new Prisma.Decimal(recalc.pfEmployee),
      esiEmployee: new Prisma.Decimal(recalc.esiEmployee),
      tdsDeduction: new Prisma.Decimal(recalc.tdsDeduction),
      professionalTax: new Prisma.Decimal(recalc.professionalTax),
      otherDeductions: new Prisma.Decimal(otherDeductions),
      totalDeductions: new Prisma.Decimal(totalDeductions),
      netPay: new Prisma.Decimal(netPay),
      pfEmployer: new Prisma.Decimal(recalc.pfEmployer),
      esiEmployer: new Prisma.Decimal(recalc.esiEmployer),
      status: holdReason ? "on_hold" : "draft",
      holdReason: holdReason ?? null,
    },
    select: { id: true },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "payroll.item.updated",
    entityType: "payrollRunItem",
    entityId: input.itemId,
    metadata: { attendedDays, lossOfPayDays: lopDays, holdReason },
  });

  return { success: true, data: updated };
}

// ─── Move to Review ───────────────────────────────────────────────────────────

export async function moveToReview(
  runId: string
): Promise<ActionResult<{ id: string }>> {
  const { orgId } = await requireOrgContext();
  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId },
    select: { status: true },
  });
  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== PayrollStatus.PROCESSING)
    return {
      success: false,
      error: `Run must be in PROCESSING state (current: ${run.status})`,
    };

  await db.payrollRun.update({
    where: { id: runId },
    data: { status: PayrollStatus.REVIEW },
  });
  return { success: true, data: { id: runId } };
}

// ─── Finalize Payroll Run ─────────────────────────────────────────────────────

export async function finalizePayrollRun(
  runId: string
): Promise<ActionResult<{ slipsCreated: number }>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");

  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId },
    include: {
      runItems: {
        where: { status: "draft" },
        include: { employee: { select: { name: true, organizationId: true } } },
      },
    },
  });
  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== PayrollStatus.REVIEW)
    return {
      success: false,
      error: `Run must be in REVIEW state to finalize (current: ${run.status})`,
    };

  const [periodYear, periodMonth] = run.period.split("-").map(Number);
  let slipsCreated = 0;

  for (const item of run.runItems) {
    const slipNumber = await nextDocumentNumber(orgId, "salarySlip");
    const slip = await db.salarySlip.create({
      data: {
        organizationId: orgId,
        employeeId: item.employeeId,
        slipNumber,
        month: periodMonth,
        year: periodYear,
        status: "final",
        grossPay: Number(item.grossPay),
        netPay: Number(item.netPay),
        formData: {
          runId: run.id,
          period: run.period,
          basicPay: Number(item.basicPay),
          hra: Number(item.hra),
          specialAllowance: Number(item.specialAllowance),
          pfEmployee: Number(item.pfEmployee),
          esiEmployee: Number(item.esiEmployee),
          tdsDeduction: Number(item.tdsDeduction),
          professionalTax: Number(item.professionalTax),
          pfEmployer: Number(item.pfEmployer),
          esiEmployer: Number(item.esiEmployer),
        },
      },
      select: { id: true },
    });

    await db.payrollRunItem.update({
      where: { id: item.id },
      data: { salarySlipId: slip.id, status: "finalized" },
    });
    slipsCreated++;
  }

  // Recompute totals after excluding on_hold items
  const allItems = await db.payrollRunItem.findMany({ where: { runId } });
  type Totals = { gross: number; deductions: number; net: number; pfEmployer: number; esiEmployer: number };
  const finalTotals = allItems.reduce<Totals>(
    (acc, it) => ({
      gross: acc.gross + Number(it.grossPay),
      deductions: acc.deductions + Number(it.totalDeductions),
      net: acc.net + Number(it.netPay),
      pfEmployer: acc.pfEmployer + Number(it.pfEmployer),
      esiEmployer: acc.esiEmployer + Number(it.esiEmployer),
    }),
    { gross: 0, deductions: 0, net: 0, pfEmployer: 0, esiEmployer: 0 }
  );

  await db.payrollRun.update({
    where: { id: runId },
    data: {
      status: PayrollStatus.FINALIZED,
      finalizedAt: new Date(),
      finalizedBy: userId,
      totalGross: new Prisma.Decimal(finalTotals.gross),
      totalDeductions: new Prisma.Decimal(finalTotals.deductions),
      totalNetPay: new Prisma.Decimal(finalTotals.net),
      totalPfEmployer: new Prisma.Decimal(finalTotals.pfEmployer),
      totalEsiEmployer: new Prisma.Decimal(finalTotals.esiEmployer),
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "payroll.run.finalized",
    entityType: "payrollRun",
    entityId: runId,
    metadata: { period: run.period, slipsCreated },
  });

  // Fire webhook event
  await dispatchEvent(orgId, "payroll.run.finalized", {
    runId,
    period: run.period,
    totalAmount: finalTotals.net,
    slipCount: slipsCreated,
    finalizedBy: userId,
  });

  return { success: true, data: { slipsCreated } };
}

// ─── List Payroll Runs ────────────────────────────────────────────────────────

export async function listPayrollRuns(): Promise<
  ActionResult<
    Array<{
      id: string;
      period: string;
      status: string;
      totalNetPay: number;
      totalGross: number;
      createdAt: Date;
      finalizedAt: Date | null;
      _count: { runItems: number };
    }>
  >
> {
  const { orgId } = await requireOrgContext();
  const runs = await db.payrollRun.findMany({
    where: { orgId },
    orderBy: { period: "desc" },
    select: {
      id: true,
      period: true,
      status: true,
      totalNetPay: true,
      totalGross: true,
      createdAt: true,
      finalizedAt: true,
      _count: { select: { runItems: true } },
    },
  });
  return {
    success: true,
    data: runs.map((r) => ({
      ...r,
      status: r.status as string,
      totalNetPay: Number(r.totalNetPay),
      totalGross: Number(r.totalGross),
    })),
  };
}

export async function getPayrollRun(runId: string): Promise<
  ActionResult<{
    id: string;
    period: string;
    status: string;
    workingDays: number;
    totalGross: number;
    totalDeductions: number;
    totalNetPay: number;
    totalPfEmployer: number;
    totalEsiEmployer: number;
    createdAt: Date;
    finalizedAt: Date | null;
    runItems: Array<{
      id: string;
      employeeId: string;
      employeeName: string;
      attendedDays: number;
      lossOfPayDays: number;
      grossPay: number;
      basicPay: number;
      hra: number;
      specialAllowance: number;
      pfEmployee: number;
      esiEmployee: number;
      tdsDeduction: number;
      professionalTax: number;
      otherDeductions: number;
      otherEarnings: number;
      totalDeductions: number;
      netPay: number;
      pfEmployer: number;
      esiEmployer: number;
      status: string;
      holdReason: string | null;
      salarySlipId: string | null;
    }>;
  }>
> {
  const { orgId } = await requireOrgContext();
  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId },
    include: {
      runItems: {
        include: { employee: { select: { name: true } } },
        orderBy: [{ status: "asc" }],
      },
    },
  });
  if (!run) return { success: false, error: "Payroll run not found" };

  return {
    success: true,
    data: {
      id: run.id,
      period: run.period,
      status: run.status as string,
      workingDays: run.workingDays,
      totalGross: Number(run.totalGross),
      totalDeductions: Number(run.totalDeductions),
      totalNetPay: Number(run.totalNetPay),
      totalPfEmployer: Number(run.totalPfEmployer),
      totalEsiEmployer: Number(run.totalEsiEmployer),
      createdAt: run.createdAt,
      finalizedAt: run.finalizedAt,
      runItems: run.runItems.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        employeeName: item.employee.name,
        attendedDays: item.attendedDays,
        lossOfPayDays: item.lossOfPayDays,
        grossPay: Number(item.grossPay),
        basicPay: Number(item.basicPay),
        hra: Number(item.hra),
        specialAllowance: Number(item.specialAllowance),
        pfEmployee: Number(item.pfEmployee),
        esiEmployee: Number(item.esiEmployee),
        tdsDeduction: Number(item.tdsDeduction),
        professionalTax: Number(item.professionalTax),
        otherDeductions: Number(item.otherDeductions),
        otherEarnings: Number(item.otherEarnings),
        totalDeductions: Number(item.totalDeductions),
        netPay: Number(item.netPay),
        pfEmployer: Number(item.pfEmployer),
        esiEmployer: Number(item.esiEmployer),
        status: item.status,
        holdReason: item.holdReason,
        salarySlipId: item.salarySlipId,
      })),
    },
  };
}
