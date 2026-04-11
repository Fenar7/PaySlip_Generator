import { NextRequest, NextResponse } from "next/server";
import { getAuthRoutingContext } from "@/lib/auth";
import { dismissOnboarding } from "@/lib/onboarding-tracker";

export async function POST(_request: NextRequest) {
  const auth = await getAuthRoutingContext();

  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dismissOnboarding(auth.userId);
  return NextResponse.json({ success: true });
}
