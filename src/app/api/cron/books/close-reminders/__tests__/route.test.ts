import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    fiscalPeriod: {
      findMany: vi.fn(),
    },
    jobLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/accounting", () => ({
  getCloseWorkspace: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyOrgAdmins: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "../route";
import { getCloseWorkspace } from "@/lib/accounting";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";
import { notifyOrgAdmins } from "@/lib/notifications";

const mockedValidateCronSecret = vi.mocked(validateCronSecret);
const mockedFiscalPeriodFindMany = vi.mocked(db.fiscalPeriod.findMany);
const mockedJobLogCreate = vi.mocked(db.jobLog.create);
const mockedGetCloseWorkspace = vi.mocked(getCloseWorkspace);
const mockedNotifyOrgAdmins = vi.mocked(notifyOrgAdmins);

describe("POST /api/cron/books/close-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateCronSecret.mockReturnValue(true);
    mockedFiscalPeriodFindMany.mockResolvedValue([
      { id: "period-1", orgId: "org-1", label: "Apr 2026" },
    ] as never);
    mockedGetCloseWorkspace.mockResolvedValue({
      closeRun: { blockerCount: 2 },
    } as never);
  });

  it("returns 401 when the cron secret is invalid", async () => {
    mockedValidateCronSecret.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/cron/books/close-reminders", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("sends reminders for blocked open periods", async () => {
    const response = await POST(
      new Request("http://localhost/api/cron/books/close-reminders", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.periodsReviewed).toBe(1);
    expect(body.blockedPeriods).toBe(1);
    expect(body.remindersSent).toBe(1);
    expect(mockedNotifyOrgAdmins).toHaveBeenCalledWith({
      orgId: "org-1",
      type: "books.close.reminder",
      title: "Close blockers remain for Apr 2026",
      body: "2 close checklist blocker(s) remain for Apr 2026.",
      link: "/app/books/close?fiscalPeriodId=period-1",
    });
    expect(mockedJobLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: "books-close-reminders",
        status: "completed",
      }),
    });
  });
});
