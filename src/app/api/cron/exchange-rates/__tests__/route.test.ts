import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    exchangeRate: { create: vi.fn().mockResolvedValue({}) },
    jobLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@/lib/currency/exchange-rate", () => ({
  fetchAndStoreRates: vi.fn(),
}));

import { GET } from "../route";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

const mockValidate = vi.mocked(validateCronSecret);
const mockJobLogCreate = vi.mocked(db.jobLog.create);

function buildRequest(): Request {
  return new Request("http://localhost/api/cron/exchange-rates", {
    headers: { authorization: "Bearer test-secret" },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/exchange-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockReturnValue(true);
  });

  it("returns 401 when cron secret is invalid", async () => {
    mockValidate.mockReturnValue(false);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockJobLogCreate).not.toHaveBeenCalled();
  });

  it("fetches and stores exchange rates successfully", async () => {
    const { fetchAndStoreRates } = await import(
      "@/lib/currency/exchange-rate"
    );
    vi.mocked(fetchAndStoreRates).mockResolvedValue(undefined);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Exchange rates refreshed");
    expect(body.currencies).toEqual(
      expect.arrayContaining(["USD", "EUR", "GBP", "AED", "SGD", "AUD", "SAR"]),
    );
  });

  it("logs successful job to jobLog", async () => {
    const { fetchAndStoreRates } = await import(
      "@/lib/currency/exchange-rate"
    );
    vi.mocked(fetchAndStoreRates).mockResolvedValue(undefined);

    await GET(buildRequest());

    expect(mockJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "exchange-rate-refresh",
        status: "completed",
      }),
    });
  });

  it("returns 500 and logs failure when fetch throws", async () => {
    const { fetchAndStoreRates } = await import(
      "@/lib/currency/exchange-rate"
    );
    vi.mocked(fetchAndStoreRates).mockRejectedValue(
      new Error("API timeout"),
    );

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("API timeout");

    expect(mockJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "exchange-rate-refresh",
        status: "failed",
        error: "API timeout",
      }),
    });
  });
});
