import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resumeSubscription, resolveBillingOrgId } from "@/lib/billing";

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
  const { orgId: requestedOrgId }: { orgId?: string } = body;

  const orgResult = await resolveBillingOrgId(user.id, requestedOrgId);
  if (!orgResult.success) {
    return NextResponse.json(
      { error: orgResult.error },
      { status: orgResult.status },
    );
  }

  const result = await resumeSubscription(orgResult.orgId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
