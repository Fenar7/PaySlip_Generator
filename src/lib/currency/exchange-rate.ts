import "server-only";

import { db } from "@/lib/db";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "./utils";

/**
 * Retrieve the latest stored exchange rate between two currencies.
 */
export async function getLatestRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<{ rate: number; fetchedAt: Date } | null> {
  const record = await db.exchangeRate.findFirst({
    where: { fromCurrency, toCurrency },
    orderBy: { fetchedAt: "desc" },
  });

  if (!record) return null;
  return { rate: record.rate, fetchedAt: record.fetchedAt };
}

/**
 * Fetch rates from the Open Exchange Rates API (or env-configured endpoint)
 * and persist them in the exchange_rates table.
 *
 * Falls back to a static set when the API key is missing or the request fails.
 */
export async function fetchAndStoreRates(): Promise<void> {
  const baseCurrency = "INR";
  const targets = Object.keys(SUPPORTED_CURRENCIES).filter(
    (c) => c !== baseCurrency,
  ) as SupportedCurrency[];

  let rates: Record<string, number>;

  const apiKey = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  const apiBase =
    process.env.EXCHANGE_RATE_API_URL ??
    "https://openexchangerates.org/api/latest.json";

  if (apiKey) {
    try {
      const res = await fetch(`${apiBase}?app_id=${apiKey}&base=USD`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`Exchange rate API returned ${res.status}`);
      }

      const data = (await res.json()) as {
        rates: Record<string, number>;
      };

      // API returns USD-based rates; convert to INR-based
      const usdToInr = data.rates["INR"] ?? 83.3;
      rates = {};
      for (const cur of targets) {
        const usdToTarget = data.rates[cur];
        if (usdToTarget) {
          // INR→target = usdToTarget / usdToInr  ⇒  1 target = usdToInr / usdToTarget INR
          rates[cur] = usdToInr / usdToTarget;
        }
      }
    } catch (err) {
      console.error("Exchange rate fetch failed, using fallback rates:", err);
      rates = getFallbackRates();
    }
  } else {
    rates = getFallbackRates();
  }

  const now = new Date();
  const creates = Object.entries(rates).map(([currency, rate]) =>
    db.exchangeRate.create({
      data: {
        fromCurrency: currency,
        toCurrency: baseCurrency,
        rate,
        fetchedAt: now,
      },
    }),
  );

  await Promise.all(creates);
}

/** Static fallback rates (approximate, 1 foreign-currency = X INR). */
function getFallbackRates(): Record<string, number> {
  return {
    USD: 83.3,
    EUR: 90.5,
    GBP: 105.2,
    AED: 22.68,
    SGD: 62.1,
    AUD: 54.5,
    SAR: 22.21,
  };
}
