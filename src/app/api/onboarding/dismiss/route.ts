import { NextRequest, NextResponse } from "next/server";
import { dismissOnboarding } from "@/lib/onboarding-tracker";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  await dismissOnboarding(userId);
  return NextResponse.json({ success: true });
}
