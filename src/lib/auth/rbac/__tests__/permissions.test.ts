import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getEffectivePermissions,
  validatePermissionSet,
  canManageRole,
  type AccessContext,
  type PermissionSet,
} from "../permissions";

describe("RBAC Permission Engine", () => {
  describe("hasPermission", () => {
    it("grants owner full access to all resources", () => {
      const ctx: AccessContext = { systemRole: "owner" };
      expect(hasPermission(ctx, "invoices", "create")).toBe(true);
      expect(hasPermission(ctx, "settings", "delete")).toBe(true);
      expect(hasPermission(ctx, "billing", "update")).toBe(true);
      expect(hasPermission(ctx, "audit", "read")).toBe(true);
    });

    it("grants admin full access to all resources", () => {
      const ctx: AccessContext = { systemRole: "admin" };
      expect(hasPermission(ctx, "invoices", "delete")).toBe(true);
      expect(hasPermission(ctx, "payroll", "create")).toBe(true);
      expect(hasPermission(ctx, "settings", "update")).toBe(true);
    });

    it("restricts member to read-only defaults", () => {
      const ctx: AccessContext = { systemRole: "member" };
      expect(hasPermission(ctx, "invoices", "read")).toBe(true);
      expect(hasPermission(ctx, "invoices", "create")).toBe(false);
      expect(hasPermission(ctx, "invoices", "update")).toBe(false);
      expect(hasPermission(ctx, "invoices", "delete")).toBe(false);
    });

    it("denies member access to write-protected resources", () => {
      const ctx: AccessContext = { systemRole: "member" };
      expect(hasPermission(ctx, "settings", "read")).toBe(false);
      expect(hasPermission(ctx, "billing", "read")).toBe(false);
      expect(hasPermission(ctx, "audit", "read")).toBe(false);
    });

    it("custom role overrides member defaults", () => {
      const ctx: AccessContext = {
        systemRole: "member",
        customPermissions: {
          invoices: ["create", "read", "update"],
          settings: ["read"],
        },
      };
      expect(hasPermission(ctx, "invoices", "create")).toBe(true);
      expect(hasPermission(ctx, "invoices", "read")).toBe(true);
      expect(hasPermission(ctx, "invoices", "delete")).toBe(false);
      expect(hasPermission(ctx, "settings", "read")).toBe(true);
      expect(hasPermission(ctx, "settings", "update")).toBe(false);
    });

    it("custom role with empty permissions denies all", () => {
      const ctx: AccessContext = {
        systemRole: "member",
        customPermissions: {},
      };
      expect(hasPermission(ctx, "invoices", "read")).toBe(false);
      expect(hasPermission(ctx, "customers", "read")).toBe(false);
    });

    it("handles unknown role as member", () => {
      const ctx: AccessContext = { systemRole: "viewer" };
      expect(hasPermission(ctx, "invoices", "read")).toBe(true);
      expect(hasPermission(ctx, "invoices", "create")).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true when all permissions granted", () => {
      const ctx: AccessContext = { systemRole: "admin" };
      expect(
        hasAllPermissions(ctx, [
          { resource: "invoices", action: "create" },
          { resource: "bills", action: "delete" },
        ])
      ).toBe(true);
    });

    it("returns false when any permission is missing", () => {
      const ctx: AccessContext = { systemRole: "member" };
      expect(
        hasAllPermissions(ctx, [
          { resource: "invoices", action: "read" },
          { resource: "invoices", action: "create" },
        ])
      ).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true when at least one permission granted", () => {
      const ctx: AccessContext = { systemRole: "member" };
      expect(
        hasAnyPermission(ctx, [
          { resource: "invoices", action: "read" },
          { resource: "invoices", action: "create" },
        ])
      ).toBe(true);
    });

    it("returns false when no permissions match", () => {
      const ctx: AccessContext = { systemRole: "member" };
      expect(
        hasAnyPermission(ctx, [
          { resource: "settings", action: "update" },
          { resource: "billing", action: "create" },
        ])
      ).toBe(false);
    });
  });

  describe("getEffectivePermissions", () => {
    it("returns full permissions for owner", () => {
      const ctx: AccessContext = { systemRole: "owner" };
      const perms = getEffectivePermissions(ctx);
      expect(perms.invoices).toEqual(["create", "read", "update", "delete"]);
      expect(perms.settings).toEqual(["create", "read", "update", "delete"]);
    });

    it("returns custom permissions for member with custom role", () => {
      const custom: PermissionSet = { invoices: ["read", "create"] };
      const ctx: AccessContext = { systemRole: "member", customPermissions: custom };
      const perms = getEffectivePermissions(ctx);
      expect(perms).toEqual(custom);
    });

    it("returns member defaults when no custom role", () => {
      const ctx: AccessContext = { systemRole: "member" };
      const perms = getEffectivePermissions(ctx);
      expect(perms.invoices).toEqual(["read"]);
      expect(perms.settings).toBeUndefined();
    });
  });

  describe("validatePermissionSet", () => {
    it("accepts valid permission set", () => {
      const result = validatePermissionSet({
        invoices: ["create", "read"],
        bills: ["read", "update"],
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.invoices).toEqual(["create", "read"]);
      }
    });

    it("deduplicates actions", () => {
      const result = validatePermissionSet({
        invoices: ["read", "read", "create"],
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.invoices).toEqual(["read", "create"]);
      }
    });

    it("rejects non-object input", () => {
      expect(validatePermissionSet(null)).toEqual({
        valid: false,
        error: "Permissions must be an object",
      });
      expect(validatePermissionSet("string")).toEqual({
        valid: false,
        error: "Permissions must be an object",
      });
      expect(validatePermissionSet([])).toEqual({
        valid: false,
        error: "Permissions must be an object",
      });
    });

    it("rejects unknown resource", () => {
      const result = validatePermissionSet({ badResource: ["read"] });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Unknown resource: badResource");
      }
    });

    it("rejects unknown action", () => {
      const result = validatePermissionSet({ invoices: ["read", "execute"] });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Unknown action 'execute'");
      }
    });

    it("rejects non-array actions", () => {
      const result = validatePermissionSet({ invoices: "read" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("must be an array");
      }
    });
  });

  describe("canManageRole", () => {
    it("owner can manage admin", () => {
      expect(canManageRole("owner", "admin")).toBe(true);
    });

    it("owner can manage member", () => {
      expect(canManageRole("owner", "member")).toBe(true);
    });

    it("admin can manage member", () => {
      expect(canManageRole("admin", "member")).toBe(true);
    });

    it("admin cannot manage owner", () => {
      expect(canManageRole("admin", "owner")).toBe(false);
    });

    it("member cannot manage anyone", () => {
      expect(canManageRole("member", "admin")).toBe(false);
      expect(canManageRole("member", "member")).toBe(false);
    });

    it("same role cannot manage itself", () => {
      expect(canManageRole("admin", "admin")).toBe(false);
    });
  });
});
