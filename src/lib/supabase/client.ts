import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

const AUTH_STORAGE_KEY = "slipwise-auth-token";

export async function clearSupabaseBrowserSessionStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);

  const supabase = createSupabaseBrowser();
  await supabase.auth.signOut({ scope: "local" });
}

export function createSupabaseBrowser(_options: { rememberSession?: boolean } = {}) {
  const rememberSession = _options.rememberSession ?? true;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(parse(document.cookie)).map(([name, value]) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions =
              value === ""
                ? options
                : rememberSession
                  ? options
                  : { ...options, maxAge: undefined };

            document.cookie = serialize(name, value, cookieOptions);
          });
        },
      },
    }
  );
}
