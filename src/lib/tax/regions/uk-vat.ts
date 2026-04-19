/**
 * UK VAT region strategy.
 * Standard rate: 20%, Reduced: 5%, Zero: 0%.
 * Uses HMRC half-down rounding.
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult, TaxBreakdownLine, TaxLineResult } from "../engine";
import { halfDown } from "../engine";

const UK_STANDARD_RATE = 20;
const UK_REDUCED_RATE = 5;

export const ukVatStrategy: TaxStrategy = {
  region: "UK_VAT",
  displayName: "UK VAT",
  defaultCurrency: "GBP",

  compute(input: TaxComputeInput): TaxComputeResult {
    let totalTaxable = 0;
    let totalTax = 0;
    const lineResults: TaxLineResult[] = [];

    for (const line of input.lines) {
      const taxable = halfDown(line.amount);
      if (line.isExempt) {
        lineResults.push({ taxableAmount: taxable, taxAmount: 0, effectiveRate: 0, breakdown: [] });
        totalTaxable += taxable;
        continue;
      }

      const rate = line.taxRate ?? UK_STANDARD_RATE;
      const tax = halfDown(taxable * rate / 100);
      totalTaxable += taxable;
      totalTax += tax;

      lineResults.push({
        taxableAmount: taxable,
        taxAmount: tax,
        effectiveRate: rate,
        breakdown: [{ label: "VAT", rate, amount: tax }],
      });
    }

    const breakdown: TaxBreakdownLine[] = totalTax > 0
      ? [{ label: "VAT", rate: totalTaxable > 0 ? halfDown((totalTax / totalTaxable) * 100) : 0, amount: totalTax }]
      : [];

    return {
      totalTaxable: halfDown(totalTaxable),
      totalTax: halfDown(totalTax),
      effectiveRate: totalTaxable > 0 ? halfDown((totalTax / totalTaxable) * 100) : 0,
      breakdown,
      lineResults,
      currency: "GBP",
    };
  },
};
