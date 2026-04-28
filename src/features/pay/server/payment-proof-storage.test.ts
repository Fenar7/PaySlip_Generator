import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSignedUrlServer: vi.fn(),
  uploadFileServer: vi.fn(),
}));

vi.mock("@/lib/storage/upload-server", () => ({
  getSignedUrlServer: mocks.getSignedUrlServer,
  uploadFileServer: mocks.uploadFileServer,
}));

import { resolvePaymentProofUrl } from "./payment-proof-storage";

describe("payment-proof-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns legacy URLs unchanged", async () => {
    await expect(
      resolvePaymentProofUrl("https://legacy.example/proof.png"),
    ).resolves.toBe("https://legacy.example/proof.png");

    expect(mocks.getSignedUrlServer).not.toHaveBeenCalled();
  });

  it("uses admin-backed signing for private proof storage keys", async () => {
    mocks.getSignedUrlServer.mockResolvedValue("https://signed.example/proof.png");

    await expect(
      resolvePaymentProofUrl("proofs/org-1/inv-1/proof.png"),
    ).resolves.toBe("https://signed.example/proof.png");

    expect(mocks.getSignedUrlServer).toHaveBeenCalledWith(
      "proofs",
      "proofs/org-1/inv-1/proof.png",
      3600,
      { useAdmin: true },
    );
  });
});
