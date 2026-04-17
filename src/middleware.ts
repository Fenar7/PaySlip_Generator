import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimitByIp } from "@/lib/rate-limit";
import {
  verifyChallengeToken,
  TOTP_CHALLENGE_COOKIE,
} from "@/lib/totp/challenge-session";

const PUBLIC_PREFIXES = [
  "/",
  "/auth",
  "/api/auth",
  "/api/billing",
  "/api/v1",
  "/api/health",
  "/app/docs",
  "/invoice",
  "/salary-slip",
  "/voucher",
  "/pdf-studio",
  "/share",
  "/portal",
  "/quote",
  "/unsubscribe",
  "/developers",
  "/_next",
  "/favicon",
  "/public",
  "/manifest.json",
  "/sw.js",
  "/offline",
];

// ─── 2FA challenge enforcement ────────────────────────────────────────────────

/**
 * Check whether the current request satisfies the 2FA challenge requirement.
 *
 * Reading totpEnabled from Supabase user_metadata means no DB call at the edge.
 * The flag is synced into user_metadata by verify2faSetup / disable2fa server
 * actions, so it is authoritative for middleware purposes.
 *
 * The sw_2fa cookie is an HMAC-HS256 JWT signed with TOTP_SESSION_SECRET
 * (falls back to PORTAL_JWT_SECRET). Verified using the Web Crypto API
 * (edge-runtime compatible).
 */
async function check2faChallenge(
  request: NextRequest,
  userId: string,
  totpEnabled: boolean
): Promise<NextResponse | null> {
  if (!totpEnabled) return null;

  const secret =
    process.env.TOTP_SESSION_SECRET ?? process.env.PORTAL_JWT_SECRET ?? "";

  // Fail-open: if no secret is configured, skip enforcement (misconfigured env)
  if (!secret) {
    console.warn("[middleware] TOTP_SESSION_SECRET not set — skipping 2FA enforcement");
    return null;
  }

  const cookieValue = request.cookies.get(TOTP_CHALLENGE_COOKIE)?.value ?? "";
  const verifiedUserId = await verifyChallengeToken(cookieValue, secret);

  if (verifiedUserId === userId) {
    // Valid challenge cookie — user has already passed 2FA
    return null;
  }

  // Challenge required: redirect to /auth/2fa with the original path as callback
  const challengeUrl = new URL("/auth/2fa", request.url);
  challengeUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(challengeUrl);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting (fail-open: errors are caught and logged)
  try {
    if (
      pathname.startsWith("/api/export") ||
      pathname.startsWith("/api/pdf")
    ) {
      const rl = await rateLimitByIp(request, {
        maxRequests: 10,
        window: "60 s",
      });
      if (!rl.success) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfter ?? 60) },
          }
        );
      }
    } else if (
      pathname.startsWith("/auth") &&
      !pathname.startsWith("/api/auth")
    ) {
      const rl = await rateLimitByIp(request, {
        maxRequests: 5,
        window: "60 s",
      });
      if (!rl.success) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfter ?? 60) },
          }
        );
      }
    }
    // /api/cron/* paths: skip rate limiting (cron jobs are trusted)
  } catch (error) {
    console.warn("[middleware] Rate limiting error, continuing:", error);
  }

  const isPublic = PUBLIC_PREFIXES.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)
  );

  // Always refresh the Supabase session (sets cookies)
  const { user, supabaseResponse } = await updateSession(request);

  if (isPublic) return supabaseResponse;

  if (pathname.startsWith("/app") || pathname.startsWith("/onboarding")) {
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── 2FA challenge gate ────────────────────────────────────────────────
    // totpEnabled is synced to user_metadata on enable/disable, so it can be
    // read from the Supabase JWT without a database round-trip.
    const totpEnabled = user.user_metadata?.totpEnabled === true;
    try {
      const challengeRedirect = await check2faChallenge(request, user.id, totpEnabled);
      if (challengeRedirect) return challengeRedirect;
    } catch (err) {
      // Fail-open: log but don't block the user on infrastructure errors
      console.warn("[middleware] 2FA check error, continuing:", err);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
