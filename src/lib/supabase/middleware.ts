import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Clear stale/invalid sessions (e.g. old Better Auth JWTs or deleted users).
  // Without this, the client loops on 403 user_not_found on every request.
  if (authError && !user) {
    console.warn("[middleware] Clearing invalid session:", authError.message);
    await supabase.auth.signOut({ scope: "local" });
  }

  return { user: authError ? null : user, supabaseResponse };
}
