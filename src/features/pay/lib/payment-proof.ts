const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;

const ALLOWED_PAYMENT_PROOF_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_PAYMENT_PROOF_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".heic",
  ".heif",
];

export { MAX_PAYMENT_PROOF_BYTES };

export function sanitizePaymentProofFileName(fileName: string): string {
  return (
    fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "payment-proof"
  );
}

export function buildPaymentProofStoragePath(orgId: string, invoiceId: string, fileName: string): string {
  const safeName = sanitizePaymentProofFileName(fileName);
  return `proofs/${orgId}/${invoiceId}/${Date.now()}-${safeName}`;
}

export function isLegacyProofUrl(value: string): boolean {
  return /^(data:|https?:\/\/|\/)/i.test(value);
}

export function isPaymentProofMimeTypeAllowed(type: string): boolean {
  const normalizedType = type.trim().toLowerCase();
  return ALLOWED_PAYMENT_PROOF_MIME_TYPES.has(normalizedType);
}

export function isPaymentProofExtensionAllowed(fileName: string): boolean {
  const normalizedName = fileName.trim().toLowerCase();
  return ALLOWED_PAYMENT_PROOF_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

export function validatePaymentProofFile(file: { name: string; size: number; type: string }): string | null {
  if (!file.name.trim()) {
    return "A proof file is required.";
  }

  if (file.size <= 0) {
    return "The uploaded proof file is empty.";
  }

  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    return "Payment proof files must be 5MB or smaller.";
  }

  if (!isPaymentProofMimeTypeAllowed(file.type) && !isPaymentProofExtensionAllowed(file.name)) {
    return "Only PDF, JPG, PNG, WEBP, GIF, BMP, HEIC, or HEIF files are supported.";
  }

  return null;
}
