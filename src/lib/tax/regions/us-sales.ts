/**
 * US Sales Tax region strategy.
 * US sales tax is destination-based and varies by state/county/city.
 * Config must provide nexus states and applicable rates.
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult, TaxBreakdownLine, TaxLineResult } from "../engine";
import { taxRound2 } from "../engine";

const US_DEFAULT_RATE = 0; // No federal sales tax

export const usSalesStrategy: TaxStrategy = {
  region: "US_SALES",
  displayName: "US Sales Tax",
  defaultCurrency: "USD",

  compute(input: TaxComputeInput): TaxComputeResult {
    const config = input.config as {
      stateRate?: number;
      countyRate?: number;
      cityRate?: number;
    };

    const combinedRate = (config.stateRate ?? 0) + (config.countyRate ?? 0) + (config.cityRate ?? 0);
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

      const rate = line.taxRate ?? combinedRate;
      const tax = taxRound2(taxable * rate / 100);
      totalTaxable += taxable;
      totalTax += tax;

      const bd: TaxBreakdownLine[] = [];
      if (config.stateRate) bd.push({ label: "State Tax", rate: config.stateRate, amount: taxRound2(taxable * config.stateRate / 100) });
      if (config.countyRate) bd.push({ label: "County Tax", rate: config.countyRate, amount: taxRound2(taxable * config.countyRate / 100) });
      if (config.cityRate) bd.push({ label: "City Tax", rate: config.cityRate, amount: taxRound2(taxable * config.cityRate / 100) });

      lineResults.push({
        taxableAmount: taxable,
        taxAmount: tax,
        effectiveRate: rate,
        breakdown: bd.length > 0 ? bd : [{ label: "Sales Tax", rate, amount: tax }],
      });
    }

    return {
      totalTaxable: taxRound2(totalTaxable),
      totalTax: taxRound2(totalTax),
      effectiveRate: totalTaxable > 0 ? taxRound2((totalTax / totalTaxable) * 100) : 0,
      breakdown: totalTax > 0 ? [{ label: "Sales Tax", rate: combinedRate, amount: taxRound2(totalTax) }] : [],
      lineResults,
      currency: "USD",
    };
  },
};
