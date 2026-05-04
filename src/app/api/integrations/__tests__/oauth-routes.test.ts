import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
  hasRole: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    member: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/integrations/quickbooks", () => ({
  getAuthUrl: vi.fn((state: string) => `https://qb.example/auth?state=${state}`),
  handleCallback: vi.fn(),
}));

vi.mock("@/lib/integrations/zoho", () => ({
  getAuthUrl: vi.fn((state: string) => `https://zoho.example/auth?state=${state}`),
  handleCallback: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  createIntegrationOAuthState,
  getIntegrationOAuthStateCookieName,
} from "@/lib/integrations/oauth-state";
import {
  getAuthUrl as getQuickBooksAuthUrl,
  handleCallback as handleQuickBooksCallback,
} from "@/lib/integrations/quickbooks";
import {
  getAuthUrl as getZohoAuthUrl,
  handleCallback as handleZohoCallback,
} from "@/lib/integrations/zoho";
import { GET as quickBooksConnect } from "../quickbooks/connect/route";
import { GET as quickBooksCallback } from "../quickbooks/callback/route";
import { GET as zohoConnect } from "../zoho/connect/route";
import { GET as zohoCallback } from "../zoho/callback/route";

function makeRequest(url: string) {
  return new NextRequest(new URL(url));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrgContext).mockResolvedValue({
    orgId: "org-1",
    userId: "user-1",
    role: "admin",
  });
  vi.mocked(createSupabaseServer).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
  } as never);
  vi.mocked(db.member.findUnique).mockResolvedValue({
    organizationId: "org-1",
  } as never);
});

describe("integration OAuth routes", () => {
  it("sets a bound QuickBooks state cookie during connect", async () => {
    const response = await quickBooksConnect();
    const stateCookie = response.cookies.get(
      getIntegrationOAuthStateCookieName("quickbooks"),
    );

    expect(response.headers.get("location")).toContain("https://qb.example/auth?state=");
    expect(stateCookie?.value).toBeTruthy();
    expect(getQuickBooksAuthUrl).toHaveBeenCalledTimes(1);
  });

  it("rejects expired QuickBooks callback state", async () => {
    const { state, cookieValue } = createIntegrationOAuthState(
      "quickbooks",
      "org-1",
      "user-1",
      1_000,
    );
    const request = makeRequest(
      `http://localhost/api/integrations/quickbooks/callback?code=abc&state=${state}&realmId=realm-1`,
    );
    request.cookies.set(
      getIntegrationOAuthStateCookieName("quickbooks"),
      cookieValue,
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000 + 700_000));

    const response = await quickBooksCallback(request);

    expect(response.headers.get("location")).toContain(
      "error=quickbooks_state_expired",
    );
    expect(handleQuickBooksCallback).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("clears state and completes Zoho callback for the initiating user", async () => {
    const { state, cookieValue } = createIntegrationOAuthState(
      "zoho",
      "org-1",
      "user-1",
    );
    const request = makeRequest(
      `http://localhost/api/integrations/zoho/callback?code=abc&state=${state}`,
    );
    request.cookies.set(getIntegrationOAuthStateCookieName("zoho"), cookieValue);

    const response = await zohoCallback(request);

    expect(handleZohoCallback).toHaveBeenCalledWith("org-1", "abc");
    expect(response.headers.get("location")).toContain("connected=zoho");
    expect(
      response.cookies.get(getIntegrationOAuthStateCookieName("zoho"))?.value,
    ).toBe("");
  });

  it("rejects invalid Zoho callback state", async () => {
    const request = makeRequest(
      "http://localhost/api/integrations/zoho/callback?code=abc&state=forged",
    );
    request.cookies.set(
      getIntegrationOAuthStateCookieName("zoho"),
      "malformed-cookie",
    );

    const response = await zohoCallback(request);

    expect(response.headers.get("location")).toContain("error=zoho_invalid_state");
    expect(handleZohoCallback).not.toHaveBeenCalled();
  });

  it("sets a bound Zoho state cookie during connect", async () => {
    const response = await zohoConnect();
    const stateCookie = response.cookies.get(
      getIntegrationOAuthStateCookieName("zoho"),
    );

    expect(response.headers.get("location")).toContain(
      "https://zoho.example/auth?state=",
    );
    expect(stateCookie?.value).toBeTruthy();
    expect(getZohoAuthUrl).toHaveBeenCalledTimes(1);
  });
});
