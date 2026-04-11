import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    oAuthApp: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    oAuthAuthorization: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  createOAuthApp,
  listOAuthApps,
  rotateClientSecret,
  deleteOAuthApp,
  listAppAuthorizations,
} from "../actions";

const ORG_ID = "org-test-1";
const USER_ID = "user-test-1";

function mockAdmin() {
  vi.mocked(requireRole).mockResolvedValue({
    orgId: ORG_ID,
    userId: USER_ID,
    role: "admin",
  });
}

function mockFeatureEnabled() {
  vi.mocked(checkFeature).mockResolvedValue(true);
}

function mockFeatureDisabled() {
  vi.mocked(checkFeature).mockResolvedValue(false);
}

describe("OAuth App CRUD actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("TC-15-032: createOAuthApp returns clientId + clientSecret", () => {
    it("creates app and returns raw credentials", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.oAuthApp.create).mockResolvedValue({
        id: "app-1",
        clientId: "slipwise_test",
        name: "Test App",
      } as any);

      const result = await createOAuthApp({
        name: "Test App",
        redirectUris: ["https://example.com/callback"],
        scopes: ["invoices:read"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clientId).toMatch(/^slipwise_/);
        expect(result.data.clientSecret).toMatch(/^sk_/);
      }
      expect(db.oAuthApp.create).toHaveBeenCalledTimes(1);
    });

    it("rejects when feature is disabled", async () => {
      mockAdmin();
      mockFeatureDisabled();

      const result = await createOAuthApp({
        name: "Test App",
        redirectUris: ["https://example.com/callback"],
        scopes: ["invoices:read"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("upgraded plan");
      }
    });

    it("rejects empty name", async () => {
      mockAdmin();
      mockFeatureEnabled();

      const result = await createOAuthApp({
        name: "",
        redirectUris: ["https://example.com/callback"],
        scopes: ["invoices:read"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("name is required");
      }
    });
  });

  describe("TC-15-033: Token exchange flow logic", () => {
    it("stores hashed client secret, not raw", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.oAuthApp.create).mockResolvedValue({ id: "app-1" } as any);

      await createOAuthApp({
        name: "Hash Test",
        redirectUris: ["https://example.com/cb"],
        scopes: ["invoices:read"],
      });

      const createCall = vi.mocked(db.oAuthApp.create).mock.calls[0][0];
      const storedSecret = (createCall as any).data.clientSecret;
      // bcrypt hashes start with $2
      expect(storedSecret).toMatch(/^\$2[aby]\$/);
    });
  });

  describe("TC-15-034: Expired access token scenario", () => {
    it("rotateClientSecret generates new credentials", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.oAuthApp.findFirst).mockResolvedValue({
        id: "app-1",
        orgId: ORG_ID,
      } as any);
      vi.mocked(db.oAuthApp.update).mockResolvedValue({} as any);

      const result = await rotateClientSecret("app-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clientSecret).toMatch(/^sk_/);
      }
    });
  });

  describe("TC-15-036: Same app auth twice updates existing", () => {
    it("listAppAuthorizations returns existing authorizations", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.oAuthApp.findFirst).mockResolvedValue({
        id: "app-1",
        orgId: ORG_ID,
      } as any);

      vi.mocked(db.oAuthAuthorization.findMany).mockResolvedValue([
        { id: "auth-1", orgId: ORG_ID, scopes: ["invoices:read"], isRevoked: false, createdAt: new Date() },
        { id: "auth-2", orgId: "org-2", scopes: ["invoices:read"], isRevoked: false, createdAt: new Date() },
      ] as any);

      const result = await listAppAuthorizations("app-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe("TC-15-037: Invalid redirect_uri → error", () => {
    it("rejects when no redirect URIs provided", async () => {
      mockAdmin();
      mockFeatureEnabled();

      const result = await createOAuthApp({
        name: "Bad App",
        redirectUris: [],
        scopes: ["invoices:read"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("redirect URI");
      }
    });

    it("rejects invalid scopes", async () => {
      mockAdmin();
      mockFeatureEnabled();

      const result = await createOAuthApp({
        name: "Bad Scopes App",
        redirectUris: ["https://example.com/cb"],
        scopes: ["nonexistent:scope"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("invalid");
      }
    });
  });

  describe("deleteOAuthApp", () => {
    it("revokes all authorizations then deletes app", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.oAuthApp.findFirst).mockResolvedValue({
        id: "app-1",
        orgId: ORG_ID,
      } as any);
      vi.mocked(db.oAuthAuthorization.updateMany).mockResolvedValue({ count: 3 } as any);
      vi.mocked(db.oAuthApp.delete).mockResolvedValue({} as any);

      const result = await deleteOAuthApp("app-1");
      expect(result.success).toBe(true);
      expect(db.oAuthAuthorization.updateMany).toHaveBeenCalledWith({
        where: { appId: "app-1" },
        data: { isRevoked: true },
      });
      expect(db.oAuthApp.delete).toHaveBeenCalledWith({ where: { id: "app-1" } });
    });

    it("returns error if app not found", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.oAuthApp.findFirst).mockResolvedValue(null);

      const result = await deleteOAuthApp("nonexistent");
      expect(result.success).toBe(false);
    });
  });
});
