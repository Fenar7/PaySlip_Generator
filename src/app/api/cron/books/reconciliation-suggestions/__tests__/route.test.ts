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

import { POST } from "../route";
import { refreshReconciliationSuggestions } from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";

const mockedValidateCronSecret = vi.mocked(validateCronSecret);
const mockedFindMany = vi.mocked(db.bankTransaction.findMany);
const mockedJobLogCreate = vi.mocked(db.jobLog.create);
const mockedRefreshReconciliationSuggestions = vi.mocked(refreshReconciliationSuggestions);

function buildRequest(body?: Record<string, string>) {
  return new Request("http://localhost/api/cron/books/reconciliation-suggestions", {
    method: "POST",
    headers: {
      authorization: "Bearer test-secret",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/cron/books/reconciliation-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateCronSecret.mockReturnValue(true);
    mockedFindMany.mockResolvedValue([{ orgId: "org-1" }] as never);
  });

  it("returns 401 when the cron secret is invalid", async () => {
    mockedValidateCronSecret.mockReturnValue(false);

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockedJobLogCreate).not.toHaveBeenCalled();
  });

  it("refreshes suggestions with body filters and logs completion", async () => {
    mockedRefreshReconciliationSuggestions.mockResolvedValue({ refreshed: 4 } as never);

    const response = await POST(
      buildRequest({
        orgId: "org-1",
        bankAccountId: "bank-1",
        importId: "import-1",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orgsProcessed).toBe(1);
    expect(body.refreshedTransactions).toBe(4);
    expect(mockedRefreshReconciliationSuggestions).toHaveBeenCalledWith("org-1", {
      bankAccountId: "bank-1",
      importId: "import-1",
    });
    expect(mockedJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "books-reconciliation-suggestions-refresh",
        status: "completed",
      }),
    });
  });
});
