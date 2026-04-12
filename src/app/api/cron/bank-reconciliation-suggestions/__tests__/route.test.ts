import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    bankTransaction: {
      findMany: vi.fn(),
    },
    jobLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/accounting", () => ({
  refreshReconciliationSuggestions: vi.fn(),
}));

import { GET } from "../route";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";
import { refreshReconciliationSuggestions } from "@/lib/accounting";

const mockedValidateCronSecret = vi.mocked(validateCronSecret);
const mockedFindMany = vi.mocked(db.bankTransaction.findMany);
const mockedJobLogCreate = vi.mocked(db.jobLog.create);
const mockedRefreshReconciliationSuggestions = vi.mocked(refreshReconciliationSuggestions);

function buildRequest(url = "http://localhost/api/cron/bank-reconciliation-suggestions"): Request {
  return new Request(url, {
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("GET /api/cron/bank-reconciliation-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateCronSecret.mockReturnValue(true);
    mockedFindMany.mockResolvedValue([{ orgId: "org-1" }, { orgId: "org-2" }] as never);
  });

  it("returns 401 when the cron secret is invalid", async () => {
    mockedValidateCronSecret.mockReturnValue(false);

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockedJobLogCreate).not.toHaveBeenCalled();
  });

  it("refreshes suggestions across open org queues and logs completion", async () => {
    mockedRefreshReconciliationSuggestions
      .mockResolvedValueOnce({ refreshed: 2 } as never)
      .mockResolvedValueOnce({ refreshed: 3 } as never);

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orgsProcessed).toBe(2);
    expect(body.refreshedTransactions).toBe(5);
    expect(mockedRefreshReconciliationSuggestions).toHaveBeenCalledWith("org-1", {
      bankAccountId: undefined,
      importId: undefined,
    });
    expect(mockedRefreshReconciliationSuggestions).toHaveBeenCalledWith("org-2", {
      bankAccountId: undefined,
      importId: undefined,
    });
    expect(mockedJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "bank-reconciliation-suggestions-refresh",
        status: "completed",
      }),
    });
  });

  it("returns 500 and logs failure when refresh throws", async () => {
    mockedRefreshReconciliationSuggestions.mockRejectedValue(new Error("Refresh failed"));

    const response = await GET(buildRequest("http://localhost/api/cron/bank-reconciliation-suggestions?orgId=org-1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Refresh failed");
    expect(mockedJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "bank-reconciliation-suggestions-refresh",
        status: "failed",
        error: "Refresh failed",
      }),
    });
  });
});
