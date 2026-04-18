/**
 * Exempt tax strategy — zero tax for tax-exempt organizations.
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult, TaxLineResult } from "../engine";
import { taxRound2 } from "../engine";

export const exemptStrategy: TaxStrategy = {
  region: "EXEMPT",
  displayName: "Tax Exempt",
  defaultCurrency: "USD",

  compute(input: TaxComputeInput): TaxComputeResult {
    const lineResults: TaxLineResult[] = input.lines.map((l) => ({
      taxableAmount: taxRound2(l.amount),
      taxAmount: 0,
      effectiveRate: 0,
      breakdown: [],
    }));

    const totalTaxable = lineResults.reduce((sum, lr) => sum + lr.taxableAmount, 0);

    return {
      totalTaxable: taxRound2(totalTaxable),
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [],
      lineResults,
      currency: (input.config as { currency?: string }).currency ?? "USD",
    };
  },
};
