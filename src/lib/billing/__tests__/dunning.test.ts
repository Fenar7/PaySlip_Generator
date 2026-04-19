import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock(import("@/lib/db"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    db: {
      subscription: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      billingDunningAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
    },
  };
});

vi.mock(import("../stripe"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    retryStripePayment: vi.fn().mockResolvedValue({ success: true }),
  };
});

vi.mock(import("../razorpay"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    retryRazorpayPayment: vi.fn().mockResolvedValue({ success: true }),
  };
});

import { processDunningBatch, getNextDunningAttempt } from "../dunning";
import { db } from "@/lib/db";
import { retryStripePayment } from "../stripe";

describe("Dunning Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processDunningBatch", () => {
    it("should return zeros when no past_due subscriptions exist", async () => {
      vi.mocked(db.subscription.findMany).mockResolvedValueOnce([]);

      const result = await processDunningBatch();
      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.canceled).toBe(0);
    });

    it("should process a past_due subscription and retry payment", async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 2); // 2 days ago

      vi.mocked(db.subscription.findMany).mockResolvedValueOnce([
        {
          id: "sub_1",
          orgId: "org_1",
          planId: "pro",
          status: "past_due",
          billingInterval: "monthly",
          razorpayCustomerId: null,
          razorpaySubId: null,
          razorpayPlanId: null,
          stripeCustomerId: "cus_123",
          stripeSubId: "sub_stripe_1",
          trialEndsAt: null,
          currentPeriodStart: pastDueDate,
          currentPeriodEnd: pastDueDate,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          pausedAt: null,
          pausedUntil: null,
          pauseReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: {
            billingAccount: {
              id: "ba_1",
              orgId: "org_1",
              gateway: "STRIPE",
              billingEmail: "test@example.com",
              billingCountry: "US",
              currency: "USD",
              stripeCustomerId: "cus_123",
              razorpayCustomerId: null,
              status: "ACTIVE",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        } as unknown as Awaited<ReturnType<typeof db.subscription.findMany>>[0],
      ]);

      vi.mocked(retryStripePayment).mockResolvedValueOnce({ success: true });

      const result = await processDunningBatch();
      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(retryStripePayment).toHaveBeenCalledWith("sub_stripe_1");
    });

    it("should cancel subscription when all retries are exhausted", async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 35); // 35 days ago

      vi.mocked(db.subscription.findMany).mockResolvedValueOnce([
        {
          id: "sub_2",
          orgId: "org_2",
          planId: "pro",
          status: "past_due",
          stripeSubId: "sub_stripe_2",
          stripeCustomerId: "cus_456",
          currentPeriodEnd: pastDueDate,
          cancelAtPeriodEnd: false,
          organization: {
            billingAccount: {
              id: "ba_2",
              orgId: "org_2",
              gateway: "STRIPE",
            },
          },
        } as unknown as Awaited<ReturnType<typeof db.subscription.findMany>>[0],
      ]);

      // 6 attempts already made = exhausted
      vi.mocked(db.billingDunningAttempt.findFirst).mockResolvedValueOnce({
        id: "da_6",
        orgId: "org_2",
        subscriptionId: "sub_2",
        attemptNumber: 6,
        scheduledAt: new Date(),
        executedAt: new Date(),
        status: "FAILED",
        metadata: null,
        createdAt: new Date(),
      });

      const result = await processDunningBatch();
      expect(result.canceled).toBe(1);
      expect(db.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub_2" },
          data: expect.objectContaining({ status: "canceled" }),
        }),
      );
    });
  });

  describe("getNextDunningAttempt", () => {
    it("should return first attempt when no history", async () => {
      vi.mocked(db.billingDunningAttempt.findFirst).mockResolvedValueOnce(null);

      const result = await getNextDunningAttempt("sub_1");
      expect(result).not.toBeNull();
      expect(result!.attemptNumber).toBe(1);
      expect(result!.scheduledDay).toBe(1);
      expect(result!.willCancel).toBe(false);
    });

    it("should return willCancel=true when all attempts exhausted", async () => {
      vi.mocked(db.billingDunningAttempt.findFirst).mockResolvedValueOnce({
        id: "da_6",
        orgId: "org_1",
        subscriptionId: "sub_1",
        attemptNumber: 6,
        scheduledAt: new Date(),
        executedAt: new Date(),
        status: "FAILED",
        metadata: null,
        createdAt: new Date(),
      });

      const result = await getNextDunningAttempt("sub_1");
      expect(result).not.toBeNull();
      expect(result!.willCancel).toBe(true);
    });
  });
});
