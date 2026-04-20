import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/billing/stripe", () => ({
  verifyStripeWebhookSignature: vi.fn(() => true),
}));

vi.mock("@/lib/billing/invoicing", () => ({
  generateSubscriptionInvoice: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    billingEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "evt_db" }),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue({
        id: "sub_1",
        orgId: "org_1",
        planId: "starter",
        billingInterval: "monthly",
        status: "active",
      }),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
    },
    billingAccount: {
      findUnique: vi.fn().mockResolvedValue({
        id: "ba_1",
        currency: "USD",
      }),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { POST } from "../route";
import { generateSubscriptionInvoice } from "@/lib/billing/invoicing";

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves Stripe minor-unit amounts when generating invoices", async () => {
    const event = {
      id: "evt_1",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_1",
          subscription: "sub_stripe_1",
          amount_paid: 1234,
          currency: "usd",
          lines: {
            data: [
              {
                period: {
                  start: 1711929600,
                  end: 1714521600,
                },
              },
            ],
          },
        },
      },
    };

    const request = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "sig",
      },
      body: JSON.stringify(event),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(generateSubscriptionInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        amountPaise: BigInt(1234),
        currency: "USD",
      }),
    );
  });
});
