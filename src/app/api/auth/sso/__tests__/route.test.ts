import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
    },
    ssoConfig: {
      findUnique: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    userOrgPreference: {
      upsert: vi.fn(),
    },
  },
}));

import { GET as initiateSso } from "../[orgSlug]/initiate/route";
import { POST as handleSsoCallback } from "../[orgSlug]/callback/route";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url), init);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("FEATURE_SSO_ENABLED", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SSO runtime disablement", () => {
  it("returns 503 for initiate in production", async () => {
    const response = await initiateSso(
      makeRequest("http://localhost/api/auth/sso/acme/initiate"),
      { params: Promise.resolve({ orgSlug: "acme" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("disabled in production");
  });

  it("returns 503 for callback in production even with a SAML response", async () => {
    const formData = new FormData();
    formData.set("SAMLResponse", Buffer.from("<Assertion />").toString("base64"));

    const response = await handleSsoCallback(
      makeRequest("http://localhost/api/auth/sso/acme/callback", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ orgSlug: "acme" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("disabled in production");
  });
});
