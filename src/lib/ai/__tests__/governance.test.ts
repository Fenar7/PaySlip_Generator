import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    aiUsageRecord: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/plans/enforcement", () => ({
  getOrgPlan: vi.fn().mockResolvedValue({
    limits: {
      documentIntelligence: true,
      aiInsights: true,
      anomalyDetection: true,
      aiRunsPerMonth: Infinity,
    },
  }),
}));

import { checkProviderHealth } from "../governance";

describe("checkProviderHealth", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("returns unhealthy when OPENAI_API_KEY is missing", async () => {
    const result = await checkProviderHealth();
    expect(result.healthy).toBe(false);
    expect(result.error).toContain("OPENAI_API_KEY");
    expect(result.provider).toBe("openai");
    expect(result.checkedAt).toBeInstanceOf(Date);
  });
});
