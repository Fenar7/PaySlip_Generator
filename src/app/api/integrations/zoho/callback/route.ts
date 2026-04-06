import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/integrations/zoho";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state"); // orgId

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/app/settings/integrations?error=missing_params", request.url)
      );
    }

    await handleCallback(state, code);

    return NextResponse.redirect(
      new URL("/app/settings/integrations?connected=zoho", request.url)
    );
  } catch (error) {
    console.error("Zoho callback failed:", error);
    return NextResponse.redirect(
      new URL("/app/settings/integrations?error=zoho_failed", request.url)
    );
  }
}
