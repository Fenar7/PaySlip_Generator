import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cancelSubscription, resolveBillingOrgId } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    orgId: requestedOrgId,
    cancelAtPeriodEnd = true,
  } = body as { orgId?: string; cancelAtPeriodEnd?: boolean };

  const orgResult = await resolveBillingOrgId(user.id, requestedOrgId);
  if (!orgResult.success) {
    return NextResponse.json(
      { error: orgResult.error },
      { status: orgResult.status },
    );
  }

  const result = await cancelSubscription(
    orgResult.orgId,
    cancelAtPeriodEnd,
  );
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
