import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { fetchRazorpaySubscription } from "@/lib/razorpay";
import {
  getInternalPlanIdForRazorpayPlanId,
  resolveBillingOrgId,
} from "@/lib/billing";
import type { SubscriptionStatus } from "@/lib/billing";

export const dynamic = "force-dynamic";

function buildFreeCheckoutReset() {
  return {
    status: "active" as const,
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
  };
}

/** Map Razorpay subscription status to our internal status. */
function mapRazorpayStatus(rpStatus: string): SubscriptionStatus {
  switch (rpStatus) {
    case "created":
      return "pending";
    case "authenticated":
      return "pending";
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "halted":
      return "expired";
    case "cancelled":
      return "cancelled";
    case "completed":
      return "expired";
    case "expired":
      return "expired";
    case "paused":
      return "paused";
    default:
      return "pending";
  }
}

/**
 * POST /api/billing/razorpay/sync
 *
 * Fetches the current subscription status from Razorpay and updates the
 * local DB to match. Useful when the webhook hasn't fired yet (e.g. user
 * abandoned checkout and came back).
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orgResult = await resolveBillingOrgId(user.id, body.orgId);
  if (!orgResult.success) {
    return NextResponse.json(
      { error: orgResult.error },
      { status: orgResult.status },
    );
  }

  const orgId = orgResult.orgId;

  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub?.razorpaySubId) {
    return NextResponse.json({ status: "no_subscription" });
  }

  let rpSub;
  try {
    rpSub = await fetchRazorpaySubscription(sub.razorpaySubId);
  } catch (error) {
    console.error("[Billing] sync error:", error);
    return NextResponse.json(
      { error: "Could not fetch subscription from Razorpay" },
      { status: 502 },
    );
  }

  if (!rpSub) {
    return NextResponse.json(
      { error: "Could not fetch subscription from Razorpay" },
      { status: 502 },
    );
  }

  const newStatus = mapRazorpayStatus(rpSub.status ?? "");
  const internalPlanId = getInternalPlanIdForRazorpayPlanId(rpSub.plan_id);

  if (
    sub.planId === "free" &&
    (newStatus === "cancelled" || newStatus === "expired")
  ) {
    await db.subscription.update({
      where: { orgId },
      data: buildFreeCheckoutReset(),
    });

    return NextResponse.json({
      status: "synced",
      razorpayStatus: rpSub.status,
      localStatus: "active",
      changed: true,
    });
  }

  // Build the update payload — only change fields that differ
  const update: Record<string, unknown> = {};

  if (newStatus !== sub.status) {
    update.status = newStatus;
  }

  if (internalPlanId && internalPlanId !== sub.planId && newStatus === "active") {
    update.planId = internalPlanId;
  }

  if (rpSub.customer_id && rpSub.customer_id !== sub.razorpayCustomerId) {
    update.razorpayCustomerId = rpSub.customer_id;
  }

  if (rpSub.plan_id && rpSub.plan_id !== sub.razorpayPlanId) {
    update.razorpayPlanId = rpSub.plan_id;
  }

  const rpCurrentStart = rpSub.current_start
    ? new Date((rpSub.current_start as number) * 1000)
    : null;
  const rpCurrentEnd = rpSub.current_end
    ? new Date((rpSub.current_end as number) * 1000)
    : null;

  if (rpCurrentStart) update.currentPeriodStart = rpCurrentStart;
  if (rpCurrentEnd) update.currentPeriodEnd = rpCurrentEnd;

  if (newStatus === "cancelled" && !sub.cancelledAt) {
    update.cancelledAt = new Date();
  }

  if (Object.keys(update).length > 0) {
    await db.subscription.update({
      where: { orgId },
      data: update,
    });
  }

  return NextResponse.json({
    status: "synced",
    razorpayStatus: rpSub.status,
    localStatus: newStatus,
    changed: Object.keys(update).length > 0,
  });
}
