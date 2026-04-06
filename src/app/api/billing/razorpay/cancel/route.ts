import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cancelRazorpaySubscription } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    orgId,
    cancelAtPeriodEnd = true,
  }: { orgId: string; cancelAtPeriodEnd?: boolean } = body;

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  try {
    const sub = await db.subscription.findUnique({ where: { orgId } });
    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    if (!sub.razorpaySubId) {
      return NextResponse.json(
        { error: "No active Razorpay subscription" },
        { status: 400 },
      );
    }

    await cancelRazorpaySubscription(sub.razorpaySubId, cancelAtPeriodEnd);

    await db.subscription.update({
      where: { orgId },
      data: {
        cancelAtPeriodEnd,
        ...(cancelAtPeriodEnd
          ? {}
          : { status: "cancelled", cancelledAt: new Date() }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Billing] cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
