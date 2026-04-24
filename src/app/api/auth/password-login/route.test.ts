import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createServerClientMock,
  signInWithPasswordMock,
  redeemBreakGlassCodeMock,
  setSsoSessionCookieMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  redeemBreakGlassCodeMock: vi.fn(),
  setSsoSessionCookieMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("@/lib/sso", () => ({
  redeemBreakGlassCode: redeemBreakGlassCodeMock,
}));

vi.mock("@/lib/sso-session", () => ({
  setSsoSessionCookie: setSsoSessionCookieMock,
}));

import { POST } from "./route";

function makeRequest(body: unknown, cookieHeader?: string) {
  return new NextRequest("http://localhost/api/auth/password-login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInWithPasswordMock.mockResolvedValue({ error: null });
  redeemBreakGlassCodeMock.mockResolvedValue({
    orgId: "org_123",
    userId: "user_123",
  });
  createServerClientMock.mockReturnValue({
    auth: {
      signInWithPassword: signInWithPasswordMock,
    },
  });
});

describe("POST /api/auth/password-login", () => {
  it("signs in on the server and returns a safe redirect target", async () => {
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "secret123",
        callbackUrl: "/app/home?tab=team",
      }),
    );
    const body = await response.json();

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    });
    expect(body).toEqual({ success: true, redirectTo: "/app/home?tab=team" });
  });

  it("downgrades unsafe redirects to onboarding", async () => {
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "secret123",
        callbackUrl: "https://evil.example",
      }),
    );
    const body = await response.json();

    expect(body.redirectTo).toBe("/onboarding");
  });

  it("returns email_not_confirmed as a handled error", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { message: "Email not confirmed", code: "email_not_confirmed" },
    });

    const response = await POST(
      makeRequest({ email: "user@example.com", password: "secret123" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Email not confirmed",
      code: "email_not_confirmed",
    });
  });

  it("requires org slug when redeeming break-glass codes", async () => {
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "secret123",
        breakGlassCode: "ABCD",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Enter your organization slug to redeem a break-glass code.",
    });
  });

  it("redeems break-glass codes on the server after password sign-in", async () => {
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "secret123",
        orgSlug: "acme",
        breakGlassCode: "ABCD",
      }),
    );

    expect(response.status).toBe(200);
    expect(redeemBreakGlassCodeMock).toHaveBeenCalledWith({
      orgSlug: "acme",
      email: "user@example.com",
      code: "ABCD",
    });
    expect(setSsoSessionCookieMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: "org_123",
        userId: "user_123",
        mode: "break_glass",
      }),
    );
  });

  it("clears stale Supabase auth cookies before reissuing session cookies", async () => {
    const response = await POST(
      makeRequest(
        {
          email: "user@example.com",
          password: "secret123",
        },
        "sb-demo-auth-token=stale; other=value",
      ),
    );

    const cookies = response.cookies.getAll();
    expect(cookies.some((cookie) => cookie.name === "sb-demo-auth-token")).toBe(true);
  });

  it("supports plain form posts by redirecting back with preserved email on failure", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { message: "Invalid email or password", code: "invalid_credentials" },
    });

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "wrong");
    formData.set("callbackUrl", "/app/home");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/password-login", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/login?error=Invalid+email+or+password&email=user%40example.com&callbackUrl=%2Fapp%2Fhome",
    );
  });

  it("supports plain form posts by redirecting to the destination on success", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "secret123");
    formData.set("callbackUrl", "/app/home");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/password-login", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/app/home");
  });

  it("uses the forwarded LAN host for plain form redirects", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { message: "Invalid login credentials", code: "invalid_credentials" },
    });

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "wrong");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/password-login", {
        method: "POST",
        headers: {
          host: "localhost:3001",
          "x-forwarded-host": "192.168.29.173:3001",
          "x-forwarded-proto": "http",
        },
        body: formData,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://192.168.29.173:3001/auth/login?error=Invalid+login+credentials&email=user%40example.com&callbackUrl=%2Fonboarding",
    );
  });
});
