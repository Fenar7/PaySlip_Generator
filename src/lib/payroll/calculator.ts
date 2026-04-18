/**
 * Payroll Calculator
 *
 * Pure functions for computing CTC breakdown and statutory deductions.
 * No database access — all inputs must be resolved before calling.
 *
 * Indian statutory rates (FY 2025-26):
 *   PF Employee:  12% of Basic, capped at ₹1,800/month (PF wage ceiling ₹15,000)
 *   PF Employer:  13% of Basic (3.67% PF + 8.33% EPS + 0.5% EDLI + 0.5% admin), capped
 *   ESI Employee: 0.75% of Gross if Gross ≤ ₹21,000/month
 *   ESI Employer: 3.25% of Gross if Gross ≤ ₹21,000/month
 *   PT:           State slab-based (default Maharashtra)
 *   TDS:          Monthly projection of annual tax liability
 */

export const PF_WAGE_CEILING = 15_000; // PF applicable on Basic up to ₹15,000
export const PF_EMP_RATE = 0.12; // 12%
export const PF_EMPLOYER_RATE = 0.13; // 13% (incl. EPS + EDLI + admin)
export const ESI_GROSS_CEILING = 21_000; // ESI applicable if gross ≤ ₹21,000
export const ESI_EMP_RATE = 0.0075; // 0.75%
export const ESI_EMPLOYER_RATE = 0.0325; // 3.25%

/** One slab in a Professional Tax schedule */
export interface PtSlab {
  minSalary: number;
  maxSalary: number | null; // null = unlimited
  monthlyTax: number;
}

/** Default Maharashtra PT slabs (monthly gross) */
export const MAHARASHTRA_PT_SLABS: PtSlab[] = [
  { minSalary: 0, maxSalary: 7_500, monthlyTax: 0 },
  { minSalary: 7_501, maxSalary: 10_000, monthlyTax: 175 },
  { minSalary: 10_001, maxSalary: null, monthlyTax: 200 }, // Feb = 300
];

export type TaxRegime = "old" | "new";

/** Per-employee CTC configuration */
export interface EmployeeCTCConfig {
  ctcAnnual: number; // Annual CTC in INR
  employmentType?: string;
  pfOptOut?: boolean; // Has opted out of PF
  esiOptOut?: boolean; // Not eligible (salary > ESI ceiling)
  taxRegime?: TaxRegime;
  ptSlabs?: PtSlab[]; // Org-level PT slabs; defaults to Maharashtra
  panNumber?: string; // For TDS (10% without PAN)
  // Attendance
  workingDays?: number; // Standard working days in the period
  attendedDays?: number; // Actual days worked
  lossOfPayDays?: number; // LOP days
}

/** Calculated payroll breakdown for one employee in one period */
export interface PayrollItem {
  // Earnings
  monthlyCtc: number;
  basicPay: number; // 40% of monthly CTC
  hra: number; // 50% of Basic (metro)
  lta: number; // 5% of Basic
  specialAllowance: number; // CTC - Basic - HRA - LTA - Employer PF
  grossPay: number; // Basic + HRA + LTA + Special Allowance (before statutory)
  // Deductions
  pfEmployee: number;
  esiEmployee: number;
  professionalTax: number;
  tdsDeduction: number;
  totalDeductions: number;
  // Employer contributions (not deducted from gross, but cost to company)
  pfEmployer: number;
  esiEmployer: number;
  // Net
  netPay: number;
}

/**
 * Compute a complete payroll breakdown for one employee.
 * All monetary values are rounded to 2 decimal places.
 */
