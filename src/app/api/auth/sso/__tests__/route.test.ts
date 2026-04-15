import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/sso", () => ({
  getSsoRuntimeDisabledReason: vi.fn(),
  createSsoAuthnRequest: vi.fn(),
  completeSsoLogin: vi.fn(),
  getPublicSsoFailureReason: vi.fn(),
  recordSsoFailure: vi.fn(),
}));

vi.mock("@/lib/sso-session", () => ({
  setSsoSessionCookie: vi.fn(),
}));

import { GET as initiateSso } from "../[orgSlug]/initiate/route";
import { POST as callbackSso } from "../[orgSlug]/callback/route";
import {
  completeSsoLogin,
  createSsoAuthnRequest,
  getPublicSsoFailureReason,
  getSsoRuntimeDisabledReason,
  recordSsoFailure,
} from "@/lib/sso";
import { setSsoSessionCookie } from "@/lib/sso-session";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url), init);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSsoRuntimeDisabledReason).mockReturnValue(null);
});

describe("GET /api/auth/sso/[orgSlug]/initiate", () => {
  it("redirects to the IdP for redirect binding", async () => {
    vi.mocked(createSsoAuthnRequest).mockResolvedValue({
      kind: "redirect",
      redirectUrl: "https://idp.example.com/login?SAMLRequest=abc",
    });

    const response = await initiateSso(
      makeRequest("http://localhost/api/auth/sso/acme/initiate?next=%2Fapp%2Fhome"),
      { params: Promise.resolve({ orgSlug: "acme" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://idp.example.com/login?SAMLRequest=abc",
    );
    expect(createSsoAuthnRequest).toHaveBeenCalledWith({
      orgSlug: "acme",
      mode: "LOGIN",
      next: "/app/home",
    });
  });

  it("returns an auto-submitting HTML form for post binding", async () => {
    vi.mocked(createSsoAuthnRequest).mockResolvedValue({
      kind: "post",
      actionUrl: "https://idp.example.com/post",
      samlRequest: "encoded-request",
      relayState: "_request-1",
    });

    const response = await initiateSso(
      makeRequest("http://localhost/api/auth/sso/acme/initiate?mode=test"),
      { params: Promise.resolve({ orgSlug: "acme" }) },
    );

    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('action="https://idp.example.com/post"');
    expect(html).toContain('name="SAMLRequest" value="encoded-request"');
    expect(html).toContain('name="RelayState" value="_request-1"');
    expect(createSsoAuthnRequest).toHaveBeenCalledWith({
      orgSlug: "acme",
      mode: "TEST",
      next: null,
    });
  });
});

describe("POST /api/auth/sso/[orgSlug]/callback", () => {
  it("sets the SSO cookie and redirects to the resolved destination on success", async () => {
    vi.mocked(completeSsoLogin).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      mode: "LOGIN",
      redirectTo: "/app/home",
    });

    const formData = new FormData();
    formData.set("SAMLResponse", Buffer.from("<Assertion />").toString("base64"));
    formData.set("RelayState", "_request-1");

    const response = await callbackSso(
      makeRequest("http://localhost/api/auth/sso/acme/callback", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ orgSlug: "acme" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/app/home");
    expect(setSsoSessionCookie).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        orgId: "org-1",
        userId: "user-1",
        mode: "sso",
      }),
    );
    expect(completeSsoLogin).toHaveBeenCalledWith({
      orgSlug: "acme",
      samlResponse: Buffer.from("<Assertion />").toString("base64"),
      relayState: "_request-1",
    });
  });

  it("records a failure and redirects to login when callback processing fails", async () => {
    vi.mocked(completeSsoLogin).mockRejectedValue(new Error("bad signature"));
    vi.mocked(getPublicSsoFailureReason).mockReturnValue("invalid_signature");

    const formData = new FormData();
    formData.set("SAMLResponse", Buffer.from("<Assertion />").toString("base64"));

    const response = await callbackSso(
      makeRequest("http://localhost/api/auth/sso/acme/callback", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ orgSlug: "acme" }) },
    );

    expect(recordSsoFailure).toHaveBeenCalledWith("acme", "invalid_signature");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/auth/login?org=acme&callbackUrl=%2Fapp%2Fhome&sso_error=invalid_signature",
    );
  });
});
