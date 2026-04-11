import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { handleCallback } from "@/lib/integrations/quickbooks";
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
    getIntegrationOAuthStateCookieName("quickbooks"),
    "",
    getClearedIntegrationOAuthStateCookieOptions("quickbooks"),
  );
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const realmId = request.nextUrl.searchParams.get("realmId");

    if (!code || !state || !realmId) {
      return redirectWithError(request, "quickbooks_missing_params");
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirectWithError(request, "quickbooks_auth_required");
    }

    const stateResult = readIntegrationOAuthState(
      "quickbooks",
      request.cookies.get(getIntegrationOAuthStateCookieName("quickbooks"))?.value,
    );

    if (!stateResult.ok) {
      return redirectWithError(
        request,
        stateResult.error === "expired"
          ? "quickbooks_state_expired"
          : "quickbooks_invalid_state",
      );
    }

    if (stateResult.data.state !== state || stateResult.data.userId !== user.id) {
      return redirectWithError(request, "quickbooks_invalid_state");
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
      return redirectWithError(request, "quickbooks_invalid_state");
    }

    await handleCallback(stateResult.data.orgId, code, realmId);

    const response = NextResponse.redirect(
      new URL("/app/settings/integrations?connected=quickbooks", request.url),
    );
    response.cookies.set(
      getIntegrationOAuthStateCookieName("quickbooks"),
      "",
      getClearedIntegrationOAuthStateCookieOptions("quickbooks"),
    );
    return response;
  } catch (error) {
    console.error("QuickBooks callback failed:", error);
    return redirectWithError(request, "quickbooks_failed");
  }
}
