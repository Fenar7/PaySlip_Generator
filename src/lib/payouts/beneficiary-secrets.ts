import crypto from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const AAD = Buffer.from("marketplace-payout-beneficiary:v1", "utf8");

function decodeEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  try {
    const base64Key = Buffer.from(trimmed, "base64");
    if (base64Key.length === 32) {
      return base64Key;
    }
  } catch {
    // Ignore invalid base64 and fall through to utf8 length validation.
  }

  const utf8Key = Buffer.from(trimmed, "utf8");
  if (utf8Key.length === 32) {
    return utf8Key;
  }

  throw new Error(
    "PAYOUT_DETAILS_ENCRYPTION_KEY must be 32 bytes encoded as raw text, base64, or hex.",
  );
}

function getEncryptionKey(): Buffer {
  const rawKey = env.PAYOUT_DETAILS_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      "Payout beneficiary storage is not configured. Set PAYOUT_DETAILS_ENCRYPTION_KEY before onboarding beneficiaries.",
    );
  }

  return decodeEncryptionKey(rawKey);
}

export function encryptPayoutSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  cipher.setAAD(AAD);

  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptPayoutSecret(payload: string): string {
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = payload.split(".");
  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    throw new Error("Invalid payout secret payload.");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function normalizeBankAccountNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function fingerprintBankAccountNumber(value: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeBankAccountNumber(value))
    .digest("hex");
}

export function maskBankAccountNumber(value: string): string {
  const normalized = normalizeBankAccountNumber(value);
  const last4 = normalized.slice(-4);
  const maskedPrefix = normalized
    .slice(0, Math.max(0, normalized.length - 4))
    .replace(/./g, "*");
  return `${maskedPrefix}${last4}`;
}
