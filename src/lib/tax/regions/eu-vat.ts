/**
 * EU VAT region strategy.
 * Standard rates vary by country — configurable via config.vatRate.
 * Default: 21% (Netherlands/Belgium average).
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult, TaxBreakdownLine, TaxLineResult } from "../engine";
import { taxRound2 } from "../engine";

const EU_DEFAULT_RATE = 21;

export const euVatStrategy: TaxStrategy = {
  region: "EU_VAT",
  displayName: "EU VAT",
  defaultCurrency: "EUR",

  compute(input: TaxComputeInput): TaxComputeResult {
    const countryRate = (input.config as { vatRate?: number }).vatRate ?? EU_DEFAULT_RATE;
    let totalTaxable = 0;
    let totalTax = 0;
    const lineResults: TaxLineResult[] = [];

    for (const line of input.lines) {
      const taxable = taxRound2(line.amount);
      if (line.isExempt) {
        lineResults.push({ taxableAmount: taxable, taxAmount: 0, effectiveRate: 0, breakdown: [] });
        totalTaxable += taxable;
        continue;
      }

      const rate = line.taxRate ?? countryRate;
      const tax = taxRound2(taxable * rate / 100);
      totalTaxable += taxable;
      totalTax += tax;

      lineResults.push({
        taxableAmount: taxable,
        taxAmount: tax,
        effectiveRate: rate,
        breakdown: [{ label: "VAT", rate, amount: tax }],
      });
    }

    return {
      totalTaxable: taxRound2(totalTaxable),
      totalTax: taxRound2(totalTax),
      effectiveRate: totalTaxable > 0 ? taxRound2((totalTax / totalTaxable) * 100) : 0,
      breakdown: totalTax > 0 ? [{ label: "VAT", rate: countryRate, amount: taxRound2(totalTax) }] : [],
      lineResults,
      currency: "EUR",
    };
  },
};
