import "server-only";
import fs from "fs";
import path from "path";

export const SUPPORTED_LOCALES = ["en", "hi", "ar", "es", "fr", "de"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const translationCache = new Map<string, Record<string, unknown>>();

function cacheKey(locale: string, namespace: string) {
  return `${locale}:${namespace}`;
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function loadTranslations(
  locale: string,
  namespace: string,
): Record<string, unknown> {
  const key = cacheKey(locale, namespace);
  if (translationCache.has(key)) return translationCache.get(key)!;

  const filePath = path.join(
    process.cwd(),
    "src",
    "locales",
    locale,
    `${namespace}.json`,
  );

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    translationCache.set(key, data);
    return data;
  } catch {
    if (locale !== "en") return loadTranslations("en", namespace);
    return {};
  }
}

/** @deprecated Use loadTranslations instead */
export function getTranslations(
  locale: string,
  namespace: string,
): Record<string, unknown> {
  const resolvedLocale = isSupportedLocale(locale) ? locale : "en";
  return loadTranslations(resolvedLocale, namespace);
}

function getNestedValue(
  obj: Record<string, unknown>,
  keyPath: string,
): string | undefined {
  const parts = keyPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(
  locale: string,
  namespace: string,
  key: string,
  vars?: Record<string, string>,
): string {
  const translations = loadTranslations(locale, namespace);
  let value = getNestedValue(translations, key);

  if (!value) {
    if (locale !== "en") {
      const enTranslations = loadTranslations("en", namespace);
      value = getNestedValue(enTranslations, key);
    }
    if (!value) return key;
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
  }

  return value;
}

export function getDocumentLabels(
  locale: string,
  docType: "invoices" | "vouchers" | "salary-slips" | "quotes",
): Record<string, unknown> {
  return loadTranslations(locale, docType);
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}

export function resolveDocumentLanguage(
  customerPreferredLanguage: string | null | undefined,
  orgDefaultDocLanguage: string,
  explicitDocLanguage?: string,
): string {
  if (explicitDocLanguage && isSupportedLocale(explicitDocLanguage)) {
    return explicitDocLanguage;
  }
  if (
    customerPreferredLanguage &&
    isSupportedLocale(customerPreferredLanguage)
  ) {
    return customerPreferredLanguage;
  }
  return isSupportedLocale(orgDefaultDocLanguage)
    ? orgDefaultDocLanguage
    : "en";
}
