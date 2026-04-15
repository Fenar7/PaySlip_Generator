import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    ssoConfig: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sso-session", () => ({
  readSsoSessionCookie: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3001",
    FEATURE_SSO_ENABLED: "true",
    NODE_ENV: "test",
    SSO_SESSION_SECRET: "test-secret",
    PORTAL_JWT_SECRET: "test-secret",
    CRON_SECRET: "test-secret",
  },
}));

vi.mock("@/lib/plans/enforcement", () => ({
  requirePlan: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
  createSupabaseServer: vi.fn(),
}));

import { db } from "@/lib/db";
import { readSsoSessionCookie } from "@/lib/sso-session";
import {
  getSsoAccessModeForUser,
  getSsoLoginPathForUser,
} from "@/lib/sso";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SSO enforcement helpers", () => {
  it("returns null when SSO is not enforced", async () => {
    vi.mocked(db.ssoConfig.findUnique).mockResolvedValue({
      isActive: true,
      ssoEnforced: false,
    } as never);

    await expect(
      getSsoLoginPathForUser("org-1", "acme", "user-1", "member"),
    ).resolves.toBeNull();
  });

  it("returns a login path when SSO is enforced and the session is not SSO-backed", async () => {
    vi.mocked(db.ssoConfig.findUnique).mockResolvedValue({
      isActive: true,
      ssoEnforced: true,
    } as never);
    vi.mocked(readSsoSessionCookie).mockResolvedValue(null);

    await expect(
      getSsoLoginPathForUser("org-1", "acme", "user-1", "member"),
    ).resolves.toContain("/auth/login?org=acme");
  });

  it("allows owner break-glass sessions for enforced orgs", async () => {
    vi.mocked(db.ssoConfig.findUnique).mockResolvedValue({
      isActive: true,
      ssoEnforced: true,
    } as never);
    vi.mocked(readSsoSessionCookie).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      mode: "break_glass",
      exp: Date.now() + 60_000,
      iat: Date.now(),
    } as never);

    await expect(
      getSsoAccessModeForUser("org-1", "user-1", "owner"),
    ).resolves.toBe("break_glass");
    await expect(
      getSsoLoginPathForUser("org-1", "acme", "user-1", "owner"),
    ).resolves.toBeNull();
  });
});
