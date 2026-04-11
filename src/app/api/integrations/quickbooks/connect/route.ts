import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getAuthUrl } from "@/lib/integrations/quickbooks";
import {
  createIntegrationOAuthState,
  getIntegrationOAuthStateCookieName,
  getIntegrationOAuthStateCookieOptions,
} from "@/lib/integrations/oauth-state";

export async function GET() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { state, cookieValue } = createIntegrationOAuthState(
      "quickbooks",
      ctx.orgId,
      ctx.userId,
    );
    const response = NextResponse.redirect(getAuthUrl(state));
    response.cookies.set(
      getIntegrationOAuthStateCookieName("quickbooks"),
      cookieValue,
      getIntegrationOAuthStateCookieOptions("quickbooks"),
    );
    return response;
  } catch (error) {
    console.error("QuickBooks connect failed:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
