import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    MARKETPLACE_PAYOUT_SETTLEMENT_HOLD_DAYS: "7",
  },
}));

import { evaluateMarketplaceRevenueStatus } from "../eligibility";

describe("evaluateMarketplaceRevenueStatus", () => {
  const baseCandidate = {
    id: "rev-1",
    publisherOrgId: "org-1",
    status: "pending",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    queuedAt: null,
    paidOutAt: null,
    onHoldReason: null,
    failureReason: null,
    purchase: {
      status: "COMPLETED",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      template: {
        status: "PUBLISHED",
      },
    },
  } as const;

  it("keeps revenue pending during the settlement hold window", () => {
    const result = evaluateMarketplaceRevenueStatus(
      baseCandidate,
      { id: "ben-1", status: "verified" },
      new Date("2026-03-05T00:00:00.000Z"),
    );

    expect(result.status).toBe("pending");
    expect(result.eligibleAt?.toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });

  it("marks revenue eligible once the hold window has passed and beneficiary is verified", () => {
    const result = evaluateMarketplaceRevenueStatus(
      baseCandidate,
      { id: "ben-1", status: "verified" },
      new Date("2026-03-12T00:00:00.000Z"),
    );

    expect(result.status).toBe("eligible");
    expect(result.onHoldReason).toBeNull();
  });

  it("holds revenue when the template is no longer payout safe", () => {
    const result = evaluateMarketplaceRevenueStatus(
      {
        ...baseCandidate,
        purchase: {
          ...baseCandidate.purchase,
          template: {
            status: "REJECTED",
          },
        },
      },
      { id: "ben-1", status: "verified" },
      new Date("2026-03-12T00:00:00.000Z"),
    );

    expect(result.status).toBe("on_hold");
    expect(result.onHoldReason).toBe("template_not_payout_safe");
  });

  it("preserves explicit manual holds until they are released", () => {
    const result = evaluateMarketplaceRevenueStatus(
      {
        ...baseCandidate,
        status: "on_hold",
        onHoldReason: "manual:compliance_review",
      },
      { id: "ben-1", status: "verified" },
      new Date("2026-03-12T00:00:00.000Z"),
    );

    expect(result.status).toBe("on_hold");
    expect(result.onHoldReason).toBe("manual:compliance_review");
  });
});
