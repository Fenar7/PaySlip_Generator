/**
 * Multi-currency formatting and conversion utilities.
 */

export const SUPPORTED_CURRENCIES = {
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  AED: { symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  SGD: { symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  SAR: { symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

/** Format amount in a specific currency using its locale and symbol. */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
): string {
  const config = SUPPORTED_CURRENCIES[currency];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format an exchange-rate note suitable for a PDF footer. */
export function formatExchangeRateNote(
  displayCurrency: string,
  rate: number,
  date: Date | string,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const cur = displayCurrency as SupportedCurrency;
  const symbol =
    cur in SUPPORTED_CURRENCIES
      ? SUPPORTED_CURRENCIES[cur].symbol
      : displayCurrency;
  return `Exchange rate: ${displayCurrency} 1 = ${symbol === SUPPORTED_CURRENCIES.INR.symbol ? symbol : "₹"}${rate.toFixed(2)} as of ${formatted}`;
}

/** Returns true when the exchange rate was fetched more than 7 days ago. */
export function isExchangeRateStale(fetchedAt: Date | string): boolean {
  const d = typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - d.getTime() > sevenDaysMs;
}

/** Convert an amount from the base currency using the given exchange rate. */
export function convertAmount(
  amountInBase: number,
  exchangeRate: number,
): number {
  return Math.round((amountInBase / exchangeRate) * 100) / 100;
}
