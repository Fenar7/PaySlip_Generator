import { describe, it, expect } from "vitest";
import {
  generateClientId,
  generateClientSecret,
  generateAccessToken,
  generateRefreshToken,
  generateAuthCode,
  hashSecret,
  verifySecret,
  hashToken,
  validateScopes,
  validateRedirectUri,
  VALID_SCOPES,
} from "../utils";

describe("OAuth utils", () => {
  describe("generateClientId", () => {
    it("starts with 'slipwise_'", () => {
      const id = generateClientId();
      expect(id).toMatch(/^slipwise_[a-f0-9]{32}$/);
    });

    it("generates unique values", () => {
      const a = generateClientId();
      const b = generateClientId();
      expect(a).not.toBe(b);
    });
  });

  describe("generateClientSecret", () => {
    it("starts with 'sk_'", () => {
      const secret = generateClientSecret();
      expect(secret).toMatch(/^sk_[a-f0-9]{64}$/);
    });
  });

  describe("generateAccessToken", () => {
    it("starts with 'sat_'", () => {
      const token = generateAccessToken();
      expect(token).toMatch(/^sat_[a-f0-9]{96}$/);
    });
  });

  describe("generateRefreshToken", () => {
    it("starts with 'srt_'", () => {
      const token = generateRefreshToken();
      expect(token).toMatch(/^srt_[a-f0-9]{96}$/);
    });
  });

  describe("generateAuthCode", () => {
    it("generates a 64-char hex string", () => {
      const code = generateAuthCode();
      expect(code).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("hashSecret (bcrypt)", () => {
    it("hashes and verifies a secret", async () => {
      const raw = "my-secret-value";
      const hashed = await hashSecret(raw);
      expect(hashed).not.toBe(raw);
      expect(await verifySecret(raw, hashed)).toBe(true);
    });

    it("rejects wrong secret", async () => {
      const hashed = await hashSecret("correct-secret");
      expect(await verifySecret("wrong-secret", hashed)).toBe(false);
    });
  });

  describe("hashToken (SHA-256)", () => {
    it("produces consistent SHA-256 hash", () => {
      const token = "sat_abc123";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("different tokens produce different hashes", () => {
      expect(hashToken("token_a")).not.toBe(hashToken("token_b"));
    });
  });

  describe("validateScopes", () => {
    it("returns true for valid scopes", () => {
      expect(validateScopes(["invoices:read", "customers:write"])).toBe(true);
    });

    it("returns true for all valid scopes", () => {
      expect(validateScopes([...VALID_SCOPES])).toBe(true);
    });

    it("returns false for invalid scopes", () => {
      expect(validateScopes(["invoices:read", "invalid:scope"])).toBe(false);
    });

    it("returns true for empty scopes array", () => {
      expect(validateScopes([])).toBe(true);
    });
  });

  describe("validateRedirectUri", () => {
    const allowed = ["https://example.com/callback", "https://app.example.com/auth"];

    it("returns true for exact match", () => {
      expect(validateRedirectUri("https://example.com/callback", allowed)).toBe(true);
    });

    it("returns false for non-matching URI", () => {
      expect(validateRedirectUri("https://evil.com/callback", allowed)).toBe(false);
    });

    it("returns false for partial match", () => {
      expect(validateRedirectUri("https://example.com/callback/extra", allowed)).toBe(false);
    });
  });
});
