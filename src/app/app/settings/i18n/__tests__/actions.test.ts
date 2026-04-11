import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    orgDefaults: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  getOrgI18nSettings,
  updateOrgLanguageSettings,
  updateOrgCountrySettings,
  updateCustomerLanguage,
} from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORG_ID = "org-1";
const USER_ID = "user-1";

function mockAdmin() {
  vi.mocked(requireRole).mockResolvedValue({
    orgId: ORG_ID,
    userId: USER_ID,
    role: "admin",
  });
}

function mockOrgContext() {
  vi.mocked(requireOrgContext).mockResolvedValue({
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("i18n settings actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── getOrgI18nSettings ──────────────────────────────────────────────────

  describe("getOrgI18nSettings", () => {
    it("returns stored settings when org defaults exist", async () => {
      mockOrgContext();

      vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
        defaultLanguage: "hi",
        defaultDocLanguage: "de",
        country: "DE",
        baseCurrency: "EUR",
        timezone: "Europe/Berlin",
        vatRegNumber: "DE123456789",
        vatRate: 19,
        fiscalYearStart: 1,
      } as any);

      const result = await getOrgI18nSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultLanguage).toBe("hi");
        expect(result.data.country).toBe("DE");
        expect(result.data.baseCurrency).toBe("EUR");
        expect(result.data.vatRegNumber).toBe("DE123456789");
        expect(result.data.vatRate).toBe(19);
      }
    });

    it("returns defaults when no org defaults record exists", async () => {
      mockOrgContext();
      vi.mocked(db.orgDefaults.findUnique).mockResolvedValue(null);

      const result = await getOrgI18nSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultLanguage).toBe("en");
        expect(result.data.country).toBe("IN");
        expect(result.data.baseCurrency).toBe("INR");
        expect(result.data.timezone).toBe("Asia/Kolkata");
        expect(result.data.fiscalYearStart).toBe(4);
      }
    });

    it("returns error when auth fails", async () => {
      vi.mocked(requireOrgContext).mockRejectedValue(new Error("Unauthorized"));

      const result = await getOrgI18nSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized");
      }
    });
  });

  // ── updateOrgLanguageSettings ───────────────────────────────────────────

  describe("updateOrgLanguageSettings", () => {
    it("updates language settings for admin", async () => {
      mockAdmin();
      mockFeatureEnabled();
      vi.mocked(db.orgDefaults.upsert).mockResolvedValue({} as any);

      const result = await updateOrgLanguageSettings({
        defaultLanguage: "de",
        defaultDocLanguage: "fr",
      });

      expect(result.success).toBe(true);
      expect(db.orgDefaults.upsert).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        create: expect.objectContaining({
          organizationId: ORG_ID,
          defaultLanguage: "de",
          defaultDocLanguage: "fr",
        }),
        update: expect.objectContaining({
          defaultLanguage: "de",
          defaultDocLanguage: "fr",
        }),
      });
    });

    it("rejects when multiCurrency feature is disabled", async () => {
      mockAdmin();
      mockFeatureDisabled();

      const result = await updateOrgLanguageSettings({
        defaultLanguage: "de",
        defaultDocLanguage: "fr",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("upgraded plan");
      }
      expect(db.orgDefaults.upsert).not.toHaveBeenCalled();
    });

    it("rejects non-admin users", async () => {
      vi.mocked(requireRole).mockRejectedValue(
        new Error("Insufficient permissions. Required: admin, Have: member"),
      );

      const result = await updateOrgLanguageSettings({
        defaultLanguage: "de",
        defaultDocLanguage: "fr",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Insufficient permissions");
      }
    });
  });

  // ── updateOrgCountrySettings ────────────────────────────────────────────

  describe("updateOrgCountrySettings", () => {
    it("updates country settings for admin", async () => {
      mockAdmin();
      mockFeatureEnabled();
      vi.mocked(db.orgDefaults.upsert).mockResolvedValue({} as any);

      const result = await updateOrgCountrySettings({
        country: "GB",
        baseCurrency: "GBP",
        timezone: "Europe/London",
        vatRegNumber: "GB123456789",
        vatRate: 20,
        fiscalYearStart: 4,
      });

      expect(result.success).toBe(true);
      expect(db.orgDefaults.upsert).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        create: expect.objectContaining({
          organizationId: ORG_ID,
          country: "GB",
          baseCurrency: "GBP",
          timezone: "Europe/London",
          vatRegNumber: "GB123456789",
          vatRate: 20,
          fiscalYearStart: 4,
        }),
        update: expect.objectContaining({
          country: "GB",
          baseCurrency: "GBP",
          vatRegNumber: "GB123456789",
          vatRate: 20,
        }),
      });
    });

    it("handles optional fields being omitted", async () => {
      mockAdmin();
      mockFeatureEnabled();
      vi.mocked(db.orgDefaults.upsert).mockResolvedValue({} as any);

      const result = await updateOrgCountrySettings({
        country: "US",
        baseCurrency: "USD",
        timezone: "America/New_York",
      });

      expect(result.success).toBe(true);
      expect(db.orgDefaults.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            vatRegNumber: null,
            vatRate: null,
            fiscalYearStart: 4,
          }),
        }),
      );
    });

    it("rejects when multiCurrency feature is disabled", async () => {
      mockAdmin();
      mockFeatureDisabled();

      const result = await updateOrgCountrySettings({
        country: "US",
        baseCurrency: "USD",
        timezone: "America/New_York",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("upgraded plan");
      }
    });
  });

  // ── updateCustomerLanguage ──────────────────────────────────────────────

  describe("updateCustomerLanguage", () => {
    it("updates customer preferred language", async () => {
      mockAdmin();

      vi.mocked(db.customer.findUnique).mockResolvedValue({
        id: "cust-1",
        organizationId: ORG_ID,
      } as any);

      vi.mocked(db.customer.update).mockResolvedValue({} as any);

      const result = await updateCustomerLanguage("cust-1", "hi");

      expect(result.success).toBe(true);
      expect(db.customer.update).toHaveBeenCalledWith({
        where: { id: "cust-1" },
        data: { preferredLanguage: "hi" },
      });
    });

    it("returns error when customer not found", async () => {
      mockAdmin();
      vi.mocked(db.customer.findUnique).mockResolvedValue(null);

      const result = await updateCustomerLanguage("cust-missing", "hi");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Customer not found");
      }
    });

    it("returns error when customer belongs to different org", async () => {
      mockAdmin();

      vi.mocked(db.customer.findUnique).mockResolvedValue({
        id: "cust-1",
        organizationId: "other-org",
      } as any);

      const result = await updateCustomerLanguage("cust-1", "hi");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Customer not found");
      }
    });
  });

  // ── Plan gate checks ───────────────────────────────────────────────────

  describe("plan gate: multiCurrency", () => {
    it("calls checkFeature with multiCurrency for language settings", async () => {
      mockAdmin();
      mockFeatureEnabled();
      vi.mocked(db.orgDefaults.upsert).mockResolvedValue({} as any);

      await updateOrgLanguageSettings({
        defaultLanguage: "en",
        defaultDocLanguage: "en",
      });

      expect(checkFeature).toHaveBeenCalledWith(ORG_ID, "multiCurrency");
    });

    it("calls checkFeature with multiCurrency for country settings", async () => {
      mockAdmin();
      mockFeatureEnabled();
      vi.mocked(db.orgDefaults.upsert).mockResolvedValue({} as any);

      await updateOrgCountrySettings({
        country: "IN",
        baseCurrency: "INR",
        timezone: "Asia/Kolkata",
      });

      expect(checkFeature).toHaveBeenCalledWith(ORG_ID, "multiCurrency");
    });
  });
});
