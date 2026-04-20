import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    ssoConfig: {
      findUnique: vi.fn(),
    },
    userOrgPreference: {
      findUnique: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
    proxyGrant: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isMarketplaceModeratorUser, requireMarketplaceModerator } from "../require-org";

describe("marketplace moderator auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MARKETPLACE_MODERATOR_USER_IDS;
    vi.mocked(db.ssoConfig.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.userOrgPreference.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.proxyGrant.findFirst).mockResolvedValue(null as never);
  });

  it("checks moderator membership from the explicit allowlist", () => {
    process.env.MARKETPLACE_MODERATOR_USER_IDS = "user-1, user-2";

    expect(isMarketplaceModeratorUser("user-1")).toBe(true);
    expect(isMarketplaceModeratorUser("user-3")).toBe(false);
  });

  it("redirects unauthenticated users to login", async () => {
    vi.mocked(createSupabaseServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    await expect(requireMarketplaceModerator()).rejects.toThrow("redirect:/auth/login");
  });

  it("allows authenticated moderators with org context", async () => {
    process.env.MARKETPLACE_MODERATOR_USER_IDS = "mod-1";
    vi.mocked(createSupabaseServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "mod-1" } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(db.member.findFirst).mockResolvedValue({
      organizationId: "org-1",
      role: "admin",
      organization: {
        slug: "acme",
      },
    } as never);

    await expect(requireMarketplaceModerator()).resolves.toEqual({
      userId: "mod-1",
      orgId: "org-1",
      role: "admin",
    });
  });

  it("denies authenticated users who are not in the moderator allowlist", async () => {
    process.env.MARKETPLACE_MODERATOR_USER_IDS = "mod-1";
    vi.mocked(createSupabaseServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(db.member.findFirst).mockResolvedValue(null as never);

    await expect(requireMarketplaceModerator()).rejects.toThrow(
      "Marketplace moderation access denied",
    );
  });
});