export function computePayrollItem(config: EmployeeCTCConfig): PayrollItem {
  const {
    ctcAnnual,
    pfOptOut = false,
    esiOptOut = false,
    taxRegime = "new",
    ptSlabs = MAHARASHTRA_PT_SLABS,
    panNumber,
    workingDays = 26,
    attendedDays,
    lossOfPayDays = 0,
  } = config;

  const monthlyCtcFull = ctcAnnual / 12;

  // Attendance-based pay (pro-ration if attended < working days)
  const effectiveWorkingDays = workingDays;
  const effectiveAttendedDays =
    attendedDays !== undefined ? attendedDays : workingDays;
  const lopDays =
    attendedDays !== undefined
      ? Math.max(0, workingDays - effectiveAttendedDays + lossOfPayDays)
      : lossOfPayDays;
  const attendanceRatio = lopDays > 0
    ? Math.max(0, (effectiveWorkingDays - lopDays) / effectiveWorkingDays)
    : 1;
  const monthlyCtc = round2(monthlyCtcFull * attendanceRatio);

  // CTC Component breakdown
  // Employer PF = 13% of Basic where Basic = 40% CTC
  // We back-calculate from CTC: CTC = Basic + HRA + LTA + Special + Employer PF
  // Basic = 40% of (CTC - EmployerPF), but iterating once is sufficient
  const basicRaw = round2(monthlyCtc * 0.40);
  const pfWageBase = Math.min(basicRaw, PF_WAGE_CEILING);

  const pfEmployerFull = pfOptOut ? 0 : round2(pfWageBase * PF_EMPLOYER_RATE);
  const hra = round2(basicRaw * 0.50);
  const lta = round2(basicRaw * 0.05);
  // Special allowance = CTC - Basic - HRA - LTA - Employer PF contribution
  const specialAllowance = round2(
    Math.max(0, monthlyCtc - basicRaw - hra - lta - pfEmployerFull)
  );

  const grossPay = round2(basicRaw + hra + lta + specialAllowance);

  // Statutory deductions (from employee gross)
  const pfEmployee = pfOptOut
    ? 0
    : round2(Math.min(pfWageBase * PF_EMP_RATE, 1_800));

  const esiEmployee =
    esiOptOut || grossPay > ESI_GROSS_CEILING
      ? 0
      : round2(grossPay * ESI_EMP_RATE);

  const esiEmployer =
    esiOptOut || grossPay > ESI_GROSS_CEILING
      ? 0
      : round2(grossPay * ESI_EMPLOYER_RATE);

  const professionalTax = computeProfessionalTax(grossPay, ptSlabs);

  const tdsDeduction = computeMonthlyTds(
    grossPay,
    pfEmployee,
    taxRegime,
    !!panNumber
  );

  const totalDeductions = round2(
    pfEmployee + esiEmployee + professionalTax + tdsDeduction
  );
  const netPay = round2(grossPay - totalDeductions);

  return {
    monthlyCtc,
    basicPay: basicRaw,
    hra,
    lta,
    specialAllowance,
    grossPay,
    pfEmployee,
    esiEmployee,
    professionalTax,
    tdsDeduction,
    totalDeductions,
    pfEmployer: pfEmployerFull,
    esiEmployer,
    netPay,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeProfessionalTax(
  monthlyGross: number,
  slabs: PtSlab[]
): number {
  for (const slab of slabs) {
    const upperBound = slab.maxSalary ?? Infinity;
    if (monthlyGross >= slab.minSalary && monthlyGross <= upperBound) {
      return slab.monthlyTax;
    }
  }
  return 0;
}

/**
 * Computes a rough monthly TDS deduction.
 *
 * New regime (FY 2025-26 slabs under Section 115BAC):
 *   0 – 3L:      0%
 *   3L – 7L:     5%
 *   7L – 10L:    10%
 *   10L – 12L:   15%
 *   12L – 15L:   20%
 *   >15L:        30%
 *
 * Old regime (rough):
 *   0 – 2.5L:    0%
 *   2.5L – 5L:   5%
 *   5L – 10L:    20%
 *   >10L:        30%
 *
 * Without PAN: 20% flat per Income Tax Act §206AA.
 */
export function computeMonthlyTds(
  monthlyGross: number,
  monthlyPfDeduction: number,
  regime: TaxRegime,
  hasPan: boolean
): number {
  if (!hasPan) {
    // Without PAN, flat 20% TDS per §206AA
    return round2(monthlyGross * 0.2);
  }

  const annualGross = monthlyGross * 12;
  // Standard deduction ₹75,000 for salaried (FY 2025-26)
  const standardDeduction = 75_000;
  // PF contribution for the year (employee share)
  const annualPf = monthlyPfDeduction * 12;
  const taxableIncome = Math.max(
    0,
    annualGross - standardDeduction - annualPf
  );

  const annualTax =
    regime === "new"
      ? computeTaxNewRegime(taxableIncome)
      : computeTaxOldRegime(taxableIncome);

  const healthEducationCess = round2(annualTax * 0.04);
  const totalTax = round2(annualTax + healthEducationCess);
  return round2(totalTax / 12);
}

function computeTaxNewRegime(taxableIncome: number): number {
  // Rebate u/s 87A: no tax if taxable income ≤ ₹7L
  if (taxableIncome <= 700_000) return 0;

  const slabs = [
    { limit: 300_000, rate: 0 },
    { limit: 700_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.10 },
    { limit: 1_200_000, rate: 0.15 },
    { limit: 1_500_000, rate: 0.20 },
  ];
  return applySlabs(taxableIncome, slabs, 0.30);
}

function computeTaxOldRegime(taxableIncome: number): number {
  // Rebate u/s 87A: no tax if taxable income ≤ ₹5L
  if (taxableIncome <= 500_000) return 0;

  const slabs = [
    { limit: 250_000, rate: 0 },
    { limit: 500_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.20 },
  ];
  return applySlabs(taxableIncome, slabs, 0.30);
}

interface Slab {
  limit: number;
  rate: number;
}

function applySlabs(income: number, slabs: Slab[], topRate: number): number {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, slab.limit) - prev;
    tax += taxable * slab.rate;
    prev = slab.limit;
  }
  if (income > prev) {
    tax += (income - prev) * topRate;
  }
  return round2(tax);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
