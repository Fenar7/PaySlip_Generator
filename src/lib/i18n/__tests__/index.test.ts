import { describe, it, expect, beforeEach } from "vitest";
import {
  t,
  loadTranslations,
  isRtlLocale,
  resolveDocumentLanguage,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from "../index";

describe("loadTranslations", () => {
  it("loads English invoices translations", () => {
    const data = loadTranslations("en", "invoices");
    expect(data).toBeDefined();
    expect(data.title).toBe("Invoice");
  });

  it("loads Hindi common translations", () => {
    const data = loadTranslations("hi", "common");
    expect(data).toBeDefined();
    expect(data.nav).toBeDefined();
  });

  it("falls back to English for unknown locale", () => {
    const data = loadTranslations("xx", "invoices");
    expect(data.title).toBe("Invoice");
  });
});

describe("t — translation function", () => {
  // TC-15-025: Hindi translation returns non-empty Hindi string
  it("TC-15-025: t('hi', 'common', 'nav.dashboard') returns Hindi string", () => {
    const result = t("hi", "common", "nav.dashboard");
    expect(result).toBeTruthy();
    expect(result).not.toBe("nav.dashboard");
    expect(result).toBe("डैशबोर्ड");
  });

  it("t('en', 'invoices', 'fields.invoiceNumber') returns 'Invoice Number'", () => {
    expect(t("en", "invoices", "fields.invoiceNumber")).toBe("Invoice Number");
  });

  it("t('hi', 'invoices', 'title') returns 'चालान'", () => {
    expect(t("hi", "invoices", "title")).toBe("चालान");
  });

  it("falls back to English for unsupported locale", () => {
    expect(t("xx", "invoices", "title")).toBe("Invoice");
  });

  it("returns key when translation not found anywhere", () => {
    expect(t("en", "invoices", "nonexistent.key.path")).toBe(
      "nonexistent.key.path",
    );
  });

  it("interpolates variables in template strings", () => {
    const result = t("en", "invoices", "currency.exchangeRateNote", {
      rate: "83.30",
      date: "2026-04-08",
    });
    expect(result).toBe("Exchange rate: 83.30 as of 2026-04-08");
  });
});

describe("isRtlLocale", () => {
  it("returns true for Arabic", () => {
    expect(isRtlLocale("ar")).toBe(true);
  });

  it("returns false for English", () => {
    expect(isRtlLocale("en")).toBe(false);
  });

  it("returns false for Hindi", () => {
    expect(isRtlLocale("hi")).toBe(false);
  });
});

describe("resolveDocumentLanguage", () => {
  it("returns customer preferred language when set", () => {
    expect(resolveDocumentLanguage("ar", "en")).toBe("ar");
  });

  it("returns org default when customer preference is null", () => {
    expect(resolveDocumentLanguage(null, "hi")).toBe("hi");
  });

  it("returns org default when customer preference is undefined", () => {
    expect(resolveDocumentLanguage(undefined, "fr")).toBe("fr");
  });

  it("returns 'en' when both are invalid", () => {
    expect(resolveDocumentLanguage(null, "zz")).toBe("en");
  });

  it("uses explicitDocLanguage when provided", () => {
    expect(resolveDocumentLanguage("ar", "en", "de")).toBe("de");
  });
});

describe("SUPPORTED_LOCALES", () => {
  it("contains all 6 supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "hi", "ar", "es", "fr", "de"]);
  });
});

describe("isSupportedLocale", () => {
  it("returns true for supported locales", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("hi")).toBe(true);
    expect(isSupportedLocale("ar")).toBe(true);
  });

  it("returns false for unsupported locales", () => {
    expect(isSupportedLocale("xx")).toBe(false);
    expect(isSupportedLocale("ja")).toBe(false);
  });
});
