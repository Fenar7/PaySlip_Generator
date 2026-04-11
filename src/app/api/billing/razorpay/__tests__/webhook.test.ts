import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/razorpay", () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/billing", () => ({
  getInternalPlanIdForRazorpayPlanId: vi.fn(),
  recordRazorpayEvent: vi.fn(),
  updateSubscriptionFromWebhook: vi.fn(),
}));

vi.mock("@/lib/payment-links", () => ({
  handlePaymentLinkPaid: vi.fn(),
}));

vi.mock("@/lib/smart-collect", () => ({
  handleVirtualAccountCredited: vi.fn(),
}));

import { POST } from "../webhook/route";
import { verifyWebhookSignature } from "@/lib/razorpay";
import {
  getInternalPlanIdForRazorpayPlanId,
  recordRazorpayEvent,
  updateSubscriptionFromWebhook,
} from "@/lib/billing";

function post(body: unknown, signature = "sig") {
  return new Request("http://localhost/api/billing/razorpay/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/razorpay/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(recordRazorpayEvent).mockResolvedValue(true);
    vi.mocked(getInternalPlanIdForRazorpayPlanId).mockReturnValue(null);
  });

  it("rejects invalid signatures", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);

    const response = await POST(post({ event: "subscription.pending" }));

    expect(response.status).toBe(400);
    expect(updateSubscriptionFromWebhook).not.toHaveBeenCalled();
  });

  it("returns already_processed for duplicate events", async () => {
    vi.mocked(recordRazorpayEvent).mockResolvedValue(false);

    const response = await POST(
      post({
        event: "subscription.pending",
        payload: { subscription: { entity: { id: "sub_1" } } },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("already_processed");
    expect(updateSubscriptionFromWebhook).not.toHaveBeenCalled();
  });

  it("stores pending status for unconfirmed subscriptions", async () => {
    const response = await POST(
      post({
        event: "subscription.pending",
        event_id: "evt_pending",
        payload: { subscription: { entity: { id: "sub_1" } } },
      }),
    );

    expect(response.status).toBe(200);
    expect(updateSubscriptionFromWebhook).toHaveBeenCalledWith({
      razorpaySubId: "sub_1",
      status: "pending",
    });
  });

  it("promotes the internal plan when activation is confirmed", async () => {
    vi.mocked(getInternalPlanIdForRazorpayPlanId).mockReturnValue("starter");

    const response = await POST(
      post({
        event: "subscription.activated",
        event_id: "evt_active",
        payload: {
          subscription: {
            entity: {
              id: "sub_1",
              plan_id: "plan_starter_monthly",
              current_start: 1712800000,
              current_end: 1715400000,
            },
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(updateSubscriptionFromWebhook).toHaveBeenCalledWith({
      razorpaySubId: "sub_1",
      status: "active",
      planId: "starter",
      currentPeriodStart: new Date(1712800000 * 1000),
      currentPeriodEnd: new Date(1715400000 * 1000),
    });
  });
});
