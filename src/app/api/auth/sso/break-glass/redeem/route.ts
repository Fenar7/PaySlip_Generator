import { NextRequest, NextResponse } from "next/server";
import { redeemBreakGlassCode } from "@/lib/sso";
import { setSsoSessionCookie } from "@/lib/sso-session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orgSlug?: string;
      email?: string;
      code?: string;
    };

    if (!body.orgSlug || !body.email || !body.code) {
      return NextResponse.json(
        { error: "orgSlug, email, and code are required." },
        { status: 400 },
      );
    }

    const result = await redeemBreakGlassCode({
      orgSlug: body.orgSlug,
      email: body.email,
      code: body.code,
    });

    const response = NextResponse.json({ success: true });
    setSsoSessionCookie(response, {
      orgId: result.orgId,
      userId: result.userId,
      mode: "break_glass",
    });

    return response;
  } catch (error) {
    console.error("Break-glass redeem failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to redeem break-glass code",
      },
      { status: 400 },
    );
  }
}
