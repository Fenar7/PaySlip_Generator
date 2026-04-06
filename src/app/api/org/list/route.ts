import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserOrgs, getActiveOrg } from "@/lib/multi-org";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [orgs, activeOrg] = await Promise.all([
      getUserOrgs(user.id),
      getActiveOrg(user.id),
    ]);

    return NextResponse.json({
      orgs,
      activeOrgId: activeOrg?.id ?? null,
    });
  } catch (error) {
    console.error("Org list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
