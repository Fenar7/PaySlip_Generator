import { NextRequest, NextResponse } from "next/server";
import {
  createSsoAuthnRequest,
  getSsoRuntimeDisabledReason,
} from "@/lib/sso";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const mode =
    request.nextUrl.searchParams.get("mode") === "test" ? "TEST" : "LOGIN";

  const disabledReason = getSsoRuntimeDisabledReason();
  if (disabledReason) {
    const fallback =
      mode === "TEST"
        ? new URL("/app/settings/security/sso?sso_error=sso_unavailable", request.nextUrl.origin)
        : new URL("/auth/login", request.nextUrl.origin);
    if (mode !== "TEST") {
      fallback.searchParams.set("org", orgSlug);
      fallback.searchParams.set("sso_error", "sso_unavailable");
      fallback.searchParams.set("callbackUrl", "/app/home");
    }
    return NextResponse.redirect(fallback);
  }

  try {
    const result = await createSsoAuthnRequest({
      orgSlug,
      mode,
      next: request.nextUrl.searchParams.get("next"),
    });

    if (result.kind === "redirect") {
      return NextResponse.redirect(result.redirectUrl);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta httpEquiv="refresh" content="0" />
    <title>Redirecting to SSO…</title>
  </head>
  <body>
    <form id="sso-post-form" method="post" action="${escapeHtml(result.actionUrl)}">
      <input type="hidden" name="SAMLRequest" value="${escapeHtml(result.samlRequest)}" />
      <input type="hidden" name="RelayState" value="${escapeHtml(result.relayState)}" />
      <noscript>
        <button type="submit">Continue to sign in</button>
      </noscript>
    </form>
    <script>document.getElementById("sso-post-form")?.submit();</script>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("SSO initiate error:", error);
    const fallback =
      mode === "TEST"
        ? new URL("/app/settings/security/sso", request.nextUrl.origin)
        : new URL("/auth/login", request.nextUrl.origin);

    if (mode === "TEST") {
      fallback.searchParams.set("sso_error", "metadata_invalid");
    } else {
      fallback.searchParams.set("org", orgSlug);
      fallback.searchParams.set("sso_error", "sso_initiate_failed");
      fallback.searchParams.set("callbackUrl", "/app/home");
    }

    return NextResponse.redirect(fallback);
  }
}
