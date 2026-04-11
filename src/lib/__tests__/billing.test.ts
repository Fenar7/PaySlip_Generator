import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    member: {
      findUnique: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    razorpayEvent: {
      create: vi.fn(),
    },
    billingInvoice: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/multi-org", () => ({
  getActiveOrg: vi.fn(),
}));

vi.mock("@/lib/razorpay", () => ({
  pauseRazorpaySubscription: vi.fn(),
  resumeRazorpaySubscription: vi.fn(),
  changeSubscriptionPlan: vi.fn(),
  cancelRazorpaySubscription: vi.fn(),
}));

import { db } from "@/lib/db";
import { getActiveOrg } from "@/lib/multi-org";
import {
  cancelSubscription,
  changePlan,
  getRazorpayPlanId,
  pauseSubscription,
  resolveBillingCustomer,
  resolveBillingOrgId,
  resumeSubscription,
} from "@/lib/billing";
import {
  cancelRazorpaySubscription,
  changeSubscriptionPlan,
  pauseRazorpaySubscription,
  resumeRazorpaySubscription,
} from "@/lib/razorpay";

const ORIGINAL_ENV = { ...process.env };

describe("billing helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses the active org when no orgId is supplied", async () => {
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });

    const result = await resolveBillingOrgId("user-1");

    expect(result).toEqual({ success: true, orgId: "org-active" });
  });

  it("rejects forged orgIds outside the user's membership", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue(null as never);

    const result = await resolveBillingOrgId("user-1", "org-other");

    expect(result).toEqual({
      success: false,
      error: "Unauthorized for this org",
      status: 403,
    });
  });

  it("derives billing contact details from the stored profile", async () => {
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      name: "Jane Doe",
      email: "jane@example.com",
    } as never);

    const result = await resolveBillingCustomer({
      id: "user-1",
      email: "fallback@example.com",
      user_metadata: { name: "Fallback Name" },
    });

    expect(result).toEqual({
      success: true,
      data: { name: "Jane Doe", email: "jane@example.com" },
    });
  });

  it("falls back to auth metadata when no profile exists", async () => {
    vi.mocked(db.profile.findUnique).mockResolvedValue(null as never);

    const result = await resolveBillingCustomer({
      id: "user-1",
      email: "owner@example.com",
      user_metadata: { full_name: "Owner Name" },
    });

    expect(result).toEqual({
      success: true,
      data: { name: "Owner Name", email: "owner@example.com" },
    });
  });

  it("maps a plan and billing interval to the configured Razorpay plan ID", () => {
    process.env.RAZORPAY_PLAN_PRO_YEARLY = "plan_pro_yearly";

    expect(getRazorpayPlanId("pro", "yearly")).toBe("plan_pro_yearly");
    expect(getRazorpayPlanId("free", "monthly")).toBeNull();
  });

  it("uses Razorpay plan IDs when changing plans", async () => {
    process.env.RAZORPAY_PLAN_PRO_YEARLY = "plan_pro_yearly";

    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-1",
      planId: "starter",
      razorpaySubId: "sub_123",
    } as never);
    vi.mocked(changeSubscriptionPlan).mockResolvedValue({ id: "sub_123" } as never);
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);

    const result = await changePlan("org-1", "pro", "yearly");

    expect(result).toEqual({ success: true, data: { planId: "pro" } });
    expect(changeSubscriptionPlan).toHaveBeenCalledWith(
      "sub_123",
      "plan_pro_yearly",
      false,
    );
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: {
        planId: "pro",
        razorpayPlanId: "plan_pro_yearly",
        billingInterval: "yearly",
      },
    });
  });

  it("fails clearly when plan mapping is missing during a plan change", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-1",
      planId: "starter",
      razorpaySubId: "sub_123",
    } as never);

    const result = await changePlan("org-1", "pro", "monthly");

    expect(result).toEqual({
      success: false,
      error: "Missing Razorpay plan ID for pro (monthly)",
    });
    expect(changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("does not update pause state when Razorpay is unavailable", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-1",
      razorpaySubId: "sub_123",
      status: "active",
    } as never);
    vi.mocked(pauseRazorpaySubscription).mockResolvedValue(null as never);

    const result = await pauseSubscription("org-1");

    expect(result).toEqual({
      success: false,
      error: "Billing is not configured",
    });
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("does not update resume state when Razorpay is unavailable", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-1",
      razorpaySubId: "sub_123",
      status: "paused",
    } as never);
    vi.mocked(resumeRazorpaySubscription).mockResolvedValue(null as never);

    const result = await resumeSubscription("org-1");

    expect(result).toEqual({
      success: false,
      error: "Billing is not configured",
    });
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("does not mark a subscription as cancelled when Razorpay is unavailable", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-1",
      razorpaySubId: "sub_123",
      status: "active",
    } as never);
    vi.mocked(cancelRazorpaySubscription).mockResolvedValue(null as never);

    const result = await cancelSubscription("org-1", true);

    expect(result).toEqual({
      success: false,
      error: "Billing is not configured",
    });
    expect(db.subscription.update).not.toHaveBeenCalled();
  });
});
