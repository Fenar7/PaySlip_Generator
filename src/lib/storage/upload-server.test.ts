import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const upload = vi.fn();
  const listBuckets = vi.fn();
  const createBucket = vi.fn();
  const getPublicUrl = vi.fn();

  const storage = {
    from: vi.fn(() => ({
      upload,
      getPublicUrl,
    })),
    listBuckets,
    createBucket,
  };

  return {
    upload,
    listBuckets,
    createBucket,
    getPublicUrl,
    adminClient: { storage },
    serverClient: { storage },
    findUnique: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(async () => mocks.adminClient),
  createSupabaseServer: vi.fn(async () => mocks.serverClient),
}));

vi.mock("@/lib/db", () => ({
  db: {
    dataResidencyConfig: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { uploadFileServer } from "./upload-server";

describe("uploadFileServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.test/logo.png" },
    });
  });

  it("creates a missing bucket and retries the upload once", async () => {
    mocks.upload
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Bucket not found", statusCode: "404" },
      })
      .mockResolvedValueOnce({
        data: { path: "org-1/inv-1/payment.png" },
        error: null,
      });
    mocks.listBuckets.mockResolvedValue({ data: [], error: null });
    mocks.createBucket.mockResolvedValue({ data: {}, error: null });

    const result = await uploadFileServer(
      "proofs",
      "org-1/inv-1/payment.png",
      Buffer.from("proof"),
      "image/png",
    );

    expect(mocks.listBuckets).toHaveBeenCalled();
    expect(mocks.createBucket).toHaveBeenCalledWith("proofs", {
      public: false,
      fileSizeLimit: "10MB",
      allowedMimeTypes: ["image/png", "image/jpeg", "image/pdf", "application/pdf"],
    });
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ storageKey: "org-1/inv-1/payment.png" });
  });
});
