/**
 * TOTP 2FA service — wraps otpauth + qrcode for enrollment and verification.
 * Secrets are encrypted at rest using the existing AES-256-CBC gateway-secrets utility.
 * Recovery codes are bcrypt-hashed before storage.
 */
import { TOTP } from "otpauth";
import { createHash, randomBytes } from "crypto";
import { encryptGatewaySecret, decryptGatewaySecret } from "@/lib/crypto/gateway-secrets";

const TOTP_WINDOW = 1; // ±1 period tolerance
const RECOVERY_CODE_LENGTH = 10;
const RECOVERY_CODE_COUNT = 8;

/** Generate a new TOTP secret and its otpauth:// URI for QR-code display. */
export function generateTotpSecret(userEmail: string, issuer = "Slipwise"): {
  secret: string;
  uri: string;
} {
  const totp = new TOTP({
    issuer,
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    // otpauth generates a random secret when not provided
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/** Verify a 6-digit TOTP code against a raw base32 secret. */
export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    const totp = new TOTP({
      issuer: "Slipwise",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });
    const delta = totp.validate({ token: code, window: TOTP_WINDOW });
    return delta !== null;
  } catch {
    return false;
  }
}

/** Encrypt a TOTP secret (base32) for DB storage. */
export function encryptTotpSecret(secret: string): string {
  return encryptGatewaySecret(secret);
}

/** Decrypt a stored TOTP secret back to base32. */
export function decryptTotpSecret(encrypted: string): string {
  return decryptGatewaySecret(encrypted);
}

/** Generate `RECOVERY_CODE_COUNT` plaintext recovery codes (hex strings). */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(RECOVERY_CODE_LENGTH).toString("hex").toUpperCase().slice(0, 16)
  );
}

/** Hash a single recovery code using SHA-256 for storage. */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/**
 * Verify and consume a recovery code.
 * Returns the index of the consumed code (to remove it from stored array), or -1 on failure.
 */
export function findRecoveryCodeIndex(
  inputCode: string,
  storedHashes: string[]
): number {
  const needle = hashRecoveryCode(inputCode);
  return storedHashes.findIndex((h) => h === needle);
}
