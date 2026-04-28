import { createCipheriv, randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptGatewaySecret,
  encryptGatewaySecret,
  timingSafeStringEqual,
} from "@/lib/crypto/gateway-secrets";

// 64 hex chars = 32 bytes — valid for AES-256
const TEST_KEY = "a".repeat(64);

describe("gateway secrets (AES-256-GCM)", () => {
  const originalEnv = process.env.RAZORPAY_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.RAZORPAY_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RAZORPAY_ENCRYPTION_KEY;
    } else {
      process.env.RAZORPAY_ENCRYPTION_KEY = originalEnv;
    }
  });

  it("produces v2-prefixed ciphertext", () => {
    const encrypted = encryptGatewaySecret("hello");
    expect(encrypted).toMatch(/^v2:/);
  });

  it("round-trips: decrypt(encrypt(x)) === x", () => {
    const plaintext = "super-secret-oauth-token-value";
    const encrypted = encryptGatewaySecret(plaintext);
    const decrypted = decryptGatewaySecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV per call)", () => {
    const a = encryptGatewaySecret("token");
    const b = encryptGatewaySecret("token");
    expect(a).not.toBe(b);
  });

  it("v2 output has exactly four colon-separated parts: v2, iv24hex, ciphertext, tag32hex", () => {
    const encrypted = encryptGatewaySecret("data");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v2");
    expect(parts[1]).toHaveLength(24); // 12-byte IV → 24 hex chars
    expect(parts[3]).toHaveLength(32); // 16-byte auth tag → 32 hex chars
  });

  it("rejects tampered ciphertext via authentication tag mismatch (AEAD guarantee)", () => {
    const encrypted = encryptGatewaySecret("sensitive-data");
    const parts = encrypted.split(":");
    // Flip last 2 hex chars of ciphertext
    const lastTwo = parts[2].slice(-2);
    const flipped = lastTwo === "00" ? "ff" : "00";
    const tampered = `v2:${parts[1]}:${parts[2].slice(0, -2)}${flipped}:${parts[3]}`;
    expect(() => decryptGatewaySecret(tampered)).toThrow();
  });

  it("rejects tampered authentication tag", () => {
    const encrypted = encryptGatewaySecret("sensitive-data");
    const parts = encrypted.split(":");
    const badTag = "0".repeat(32);
    expect(() => decryptGatewaySecret(`v2:${parts[1]}:${parts[2]}:${badTag}`)).toThrow();
  });

  it("decrypts legacy v1 CBC format for backward migration compatibility", () => {
    // Build a v1 CBC token directly so this test doesn't depend on the old encryptGatewaySecret
    const key = Buffer.from(TEST_KEY, "hex");
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const ciphertext = Buffer.concat([cipher.update("legacy-value", "utf8"), cipher.final()]);
    const v1Token = `${iv.toString("hex")}:${ciphertext.toString("hex")}`;

    const result = decryptGatewaySecret(v1Token);
    expect(result).toBe("legacy-value");
  });

  it("throws when RAZORPAY_ENCRYPTION_KEY is not set", () => {
    delete process.env.RAZORPAY_ENCRYPTION_KEY;
    expect(() => encryptGatewaySecret("test")).toThrow("RAZORPAY_ENCRYPTION_KEY is not set");
  });

  it("throws on invalid v2 format (missing tag part)", () => {
    expect(() => decryptGatewaySecret("v2:aabbcc:ddeeff")).toThrow();
  });
});

describe("timingSafeStringEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeStringEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeStringEqual("abc123", "abc124")).toBe(false);
  });

  it("returns false for strings of different lengths without short-circuit timing leak", () => {
    expect(timingSafeStringEqual("short", "much-longer-string")).toBe(false);
  });
});
