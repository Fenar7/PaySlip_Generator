import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currencies = Object.keys(SUPPORTED_CURRENCIES).filter(
      (c) => c !== "INR",
    );

    // Fetch the latest rate for each currency pair
    const rates = await Promise.all(
      currencies.map(async (currency) => {
        const record = await db.exchangeRate.findFirst({
          where: { fromCurrency: currency, toCurrency: "INR" },
          orderBy: { fetchedAt: "desc" },
        });
        return record
          ? {
              fromCurrency: record.fromCurrency,
              toCurrency: record.toCurrency,
              rate: record.rate,
              fetchedAt: record.fetchedAt,
            }
          : null;
      }),
    );

    return NextResponse.json({
      baseCurrency: "INR",
      rates: rates.filter(Boolean),
    });
  } catch (error) {
    console.error("Exchange rates API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 },
    );
  }
}
