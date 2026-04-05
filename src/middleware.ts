import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PREFIXES = [
  "/",
  "/auth",
  "/api/auth",
  "/app/docs",
  "/invoice",
  "/salary-slip",
  "/voucher",
  "/pdf-studio",
  "/_next",
  "/favicon",
  "/public",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
