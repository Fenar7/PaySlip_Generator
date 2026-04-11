/**
 * Country-specific invoice format configuration.
 */

import type { SupportedCurrency } from "./utils";

export interface CountryConfig {
  code: string;
  name: string;
  defaultCurrency: SupportedCurrency;
  timezone: string;
  fiscalYearStart: number; // month (1-12)
  taxSystem: "GST" | "VAT" | "SALES_TAX" | "NONE";
  taxLabel: string;
  invoiceTitle: string;
  showGstin: boolean;
  showHsnSac: boolean;
  showCgstSgstIgst: boolean;
  showVatNumber: boolean;
  showTrn: boolean;
  showStateTax: boolean;
  vatIdLabel: string;
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  IN: {
    code: "IN",
    name: "India",
    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
    fiscalYearStart: 4,
    taxSystem: "GST",
    taxLabel: "GST",
    invoiceTitle: "Tax Invoice",
    showGstin: true,
    showHsnSac: true,
    showCgstSgstIgst: true,
    showVatNumber: false,
    showTrn: false,
    showStateTax: false,
    vatIdLabel: "GSTIN",
  },
  AE: {
    code: "AE",
    name: "UAE",
    defaultCurrency: "AED",
    timezone: "Asia/Dubai",
    fiscalYearStart: 1,
    taxSystem: "VAT",
    taxLabel: "VAT",
    invoiceTitle: "Tax Invoice",
    showGstin: false,
    showHsnSac: false,
    showCgstSgstIgst: false,
    showVatNumber: false,
    showTrn: true,
    showStateTax: false,
    vatIdLabel: "TRN",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    defaultCurrency: "GBP",
    timezone: "Europe/London",
    fiscalYearStart: 4,
    taxSystem: "VAT",
    taxLabel: "VAT",
    invoiceTitle: "VAT Invoice",
    showGstin: false,
    showHsnSac: false,
    showCgstSgstIgst: false,
    showVatNumber: true,
    showTrn: false,
    showStateTax: false,
    vatIdLabel: "VAT Number",
  },
  US: {
    code: "US",
    name: "United States",
    defaultCurrency: "USD",
    timezone: "America/New_York",
    fiscalYearStart: 1,
    taxSystem: "SALES_TAX",
    taxLabel: "Tax",
    invoiceTitle: "Invoice",
    showGstin: false,
    showHsnSac: false,
    showCgstSgstIgst: false,
    showVatNumber: false,
    showTrn: false,
    showStateTax: true,
    vatIdLabel: "Tax ID",
  },
  DE: {
    code: "DE",
    name: "Germany",
    defaultCurrency: "EUR",
    timezone: "Europe/Berlin",
    fiscalYearStart: 1,
    taxSystem: "VAT",
    taxLabel: "MwSt.",
    invoiceTitle: "Rechnung",
    showGstin: false,
    showHsnSac: false,
    showCgstSgstIgst: false,
    showVatNumber: true,
    showTrn: false,
    showStateTax: false,
    vatIdLabel: "USt-IdNr.",
  },
};

export const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_CONFIGS);

/** Returns the config for the given country code, defaulting to India (IN). */
export function getCountryConfig(countryCode: string): CountryConfig {
  return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS["IN"];
}
