import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findMany: vi.fn() },
    invoice: { count: vi.fn(), findMany: vi.fn() },
    jobLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

import { GET } from "../route";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

const mockValidate = vi.mocked(validateCronSecret);
const mockSubFindMany = vi.mocked(db.subscription.findMany);
const mockInvoiceCount = vi.mocked(db.invoice.count);
const mockInvoiceFindMany = vi.mocked(db.invoice.findMany);
const mockJobLogCreate = vi.mocked(db.jobLog.create);

function buildRequest(): Request {
  return new Request("http://localhost/api/cron/gst-prefetch", {
    headers: { authorization: "Bearer test-secret" },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/gst-prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockReturnValue(true);
  });

  it("processes Pro orgs and skips Free orgs", async () => {
    // Only Pro/Enterprise subs are returned (Free orgs already filtered by query)
    mockSubFindMany.mockResolvedValue([
      { orgId: "org-pro-1" },
      { orgId: "org-ent-1" },
    ] as never);

    // First org has 100 invoices (above threshold)
    mockInvoiceCount.mockResolvedValueOnce(100);
    mockInvoiceFindMany.mockResolvedValueOnce([
      {
        gstTotalCgst: 900,
        gstTotalSgst: 900,
        gstTotalIgst: 0,
        gstTotalCess: 0,
        totalAmount: 10000,
        customerGstin: "29AABCT1332L1ZP",
      },
      {
        gstTotalCgst: 450,
        gstTotalSgst: 450,
        gstTotalIgst: 0,
        gstTotalCess: 0,
        totalAmount: 5000,
        customerGstin: null,
      },
    ] as never);

    // Second org has 60 invoices (above threshold)
    mockInvoiceCount.mockResolvedValueOnce(60);
    mockInvoiceFindMany.mockResolvedValueOnce([
      {
        gstTotalCgst: 0,
        gstTotalSgst: 0,
        gstTotalIgst: 1800,
        gstTotalCess: 0,
        totalAmount: 20000,
        customerGstin: "07AAACR5055K1Z1",
      },
    ] as never);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.total).toBe(2);
    expect(body.errors).toBe(0);

    // Verify subscription query filters only pro/enterprise
    expect(mockSubFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          planId: { in: ["pro", "enterprise"] },
        }),
      })
    );
  });

  it("skips orgs with < 50 invoices", async () => {
    mockSubFindMany.mockResolvedValue([{ orgId: "org-small" }] as never);
    mockInvoiceCount.mockResolvedValue(10);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.total).toBe(1);

    // findMany for invoices should NOT have been called (count was below threshold)
    expect(mockInvoiceFindMany).not.toHaveBeenCalled();
  });

  it("returns 401 when cron secret invalid", async () => {
    mockValidate.mockReturnValue(false);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockSubFindMany).not.toHaveBeenCalled();
  });
});
