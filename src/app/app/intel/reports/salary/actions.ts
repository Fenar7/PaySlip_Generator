"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { generateCSV } from "@/lib/csv";

const PAGE_SIZE = 50;

export interface SalaryReportFilters {
  employeeId?: string;
  month?: number;
  year?: number;
  status?: string;
  department?: string;
  page?: number;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}

export interface SalaryReportRow {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  month: number;
  year: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
}

export async function getSalaryReport(filters: SalaryReportFilters) {
  const { orgId } = await requireOrgContext();
  const page = filters.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    archivedAt: null,
  };

  if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters.month != null) {
    where.month = filters.month;
  }

  if (filters.year != null) {
    where.year = filters.year;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.department) {
    where.employee = {
      department: { contains: filters.department, mode: "insensitive" },
    };
  }

  const orderBy: Record<string, string> = {};
  if (filters.sortKey) {
    const allowed = ["slipNumber", "month", "year", "grossPay", "netPay", "status"];
    if (allowed.includes(filters.sortKey)) {
      orderBy[filters.sortKey] = filters.sortDir ?? "asc";
    }
  }
  if (!Object.keys(orderBy).length) {
    orderBy.createdAt = "desc";
  }

  const [slips, total, agg] = await Promise.all([
    db.salarySlip.findMany({
      where: where,  
      skip,
      take: PAGE_SIZE,
      orderBy,
      include: {
        employee: {
          select: { name: true, employeeId: true, department: true },
        },
      },
    }),
    db.salarySlip.count({ where: where }),  
    db.salarySlip.aggregate({
      where: where,  
      _sum: { grossPay: true, netPay: true },
    }),
  ]);

  // Count unique employees
  const uniqueEmployees = new Set(
    (slips)  
      .map((s) => s.employeeId)
      .filter(Boolean)
  );

  const rows: SalaryReportRow[] = (slips).map((s) => ({  
    id: s.id,
    employeeName: s.employee?.name ?? "—",
    employeeCode: s.employee?.employeeId ?? "—",
    department: s.employee?.department ?? "—",
    month: s.month,
    year: s.year,
    grossPay: s.grossPay,
    totalDeductions: s.grossPay - s.netPay,
    netPay: s.netPay,
    status: s.status,
  }));

  const totalGross = agg._sum.grossPay ?? 0;
  const totalNet = agg._sum.netPay ?? 0;

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalGross,
    totalDeductions: totalGross - totalNet,
    totalNet,
    headcount: uniqueEmployees.size,
  };
}

export async function exportSalaryReportCSV(
  filters: Omit<SalaryReportFilters, "page">
): Promise<string> {
  const allFilters = { ...filters, page: 1 } as SalaryReportFilters;
  const allRows: SalaryReportRow[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    allFilters.page = currentPage;
    const result = await getSalaryReport(allFilters);
    allRows.push(...result.rows);
    hasMore = currentPage * PAGE_SIZE < result.total;
    currentPage++;
  }

  const MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return generateCSV(
    [
      "Employee Name",
      "Employee ID",
      "Department",
      "Period",
      "Gross Salary",
      "Total Deductions",
      "Net Pay",
      "Status",
    ],
    allRows.map((r) => [
      r.employeeName,
      r.employeeCode,
      r.department,
      `${MONTH_NAMES[r.month]} ${r.year}`,
      r.grossPay.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.netPay.toFixed(2),
      r.status,
    ])
  );
}
