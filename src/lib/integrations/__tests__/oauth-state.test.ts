import { describe, expect, it } from "vitest";
import {
  createIntegrationOAuthState,
  readIntegrationOAuthState,
} from "../oauth-state";

describe("integration OAuth state helpers", () => {
  it("round-trips a valid state payload", () => {
    const { state, cookieValue } = createIntegrationOAuthState(
      "quickbooks",
      "org-1",
      "user-1",
      1_000,
    );

    const result = readIntegrationOAuthState("quickbooks", cookieValue, 1_500);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe(state);
      expect(result.data.orgId).toBe("org-1");
      expect(result.data.userId).toBe("user-1");
    }
  });

  it("rejects expired state", () => {
    const { cookieValue } = createIntegrationOAuthState(
      "zoho",
      "org-1",
      "user-1",
      1_000,
    );

    expect(readIntegrationOAuthState("zoho", cookieValue, 1_000 + 700_000)).toEqual(
      { ok: false, error: "expired" },
    );
  });

  it("rejects provider mismatch", () => {
    const { cookieValue } = createIntegrationOAuthState(
      "quickbooks",
      "org-1",
      "user-1",
    );

    expect(readIntegrationOAuthState("zoho", cookieValue)).toEqual({
      ok: false,
      error: "provider_mismatch",
    });
  });

  it("rejects malformed cookie payloads", () => {
    expect(readIntegrationOAuthState("quickbooks", "not-base64")).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});
