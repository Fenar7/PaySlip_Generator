import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { changePlan, resolveBillingOrgId } from "@/lib/billing";
import { PLANS, type BillingInterval, type PlanId } from "@/lib/plans/config";

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
    orgId: requestedOrgId,
    newPlanId,
    billingInterval,
    immediate = false,
  }: {
    orgId?: string;
    newPlanId: PlanId;
    billingInterval: BillingInterval;
    immediate?: boolean;
  } = body;

  if (!newPlanId || !billingInterval) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!PLANS.some((plan) => plan.id === newPlanId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const orgResult = await resolveBillingOrgId(user.id, requestedOrgId);
  if (!orgResult.success) {
    return NextResponse.json(
      { error: orgResult.error },
      { status: orgResult.status },
    );
  }

  const result = await changePlan(
    orgResult.orgId,
    newPlanId,
    billingInterval,
    immediate,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
