import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    orgIntegration: {
      findMany: vi.fn(),
    },
  },
}));

import { getOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET } from "../status/route";

describe("integration status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "admin",
    } as never);
  });

  it("returns provider diagnostics for connected integrations and defaults for missing ones", async () => {
    vi.mocked(db.orgIntegration.findMany).mockResolvedValue([
      {
        provider: "quickbooks",
        isActive: true,
        lastSyncAt: new Date("2026-04-21T01:00:00.000Z"),
        tokenExpiresAt: new Date("2026-04-21T02:00:00.000Z"),
        externalOrgId: "realm-1",
        config: {
          connectionStatus: "connected",
          lastSyncStatus: "partial_success",
          lastSyncError: "Failed invoices: INV-3",
          syncedCount: 2,
          attemptedCount: 3,
        },
      },
    ] as never);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual([
      expect.objectContaining({
        provider: "quickbooks",
        isActive: true,
        externalOrgId: "realm-1",
        connectionStatus: "connected",
        lastSyncStatus: "partial_success",
        lastSyncError: "Failed invoices: INV-3",
        syncedCount: 2,
        attemptedCount: 3,
      }),
      expect.objectContaining({
        provider: "zoho",
        isActive: false,
        connectionStatus: "disconnected",
        lastSyncStatus: null,
      }),
    ]);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
