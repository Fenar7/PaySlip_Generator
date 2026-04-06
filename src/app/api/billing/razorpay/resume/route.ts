import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { resumeSubscription } from "@/lib/billing";

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
  const { orgId }: { orgId: string } = body;

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const member = await db.member.findFirst({
    where: { userId: user.id, organizationId: orgId },
    select: { organizationId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Unauthorized for this org" }, { status: 403 });
  }

  const result = await resumeSubscription(orgId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
