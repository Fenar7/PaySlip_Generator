import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  createRazorpayCustomer,
  createRazorpaySubscription,
  getRazorpay,
  updateRazorpayCustomer,
} from "@/lib/razorpay";
import {
  getRazorpayPlanId,
  resolveBillingCustomer,
  resolveBillingOrgId,
} from "@/lib/billing";
import { PLANS, type PlanId, type BillingInterval } from "@/lib/plans/config";
import { normalizeIndianPhone } from "@/lib/sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getRazorpay()) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    orgId: requestedOrgId,
    planId,
    billingInterval,
    phone,
  } = body as {
    orgId?: string;
    planId: PlanId;
    billingInterval: BillingInterval;
    phone?: string;
  };

  if (!planId || !billingInterval) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!PLANS.some((plan) => plan.id === planId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const orgResult = await resolveBillingOrgId(user.id, requestedOrgId);
  if (!orgResult.success) {
    return NextResponse.json(
      { error: orgResult.error },
      { status: orgResult.status },
    );
  }

  const orgId = orgResult.orgId;
  const normalizedPhone =
    typeof phone === "string" && phone.trim()
      ? (normalizeIndianPhone(phone) ?? undefined)
      : undefined;

  if (phone && !normalizedPhone) {
    return NextResponse.json(
      { error: "Enter a valid billing phone number" },
      { status: 400 },
    );
  }

  if (planId === "free") {
    return NextResponse.json(
      { error: "Free plan does not require a subscription" },
      { status: 400 },
    );
  }

  const razorpayPlanId = getRazorpayPlanId(planId, billingInterval);

  if (!razorpayPlanId) {
    return NextResponse.json(
      {
        error:
          "Plan not available for this billing interval. Configure the matching Razorpay plan ID first.",
      },
      { status: 400 },
    );
  }

  try {
    const sub = await db.subscription.findUnique({ where: { orgId } });
    if (
      sub?.razorpaySubId &&
      sub.status !== "cancelled" &&
      sub.status !== "expired"
    ) {
      return NextResponse.json(
        { error: "An active subscription already exists. Use change plan instead." },
        { status: 400 },
      );
    }

    const billingCustomer = await resolveBillingCustomer({
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null,
        name:
          typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null,
      },
    });
    if (!billingCustomer.success) {
      return NextResponse.json(
        { error: billingCustomer.error },
        { status: 400 },
      );
    }

    let customerId = sub?.razorpayCustomerId;

    if (!customerId) {
      const customer = await createRazorpayCustomer({
        name: billingCustomer.data.name,
        email: billingCustomer.data.email,
        contact: normalizedPhone,
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Failed to create customer" },
          { status: 500 },
        );
      }
      customerId = customer.id;
    } else if (normalizedPhone) {
      const customer = await updateRazorpayCustomer({
        customerId,
        name: billingCustomer.data.name,
        email: billingCustomer.data.email,
        contact: normalizedPhone,
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Failed to update billing contact" },
          { status: 500 },
        );
      }
    }

    const rpSub = await createRazorpaySubscription({
      planId: razorpayPlanId,
      customerId,
    });
    if (!rpSub) {
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 },
      );
    }

    const razorpaySubId = rpSub.id;
    const shortUrl = rpSub.short_url;

    if (sub) {
      await db.subscription.update({
        where: { orgId },
        data: {
          razorpayCustomerId: customerId,
          razorpaySubId,
          razorpayPlanId,
          billingInterval,
          status: "pending",
        },
      });
    } else {
      await db.subscription.create({
        data: {
          orgId,
          razorpayCustomerId: customerId,
          razorpaySubId,
          razorpayPlanId,
          planId: "free",
          billingInterval,
          status: "pending",
        },
      });
    }

    return NextResponse.json({ subscriptionId: razorpaySubId, shortUrl });
  } catch (error) {
    console.error("[Billing] create-subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
