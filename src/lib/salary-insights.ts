import "server-only";

import { db } from "@/lib/db";

export interface DepartmentCost {
  department: string;
  totalGross: number;
  totalNet: number;
  employeeCount: number;
}

export interface MonthlyTrend {
  month: string; // "YYYY-MM"
  totalGross: number;
  totalNet: number;
  headcount: number;
}

export interface SalaryAnomaly {
  employeeId: string;
  name: string;
  currentMonth: number;
  average: number;
  deviation: number; // percentage
}

export interface TdsSlabBreakdown {
  slab: string;
  count: number;
  totalTds: number;
}

export interface SalaryInsightsResult {
  departmentCosts: DepartmentCost[];
  trends: MonthlyTrend[];
  anomalies: SalaryAnomaly[];
  tdsBreakdown: TdsSlabBreakdown[];
  period: string;
}

// FY 2026-27 New Regime TDS slabs
const TDS_SLABS = [
  { min: 0, max: 300000, rate: 0, label: "₹0 – ₹3L" },
  { min: 300001, max: 700000, rate: 0.05, label: "₹3L – ₹7L" },
  { min: 700001, max: 1000000, rate: 0.1, label: "₹7L – ₹10L" },
  { min: 1000001, max: 1200000, rate: 0.15, label: "₹10L – ₹12L" },
  { min: 1200001, max: 1500000, rate: 0.2, label: "₹12L – ₹15L" },
  { min: 1500001, max: Infinity, rate: 0.3, label: "₹15L+" },
];

/**
 * Calculate annual TDS under FY 2026-27 New Regime.
 */
export function calculateTDS(annualIncome: number): number {
  if (annualIncome <= 0) return 0;

  let tax = 0;
  let remaining = annualIncome;

  for (const slab of TDS_SLABS) {
    const slabWidth = slab.max === Infinity ? remaining : slab.max - slab.min + 1;
    const taxable = Math.min(remaining, slabWidth);
    if (taxable <= 0) break;
    tax += taxable * slab.rate;
    remaining -= taxable;
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Parse period string. Supports "YYYY-MM" or "YYYY-QN" formats.
 * Returns { startMonth, startYear, endMonth, endYear }.
 */
function parsePeriod(period?: string): {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
} {
  if (!period) {
    const now = new Date();
    return {
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
      endMonth: now.getMonth() + 1,
      endYear: now.getFullYear(),
    };
  }

  const quarterMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (quarterMatch) {
    const year = parseInt(quarterMatch[1]);
    const q = parseInt(quarterMatch[2]);
    const startMonth = (q - 1) * 3 + 1;
    return {
      startMonth,
      startYear: year,
      endMonth: startMonth + 2,
      endYear: year,
    };
  }

  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1]);
    const month = parseInt(monthMatch[2]);
    return { startMonth: month, startYear: year, endMonth: month, endYear: year };
  }

  const now = new Date();
  return {
    startMonth: now.getMonth() + 1,
    startYear: now.getFullYear(),
    endMonth: now.getMonth() + 1,
    endYear: now.getFullYear(),
  };
}

/**
 * Get comprehensive salary insights for an organization.
 */
export async function getSalaryInsights(
  orgId: string,
  period?: string,
): Promise<SalaryInsightsResult> {
  const { startMonth, startYear, endMonth, endYear } = parsePeriod(period);

  const [departmentCosts, trends, anomalies, tdsBreakdown] = await Promise.all([
    getDepartmentCosts(orgId, startMonth, startYear, endMonth, endYear),
    getMonthlyTrends(orgId),
    getAnomalies(orgId, endMonth, endYear),
    getTdsBreakdown(orgId, startMonth, startYear, endMonth, endYear),
  ]);

  return {
    departmentCosts,
    trends,
    anomalies,
    tdsBreakdown,
    period: period ?? `${endYear}-${String(endMonth).padStart(2, "0")}`,
  };
}

