import { createBrowserClient } from "@supabase/ssr";

const AUTH_STORAGE_KEY = "slipwise-auth-token";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function createWebStorageAdapter(storage: Storage): BrowserStorage {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}

function getAuthStorage(rememberSession: boolean): BrowserStorage {
  if (typeof window === "undefined") {
    // Fallback for SSR - return a no-op storage (required for auth to work)
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return createWebStorageAdapter(rememberSession ? window.localStorage : window.sessionStorage);
}

export function clearSupabaseBrowserSessionStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function createSupabaseBrowser({ rememberSession = true }: { rememberSession?: boolean } = {}) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: AUTH_STORAGE_KEY,
        storage: getAuthStorage(rememberSession),
      },
    }
  );
}
