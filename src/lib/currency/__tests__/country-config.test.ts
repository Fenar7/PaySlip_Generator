import { describe, it, expect } from "vitest";
import {
  getCountryConfig,
  COUNTRY_CONFIGS,
  SUPPORTED_COUNTRIES,
} from "../country-config";

describe("COUNTRY_CONFIGS", () => {
  it("contains IN, AE, GB, US, DE", () => {
    expect(SUPPORTED_COUNTRIES).toEqual(
      expect.arrayContaining(["IN", "AE", "GB", "US", "DE"]),
    );
  });

  it("has 5 country configurations", () => {
    expect(SUPPORTED_COUNTRIES).toHaveLength(5);
  });
});

describe("getCountryConfig", () => {
  it("returns India config for IN", () => {
    const config = getCountryConfig("IN");
    expect(config.code).toBe("IN");
    expect(config.name).toBe("India");
    expect(config.defaultCurrency).toBe("INR");
    expect(config.timezone).toBe("Asia/Kolkata");
    expect(config.fiscalYearStart).toBe(4);
    expect(config.taxSystem).toBe("GST");
    expect(config.taxLabel).toBe("GST");
    expect(config.invoiceTitle).toBe("Tax Invoice");
    expect(config.showGstin).toBe(true);
    expect(config.showHsnSac).toBe(true);
    expect(config.showCgstSgstIgst).toBe(true);
    expect(config.vatIdLabel).toBe("GSTIN");
  });

  it("returns UAE config for AE", () => {
    const config = getCountryConfig("AE");
    expect(config.code).toBe("AE");
    expect(config.defaultCurrency).toBe("AED");
    expect(config.timezone).toBe("Asia/Dubai");
    expect(config.taxSystem).toBe("VAT");
    expect(config.showTrn).toBe(true);
    expect(config.vatIdLabel).toBe("TRN");
  });

  it("returns UK config for GB", () => {
    const config = getCountryConfig("GB");
    expect(config.code).toBe("GB");
    expect(config.defaultCurrency).toBe("GBP");
    expect(config.timezone).toBe("Europe/London");
    expect(config.taxSystem).toBe("VAT");
    expect(config.invoiceTitle).toBe("VAT Invoice");
    expect(config.showVatNumber).toBe(true);
    expect(config.vatIdLabel).toBe("VAT Number");
  });

  it("returns US config for US", () => {
    const config = getCountryConfig("US");
    expect(config.code).toBe("US");
    expect(config.defaultCurrency).toBe("USD");
    expect(config.timezone).toBe("America/New_York");
    expect(config.taxSystem).toBe("SALES_TAX");
    expect(config.invoiceTitle).toBe("Invoice");
    expect(config.showStateTax).toBe(true);
    expect(config.vatIdLabel).toBe("Tax ID");
  });

  it("returns Germany config for DE", () => {
    const config = getCountryConfig("DE");
    expect(config.code).toBe("DE");
    expect(config.defaultCurrency).toBe("EUR");
    expect(config.timezone).toBe("Europe/Berlin");
    expect(config.taxSystem).toBe("VAT");
    expect(config.taxLabel).toBe("MwSt.");
    expect(config.invoiceTitle).toBe("Rechnung");
    expect(config.vatIdLabel).toBe("USt-IdNr.");
  });

  it("falls back to India for unknown country code", () => {
    const config = getCountryConfig("XX");
    expect(config.code).toBe("IN");
    expect(config.defaultCurrency).toBe("INR");
  });

  it("falls back to India for empty string", () => {
    const config = getCountryConfig("");
    expect(config.code).toBe("IN");
  });
});

describe("Country config structure", () => {
  it("each config has all required fields", () => {
    for (const [code, config] of Object.entries(COUNTRY_CONFIGS)) {
      expect(config.code).toBe(code);
      expect(config.name).toBeTruthy();
      expect(config.defaultCurrency).toBeTruthy();
      expect(config.timezone).toBeTruthy();
      expect(config.fiscalYearStart).toBeGreaterThanOrEqual(1);
      expect(config.fiscalYearStart).toBeLessThanOrEqual(12);
      expect(["GST", "VAT", "SALES_TAX", "NONE"]).toContain(config.taxSystem);
      expect(config.taxLabel).toBeTruthy();
      expect(config.invoiceTitle).toBeTruthy();
      expect(config.vatIdLabel).toBeTruthy();
    }
  });
});
