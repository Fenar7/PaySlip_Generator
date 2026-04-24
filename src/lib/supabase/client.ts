import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import {
  applySessionPersistenceToCookieOptions,
  getClearedSessionPersistenceCookie,
  getSessionPersistenceCookie,
  resolveSessionPersistenceMode,
  SESSION_PERSISTENCE_COOKIE,
  type SessionPersistenceMode,
} from "@/lib/supabase/session-persistence";

const AUTH_STORAGE_KEY = "slipwise-auth-token";

function clearLegacySupabaseStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    if (
      key === AUTH_STORAGE_KEY ||
      key.startsWith("sb-") ||
      key.includes("-auth-token")
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

function readBrowserPersistenceMode(): SessionPersistenceMode {
  if (typeof document === "undefined") {
    return "remembered";
  }

  const cookies = parse(document.cookie);
  return resolveSessionPersistenceMode(
    cookies[SESSION_PERSISTENCE_COOKIE],
    "remembered",
  );
}

function writeBrowserCookie(
  name: string,
  value: string,
  options?: Parameters<typeof serialize>[2],
) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = serialize(name, value, options);
}

export function setBrowserSessionPersistence(
  mode: SessionPersistenceMode,
) {
  const cookie = getSessionPersistenceCookie(mode);
  writeBrowserCookie(cookie.name, cookie.value, cookie.options);
}

export function clearBrowserSessionPersistence() {
  const cookie = getClearedSessionPersistenceCookie();
  writeBrowserCookie(cookie.name, cookie.value, cookie.options);
}

export async function clearSupabaseBrowserSessionStorage() {
  if (typeof window === "undefined") return;
  clearLegacySupabaseStorage(window.localStorage);
  clearLegacySupabaseStorage(window.sessionStorage);

  const supabase = createSupabaseBrowser();
  await supabase.auth.signOut({ scope: "local" });
  clearBrowserSessionPersistence();
}

export async function signOutSupabaseBrowser() {
  const supabase = createSupabaseBrowser();
  await supabase.auth.signOut();
  clearBrowserSessionPersistence();

  if (typeof window !== "undefined") {
    clearLegacySupabaseStorage(window.localStorage);
    clearLegacySupabaseStorage(window.sessionStorage);
  }
}

export function createSupabaseBrowser(_options: { rememberSession?: boolean } = {}) {
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
            const persistenceMode =
              _options.rememberSession === undefined
                ? readBrowserPersistenceMode()
                : _options.rememberSession
                  ? "remembered"
                  : "session";
            const cookieOptions =
              value === ""
                ? options
                : applySessionPersistenceToCookieOptions(
                    persistenceMode,
                    options,
                  );

            document.cookie = serialize(name, value, cookieOptions);
          });
        },
      },
    }
  );
}
