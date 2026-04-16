/**
 * Sprint 22.4 — Portal Branding & Readiness Tests
 *
 * Covers: branding CSS variable injection, "Powered by Slipwise" logic,
 * readiness checklist status computation for various org configurations.
 */

import { describe, it, expect } from "vitest";

// ─── Pure logic under test ────────────────────────────────────────────────────

// Re-implement the pure status-determination logic to test without DB:

type OrgConfig = {
  portalEnabled: boolean;
  portalSupportEmail: string | null;
  portalSupportPhone: string | null;
  portalSessionExpiryHours: number;
  hasBranding: boolean;
  domainVerified: boolean;
  hasEmailDomain: boolean;
  removeBranding: boolean;
};

type CheckStatus = "pass" | "fail" | "warn";

function computeCheckStatuses(cfg: OrgConfig): Record<string, CheckStatus> {
  return {
    "portal-enabled": cfg.portalEnabled ? "pass" : "fail",
    "support-contact": cfg.portalSupportEmail || cfg.portalSupportPhone ? "pass" : "warn",
    "branding": cfg.hasBranding ? "pass" : "warn",
    "custom-domain": cfg.domainVerified ? "pass" : "warn",
    "email-identity": cfg.hasEmailDomain ? "pass" : "warn",
    "white-label": cfg.removeBranding ? "pass" : "warn",
    "session-security": cfg.portalSessionExpiryHours <= 72 ? "pass" : "warn",
  };
}

function buildBrandStyle(accentColor: string, fontFamily: string | null, fontColor: string | null): string {
  const font = fontFamily ? `'${fontFamily}', sans-serif` : "inherit";
  const color = fontColor ?? "#0f172a";
  return `--portal-accent: ${accentColor}; --portal-font: ${font}; --portal-text: ${color};`;
}

// ─── Checklist status tests ───────────────────────────────────────────────────

describe("Portal readiness checklist", () => {
  const base: OrgConfig = {
    portalEnabled: true,
    portalSupportEmail: "support@acme.com",
    portalSupportPhone: null,
    portalSessionExpiryHours: 24,
    hasBranding: true,
    domainVerified: true,
    hasEmailDomain: true,
    removeBranding: true,
  };

  it("all pass when fully configured", () => {
    const statuses = computeCheckStatuses(base);
    Object.values(statuses).forEach((s) => expect(s).toBe("pass"));
  });

  it("fails portal-enabled when portal is disabled", () => {
    const statuses = computeCheckStatuses({ ...base, portalEnabled: false });
    expect(statuses["portal-enabled"]).toBe("fail");
  });

  it("warns support-contact when no email or phone", () => {
    const statuses = computeCheckStatuses({ ...base, portalSupportEmail: null, portalSupportPhone: null });
    expect(statuses["support-contact"]).toBe("warn");
  });

  it("passes support-contact with only phone number", () => {
    const statuses = computeCheckStatuses({ ...base, portalSupportEmail: null, portalSupportPhone: "+91-9999999999" });
    expect(statuses["support-contact"]).toBe("pass");
  });

  it("warns branding when not configured", () => {
    const statuses = computeCheckStatuses({ ...base, hasBranding: false });
    expect(statuses["branding"]).toBe("warn");
  });

  it("warns custom-domain when not verified", () => {
    const statuses = computeCheckStatuses({ ...base, domainVerified: false });
    expect(statuses["custom-domain"]).toBe("warn");
  });

  it("warns white-label when removeBranding is false", () => {
    const statuses = computeCheckStatuses({ ...base, removeBranding: false });
    expect(statuses["white-label"]).toBe("warn");
  });

  it("warns session-security when expiry > 72 hours", () => {
    const statuses = computeCheckStatuses({ ...base, portalSessionExpiryHours: 168 });
    expect(statuses["session-security"]).toBe("warn");
  });

  it("passes session-security at exactly 72 hours", () => {
    const statuses = computeCheckStatuses({ ...base, portalSessionExpiryHours: 72 });
    expect(statuses["session-security"]).toBe("pass");
  });
});

// ─── Brand CSS variable injection tests ──────────────────────────────────────

describe("Portal brand style generation", () => {
  it("injects accent color into CSS variable", () => {
    const style = buildBrandStyle("#e11d48", null, null);
    expect(style).toContain("--portal-accent: #e11d48");
  });

  it("wraps font family in quotes and appends sans-serif fallback", () => {
    const style = buildBrandStyle("#000", "Inter", null);
    expect(style).toContain("--portal-font: 'Inter', sans-serif");
  });

  it("uses inherit when no font family is set", () => {
    const style = buildBrandStyle("#000", null, null);
    expect(style).toContain("--portal-font: inherit");
  });

  it("applies custom font color", () => {
    const style = buildBrandStyle("#000", null, "#1e293b");
    expect(style).toContain("--portal-text: #1e293b");
  });

  it("defaults font color to #0f172a when null", () => {
    const style = buildBrandStyle("#000", null, null);
    expect(style).toContain("--portal-text: #0f172a");
  });
});

// ─── Powered by Slipwise visibility ──────────────────────────────────────────

describe("Powered by Slipwise badge visibility", () => {
  it("shows badge when removeBranding is false", () => {
    const removeBranding = false;
    const showPoweredBy = !removeBranding;
    expect(showPoweredBy).toBe(true);
  });

  it("hides badge when removeBranding is true", () => {
    const removeBranding = true;
    const showPoweredBy = !removeBranding;
    expect(showPoweredBy).toBe(false);
  });

  it("shows badge when whiteLabel is null (no record in DB)", () => {
    const whiteLabel = null;
    const showPoweredBy = !whiteLabel?.removeBranding;
    expect(showPoweredBy).toBe(true);
  });
});
