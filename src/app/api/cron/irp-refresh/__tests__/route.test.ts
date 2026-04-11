import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    jobLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@/lib/irp-client", () => ({
  refreshIrpSession: vi.fn(),
}));

import { GET } from "../route";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";
import { refreshIrpSession } from "@/lib/irp-client";

const mockValidate = vi.mocked(validateCronSecret);
const mockRefresh = vi.mocked(refreshIrpSession);
const mockJobLogCreate = vi.mocked(db.jobLog.create);

function buildRequest(): Request {
  return new Request("http://localhost/api/cron/irp-refresh", {
    headers: { authorization: "Bearer test-secret" },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/irp-refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockReturnValue(true);
  });

  it("returns success when token refreshed", async () => {
    const expiresAt = new Date("2025-07-01T12:00:00Z");
    mockRefresh.mockResolvedValue({ success: true, expiresAt });

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("IRP session refreshed");
    expect(body.expiresAt).toBe(expiresAt.toISOString());
    expect(mockJobLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobName: "irp-session-refresh",
          status: "completed",
        }),
      })
    );
  });

  it("returns 500 when IRP client throws", async () => {
    mockRefresh.mockRejectedValue(new Error("IRP auth failed"));

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("IRP auth failed");
    expect(mockJobLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobName: "irp-session-refresh",
          status: "failed",
          error: "IRP auth failed",
        }),
      })
    );
  });

  it("returns 401 when cron secret invalid", async () => {
    mockValidate.mockReturnValue(false);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
