import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildVoucherFilename(
  document: VoucherDocument,
  format: VoucherExportFormat,
) {
  const fallbackPrefix =
    document.voucherType === "payment" ? "payment-voucher" : "receipt-voucher";
  const suffix = sanitizeSegment(document.voucherNumber) || fallbackPrefix;

  return `voucher-${suffix}.${format}`;
}
