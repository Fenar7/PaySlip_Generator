import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/quickbooks";
import {
  createIntegrationOAuthState,
  getIntegrationOAuthStateCookieName,
  getIntegrationOAuthStateCookieOptions,
} from "@/lib/integrations/oauth-state";
import { requireIntegrationAdminRoute } from "../../_auth";

export async function GET() {
  try {
    const auth = await requireIntegrationAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    const { state, cookieValue } = createIntegrationOAuthState(
      "quickbooks",
      auth.ctx.orgId,
      auth.ctx.userId,
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
