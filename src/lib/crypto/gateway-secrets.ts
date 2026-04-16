import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getDerivedKey(): Buffer {
  const raw = process.env.RAZORPAY_ENCRYPTION_KEY ?? "";
  if (!raw) {
    throw new Error("RAZORPAY_ENCRYPTION_KEY is not set");
  }
  // Accept hex-encoded 64-char key or raw 32-byte key
  const buf = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "utf8");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `RAZORPAY_ENCRYPTION_KEY must be 32 bytes (raw) or 64 hex chars. Got ${buf.length} bytes.`
    );
  }
  return buf;
}

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns `${iv_hex}:${ciphertext_hex}` — safe to store in DB.
 */
export function encryptGatewaySecret(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value previously encrypted by `encryptGatewaySecret`.
 */
export function decryptGatewaySecret(stored: string): string {
  const key = getDerivedKey();
  const [ivHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !ciphertextHex) {
    throw new Error("Invalid encrypted gateway secret format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Timing-safe compare for webhook signature verification.
 * Returns true only if both strings are identical in length and content.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still run a comparison to avoid timing leak on length
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
