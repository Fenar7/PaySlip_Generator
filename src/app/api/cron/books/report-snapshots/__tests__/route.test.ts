import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    glAccount: {
      findMany: vi.fn(),
    },
    reportSnapshot: {
      createMany: vi.fn().mockResolvedValue({ count: 6 }),
    },
    jobLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/accounting", () => ({
  getTrialBalance: vi.fn(),
  getProfitAndLoss: vi.fn(),
  getBalanceSheet: vi.fn(),
  getCashFlowStatement: vi.fn(),
  getAccountsReceivableAging: vi.fn(),
  getAccountsPayableAging: vi.fn(),
}));

import { POST } from "../route";
import {
  getAccountsPayableAging,
  getAccountsReceivableAging,
  getBalanceSheet,
  getCashFlowStatement,
  getProfitAndLoss,
  getTrialBalance,
} from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

const mockedValidateCronSecret = vi.mocked(validateCronSecret);
const mockedGlAccountFindMany = vi.mocked(db.glAccount.findMany);
const mockedReportSnapshotCreateMany = vi.mocked(db.reportSnapshot.createMany);
const mockedJobLogCreate = vi.mocked(db.jobLog.create);

describe("POST /api/cron/books/report-snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateCronSecret.mockReturnValue(true);
    mockedGlAccountFindMany.mockResolvedValue([{ orgId: "org-1" }] as never);
    vi.mocked(getTrialBalance).mockResolvedValue({ rows: [{ id: "1" }] } as never);
    vi.mocked(getProfitAndLoss).mockResolvedValue({
      current: {
        income: [{ id: "income-1" }],
        expenses: [{ id: "expense-1" }],
      },
    } as never);
    vi.mocked(getBalanceSheet).mockResolvedValue({
      current: {
        assets: [{ id: "asset-1" }],
        liabilities: [{ id: "liability-1" }],
        equity: [{ id: "equity-1" }],
      },
    } as never);
    vi.mocked(getCashFlowStatement).mockResolvedValue({
      adjustments: [{ label: "AR delta" }],
    } as never);
    vi.mocked(getAccountsReceivableAging).mockResolvedValue({
      rows: [{ id: "ar-1" }],
    } as never);
    vi.mocked(getAccountsPayableAging).mockResolvedValue({
      rows: [{ id: "ap-1" }],
    } as never);
  });

  it("returns 401 when the cron secret is invalid", async () => {
    mockedValidateCronSecret.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/cron/books/report-snapshots", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("creates report snapshot rows for each books-enabled org", async () => {
    const response = await POST(
      new Request("http://localhost/api/cron/books/report-snapshots", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "Content-Type": "application/json",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orgsProcessed).toBe(1);
    expect(body.snapshotsCreated).toBe(6);
    expect(mockedReportSnapshotCreateMany).toHaveBeenCalledTimes(1);
    expect(mockedJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "books-report-snapshots",
        status: "completed",
      }),
    });
  });
});
