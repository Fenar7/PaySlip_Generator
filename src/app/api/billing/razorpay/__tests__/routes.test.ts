import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

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
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/multi-org", () => ({
  getActiveOrg: vi.fn(),
}));

vi.mock("@/lib/razorpay", () => ({
  getRazorpay: vi.fn(),
  createRazorpaySubscription: vi.fn(),
  changeSubscriptionPlan: vi.fn(),
  pauseRazorpaySubscription: vi.fn(),
  resumeRazorpaySubscription: vi.fn(),
  cancelRazorpaySubscription: vi.fn(),
  fetchRazorpaySubscription: vi.fn(),
}));

import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getActiveOrg } from "@/lib/multi-org";
import {
  changeSubscriptionPlan,
  fetchRazorpaySubscription,
  createRazorpaySubscription,
  getRazorpay,
  cancelRazorpaySubscription,
} from "@/lib/razorpay";
import { POST as createSubscription } from "../create-subscription/route";
import { POST as changePlan } from "../change-plan/route";
import { POST as cancelSubscription } from "../cancel/route";
import { POST as cancelPendingSubscription } from "../cancel-pending/route";
import { POST as pauseSubscription } from "../pause/route";
import { POST as resumeSubscription } from "../resume/route";
import { POST as syncSubscription } from "../sync/route";

