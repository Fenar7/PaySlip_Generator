import { NextRequest, NextResponse } from "next/server";
import { getOnboardingStatus } from "@/lib/onboarding-tracker";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  const status = await getOnboardingStatus(userId);
  return NextResponse.json(status);
}
