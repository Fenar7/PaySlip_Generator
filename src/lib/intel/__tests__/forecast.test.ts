import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@/lib/db"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    db: {
      organization: {
        findUniqueOrThrow: vi.fn(),
      },
      invoicePayment: {
        findMany: vi.fn(),
      },
      vendorBillPayment: {
        findMany: vi.fn(),
      },
      payrollRun: {
        findMany: vi.fn(),
      },
      forecastSnapshot: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock(import("@/lib/intel/insights"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    upsertInsight: vi.fn(),
  };
});

import { db } from "@/lib/db";
import { generateForecast, getLatestForecast } from "../forecast";

describe("forecast readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({
      consolidationCurrency: "INR",
    } as never);
    vi.mocked(db.invoicePayment.findMany).mockResolvedValue([]);
    vi.mocked(db.vendorBillPayment.findMany).mockResolvedValue([]);
    vi.mocked(db.payrollRun.findMany).mockResolvedValue([]);
    vi.mocked(db.forecastSnapshot.create).mockResolvedValue({
      id: "forecast_1",
      generatedAt: new Date("2026-02-01T09:00:00.000Z"),
    } as never);
  });

  it("returns a gathering-data state when settled history is insufficient", async () => {
    const result = await generateForecast("org_1", 3, "MANUAL", true);

    expect(result.readiness.status).toBe("gathering_data");
    expect(result.readiness.availableHistoryMonths).toBe(0);
    expect(result.projections).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(result.runRate).toEqual({ mrr: 0, arr: 0, momGrowth: null });
  });

  it("derives readiness for older snapshots that predate the new field", async () => {
    vi.mocked(db.forecastSnapshot.findFirst).mockResolvedValue({
      id: "forecast_legacy",
      generatedAt: new Date("2026-02-01T09:00:00.000Z"),
      baseCurrency: "INR",
      historicalData: [
        { month: "2025-12", inflow: 1000, outflow: 200, net: 800 },
        { month: "2026-01", inflow: 0, outflow: 0, net: 0 },
      ],
      projections: [],
      revenueRunRate: { mrr: 0, arr: 0, momGrowth: null },
      anomalies: null,
    } as never);

    const result = await getLatestForecast("org_1");

    expect(result?.readiness.status).toBe("gathering_data");
    expect(result?.readiness.availableHistoryMonths).toBe(1);
  });
});
