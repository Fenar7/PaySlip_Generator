/**
 * AU/NZ/SG GST strategies — flat-rate GST with standard rounding.
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult, TaxLineResult } from "../engine";
import { taxRound2 } from "../engine";

function flatGstStrategy(
  region: string,
  displayName: string,
  currency: string,
  defaultRate: number,
): TaxStrategy {
  return {
    region,
    displayName,
    defaultCurrency: currency,
    compute(input: TaxComputeInput): TaxComputeResult {
      const configRate = (input.config as { gstRate?: number }).gstRate ?? defaultRate;
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
        const rate = line.taxRate ?? configRate;
        const tax = taxRound2(taxable * rate / 100);
        totalTaxable += taxable;
        totalTax += tax;

        lineResults.push({
          taxableAmount: taxable,
          taxAmount: tax,
          effectiveRate: rate,
          breakdown: [{ label: "GST", rate, amount: tax }],
        });
      }

      return {
        totalTaxable: taxRound2(totalTaxable),
        totalTax: taxRound2(totalTax),
        effectiveRate: totalTaxable > 0 ? taxRound2((totalTax / totalTaxable) * 100) : 0,
        breakdown: totalTax > 0 ? [{ label: "GST", rate: configRate, amount: taxRound2(totalTax) }] : [],
        lineResults,
        currency,
      };
    },
  };
}

export const auGstStrategy = flatGstStrategy("AU_GST", "Australia GST", "AUD", 10);
export const nzGstStrategy = flatGstStrategy("NZ_GST", "New Zealand GST", "NZD", 15);
export const sgGstStrategy = flatGstStrategy("SG_GST", "Singapore GST", "SGD", 9);
