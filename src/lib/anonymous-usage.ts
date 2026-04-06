import "server-only";

// Server-side utilities for anonymous usage tracking
// The actual state is stored client-side (cookies/localStorage)
// This module provides server helpers for validation and conversion

export const ANONYMOUS_LIMITS = {
  maxDocuments: 2,
  maxExports: 1,
  documentTypes: ["invoice", "voucher"] as const,
} as const;

export function canAnonymousCreate(currentCount: number): boolean {
  return currentCount < ANONYMOUS_LIMITS.maxDocuments;
}

export function canAnonymousExport(currentExports: number): boolean {
  return currentExports < ANONYMOUS_LIMITS.maxExports;
}

export function getAnonymousLimitMessage(
  action: "create" | "export",
): string {
  if (action === "create") {
    return `You've reached the free demo limit of ${ANONYMOUS_LIMITS.maxDocuments} documents. Sign up for free to continue!`;
  }
  return `You've used your free export. Sign up to export unlimited documents!`;
}