async function getDepartmentCosts(
  orgId: string,
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
): Promise<DepartmentCost[]> {
  const slips = await db.salarySlip.findMany({
    where: {
      organizationId: orgId,
      OR: buildMonthYearRange(startMonth, startYear, endMonth, endYear),
    },
    select: {
      grossPay: true,
      netPay: true,
      employee: { select: { department: true } },
    },
  });

  const deptMap = new Map<
    string,
    { totalGross: number; totalNet: number; employees: Set<string> }
  >();

  for (const slip of slips) {
    const dept = slip.employee?.department ?? "Unassigned";
    const entry = deptMap.get(dept) ?? {
      totalGross: 0,
      totalNet: 0,
      employees: new Set<string>(),
    };
    entry.totalGross += slip.grossPay;
    entry.totalNet += slip.netPay;
    // Use department as proxy for unique count when no employeeId
    entry.employees.add(dept);
    deptMap.set(dept, entry);
  }

  return Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    totalGross: round(data.totalGross),
    totalNet: round(data.totalNet),
    employeeCount: data.employees.size,
  }));
}

async function getMonthlyTrends(orgId: string): Promise<MonthlyTrend[]> {
  const now = new Date();
  const trends: MonthlyTrend[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const slips = await db.salarySlip.findMany({
      where: { organizationId: orgId, month, year },
      select: { grossPay: true, netPay: true },
    });

    trends.push({
      month: `${year}-${String(month).padStart(2, "0")}`,
      totalGross: round(slips.reduce((s, sl) => s + sl.grossPay, 0)),
      totalNet: round(slips.reduce((s, sl) => s + sl.netPay, 0)),
      headcount: slips.length,
    });
  }

  return trends;
}

async function getAnomalies(
  orgId: string,
  currentMonth: number,
  currentYear: number,
): Promise<SalaryAnomaly[]> {
  // Get current month slips with employee info
  const currentSlips = await db.salarySlip.findMany({
    where: { organizationId: orgId, month: currentMonth, year: currentYear },
    select: {
      employeeId: true,
      grossPay: true,
      employee: { select: { name: true } },
    },
  });

  const anomalies: SalaryAnomaly[] = [];

  for (const slip of currentSlips) {
    if (!slip.employeeId) continue;

    // Get previous 3 months for this employee
    const prevSlips = await db.salarySlip.findMany({
      where: {
        organizationId: orgId,
        employeeId: slip.employeeId,
        NOT: { month: currentMonth, year: currentYear },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 3,
      select: { grossPay: true },
    });

    if (prevSlips.length === 0) continue;

    const avg =
      prevSlips.reduce((s, p) => s + p.grossPay, 0) / prevSlips.length;
    if (avg === 0) continue;

    const deviation = Math.abs((slip.grossPay - avg) / avg) * 100;

    if (deviation > 20) {
      anomalies.push({
        employeeId: slip.employeeId,
        name: slip.employee?.name ?? "Unknown",
        currentMonth: slip.grossPay,
        average: round(avg),
        deviation: round(deviation),
      });
    }
  }

  return anomalies.sort((a, b) => b.deviation - a.deviation);
}

async function getTdsBreakdown(
  orgId: string,
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
): Promise<TdsSlabBreakdown[]> {
  const slips = await db.salarySlip.findMany({
    where: {
      organizationId: orgId,
      OR: buildMonthYearRange(startMonth, startYear, endMonth, endYear),
    },
    select: { employeeId: true, grossPay: true },
  });

  // Group by employee and estimate annual income
  const employeeGross = new Map<string, number>();
  for (const slip of slips) {
    const key = slip.employeeId ?? "unknown";
    employeeGross.set(key, (employeeGross.get(key) ?? 0) + slip.grossPay);
  }

  const slabCounts = TDS_SLABS.map((slab) => ({
    slab: slab.label,
    count: 0,
    totalTds: 0,
  }));

  for (const [, periodGross] of employeeGross) {
    // Estimate annual income: scale period gross to 12 months
    const monthsInRange =
      (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    const annualEstimate = (periodGross / monthsInRange) * 12;
    const tds = calculateTDS(annualEstimate);

    // Assign to highest applicable slab
    for (let i = TDS_SLABS.length - 1; i >= 0; i--) {
      if (annualEstimate >= TDS_SLABS[i].min) {
        slabCounts[i].count++;
        slabCounts[i].totalTds = round(slabCounts[i].totalTds + tds);
        break;
      }
    }
  }

  return slabCounts;
}

function buildMonthYearRange(
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
): Array<{ month: number; year: number }> {
  const conditions: Array<{ month: number; year: number }> = [];
  let m = startMonth;
  let y = startYear;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    conditions.push({ month: m, year: y });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return conditions;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
