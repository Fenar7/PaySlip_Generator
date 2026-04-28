import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/request-origin";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimitByIp } from "@/lib/rate-limit";
import {
  verifyChallengeToken,
  MFA_CHALLENGE_COOKIE,
} from "@/lib/totp/challenge-session";
import {
  verifyMfaToken,
  signMfaCookieEdge,
  MFA_TOKEN_QUERY_PARAM,
  sanitizeMfaCallbackUrl,
} from "@/lib/mfa/token";

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

function hasSupabaseSessionConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function isPublicPdfStudioRoute(pathname: string) {
  return pathname === "/pdf-studio" || pathname.startsWith("/pdf-studio/");
}

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
    "https://api.razorpay.com",
    "https://*.amazonaws.com",
    // Allow the configured Supabase origin (handles local or custom-domain deployments)
    supabaseHost,
    // In development, allow all local ports (HMR websocket, local services)
    ...(isDev ? ["http://127.0.0.1:*", "ws://127.0.0.1:*", "http://localhost:*", "ws://localhost:*"] : []),
  ].filter(Boolean).join(" ");

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Next.js dev runtime relies on eval-based source maps / React refresh.
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://js.stripe.com",
    "https://checkout.razorpay.com",
    "https://api.razorpay.com",
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src ${connectSrc}`,
    "frame-src https://js.stripe.com https://checkout.razorpay.com https://api.razorpay.com",
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

// ─── MFA challenge enforcement ────────────────────────────────────────────────

/**
 * Check whether the current request satisfies the MFA challenge requirement.
 *
 * Reading MFA state from Supabase user_metadata means no DB call at the edge.
 * The flags are synced into user_metadata by server actions, so they are
 * authoritative for middleware purposes.
 *
 * The sw_2fa cookie is an HMAC-HS256 JWT signed with TOTP_SESSION_SECRET
 * (falls back to PORTAL_JWT_SECRET). Verified using the Web Crypto API
 * (edge-runtime compatible).
 */
async function checkMfaChallenge(
  request: NextRequest,
  userId: string,
  mfaRequired: boolean,
  opts?: { enrollmentRequired?: boolean }
): Promise<NextResponse | null> {
  if (!mfaRequired) return null;
  const callbackUrl = sanitizeMfaCallbackUrl(
    request.nextUrl.pathname + request.nextUrl.search
  );
  const requestOrigin = getRequestOrigin(request);

  if (opts?.enrollmentRequired) {
    const setupUrl = new URL("/app/settings/security", requestOrigin);
    setupUrl.searchParams.set("setupMfa", "1");
    setupUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(setupUrl);
  }

  const secret =
    process.env.TOTP_SESSION_SECRET ?? process.env.PORTAL_JWT_SECRET ?? "";

  if (!secret) {
    const loginUrl = new URL("/auth/login", requestOrigin);
    loginUrl.searchParams.set("error", "mfa_unavailable");
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // ── Token-based MFA handoff (bypasses Next.js 16 dev cookie issue) ──
  // Check for a short-lived mfaToken query param first. If valid, set the
  // cookie and allow access. This is used when the verify route returns
  // a token instead of setting a cookie directly.
  const mfaToken = request.nextUrl.searchParams.get(MFA_TOKEN_QUERY_PARAM);
  if (mfaToken) {
    const tokenUserId = await verifyMfaToken(mfaToken, secret);
    if (tokenUserId === userId) {
      // Valid token — set the cookie and continue (strip token from URL)
      const cleanSearch = request.nextUrl.search
        .replace(/[?&]mfaToken=[^&]+/, "")
        .replace(/^\?&/, "?")
        .replace(/^\?$/, "");
      const response = NextResponse.redirect(
        new URL(request.nextUrl.pathname + cleanSearch, request.url)
      );
      const cookieValue = await signMfaCookieEdge(userId, secret);
      response.cookies.set(MFA_CHALLENGE_COOKIE, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 12 * 60 * 60, // 12 hours
      });
      return response;
    }
  }

  const cookieValue = request.cookies.get(MFA_CHALLENGE_COOKIE)?.value ?? "";
  const verifiedUserId = await verifyChallengeToken(cookieValue, secret);

  if (verifiedUserId === userId) {
    // Valid challenge cookie — user has already passed MFA
    return null;
  }

  // Challenge required: redirect to /auth/2fa with the original path as callback
  const challengeUrl = new URL("/auth/2fa", requestOrigin);
  challengeUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(challengeUrl);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestOrigin = getRequestOrigin(request);

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

  if (isPublicPdfStudioRoute(pathname) && !hasSupabaseSessionConfig()) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  // Always refresh the Supabase session (sets cookies)
  const { user, supabaseResponse } = await updateSession(request);

  if (isPublic) return applySecurityHeaders(supabaseResponse);

  if (pathname.startsWith("/app") || pathname.startsWith("/onboarding")) {
    if (!user) {
      const loginUrl = new URL("/auth/login", requestOrigin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── MFA challenge gate ────────────────────────────────────────────────
    const hasExplicitTotp = typeof user.user_metadata?.hasTotp === "boolean";
    const hasExplicitPasskey = typeof user.user_metadata?.hasPasskey === "boolean";
    const hasTotp = hasExplicitTotp
      ? user.user_metadata?.hasTotp === true
      : user.user_metadata?.totpEnabled === true;
    const hasPasskey = hasExplicitPasskey
      ? user.user_metadata?.hasPasskey === true
      : user.user_metadata?.passkeyEnabled === true;
    const hasExplicitFactorMetadata = hasExplicitTotp || hasExplicitPasskey;
    const legacyMfaEnabled = user.user_metadata?.mfaEnabled === true;
    const mfaEnabled = hasTotp || hasPasskey || (!hasExplicitFactorMetadata && legacyMfaEnabled);
    const twoFaEnforcedByOrg = user.user_metadata?.twoFaEnforcedByOrg === true;
    const mfaRequired = mfaEnabled || twoFaEnforcedByOrg;

    // Enrollment is required when org enforces MFA and the user has no factor.
    const hasFactor = hasTotp || hasPasskey;
    const enrollmentRequired = twoFaEnforcedByOrg && !hasFactor;
    const isMfaEnrollmentPath = pathname === "/app/settings/security";

    if (enrollmentRequired && isMfaEnrollmentPath) {
      return applySecurityHeaders(supabaseResponse);
    }

    try {
      const challengeRedirect = await checkMfaChallenge(request, user.id, mfaRequired, {
        enrollmentRequired,
      });
      if (challengeRedirect) return challengeRedirect;
    } catch (err) {
      console.warn("[middleware] MFA check error, denying access:", err);
      const loginUrl = new URL("/auth/login", requestOrigin);
      loginUrl.searchParams.set("error", "mfa_check_failed");
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return applySecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
