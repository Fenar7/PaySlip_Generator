import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getAuthUrl } from "@/lib/integrations/zoho";
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
      "zoho",
      ctx.orgId,
      ctx.userId,
    );
    const response = NextResponse.redirect(getAuthUrl(state));
    response.cookies.set(
      getIntegrationOAuthStateCookieName("zoho"),
      cookieValue,
      getIntegrationOAuthStateCookieOptions("zoho"),
    );
    return response;
  } catch (error) {
    console.error("Zoho connect failed:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
