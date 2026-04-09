import { describe, expect, it } from "vitest";
import {
  applySessionPersistenceToCookieOptions,
  getRememberedSupabaseCookieRefreshes,
  getSessionPersistenceCookie,
  getSessionPersistenceModeFromCookies,
  isSupabaseAuthCookie,
  isTerminalSupabaseAuthError,
  REMEMBER_ME_MAX_AGE,
  SESSION_PERSISTENCE_COOKIE,
} from "@/lib/supabase/session-persistence";

describe("session persistence helpers", () => {
  it("reads remembered mode from cookies", () => {
    expect(
      getSessionPersistenceModeFromCookies([
        { name: SESSION_PERSISTENCE_COOKIE, value: "remembered" },
      ]),
    ).toBe("remembered");
  });

  it("falls back to session mode when no preference cookie exists on the server", () => {
    expect(getSessionPersistenceModeFromCookies([])).toBe("session");
  });

  it("adds a 3 day maxAge for remembered cookies", () => {
    expect(
      applySessionPersistenceToCookieOptions("remembered", {
        path: "/",
        sameSite: "lax",
      }),
    ).toMatchObject({
      path: "/",
      sameSite: "lax",
      maxAge: REMEMBER_ME_MAX_AGE,
    });
  });

  it("removes persistence expiry metadata for session-only cookies", () => {
    expect(
      applySessionPersistenceToCookieOptions("session", {
        path: "/",
        sameSite: "lax",
        maxAge: REMEMBER_ME_MAX_AGE,
        expires: new Date("2026-04-12T00:00:00Z"),
      }),
    ).toEqual({
      path: "/",
      sameSite: "lax",
    });
  });

  it("builds a remembered persistence cookie with the configured lifetime", () => {
    expect(getSessionPersistenceCookie("remembered")).toMatchObject({
      name: SESSION_PERSISTENCE_COOKIE,
      value: "remembered",
      options: {
        path: "/",
        sameSite: "lax",
        maxAge: REMEMBER_ME_MAX_AGE,
      },
    });
  });

  it("selects only Supabase auth cookies for remembered refreshes", () => {
    expect(
      getRememberedSupabaseCookieRefreshes([
        { name: "sb-demo-auth-token", value: "token" },
        { name: "sb-demo-auth-token.0", value: "chunk" },
        { name: SESSION_PERSISTENCE_COOKIE, value: "remembered" },
      ]),
    ).toEqual([
      {
        name: "sb-demo-auth-token",
        value: "token",
        options: expect.objectContaining({ maxAge: REMEMBER_ME_MAX_AGE }),
      },
      {
        name: "sb-demo-auth-token.0",
        value: "chunk",
        options: expect.objectContaining({ maxAge: REMEMBER_ME_MAX_AGE }),
      },
    ]);
  });

  it("recognizes terminal invalid-session auth errors", () => {
    expect(
      isTerminalSupabaseAuthError({
        message: "AuthApiError: refresh_token_not_found",
        status: 403,
      }),
    ).toBe(true);
  });

  it("does not treat transient upstream errors as terminal", () => {
    expect(
      isTerminalSupabaseAuthError({
        message: "fetch failed",
        status: 500,
      }),
    ).toBe(false);
  });

  it("matches Supabase auth cookie names including chunked values", () => {
    expect(isSupabaseAuthCookie("sb-demo-auth-token")).toBe(true);
    expect(isSupabaseAuthCookie("__Host-sb-demo-auth-token.0")).toBe(true);
    expect(isSupabaseAuthCookie("other-cookie")).toBe(false);
  });
});
