import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getActiveOrg } from "@/lib/multi-org";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { getPlan } from "@/lib/plans/config";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedOrgId = request.nextUrl.searchParams.get("orgId");
    let orgId = requestedOrgId;

    if (orgId) {
      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: user.id,
          },
        },
        select: { organizationId: true },
      });

      if (!member) {
        return NextResponse.json(
          { error: "Unauthorized for this org" },
          { status: 403 },
        );
      }

      orgId = member.organizationId;
    } else {
      const activeOrg = await getActiveOrg(user.id);
      if (!activeOrg) {
        return NextResponse.json(
          { error: "No organization context available" },
          { status: 400 },
        );
      }
      orgId = activeOrg.id;
    }

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
