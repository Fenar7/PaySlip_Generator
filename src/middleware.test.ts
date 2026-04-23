import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "./middleware";

const { updateSession, rateLimitByIp } = vi.hoisted(() => ({
  updateSession: vi.fn(),
  rateLimitByIp: vi.fn(),
}));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp,
}));

vi.mock("@/lib/totp/challenge-session", () => ({
  TOTP_CHALLENGE_COOKIE: "sw_2fa",
  verifyChallengeToken: vi.fn(),
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    rateLimitByIp.mockResolvedValue({ success: true });
    updateSession.mockResolvedValue({
      user: null,
      supabaseResponse: NextResponse.next(),
    });
  });

  it("keeps public pdf-studio routes alive without supabase env", async () => {
    const response = await middleware(
      new NextRequest("https://example.com/pdf-studio/fill-sign"),
    );

    expect(updateSession).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
  });

  it("still refreshes the session for public routes when supabase env exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    await middleware(new NextRequest("https://example.com/pdf-studio/ocr"));

    expect(updateSession).toHaveBeenCalledTimes(1);
  });
});
