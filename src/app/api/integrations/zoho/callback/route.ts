import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { handleCallback } from "@/lib/integrations/zoho";
import {
  getClearedIntegrationOAuthStateCookieOptions,
  getIntegrationOAuthStateCookieName,
  readIntegrationOAuthState,
} from "@/lib/integrations/oauth-state";

function redirectWithError(request: NextRequest, error: string) {
  const response = NextResponse.redirect(
    new URL(`/app/settings/integrations?error=${error}`, request.url),
  );
  response.cookies.set(
    getIntegrationOAuthStateCookieName("zoho"),
    "",
    getClearedIntegrationOAuthStateCookieOptions("zoho"),
  );
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return redirectWithError(request, "zoho_missing_params");
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirectWithError(request, "zoho_auth_required");
    }

    const stateResult = readIntegrationOAuthState(
      "zoho",
      request.cookies.get(getIntegrationOAuthStateCookieName("zoho"))?.value,
    );

    if (!stateResult.ok) {
      return redirectWithError(
        request,
        stateResult.error === "expired" ? "zoho_state_expired" : "zoho_invalid_state",
      );
    }

    if (stateResult.data.state !== state || stateResult.data.userId !== user.id) {
      return redirectWithError(request, "zoho_invalid_state");
    }

    const member = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: stateResult.data.orgId,
          userId: user.id,
        },
      },
      select: { organizationId: true },
    });

    if (!member) {
      return redirectWithError(request, "zoho_invalid_state");
    }

    await handleCallback(stateResult.data.orgId, code);

    const response = NextResponse.redirect(
      new URL("/app/settings/integrations?connected=zoho", request.url),
    );
    response.cookies.set(
      getIntegrationOAuthStateCookieName("zoho"),
      "",
      getClearedIntegrationOAuthStateCookieOptions("zoho"),
    );
    return response;
  } catch (error) {
    console.error("Zoho callback failed:", error);
    return redirectWithError(request, "zoho_failed");
  }
}
