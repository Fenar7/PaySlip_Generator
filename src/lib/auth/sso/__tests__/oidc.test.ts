import { createHmac } from "crypto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthorizationUrl,
  decodeJwtUnsafe,
  validateIdTokenClaims,
  generateOidcState,
  parseOidcState,
  type OidcConfig,
  type OidcDiscoveryDocument,
  type OidcIdTokenClaims,
} from "../oidc";

describe("OIDC Connector", () => {
  const mockConfig: OidcConfig = {
    issuerUrl: "https://accounts.example.com",
    clientId: "test-client-id",
    clientSecret: "test-secret",
    redirectUri: "http://localhost:3000/api/auth/oidc/callback",
    scopes: ["openid", "email", "profile"],
  };

  const mockDiscovery: OidcDiscoveryDocument = {
    issuer: "https://accounts.example.com",
    authorization_endpoint: "https://accounts.example.com/authorize",
    token_endpoint: "https://accounts.example.com/token",
    jwks_uri: "https://accounts.example.com/.well-known/jwks.json",
  };

  beforeEach(() => {
    process.env.SSO_SESSION_SECRET = "test-oidc-state-secret";
  });

  describe("PKCE", () => {
    it("generates a code verifier of correct length", () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThan(40);
      // base64url safe characters
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("generates unique code verifiers", () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toEqual(v2);
    });

    it("derives S256 code challenge from verifier", () => {
      const verifier = "test-verifier-string-1234567890abcdef";
      const challenge = generateCodeChallenge(verifier);
      expect(challenge.length).toBeGreaterThan(0);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("same verifier produces same challenge", () => {
      const verifier = generateCodeVerifier();
      const c1 = generateCodeChallenge(verifier);
      const c2 = generateCodeChallenge(verifier);
      expect(c1).toEqual(c2);
    });
  });

  describe("buildAuthorizationUrl", () => {
    it("builds a valid authorization URL with PKCE params", () => {
      const url = buildAuthorizationUrl({
        config: mockConfig,
        discovery: mockDiscovery,
        state: "test-state",
        nonce: "test-nonce",
        codeVerifier: "test-verifier",
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe("https://accounts.example.com");
      expect(parsed.pathname).toBe("/authorize");
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("redirect_uri")).toBe(mockConfig.redirectUri);
      expect(parsed.searchParams.get("scope")).toBe("openid email profile");
      expect(parsed.searchParams.get("state")).toBe("test-state");
      expect(parsed.searchParams.get("nonce")).toBe("test-nonce");
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
      expect(parsed.searchParams.get("code_challenge")).toBeTruthy();
    });
  });

  describe("decodeJwtUnsafe", () => {
    it("decodes a valid JWT", () => {
      const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "key-1" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          iss: "https://accounts.example.com",
          sub: "user-123",
          aud: "test-client-id",
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          email: "user@example.com",
        })
      ).toString("base64url");
      const signature = "fake-signature";
      const token = `${header}.${payload}.${signature}`;

      const result = decodeJwtUnsafe(token);
      expect(result.header.alg).toBe("RS256");
      expect(result.header.kid).toBe("key-1");
      expect(result.payload.iss).toBe("https://accounts.example.com");
      expect(result.payload.email).toBe("user@example.com");
    });

    it("throws on invalid JWT format", () => {
      expect(() => decodeJwtUnsafe("not-a-jwt")).toThrow("Invalid JWT format");
      expect(() => decodeJwtUnsafe("only.two")).toThrow("Invalid JWT format");
    });
  });

  describe("validateIdTokenClaims", () => {
    const validClaims: OidcIdTokenClaims = {
      iss: "https://accounts.example.com",
      sub: "user-123",
      aud: "test-client-id",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      email: "user@example.com",
      nonce: "expected-nonce",
    };

    it("accepts valid claims", () => {
      const result = validateIdTokenClaims(validClaims, mockConfig, "expected-nonce");
      expect(result.valid).toBe(true);
    });

    it("rejects mismatched issuer", () => {
      const result = validateIdTokenClaims(
        { ...validClaims, iss: "https://evil.com" },
        mockConfig
      );
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain("Issuer mismatch");
    });

    it("rejects mismatched audience", () => {
      const result = validateIdTokenClaims(
        { ...validClaims, aud: "wrong-client" },
        mockConfig
      );
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain("Audience");
    });

    it("accepts audience as array containing client_id", () => {
      const result = validateIdTokenClaims(
        { ...validClaims, aud: ["test-client-id", "another-aud"] },
        mockConfig
      );
      expect(result.valid).toBe(true);
    });

    it("rejects expired token", () => {
      const result = validateIdTokenClaims(
        { ...validClaims, exp: Math.floor(Date.now() / 1000) - 120 },
        mockConfig
      );
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain("expired");
    });

    it("rejects token issued in future", () => {
      const result = validateIdTokenClaims(
        { ...validClaims, iat: Math.floor(Date.now() / 1000) + 120 },
        mockConfig
      );
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain("future");
    });

    it("rejects nonce mismatch", () => {
      const result = validateIdTokenClaims(validClaims, mockConfig, "wrong-nonce");
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain("Nonce");
    });

    it("skips nonce validation when not provided", () => {
      const result = validateIdTokenClaims(validClaims, mockConfig);
      expect(result.valid).toBe(true);
    });

    it("accepts issuer with trailing slash normalization", () => {
      const result = validateIdTokenClaims(
        { ...validClaims, iss: "https://accounts.example.com" },
        { ...mockConfig, issuerUrl: "https://accounts.example.com/" }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("OIDC State Management", () => {
    it("generates state with orgSlug embedded", () => {
      const { state, nonce, codeVerifier } = generateOidcState("my-org");
      expect(state.length).toBeGreaterThan(0);
      expect(nonce.length).toBe(32); // 16 bytes hex
      expect(codeVerifier.length).toBeGreaterThan(40);

      const parsed = parseOidcState(state);
      expect(parsed).not.toBeNull();
      expect(parsed?.orgSlug).toBe("my-org");
      expect(parsed?.nonce).toBe(nonce);
    });

    it("rejects expired state (>10 minutes)", () => {
      const body = Buffer.from(
        JSON.stringify({ orgSlug: "test", nonce: "abc", ts: Date.now() - 11 * 60 * 1000 })
      ).toString("base64url");
      const signature = createHmac("sha256", process.env.SSO_SESSION_SECRET!)
        .update(body)
        .digest("base64url");
      const state = `${body}.${signature}`;
      expect(parseOidcState(state)).toBeNull();
    });

    it("rejects malformed state", () => {
      expect(parseOidcState("not-base64")).toBeNull();
      expect(parseOidcState("")).toBeNull();
    });

    it("rejects state missing required fields", () => {
      const body = Buffer.from(
        JSON.stringify({ orgSlug: "test", ts: Date.now() })
      ).toString("base64url");
      const signature = createHmac("sha256", process.env.SSO_SESSION_SECRET!)
        .update(body)
        .digest("base64url");
      const state = `${body}.${signature}`;
      expect(parseOidcState(state)).toBeNull();
    });

    it("rejects tampered state bodies", () => {
      const { state } = generateOidcState("my-org");
      const [body, signature] = state.split(".");
      const tamperedBody = Buffer.from(
        JSON.stringify({ orgSlug: "other-org", nonce: "abc", ts: Date.now() })
      ).toString("base64url");
      const tamperedState = `${tamperedBody}.${signature ?? body}`;
      expect(parseOidcState(tamperedState)).toBeNull();
    });

    it("preserves the code verifier for the callback exchange", () => {
      const { state, codeVerifier } = generateOidcState("my-org");
      const parsed = parseOidcState(state);
      expect(parsed?.codeVerifier).toBe(codeVerifier);
      expect(parsed?.orgSlug).toBe("my-org");
    });
  });
});
