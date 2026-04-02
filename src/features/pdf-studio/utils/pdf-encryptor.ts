"use client";

import type { PasswordSettings } from "@/features/pdf-studio/types";

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
 * Sends unencrypted PDF bytes to the server encryption endpoint and
 * returns the AES-256 encrypted result.
 *
 * Fail-closed: throws PdfEncryptionError on any failure — never returns
 * the unencrypted bytes as a fallback.
 */
export async function encryptPdfViaApi(
  pdfBytes: Uint8Array,
  passwordSettings: PasswordSettings,
): Promise<Uint8Array> {
  if (!passwordSettings.enabled || !passwordSettings.userPassword) {
    throw new PdfEncryptionError("Encryption requested but password is not set");
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
      "Unable to reach the encryption service. Check your connection and try again.",
      true,
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new PdfEncryptionError("Too many requests. Please wait a moment and try again.");
    }
    if (response.status === 413) {
      throw new PdfEncryptionError("PDF is too large to encrypt. Try reducing image count or quality.");
    }
    // Don't expose server error details to the client
    throw new PdfEncryptionError("PDF encryption failed. Please try again.");
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
