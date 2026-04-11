import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

import { createSupabaseServer } from "@/lib/supabase/server";
import { GET } from "../route";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();

function makeRequest(url: string) {
  return new NextRequest(new URL(url));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServer).mockResolvedValue({
    auth: {
      exchangeCodeForSession,
      verifyOtp,
    },
  } as never);
  exchangeCodeForSession.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("redirects unsafe next values to /onboarding for code flow", async () => {
    const response = await GET(
      makeRequest("http://localhost/auth/callback?code=abc&next=https://evil.example"),
    );

    expect(response.headers.get("location")).toBe("http://localhost/onboarding");
  });

  it("preserves safe local next values", async () => {
    const response = await GET(
      makeRequest("http://localhost/auth/callback?code=abc&next=/app/home?tab=team"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/app/home?tab=team",
    );
  });

  it("always uses reset-password for recovery links", async () => {
    const response = await GET(
      makeRequest(
        "http://localhost/auth/callback?token_hash=hash&type=recovery&next=https://evil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/reset-password",
    );
  });
});
