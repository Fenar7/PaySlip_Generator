import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { redeemBreakGlassCode } from "@/lib/sso";
import { setSsoSessionCookie } from "@/lib/sso-session";
import {
  applySessionPersistenceToCookieOptions,
  getSessionPersistenceCookie,
  isSupabaseAuthCookie,
  resolveSessionPersistenceMode,
  type SessionPersistenceMode,
} from "@/lib/supabase/session-persistence";

type PasswordLoginBody = {
  email?: string;
  password?: string;
  callbackUrl?: string;
  rememberMe?: boolean;
  orgSlug?: string;
  breakGlassCode?: string;
};

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest) {
  request.cookies.getAll().forEach(({ name }) => {
    if (!isSupabaseAuthCookie(name)) return;

    response.cookies.set(name, "", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PasswordLoginBody;
    const email = body.email?.trim();
    const password = body.password;
    const redirectTo = getSafeRedirectPath(body.callbackUrl, "/onboarding");
    const persistenceMode: SessionPersistenceMode = resolveSessionPersistenceMode(
      body.rememberMe === false ? "session" : "remembered",
      "remembered",
    );
    const orgSlug = body.orgSlug?.trim();
    const breakGlassCode = body.breakGlassCode?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (breakGlassCode && !orgSlug) {
      return NextResponse.json(
        { error: "Enter your organization slug to redeem a break-glass code." },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true, redirectTo });
    clearSupabaseAuthCookies(response, request);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                value === ""
                  ? options
                  : applySessionPersistenceToCookieOptions(
                      persistenceMode,
                      options,
                    ),
              );
            });
          },
        },
      },
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        {
          error: signInError.message ?? "Invalid email or password",
          code: signInError.code ?? null,
        },
        { status: signInError.code === "email_not_confirmed" ? 403 : 401 },
      );
    }

    const persistenceCookie = getSessionPersistenceCookie(persistenceMode);
    response.cookies.set(
      persistenceCookie.name,
      persistenceCookie.value,
      persistenceCookie.options,
    );

    if (breakGlassCode && orgSlug) {
      const result = await redeemBreakGlassCode({
        orgSlug,
        email,
        code: breakGlassCode,
      });

      setSsoSessionCookie(response, {
        orgId: result.orgId,
        userId: result.userId,
        mode: "break_glass",
      });
    }

    return response;
  } catch (error) {
    console.error("Password login failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  }
}
