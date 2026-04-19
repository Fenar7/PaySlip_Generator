/**
 * Global Tax Engine — Strategy-pattern dispatch for multi-region tax computation.
 *
 * Pure functions with no DB dependencies.
 * Each region implements the TaxStrategy interface.
 */

export interface TaxLineInput {
  amount: number;
  taxRate?: number;
  category?: string;
  isExempt?: boolean;
}

export interface TaxLineResult {
  taxableAmount: number;
  taxAmount: number;
  effectiveRate: number;
  breakdown: TaxBreakdownLine[];
}

export interface TaxBreakdownLine {
  label: string;
  rate: number;
  amount: number;
}

export interface TaxComputeInput {
  lines: TaxLineInput[];
  config: Record<string, unknown>;
}

export interface TaxComputeResult {
  totalTaxable: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: TaxBreakdownLine[];
  lineResults: TaxLineResult[];
  currency: string;
}

export interface TaxStrategy {
  region: string;
  displayName: string;
  defaultCurrency: string;
  compute(input: TaxComputeInput): TaxComputeResult;
}

/** Round to 2 decimals — financial rounding */
export function taxRound2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * UK HMRC "half-down" rounding for VAT:
 * If the fractional part is exactly 0.5, round down (toward zero).
 * Otherwise, use standard rounding.
 */
export function halfDown(n: number): number {
  const shifted = n * 100;
  const frac = shifted - Math.trunc(shifted);
  if (Math.abs(frac - 0.5) < 1e-10) {
    return Math.trunc(shifted) / 100;
  }
  return Math.round(shifted) / 100;
}
