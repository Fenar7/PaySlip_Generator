import { NextRequest, NextResponse } from "next/server";
import { getAuthRoutingContext } from "@/lib/auth";
import { getOnboardingStatus } from "@/lib/onboarding-tracker";

export async function GET(_request: NextRequest) {
  const auth = await getAuthRoutingContext();

  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getOnboardingStatus(auth.userId);
  return NextResponse.json(status);
}
