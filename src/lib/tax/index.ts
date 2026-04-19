/**
 * Tax strategy dispatcher — resolves TaxRegion to the appropriate strategy.
 */
import type { TaxStrategy, TaxComputeInput, TaxComputeResult } from "./engine";
import { inGstStrategy } from "./regions/in-gst";
import { ukVatStrategy } from "./regions/uk-vat";
import { euVatStrategy } from "./regions/eu-vat";
import { usSalesStrategy } from "./regions/us-sales";
import { auGstStrategy, nzGstStrategy, sgGstStrategy } from "./regions/flat-gst";
import { exemptStrategy } from "./regions/exempt";

export type { TaxStrategy, TaxComputeInput, TaxComputeResult };
export type { TaxLineInput, TaxLineResult, TaxBreakdownLine } from "./engine";

const STRATEGIES: Record<string, TaxStrategy> = {
  IN_GST: inGstStrategy,
  UK_VAT: ukVatStrategy,
  EU_VAT: euVatStrategy,
  US_SALES: usSalesStrategy,
  AU_GST: auGstStrategy,
  NZ_GST: nzGstStrategy,
  SG_GST: sgGstStrategy,
  EXEMPT: exemptStrategy,
};

export function getStrategy(region: string): TaxStrategy {
  const strategy = STRATEGIES[region];
  if (!strategy) throw new Error(`Unsupported tax region: ${region}`);
  return strategy;
}

export function computeTax(region: string, input: TaxComputeInput): TaxComputeResult {
  return getStrategy(region).compute(input);
}

export function listSupportedRegions(): Array<{ region: string; displayName: string; currency: string }> {
  return Object.values(STRATEGIES).map((s) => ({
    region: s.region,
    displayName: s.displayName,
    currency: s.defaultCurrency,
  }));
}