const ORIGINAL_ENV = { ...process.env };

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("billing Razorpay routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };

    vi.mocked(createSupabaseServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "owner@example.com",
              user_metadata: {
                full_name: "Owner Example",
              },
            },
          },
          error: null,
        }),
      },
    } as never);
  });

  it("creates a hosted subscription using the active org and derived billing contact", async () => {
    process.env.RAZORPAY_PLAN_STARTER_MONTHLY = "plan_starter_monthly";

    vi.mocked(getRazorpay).mockReturnValue({} as never);
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      name: "Owner Example",
      email: "owner@example.com",
    } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null as never);
    vi.mocked(createRazorpaySubscription).mockResolvedValue({
      id: "sub_1",
      short_url: "https://rzp.io/i/subscription",
    } as never);
    vi.mocked(db.subscription.create).mockResolvedValue({} as never);

    const response = await createSubscription(
      post("http://localhost/api/billing/razorpay/create-subscription", {
        planId: "starter",
        billingInterval: "monthly",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createRazorpaySubscription).toHaveBeenCalledWith({
      planId: "plan_starter_monthly",
      notifyInfo: {
        email: "owner@example.com",
        phone: undefined,
      },
    });
    expect(db.subscription.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-active",
        razorpaySubId: "sub_1",
        razorpayPlanId: "plan_starter_monthly",
        planId: "free",
        billingInterval: "monthly",
        status: "pending",
      },
    });
    expect(body.shortUrl).toBe("https://rzp.io/i/subscription");
  });

  it("normalizes the billing phone before creating the Razorpay customer", async () => {
    process.env.RAZORPAY_PLAN_STARTER_MONTHLY = "plan_starter_monthly";

    vi.mocked(getRazorpay).mockReturnValue({} as never);
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      name: "Owner Example",
      email: "owner@example.com",
    } as never);
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null as never);
    vi.mocked(createRazorpaySubscription).mockResolvedValue({
      id: "sub_1",
      short_url: "https://rzp.io/i/subscription",
    } as never);
    vi.mocked(db.subscription.create).mockResolvedValue({} as never);

    const response = await createSubscription(
      post("http://localhost/api/billing/razorpay/create-subscription", {
        planId: "starter",
        billingInterval: "monthly",
        phone: "+91 98765 43210",
      }),
    );

    expect(response.status).toBe(200);
    expect(createRazorpaySubscription).toHaveBeenCalledWith({
      planId: "plan_starter_monthly",
      notifyInfo: {
        email: "owner@example.com",
        phone: "+919876543210",
      },
    });
  });

  it("rejects forged orgIds during subscription creation", async () => {
    vi.mocked(getRazorpay).mockReturnValue({} as never);
    vi.mocked(db.member.findUnique).mockResolvedValue(null as never);

    const response = await createSubscription(
      post("http://localhost/api/billing/razorpay/create-subscription", {
        orgId: "org-other",
        planId: "starter",
        billingInterval: "monthly",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("fails clearly when the requested billing interval has no configured Razorpay plan ID", async () => {
    vi.mocked(getRazorpay).mockReturnValue({} as never);
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });

    const response = await createSubscription(
      post("http://localhost/api/billing/razorpay/create-subscription", {
        planId: "starter",
        billingInterval: "monthly",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Configure the matching Razorpay plan ID");
  });

  it("changes plans using the configured provider plan ID", async () => {
    process.env.RAZORPAY_PLAN_PRO_YEARLY = "plan_pro_yearly";

    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-active",
      planId: "starter",
      razorpaySubId: "sub_1",
    } as never);
    vi.mocked(changeSubscriptionPlan).mockResolvedValue({ id: "sub_1" } as never);
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);

    const response = await changePlan(
      post("http://localhost/api/billing/razorpay/change-plan", {
        newPlanId: "pro",
        billingInterval: "yearly",
      }),
    );

    expect(response.status).toBe(200);
    expect(changeSubscriptionPlan).toHaveBeenCalledWith(
      "sub_1",
      "plan_pro_yearly",
      false,
    );
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it.each([
    ["cancel", cancelSubscription],
    ["pause", pauseSubscription],
    ["resume", resumeSubscription],
  ] as const)(
    "rejects forged orgIds for %s actions",
    async (_label, handler) => {
      vi.mocked(db.member.findUnique).mockResolvedValue(null as never);

      const response = await handler(
        post("http://localhost/api/billing/razorpay/action", {
          orgId: "org-other",
        }),
      );

      expect(response.status).toBe(403);
    },
  );

  it("cancels an abandoned pending checkout for the free plan", async () => {
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-active",
      planId: "free",
      status: "pending",
      razorpaySubId: "sub_1",
    } as never);
    vi.mocked(fetchRazorpaySubscription).mockResolvedValue({
      status: "created",
    } as never);
    vi.mocked(cancelRazorpaySubscription).mockResolvedValue({} as never);
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);

    const response = await cancelPendingSubscription(
      post("http://localhost/api/billing/razorpay/cancel-pending", {}),
    );

    expect(response.status).toBe(200);
    expect(cancelRazorpaySubscription).toHaveBeenCalledWith("sub_1", false);
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { orgId: "org-active" },
      data: {
        status: "active",
        planId: "free",
        razorpaySubId: null,
        razorpayPlanId: null,
        billingInterval: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        pausedAt: null,
        pausedUntil: null,
        pauseReason: null,
      },
    });
  });

  it("refuses to reset a paid subscription that is only locally marked pending", async () => {
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-active",
      planId: "starter",
      status: "pending",
      razorpaySubId: "sub_1",
    } as never);

    const response = await cancelPendingSubscription(
      post("http://localhost/api/billing/razorpay/cancel-pending", {}),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("existing paid subscription");
    expect(cancelRazorpaySubscription).not.toHaveBeenCalled();
  });

  it("auto-clears a free-plan abandoned checkout when Razorpay already shows it cancelled", async () => {
    vi.mocked(getActiveOrg).mockResolvedValue({
      id: "org-active",
      name: "Acme",
      slug: "acme",
    });
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      orgId: "org-active",
      planId: "free",
      status: "pending",
      razorpaySubId: "sub_1",
      razorpayPlanId: "plan_starter_monthly",
      cancelledAt: null,
    } as never);
    vi.mocked(fetchRazorpaySubscription).mockResolvedValue({
      status: "cancelled",
      plan_id: "plan_starter_monthly",
    } as never);
    vi.mocked(db.subscription.update).mockResolvedValue({} as never);

    const response = await syncSubscription(
      post("http://localhost/api/billing/razorpay/sync", {}),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.localStatus).toBe("active");
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { orgId: "org-active" },
      data: {
        status: "active",
        planId: "free",
        razorpaySubId: null,
        razorpayPlanId: null,
        billingInterval: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        pausedAt: null,
        pausedUntil: null,
        pauseReason: null,
      },
    });
  });
});
