import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PAYMENT_PROOF_BYTES,
  buildPaymentProofStoragePath,
  isLegacyProofUrl,
  validatePaymentProofFile,
} from "./payment-proof";

describe("payment-proof helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a sanitized storage path", () => {
    vi.spyOn(Date, "now").mockReturnValue(1710000000000);

    expect(buildPaymentProofStoragePath("org_1", "inv_1", "Screenshot Apr 21.png")).toBe(
      "proofs/org_1/inv_1/1710000000000-screenshot-apr-21.png",
    );
  });

  it("accepts supported proof files", () => {
    expect(
      validatePaymentProofFile({
        name: "payment-proof.pdf",
        size: 1024,
        type: "application/pdf",
      }),
    ).toBeNull();
  });

  it("rejects oversized proof files", () => {
    expect(
      validatePaymentProofFile({
        name: "payment-proof.pdf",
        size: MAX_PAYMENT_PROOF_BYTES + 1,
        type: "application/pdf",
      }),
    ).toBe("Payment proof files must be 5MB or smaller.");
  });

  it("rejects unsupported proof files", () => {
    expect(
      validatePaymentProofFile({
        name: "malware.exe",
        size: 1024,
        type: "application/x-msdownload",
      }),
    ).toBe("Only PDF, JPG, PNG, WEBP, GIF, BMP, HEIC, or HEIF files are supported.");
  });

  it("distinguishes legacy urls from storage keys", () => {
    expect(isLegacyProofUrl("https://example.com/proof.png")).toBe(true);
    expect(isLegacyProofUrl("data:image/png;base64,abc")).toBe(true);
    expect(isLegacyProofUrl("/api/storage/dev/proof.png")).toBe(true);
    expect(isLegacyProofUrl("proofs/org-1/inv-1/file.png")).toBe(false);
  });
});
