import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { changePlan } from "@/lib/billing";
import type { BillingInterval } from "@/lib/plans/config";

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
    newPlanId,
    billingInterval,
    immediate = false,
  }: {
    orgId: string;
    newPlanId: string;
    billingInterval: BillingInterval;
    immediate?: boolean;
  } = body;

  if (!orgId || !newPlanId || !billingInterval) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const member = await db.member.findFirst({
    where: { userId: user.id, organizationId: orgId },
    select: { organizationId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Unauthorized for this org" }, { status: 403 });
  }

  const result = await changePlan(orgId, newPlanId, billingInterval, immediate);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
