import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cron", () => ({
  validateCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    jobLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@/lib/webhook/deliver", () => ({
  retryPendingWebhookDeliveries: vi.fn(),
}));

import { GET } from "../route";
import { validateCronSecret } from "@/lib/cron";
import { db } from "@/lib/db";
import { retryPendingWebhookDeliveries } from "@/lib/webhook/deliver";

const mockValidate = vi.mocked(validateCronSecret);
const mockJobLogCreate = vi.mocked(db.jobLog.create);
const mockRetryPendingWebhookDeliveries = vi.mocked(retryPendingWebhookDeliveries);

function buildRequest(): Request {
  return new Request("http://localhost/api/cron/webhook-retry-v2", {
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("GET /api/cron/webhook-retry-v2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockReturnValue(true);
  });

  it("returns success when retries are processed", async () => {
    mockRetryPendingWebhookDeliveries.mockResolvedValue({
      due: 3,
      retried: 2,
      deadLettered: 1,
      skipped: 0,
    });

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      due: 3,
      retried: 2,
      deadLettered: 1,
      skipped: 0,
    });
    expect(mockJobLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobName: "webhook-retry-v2",
          status: "completed",
        }),
      }),
    );
  });

  it("returns 500 when retry processing throws", async () => {
    mockRetryPendingWebhookDeliveries.mockRejectedValue(new Error("Retry queue failed"));

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Retry queue failed");
    expect(mockJobLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobName: "webhook-retry-v2",
          status: "failed",
          error: "Retry queue failed",
        }),
      }),
    );
  });

  it("returns 401 when the cron secret is invalid", async () => {
    mockValidate.mockReturnValue(false);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockRetryPendingWebhookDeliveries).not.toHaveBeenCalled();
  });
});
