import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimitByIp } from "@/lib/rate-limit";

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
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
