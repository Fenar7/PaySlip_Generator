import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  cancelRazorpaySubscription,
  fetchRazorpaySubscription,
} from "@/lib/razorpay";
import { resolveBillingOrgId } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/razorpay/cancel-pending
 *
 * Cancels a subscription that is still in "pending" state (user opened the
 * Razorpay checkout page but never completed payment). This resets the org
 * back to a clean state so they can start a new checkout.
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

  if (!sub) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 },
    );
  }

  if (sub.status !== "pending") {
    return NextResponse.json(
      { error: "Subscription is not in pending state" },
      { status: 400 },
    );
  }

  if (sub.planId !== "free") {
    return NextResponse.json(
      {
        error:
          "This pending status belongs to an existing paid subscription. Refresh status instead of cancelling it.",
      },
      { status: 409 },
    );
  }

  let remoteStatus: string | null = null;

  if (sub.razorpaySubId) {
    try {
      const remoteSub = await fetchRazorpaySubscription(sub.razorpaySubId);
      remoteStatus = remoteSub?.status ?? null;

      if (remoteStatus === "active") {
        return NextResponse.json(
          {
            error:
              "This checkout is already active on Razorpay. Refresh status instead.",
          },
          { status: 409 },
        );
      }

      if (
        remoteStatus === "created" ||
        remoteStatus === "authenticated" ||
        remoteStatus === "pending"
      ) {
        await cancelRazorpaySubscription(sub.razorpaySubId, false);
      }
    } catch (error) {
      console.error("[Billing] cancel-pending sync failed:", error);
      return NextResponse.json(
        {
          error:
            "Could not verify the checkout state with Razorpay. Please refresh status and try again.",
        },
        { status: 502 },
      );
    }
  }

  await db.subscription.update({
    where: { orgId },
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

  return NextResponse.json({
    status: remoteStatus === "cancelled" ? "cleared" : "cancelled",
  });
}
