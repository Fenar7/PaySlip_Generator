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
  "/help",
  "/_next",
  "/favicon",
  "/public",
  "/manifest.json",
  "/sw.js",
  "/offline",
];

// ─── Security Headers ─────────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=(self)",
  // HSTS only makes sense in production (served over HTTPS).
  // Setting it locally would pin the browser to HTTPS and break local dev.
  ...(process.env.NODE_ENV !== "development"
    ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }
    : {}),
};

/**
 * Build Content-Security-Policy header.
 * In development, extends connect-src to allow local Supabase (http://127.0.0.1:*)
 * so the browser can reach the local GoTrue auth service without CSP violations.
 */
function buildCsp(): string {
  const isDev = process.env.NODE_ENV === "development";

  // Derive the Supabase URL so local instances on non-standard ports are allowed.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : "";

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
    "https://*.amazonaws.com",
    // Allow the configured Supabase origin (handles local or custom-domain deployments)
    supabaseHost,
    // In development, allow all local ports (HMR websocket, local services)
    ...(isDev ? ["http://127.0.0.1:*", "ws://127.0.0.1:*", "http://localhost:*", "ws://localhost:*"] : []),
  ].filter(Boolean).join(" ");

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src ${connectSrc}`,
    "frame-src https://js.stripe.com https://checkout.razorpay.com",
    // Allow same-origin web workers (PDF.js uses a webpack-emitted worker chunk
    // served from /_next/static/…). blob: allows inline workers if ever needed.
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join("; ");
}

/**
 * Apply security headers to a response.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", buildCsp());
  return response;
}

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
  twoFaRequired: boolean,
  opts?: { enrollmentRequired?: boolean }
): Promise<NextResponse | null> {
  if (!twoFaRequired) return null;

  const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;

  if (opts?.enrollmentRequired) {
    const setupUrl = new URL("/app/settings/security", request.url);
    setupUrl.searchParams.set("setup2fa", "1");
    setupUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(setupUrl);
  }

  const secret =
    process.env.TOTP_SESSION_SECRET ?? process.env.PORTAL_JWT_SECRET ?? "";

  if (!secret) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "2fa_unavailable");
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  const cookieValue = request.cookies.get(TOTP_CHALLENGE_COOKIE)?.value ?? "";
  const verifiedUserId = await verifyChallengeToken(cookieValue, secret);

  if (verifiedUserId === userId) {
    // Valid challenge cookie — user has already passed 2FA
    return null;
  }

  // Challenge required: redirect to /auth/2fa with the original path as callback
  const challengeUrl = new URL("/auth/2fa", request.url);
  challengeUrl.searchParams.set("callbackUrl", callbackUrl);
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

  if (isPublic) return applySecurityHeaders(supabaseResponse);

  if (pathname.startsWith("/app") || pathname.startsWith("/onboarding")) {
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── 2FA challenge gate ────────────────────────────────────────────────
    const totpEnabled = user.user_metadata?.totpEnabled === true;
    const twoFaEnforcedByOrg = user.user_metadata?.twoFaEnforcedByOrg === true;
    const twoFaRequired = totpEnabled || twoFaEnforcedByOrg;
    const enrollmentRequired = twoFaEnforcedByOrg && !totpEnabled;
    const is2faEnrollmentPath = pathname === "/app/settings/security";

    if (enrollmentRequired && is2faEnrollmentPath) {
      return applySecurityHeaders(supabaseResponse);
    }

    try {
      const challengeRedirect = await check2faChallenge(request, user.id, twoFaRequired, {
        enrollmentRequired,
      });
      if (challengeRedirect) return challengeRedirect;
    } catch (err) {
      console.warn("[middleware] 2FA check error, denying access:", err);
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", "2fa_check_failed");
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return applySecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
