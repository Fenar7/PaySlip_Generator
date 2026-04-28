import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
  type CipherGCM,
  type DecipherGCM,
} from "crypto";

// v2 = AES-256-GCM (authenticated encryption — tamper-detectable via auth tag)
// v1 = AES-256-CBC (legacy — decryptable for migration, never written by new code)
const ALGORITHM_GCM = "aes-256-gcm";
const ALGORITHM_CBC = "aes-256-cbc";
const IV_LENGTH_GCM = 12; // 96-bit recommended for GCM
const IV_LENGTH_CBC = 16;
const KEY_LENGTH = 32;

/**
 * Stored format:
 *   v2  → `v2:<iv_24hex>:<ciphertext_hex>:<tag_32hex>`
 *   v1  → `<iv_32hex>:<ciphertext_hex>` (legacy CBC — read-only)
 */
function getDerivedKey(): Buffer {
  const raw = process.env.RAZORPAY_ENCRYPTION_KEY ?? "";
  if (!raw) {
    throw new Error("RAZORPAY_ENCRYPTION_KEY is not set");
  }
  // Accept hex-encoded 64-char key or raw 32-byte key
  const buf = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "utf8");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `RAZORPAY_ENCRYPTION_KEY must be 32 bytes (raw) or 64 hex chars. Got ${buf.length} bytes.`,
    );
  }
  return buf;
}

/**
 * Encrypt plaintext using AES-256-GCM (authenticated encryption).
 * Returns `v2:<iv_hex>:<ciphertext_hex>:<tag_hex>` — safe to store in DB.
 * The authentication tag makes ciphertext tampering cryptographically detectable.
 */
export function encryptGatewaySecret(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH_GCM);
  const cipher = createCipheriv(ALGORITHM_GCM, key, iv) as CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2:${iv.toString("hex")}:${ciphertext.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypt a value produced by `encryptGatewaySecret`.
 * Supports both v2 (AES-256-GCM, authenticated) and legacy v1 (AES-256-CBC).
 * v1 support exists only for tokens that predate the GCM upgrade; all new writes use v2.
 */
export function decryptGatewaySecret(stored: string): string {
  const key = getDerivedKey();

  if (stored.startsWith("v2:")) {
    // v2 AES-256-GCM: v2:<iv_24hex>:<ciphertext_hex>:<tag_32hex>
    const parts = stored.split(":");
    const ivHex = parts[1];
    const ciphertextHex = parts[2];
    const tagHex = parts[3];
    if (!ivHex || !ciphertextHex || !tagHex) {
      throw new Error("Invalid v2 encrypted gateway secret format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM_GCM, key, iv) as DecipherGCM;
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  }

  // Legacy v1 AES-256-CBC: <iv_32hex>:<ciphertext_hex>
  // Kept for reading tokens encrypted before the GCM upgrade. Never written by new code.
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) {
    throw new Error("Invalid encrypted gateway secret format");
  }
  const ivHex = stored.slice(0, colonIdx);
  const ciphertextHex = stored.slice(colonIdx + 1);
  if (!ivHex || !ciphertextHex) {
    throw new Error("Invalid encrypted gateway secret format");
  }
  if (ivHex.length !== IV_LENGTH_CBC * 2) {
    throw new Error("Invalid v1 encrypted gateway secret: unexpected IV length");
  }
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM_CBC, key, iv);
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
