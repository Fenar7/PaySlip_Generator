import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    vendorBill: {
      findMany: vi.fn(),
    },
    reportSnapshot: {
      create: vi.fn().mockResolvedValue({}),
    },
    jobLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/accounting", () => ({
  refreshVendorBillOverdueStates: vi.fn(),
  getAccountsPayableAging: vi.fn(),
}));

import { POST } from "../route";
import { getAccountsPayableAging, refreshVendorBillOverdueStates } from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

const mockedValidateCronSecret = vi.mocked(validateCronSecret);
const mockedVendorBillFindMany = vi.mocked(db.vendorBill.findMany);
const mockedReportSnapshotCreate = vi.mocked(db.reportSnapshot.create);
const mockedJobLogCreate = vi.mocked(db.jobLog.create);

describe("POST /api/cron/books/vendor-aging-refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateCronSecret.mockReturnValue(true);
    mockedVendorBillFindMany.mockResolvedValue([{ orgId: "org-1" }] as never);
    vi.mocked(refreshVendorBillOverdueStates).mockResolvedValue(undefined as never);
    vi.mocked(getAccountsPayableAging).mockResolvedValue({
      rows: [{ id: "bill-1", daysOverdue: 0 }, { id: "bill-2", daysOverdue: 14 }],
    } as never);
  });

  it("returns 401 when the cron secret is invalid", async () => {
    mockedValidateCronSecret.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/cron/books/vendor-aging-refresh", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("refreshes overdue vendor bills and writes a snapshot", async () => {
    const response = await POST(
      new Request("http://localhost/api/cron/books/vendor-aging-refresh", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orgsProcessed).toBe(1);
    expect(body.snapshotsCreated).toBe(1);
    expect(body.overdueBills).toBe(1);
    expect(mockedReportSnapshotCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        reportType: "books.ap_aging_refresh",
        rowCount: 2,
      }),
    });
    expect(mockedJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "books-vendor-aging-refresh",
        status: "completed",
      }),
    });
  });
});
