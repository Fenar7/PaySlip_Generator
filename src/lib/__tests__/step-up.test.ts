import { describe, it, expect, beforeEach, vi } from "vitest";
import { signStepUpToken, verifyStepUpToken } from "../step-up";

beforeEach(() => {
  vi.stubEnv("TOTP_SESSION_SECRET", "test-secret-32-bytes-long-xxxxx1234567890");
  vi.stubEnv("NODE_ENV", "test");
});

describe("signStepUpToken / verifyStepUpToken", () => {
  it("signs and verifies a valid step-up token", () => {
    const token = signStepUpToken("user_123", "password");
    const method = verifyStepUpToken(token, "user_123");
    expect(method).toBe("password");
  });

  it("returns the correct method for each type", () => {
    for (const m of ["password", "totp", "passkey"] as const) {
      const token = signStepUpToken("user_1", m);
      const result = verifyStepUpToken(token, "user_1");
      expect(result).toBe(m);
    }
  });

  it("rejects a token with wrong userId", () => {
    const token = signStepUpToken("user_1", "password");
    const result = verifyStepUpToken(token, "user_2");
    expect(result).toBeNull();
  });

  it("rejects a tampered token", () => {
    const token = signStepUpToken("user_1", "password");
    const tampered = token + "x";
    const result = verifyStepUpToken(tampered, "user_1");
    expect(result).toBeNull();
  });

  it("rejects a token with wrong format", () => {
    const result = verifyStepUpToken("not-a-valid-token", "user_1");
    expect(result).toBeNull();
  });

  it("rejects an empty token", () => {
    const result = verifyStepUpToken("", "user_1");
    expect(result).toBeNull();
  });

  it("rejects a token with modified payload but original signature", () => {
    const token = signStepUpToken("user_1", "password");
    const [payload, sig] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    decoded.sub = "user_2";
    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${sig}`;
    const result = verifyStepUpToken(tamperedToken, "user_1");
    expect(result).toBeNull();
  });

  it("returns null for a token with different body/signature separator count", () => {
    const result = verifyStepUpToken("a.b.c.d", "user_1");
    expect(result).toBeNull();
  });
});