import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    dataResidencyConfig: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
  createSupabaseServer: vi.fn(),
}));

import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSignedUrlServer, uploadFileServer } from "../upload-server";

describe("upload-server residency guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("STORAGE_PROVIDER", "supabase");
  });

  it("blocks uploads when residency is enforced but region-aware storage is unavailable", async () => {
    vi.mocked(db.dataResidencyConfig.findUnique).mockResolvedValue({
      enforced: true,
      region: "EU",
    } as never);

    await expect(
      uploadFileServer("attachments", "org-1/invoice/inv-1/file.pdf", Buffer.from("pdf"), "application/pdf"),
    ).rejects.toThrow("Configure region-aware S3 storage");

    expect(createSupabaseServer).not.toHaveBeenCalled();
  });

  it("allows signed URLs when residency is not enforced", async () => {
    vi.mocked(db.dataResidencyConfig.findUnique).mockResolvedValue(null);
    vi.mocked(createSupabaseServer).mockResolvedValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "https://example.com/file" },
            error: null,
          }),
        }),
      },
    } as never);

    await expect(
      getSignedUrlServer("attachments", "org-1/invoice/inv-1/file.pdf", 3600),
    ).resolves.toBe("https://example.com/file");
  });
});
