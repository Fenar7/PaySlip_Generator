import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  createRazorpayCustomer,
  createRazorpaySubscription,
  getRazorpay,
} from "@/lib/razorpay";
import { PLANS, type PlanId, type BillingInterval } from "@/lib/plans/config";

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

  const body = await request.json();
  const {
    orgId,
    planId,
    billingInterval,
    email,
    name,
    phone,
  }: {
    orgId: string;
    planId: PlanId;
    billingInterval: BillingInterval;
    email: string;
    name: string;
    phone?: string;
  } = body;

  if (!orgId || !planId || !billingInterval || !email || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const razorpayPlanId =
    billingInterval === "yearly"
      ? plan.razorpayYearlyPlanId
      : plan.razorpayMonthlyPlanId;

  if (!razorpayPlanId) {
    return NextResponse.json(
      { error: "Plan not available for this billing interval" },
      { status: 400 },
    );
  }

  try {
    let sub = await db.subscription.findUnique({ where: { orgId } });
    let customerId = sub?.razorpayCustomerId;

    if (!customerId) {
      const customer = await createRazorpayCustomer({
        name,
        email,
        contact: phone,
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Failed to create customer" },
          { status: 500 },
        );
      }
      customerId = customer.id;
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
          planId,
          billingInterval,
          status: "active",
        },
      });
    } else {
      await db.subscription.create({
        data: {
          orgId,
          razorpayCustomerId: customerId,
          razorpaySubId,
          razorpayPlanId,
          planId,
          billingInterval,
          status: "active",
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
