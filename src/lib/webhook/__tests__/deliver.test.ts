import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    apiWebhookEndpoint: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    apiWebhookDelivery: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  deliverWebhook,
  dispatchEvent,
  retryPendingWebhookDeliveries,
} from "../deliver";

const fetchMock = vi.fn();

function buildEndpoint(overrides: Partial<{
  id: string;
  orgId: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecret: string | null;
  maxRetries: number | null;
  autoDisableAt: number | null;
  consecutiveFails: number | null;
}> = {}) {
  return {
    id: "ep-1",
    orgId: "org-1",
    url: "https://example.com/hooks",
    events: ["invoice.created"],
    isActive: true,
    signingSecret: "whsec_test_secret",
    maxRetries: 5,
    autoDisableAt: 10,
    consecutiveFails: 0,
    ...overrides,
  };
}

describe("webhook delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.mocked(db.apiWebhookDelivery.create).mockResolvedValue({} as never);
    vi.mocked(db.apiWebhookDelivery.update).mockResolvedValue({} as never);
    vi.mocked(db.apiWebhookEndpoint.update).mockResolvedValue({
      consecutiveFails: 0,
      autoDisableAt: 10,
    } as never);
  });

  it("dispatches only to matching or wildcard endpoints", async () => {
    vi.mocked(db.apiWebhookEndpoint.findMany).mockResolvedValue([
      buildEndpoint({ id: "ep-match", url: "https://example.com/match" }),
      buildEndpoint({
        id: "ep-all",
        url: "https://example.com/all",
        events: ["*"],
      }),
      buildEndpoint({
        id: "ep-other",
        url: "https://example.com/other",
        events: ["voucher.created"],
      }),
    ] as never);
    fetchMock.mockImplementation(() => Promise.resolve(new Response("ok", { status: 200 })));

    await dispatchEvent("org-1", "invoice.created", { id: "inv-1" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/match",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/all",
      expect.any(Object),
    );
  });

  it("signs failures with the real secret and schedules the next retry", async () => {
    vi.mocked(db.apiWebhookEndpoint.findUnique).mockResolvedValue(buildEndpoint() as never);
    vi.mocked(db.apiWebhookEndpoint.update).mockResolvedValue({
      consecutiveFails: 1,
      autoDisableAt: 10,
    } as never);
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));

    await deliverWebhook("ep-1", "invoice.created", { id: "inv-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/hooks",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Slipwise-Signature": expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
          "X-Slipwise-Timestamp": expect.any(String),
        }),
      }),
    );
    expect(db.apiWebhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endpointId: "ep-1",
          attempt: 1,
          payload: { id: "inv-1" },
        }),
      }),
    );
    expect(db.apiWebhookDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          nextRetryAt: expect.any(Date),
          deliveredAt: expect.any(Date),
        }),
      }),
    );
  });

  it("dead-letters endpoints that do not have a signing secret", async () => {
    vi.mocked(db.apiWebhookEndpoint.findUnique).mockResolvedValue(
      buildEndpoint({ signingSecret: null }) as never,
    );
    vi.mocked(db.apiWebhookEndpoint.update).mockResolvedValue({
      consecutiveFails: 1,
      autoDisableAt: 10,
    } as never);

    await deliverWebhook("ep-1", "invoice.created", { id: "inv-1" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.apiWebhookDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextRetryAt: null,
          responseBody: expect.stringContaining("Rotate the secret"),
        }),
      }),
    );
  });

  it("retries queued deliveries with the next attempt number", async () => {
    vi.mocked(db.apiWebhookDelivery.findMany).mockResolvedValue([
      {
        id: "del-1",
        endpointId: "ep-1",
        eventType: "invoice.created",
        payload: { id: "inv-1" },
        requestBody: { id: "inv-1" },
        attempt: 1,
        endpoint: buildEndpoint(),
      },
    ] as never);
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));

    const result = await retryPendingWebhookDeliveries(new Date("2026-04-11T12:00:00Z"));

    expect(result).toEqual({ due: 1, retried: 1, deadLettered: 0, skipped: 0 });
    expect(db.apiWebhookDelivery.update).toHaveBeenNthCalledWith(1, {
      where: { id: "del-1" },
      data: { nextRetryAt: null },
    });
    expect(db.apiWebhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endpointId: "ep-1",
          attempt: 2,
        }),
      }),
    );
  });

  it("auto-disables endpoints after reaching the failure threshold", async () => {
    vi.mocked(db.apiWebhookEndpoint.findUnique).mockResolvedValue(
      buildEndpoint({ autoDisableAt: 1 }) as never,
    );
    vi.mocked(db.apiWebhookEndpoint.update)
      .mockResolvedValueOnce({
        consecutiveFails: 1,
        autoDisableAt: 1,
      } as never)
      .mockResolvedValueOnce({} as never);
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));

    await deliverWebhook("ep-1", "invoice.created", { id: "inv-1" });

    expect(db.apiWebhookEndpoint.update).toHaveBeenNthCalledWith(2, {
      where: { id: "ep-1" },
      data: { isActive: false },
    });
  });
});
