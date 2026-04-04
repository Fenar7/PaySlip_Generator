import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Paths that are always public — no auth required
const PUBLIC_PREFIXES = [
  "/",
  "/auth",
  "/api/auth",
  "/app/docs/pdf-studio", // PDF Studio stays free/public (growth lever)
  "/_next",
  "/favicon",
  "/public",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)
  );
  if (isPublic) return NextResponse.next();

  if (pathname.startsWith("/app") || pathname.startsWith("/onboarding")) {
    const session = getSessionCookie(request);
    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
