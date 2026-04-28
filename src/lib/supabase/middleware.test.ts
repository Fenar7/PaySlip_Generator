import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClientMock, getUserMock, signOutMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { updateSession } from "./middleware";

beforeEach(() => {
  vi.clearAllMocks();
  signOutMock.mockResolvedValue(undefined);
  getUserMock.mockResolvedValue({
    data: { user: null },
    error: { message: "Auth session missing!" },
  });
  createServerClientMock.mockReturnValue({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
    },
  });
});

describe("updateSession", () => {
  it("does not clear or warn when no Supabase auth cookies exist", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await updateSession(new NextRequest("http://localhost/auth/login"));

    expect(result.user).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("clears real invalid Supabase sessions when auth cookies are present", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await updateSession(
      new NextRequest("http://localhost/app/home", {
        headers: { cookie: "sb-demo-auth-token=stale" },
      }),
    );

    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(warnSpy).toHaveBeenCalledWith(
      "[middleware] Clearing invalid session:",
      "Auth session missing!",
    );
  });
});
