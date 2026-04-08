import { describe, it, expect, beforeEach, vi } from "vitest";

// OPT_OUT_SECRET is captured as a top-level const at module load time.
// We must use vi.resetModules() + dynamic import to re-evaluate with our env var.

async function loadModule() {
  vi.resetModules();
  process.env.DUNNING_OPT_OUT_SECRET = "test-secret-key-for-dunning";
  return await import("../dunning-opt-out");
}

describe("dunning-opt-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateOptOutToken", () => {
    it("generates consistent tokens for the same input", async () => {
      const { generateOptOutToken } = await loadModule();
      const token1 = generateOptOutToken("org-1", "cust-1");
      const token2 = generateOptOutToken("org-1", "cust-1");
      expect(token1).toBe(token2);
    });

    it("generates different tokens for different inputs", async () => {
      const { generateOptOutToken } = await loadModule();
      const token1 = generateOptOutToken("org-1", "cust-1");
      const token2 = generateOptOutToken("org-1", "cust-2");
      const token3 = generateOptOutToken("org-2", "cust-1");
      expect(token1).not.toBe(token2);
      expect(token1).not.toBe(token3);
      expect(token2).not.toBe(token3);
    });

    it("returns a hex string", async () => {
      const { generateOptOutToken } = await loadModule();
      const token = generateOptOutToken("org-1", "cust-1");
      expect(token).toMatch(/^[a-f0-9]+$/);
      // SHA256 HMAC produces 64 hex chars
      expect(token).toHaveLength(64);
    });
  });

  describe("verifyOptOutToken", () => {
    it("returns true for a valid token", async () => {
      const { generateOptOutToken, verifyOptOutToken } = await loadModule();
      const token = generateOptOutToken("org-1", "cust-1");
      expect(verifyOptOutToken(token, "org-1", "cust-1")).toBe(true);
    });

    it("returns false for a tampered token", async () => {
      const { generateOptOutToken, verifyOptOutToken } = await loadModule();
      const token = generateOptOutToken("org-1", "cust-1");
      const tampered = token.slice(0, -2) + "ff";
      expect(verifyOptOutToken(tampered, "org-1", "cust-1")).toBe(false);
    });

    it("returns false for wrong orgId", async () => {
      const { generateOptOutToken, verifyOptOutToken } = await loadModule();
      const token = generateOptOutToken("org-1", "cust-1");
      expect(verifyOptOutToken(token, "org-WRONG", "cust-1")).toBe(false);
    });

    it("returns false for wrong customerId", async () => {
      const { generateOptOutToken, verifyOptOutToken } = await loadModule();
      const token = generateOptOutToken("org-1", "cust-1");
      expect(verifyOptOutToken(token, "org-1", "cust-WRONG")).toBe(false);
    });

    it("returns false for empty token", async () => {
      const { verifyOptOutToken } = await loadModule();
      expect(verifyOptOutToken("", "org-1", "cust-1")).toBe(false);
    });
  });

  describe("buildOptOutUrl", () => {
    it("includes token, org, and cid params", async () => {
      const { buildOptOutUrl } = await loadModule();
      const url = buildOptOutUrl("org-1", "cust-1");
      expect(url).toContain("token=");
      expect(url).toContain("org=org-1");
      expect(url).toContain("cid=cust-1");
    });

    it("uses default base URL when env vars not set", async () => {
      const { buildOptOutUrl } = await loadModule();
      const url = buildOptOutUrl("org-1", "cust-1");
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain("/unsubscribe/dunning");
    });
  });
});
