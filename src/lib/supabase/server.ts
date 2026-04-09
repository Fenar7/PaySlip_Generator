import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  applySessionPersistenceToCookieOptions,
  getSessionPersistenceModeFromCookies,
} from "@/lib/supabase/session-persistence";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const persistenceMode = getSessionPersistenceModeFromCookies(
    cookieStore.getAll(),
  );

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                value === ""
                  ? options
                  : applySessionPersistenceToCookieOptions(
                      persistenceMode,
                      options,
                    ),
              )
            );
          } catch {
            // Called from a Server Component — ignore.
            // Middleware will refresh the session before this is reached.
          }
        },
      },
    }
  );
}

export async function createSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
