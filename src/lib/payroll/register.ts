/**
 * Payroll Register XLSX/PDF generator.
 * Produces three worksheets: Summary, Employee Detail, Employer Contributions.
 * Uses the `xlsx` library already present in the project (from Phase 24).
 */

import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type RunItemWithEmployee = Prisma.PayrollRunItemGetPayload<{
  include: { employee: { select: { name: true; employeeId: true } } };
}>;

export interface RegisterRow {
  slNo: number;
  employeeId: string;
  name: string;
  attendedDays: number;
  lopDays: number;
  grossPay: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  otherEarnings: number;
  pfEmployee: number;
  esiEmployee: number;
  tds: number;
  pt: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  pfEmployer: number;
  esiEmployer: number;
}

export async function generatePayRegister(runId: string): Promise<Buffer> {
  const run = await db.payrollRun.findUnique({
    where: { id: runId },
    include: {
      runItems: {
        include: {
          employee: { select: { name: true, employeeId: true } },
        },
        orderBy: [{ status: "asc" }],
      },
    },
  });

  if (!run) throw new Error("Payroll run not found");

  const rows: RegisterRow[] = run.runItems.map((item: RunItemWithEmployee, idx: number) => ({
    slNo: idx + 1,
    employeeId: item.employee.employeeId ?? "",
    name: item.employee.name,
    attendedDays: item.attendedDays,
    lopDays: item.lossOfPayDays,
    grossPay: Number(item.grossPay),
    basic: Number(item.basicPay),
    hra: Number(item.hra),
    specialAllowance: Number(item.specialAllowance),
    otherEarnings: Number(item.otherEarnings),
    pfEmployee: Number(item.pfEmployee),
    esiEmployee: Number(item.esiEmployee),
    tds: Number(item.tdsDeduction),
    pt: Number(item.professionalTax),
    otherDeductions: Number(item.otherDeductions),
    totalDeductions: Number(item.totalDeductions),
    netPay: Number(item.netPay),
    pfEmployer: Number(item.pfEmployer),
    esiEmployer: Number(item.esiEmployer),
  }));

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ───────────────────────────────────────────────────────
  const summaryData = [
    ["Payroll Register — Summary"],
    ["Period", run.period],
    ["Working Days", run.workingDays],
    ["Status", run.status],
    ["Generated At", new Date().toISOString()],
    [],
    ["Metric", "Amount (₹)"],
    ["Total Gross", Number(run.totalGross)],
    ["Total Deductions", Number(run.totalDeductions)],
    ["Total Net Pay", Number(run.totalNetPay)],
    ["Total PF (Employer)", Number(run.totalPfEmployer)],
    ["Total ESI (Employer)", Number(run.totalEsiEmployer)],
    [
      "Total CTC (Cost to Company)",
      Number(run.totalGross) +
        Number(run.totalPfEmployer) +
        Number(run.totalEsiEmployer),
    ],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ── Sheet 2: Employee Detail ───────────────────────────────────────────────
  const detailHeaders = [
    "Sl.No",
    "Emp. ID",
    "Name",
    "Attended Days",
    "LOP Days",
    "Gross Pay",
    "Basic",
    "HRA",
    "Special Allowance",
    "Other Earnings",
    "PF (Employee)",
    "ESI (Employee)",
    "TDS",
    "Prof. Tax",
    "Other Deductions",
    "Total Deductions",
    "Net Pay",
  ];
  const detailRows = rows.map((r) => [
    r.slNo,
    r.employeeId,
    r.name,
    r.attendedDays,
    r.lopDays,
    r.grossPay,
    r.basic,
    r.hra,
    r.specialAllowance,
    r.otherEarnings,
    r.pfEmployee,
    r.esiEmployee,
    r.tds,
    r.pt,
    r.otherDeductions,
    r.totalDeductions,
    r.netPay,
  ]);

  // Totals row
  const totalsRow = [
    "",
    "",
    "TOTAL",
    rows.reduce((s, r) => s + r.attendedDays, 0),
    rows.reduce((s, r) => s + r.lopDays, 0),
    rows.reduce((s, r) => s + r.grossPay, 0),
    rows.reduce((s, r) => s + r.basic, 0),
    rows.reduce((s, r) => s + r.hra, 0),
    rows.reduce((s, r) => s + r.specialAllowance, 0),
    rows.reduce((s, r) => s + r.otherEarnings, 0),
    rows.reduce((s, r) => s + r.pfEmployee, 0),
    rows.reduce((s, r) => s + r.esiEmployee, 0),
    rows.reduce((s, r) => s + r.tds, 0),
    rows.reduce((s, r) => s + r.pt, 0),
    rows.reduce((s, r) => s + r.otherDeductions, 0),
    rows.reduce((s, r) => s + r.totalDeductions, 0),
    rows.reduce((s, r) => s + r.netPay, 0),
  ];

  const detailSheet = XLSX.utils.aoa_to_sheet([
    detailHeaders,
    ...detailRows,
    totalsRow,
  ]);
  detailSheet["!cols"] = detailHeaders.map((_, i) =>
    i === 2 ? { wch: 28 } : { wch: 18 }
  );
  XLSX.utils.book_append_sheet(wb, detailSheet, "Employee Detail");

  // ── Sheet 3: Employer Contributions ───────────────────────────────────────
  const employerHeaders = [
    "Sl.No",
    "Emp. ID",
    "Name",
    "Gross Pay",
    "PF (Employer)",
    "ESI (Employer)",
    "Total CTC Cost",
  ];
  const employerRows = rows.map((r) => [
    r.slNo,
    r.employeeId,
    r.name,
    r.grossPay,
    r.pfEmployer,
    r.esiEmployer,
    r.grossPay + r.pfEmployer + r.esiEmployer,
  ]);
  const employerTotals = [
    "",
    "",
    "TOTAL",
    rows.reduce((s, r) => s + r.grossPay, 0),
    rows.reduce((s, r) => s + r.pfEmployer, 0),
    rows.reduce((s, r) => s + r.esiEmployer, 0),
    rows.reduce((s, r) => s + r.grossPay + r.pfEmployer + r.esiEmployer, 0),
  ];
  const employerSheet = XLSX.utils.aoa_to_sheet([
    employerHeaders,
    ...employerRows,
    employerTotals,
  ]);
  employerSheet["!cols"] = employerHeaders.map((_, i) =>
    i === 2 ? { wch: 28 } : { wch: 18 }
  );
  XLSX.utils.book_append_sheet(wb, employerSheet, "Employer Contributions");

  const arrayBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(arrayBuffer);
}
