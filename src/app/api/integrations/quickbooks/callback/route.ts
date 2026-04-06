import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/integrations/quickbooks";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state"); // orgId
    const realmId = request.nextUrl.searchParams.get("realmId");

    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        new URL("/app/settings/integrations?error=missing_params", request.url)
      );
    }

    await handleCallback(state, code, realmId);

    return NextResponse.redirect(
      new URL("/app/settings/integrations?connected=quickbooks", request.url)
    );
  } catch (error) {
    console.error("QuickBooks callback failed:", error);
    return NextResponse.redirect(
      new URL("/app/settings/integrations?error=quickbooks_failed", request.url)
    );
  }
}
