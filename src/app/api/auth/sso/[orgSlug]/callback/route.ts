import { NextRequest, NextResponse } from "next/server";
import {
  completeSsoLogin,
  getPublicSsoFailureReason,
  getSsoRuntimeDisabledReason,
  recordSsoFailure,
} from "@/lib/sso";
import { setSsoSessionCookie } from "@/lib/sso-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const disabledReason = getSsoRuntimeDisabledReason();
  if (disabledReason) {
    const loginUrl = new URL("/auth/login", request.nextUrl.origin);
    loginUrl.searchParams.set("org", orgSlug);
    loginUrl.searchParams.set("sso_error", "sso_unavailable");
    loginUrl.searchParams.set("callbackUrl", "/app/home");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const formData = await request.formData();
    const samlResponseB64 = formData.get("SAMLResponse") as string | null;
    if (!samlResponseB64) {
      throw new Error("Missing SAMLResponse");
    }

    const result = await completeSsoLogin({
      orgSlug,
      samlResponse: samlResponseB64,
      relayState: (formData.get("RelayState") as string | null) ?? null,
    });

    const destination =
      result.mode === "TEST"
        ? "/app/settings/security/sso?tested=1"
        : result.redirectTo;

    const response = NextResponse.redirect(
      new URL(destination, request.nextUrl.origin),
    );
    setSsoSessionCookie(response, {
      orgId: result.orgId,
      userId: result.userId,
      mode: "sso",
    });

    return response;
  } catch (error) {
    console.error("SSO callback error:", error);
    const errorCode = getPublicSsoFailureReason(error);
    await recordSsoFailure(orgSlug, errorCode);

    const fallback = new URL("/auth/login", request.nextUrl.origin);
    fallback.searchParams.set("org", orgSlug);
    fallback.searchParams.set("callbackUrl", "/app/home");
    fallback.searchParams.set("sso_error", errorCode);

    return NextResponse.redirect(fallback);
  }
}
