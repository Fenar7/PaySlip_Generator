import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let cachedRates: { usd: number; eur: number; gbp: number } | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();

  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedRates);
  }

  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/INR",
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) {
      throw new Error(`Exchange rate API returned ${res.status}`);
    }

    const data = await res.json();
    const rates = data.rates as Record<string, number>;

    cachedRates = {
      usd: rates.USD ?? 0,
      eur: rates.EUR ?? 0,
      gbp: rates.GBP ?? 0,
    };
    cachedAt = now;

    return NextResponse.json(cachedRates);
  } catch (error) {
    console.error("[ExchangeRates] fetch error:", error);

    if (cachedRates) {
      return NextResponse.json(cachedRates);
    }

    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 502 },
    );
  }
}
