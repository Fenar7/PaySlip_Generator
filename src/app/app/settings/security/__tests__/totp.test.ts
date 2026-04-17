import { describe, it, expect, vi, beforeAll } from "vitest";
import { TOTP } from "otpauth";

// Stub gateway-secrets so tests don't need a real encryption key
vi.mock("@/lib/crypto/gateway-secrets", () => ({
  encryptGatewaySecret: (val: string) => `enc:${val}`,
  decryptGatewaySecret: (val: string) => val.replace(/^enc:/, ""),
}));

import {
  generateTotpSecret,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  findRecoveryCodeIndex,
} from "@/lib/totp/index";

describe("generateTotpSecret", () => {
  it("returns a non-empty secret and a valid otpauth URI", () => {
    const { secret, uri } = generateTotpSecret("test@example.com");
    expect(secret).toBeTruthy();
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("Slipwise");
    expect(uri).toContain("test%40example.com");
  });

  it("embeds the issuer in the URI", () => {
    const { uri } = generateTotpSecret("u@x.com", "MyApp");
    expect(uri).toContain("MyApp");
  });
});

describe("verifyTotpCode", () => {
  it("validates a correct code generated from the secret", () => {
    const { secret, uri } = generateTotpSecret("user@test.com");
    void uri;
    const totp = new TOTP({ secret, algorithm: "SHA1", digits: 6, period: 30 });
    const validCode = totp.generate();
    expect(verifyTotpCode(secret, validCode)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const { secret } = generateTotpSecret("user@test.com");
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });

  it("rejects a code that is not 6 digits", () => {
    const { secret } = generateTotpSecret("user@test.com");
    expect(verifyTotpCode(secret, "abc")).toBe(false);
  });

  it("returns false on invalid/corrupted secret", () => {
    expect(verifyTotpCode("!!!invalid!!!", "123456")).toBe(false);
  });
});

describe("encryptTotpSecret / decryptTotpSecret", () => {
  it("round-trips through encryption", () => {
    const plaintext = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptTotpSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decryptTotpSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("generateRecoveryCodes", () => {
  it("generates 8 codes", () => {
    expect(generateRecoveryCodes()).toHaveLength(8);
  });

  it("generates unique codes", () => {
    const codes = generateRecoveryCodes();
    const unique = new Set(codes);
    expect(unique.size).toBe(8);
  });

  it("each code is 16 characters long", () => {
    const codes = generateRecoveryCodes();
    for (const code of codes) {
      expect(code.length).toBe(16);
    }
  });
});

describe("hashRecoveryCode", () => {
  it("produces a deterministic 64-char hex string", () => {
    const hash = hashRecoveryCode("ABCD1234EFGH5678");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashRecoveryCode("ABCD1234EFGH5678"));
  });

  it("is case-insensitive (normalises to uppercase before hashing)", () => {
    expect(hashRecoveryCode("abcd1234efgh5678")).toBe(hashRecoveryCode("ABCD1234EFGH5678"));
  });
});

describe("findRecoveryCodeIndex", () => {
  it("finds the correct index for a valid code", () => {
    const codes = ["CODE-A", "CODE-B", "CODE-C"];
    const hashes = codes.map(hashRecoveryCode);
    expect(findRecoveryCodeIndex("CODE-B", hashes)).toBe(1);
  });

  it("returns -1 for an invalid code", () => {
    const codes = ["CODE-A", "CODE-B"];
    const hashes = codes.map(hashRecoveryCode);
    expect(findRecoveryCodeIndex("WRONG-CODE", hashes)).toBe(-1);
  });

  it("returns -1 when stored hashes array is empty", () => {
    expect(findRecoveryCodeIndex("CODE-A", [])).toBe(-1);
  });
});
