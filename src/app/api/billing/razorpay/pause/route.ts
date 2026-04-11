import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { pauseSubscription, resolveBillingOrgId } from "@/lib/billing";

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
    resumeDate,
    reason,
  }: { orgId?: string; resumeDate?: string; reason?: string } = body;

  const orgResult = await resolveBillingOrgId(user.id, requestedOrgId);
  if (!orgResult.success) {
    return NextResponse.json(
      { error: orgResult.error },
      { status: orgResult.status },
    );
  }

  const result = await pauseSubscription(
    orgResult.orgId,
    resumeDate ? new Date(resumeDate) : undefined,
    reason,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
