"use client";

import type { PasswordSettings } from "@/features/docs/pdf-studio/types";
import { validatePasswordSettings, PDF_STUDIO_PASSWORD_MAX_LENGTH } from "./password";

export class PdfEncryptionError extends Error {
  constructor(
    message: string,
    public readonly isNetworkError: boolean = false,
  ) {
    super(message);
    this.name = "PdfEncryptionError";
  }
}

/**
 * Shared error messages used across browser and server paths.
 * Keep these in sync with the encrypt route and workspace UIs.
 */
export const PDF_ENCRYPTION_ERROR_MESSAGES = {
  passwordNotSet: "Encryption requested but password is not set.",
  passwordTooLong: `Password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer.`,
  rateLimited: "Too many requests. Please wait a moment and try again.",
  payloadTooLarge: "PDF is too large to encrypt. Try reducing image count or quality.",
  genericFailure: "PDF encryption failed. Please try again.",
  networkFailure: "Unable to reach the encryption service. Check your connection and try again.",
} as const;

/**
 * Sends unencrypted PDF bytes to the server encryption endpoint and
 * returns the AES-256 encrypted result.
 *
 * Fail-closed: throws PdfEncryptionError on any failure — never returns
 * the unencrypted bytes as a fallback.
 *
 * Sprint 37.1 hardening:
 * - Client-side validation runs before the network request to fail fast.
 * - Error messages are aligned with the server route and workspace UI.
 */
export async function encryptPdfViaApi(
  pdfBytes: Uint8Array,
  passwordSettings: PasswordSettings,
): Promise<Uint8Array> {
  if (!passwordSettings.enabled || !passwordSettings.userPassword) {
    throw new PdfEncryptionError(PDF_ENCRYPTION_ERROR_MESSAGES.passwordNotSet);
  }

  const validation = validatePasswordSettings(passwordSettings);
  if (!validation.isValid) {
    throw new PdfEncryptionError(validation.errors[0] ?? PDF_ENCRYPTION_ERROR_MESSAGES.genericFailure);
  }

  let response: Response;
  try {
    const formData = new FormData();
    formData.append(
      "pdf",
      new Blob([pdfBytes as unknown as BlobPart], { type: "application/octet-stream" }),
      "document.pdf",
    );
    formData.append(
      "options",
      JSON.stringify({
        userPassword: passwordSettings.userPassword,
        ownerPassword: passwordSettings.ownerPassword || undefined,
        permissions: {
          printing: passwordSettings.permissions.printing,
          copying: passwordSettings.permissions.copying,
          modifying: passwordSettings.permissions.modifying,
        },
      }),
    );

    response = await fetch("/api/pdf/encrypt", {
      method: "POST",
      // No Content-Type header — browser sets multipart/form-data with boundary
      body: formData,
    });
  } catch {
    throw new PdfEncryptionError(
      PDF_ENCRYPTION_ERROR_MESSAGES.networkFailure,
      true,
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new PdfEncryptionError(PDF_ENCRYPTION_ERROR_MESSAGES.rateLimited);
    }
    if (response.status === 413) {
      throw new PdfEncryptionError(PDF_ENCRYPTION_ERROR_MESSAGES.payloadTooLarge);
    }
    // Don't expose server error details to the client
    throw new PdfEncryptionError(PDF_ENCRYPTION_ERROR_MESSAGES.genericFailure);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
