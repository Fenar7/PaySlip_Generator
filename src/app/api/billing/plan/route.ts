import { NextRequest, NextResponse } from "next/server";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { getPlan } from "@/lib/plans/config";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  try {
    const orgPlan = await getOrgPlan(orgId);
    const planConfig = getPlan(orgPlan.planId);

    return NextResponse.json({
      planId: orgPlan.planId,
      planName: planConfig.name,
      status: orgPlan.status,
      limits: orgPlan.limits,
      trialEndsAt: orgPlan.trialEndsAt?.toISOString() ?? null,
      isTrialing: orgPlan.status === "trialing",
      isFree: orgPlan.planId === "free",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
