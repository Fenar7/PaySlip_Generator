import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { switchOrg } from "@/lib/multi-org";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { activeOrgId } = body;

    if (!activeOrgId || typeof activeOrgId !== "string") {
      return NextResponse.json(
        { error: "activeOrgId is required" },
        { status: 400 }
      );
    }

    await switchOrg(user.id, activeOrgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to switch org";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
