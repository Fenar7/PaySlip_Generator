import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createBrowserClientMock } = vi.hoisted(() => ({
  createBrowserClientMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock,
}));

const originalCookieDescriptor = Object.getOwnPropertyDescriptor(
  Document.prototype,
  "cookie",
);

describe("createSupabaseBrowser", () => {
  const cookieWrites: string[] = [];
  const cookieJar = new Map<string, string>();

  beforeEach(() => {
    vi.resetModules();
    createBrowserClientMock.mockReset();
    createBrowserClientMock.mockReturnValue({
      auth: {
        signOut: vi.fn().mockResolvedValue(undefined),
      },
    });
    cookieWrites.length = 0;
    cookieJar.clear();
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        return Array.from(cookieJar.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join("; ");
      },
      set(value: string) {
        cookieWrites.push(value);
        const [pair] = value.split(";");
        const [name, cookieValue] = pair.split("=");
        cookieJar.set(name, cookieValue);
      },
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    if (originalCookieDescriptor) {
      Object.defineProperty(document, "cookie", originalCookieDescriptor);
    }
  });

  it("uses remembered persistence when explicitly requested", async () => {
    const { createSupabaseBrowser } = await import("@/lib/supabase/client");

    createSupabaseBrowser({ rememberSession: true });

    const [, , options] = createBrowserClientMock.mock.calls[0];
    options.cookies.setAll([
      {
        name: "sb-demo-auth-token",
        value: "token",
        options: { path: "/", maxAge: 10 },
      },
    ]);

    expect(document.cookie).toContain("sb-demo-auth-token=token");
    expect(cookieWrites.at(-1)).toContain("Max-Age=259200");
  });

  it("strips maxAge for session-only persistence", async () => {
    const { createSupabaseBrowser } = await import("@/lib/supabase/client");

    createSupabaseBrowser({ rememberSession: false });

    const [, , options] = createBrowserClientMock.mock.calls[0];
    options.cookies.setAll([
      {
        name: "sb-demo-auth-token",
        value: "token",
        options: { path: "/", maxAge: 10 },
      },
    ]);

    expect(document.cookie).toContain("sb-demo-auth-token=token");
    expect(document.cookie).not.toContain("Max-Age");
  });

  it("reads the saved browser persistence cookie for subsequent clients", async () => {
    const {
      createSupabaseBrowser,
      setBrowserSessionPersistence,
    } = await import("@/lib/supabase/client");

    setBrowserSessionPersistence("session");
    createSupabaseBrowser();

    const [, , options] = createBrowserClientMock.mock.calls[0];
    options.cookies.setAll([
      {
        name: "sb-demo-auth-token",
        value: "token",
        options: { path: "/", maxAge: 10 },
      },
    ]);

    expect(document.cookie).not.toContain("Max-Age");
  });

  it("reuses a singleton browser client across calls", async () => {
    const { createSupabaseBrowser } = await import("@/lib/supabase/client");

    createSupabaseBrowser({ rememberSession: false });
    createSupabaseBrowser({ rememberSession: true });

    expect(createBrowserClientMock).toHaveBeenCalledTimes(1);
    expect(createBrowserClientMock.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({ isSingleton: true }),
    );
  });

  it("applies the current persistence cookie even when the singleton already exists", async () => {
    const {
      createSupabaseBrowser,
      setBrowserSessionPersistence,
    } = await import("@/lib/supabase/client");

    createSupabaseBrowser({ rememberSession: true });
    setBrowserSessionPersistence("session");

    const [, , options] = createBrowserClientMock.mock.calls[0];
    options.cookies.setAll([
      {
        name: "sb-demo-auth-token",
        value: "token",
        options: { path: "/", maxAge: 10 },
      },
    ]);

    expect(document.cookie).toContain("sb-demo-auth-token=token");
    expect(document.cookie).not.toContain("Max-Age");
  });
});
