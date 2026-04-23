import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
  hasRole: vi.fn(),
}));

vi.mock("@/lib/integrations/quickbooks", () => ({
  syncInvoices: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/lib/integrations/zoho", () => ({
  syncInvoices: vi.fn(),
  disconnect: vi.fn(),
}));

import { getOrgContext, hasRole } from "@/lib/auth";
import {
  disconnect as disconnectQuickbooks,
  syncInvoices as syncQuickbooks,
} from "@/lib/integrations/quickbooks";
import { DELETE as quickbooksDisconnect } from "../quickbooks/disconnect/route";
import { POST as quickbooksSync } from "../quickbooks/sync/route";
import {
  disconnect as disconnectZoho,
  syncInvoices as syncZoho,
} from "@/lib/integrations/zoho";
import { DELETE as zohoDisconnect } from "../zoho/disconnect/route";
import { POST as zohoSync } from "../zoho/sync/route";

describe("integration operation auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "admin",
    } as never);
    vi.mocked(hasRole).mockReturnValue(true);
    vi.mocked(syncQuickbooks).mockResolvedValue({ synced: 1 } as never);
    vi.mocked(disconnectQuickbooks).mockResolvedValue(undefined as never);
    vi.mocked(syncZoho).mockResolvedValue({ synced: 1 } as never);
    vi.mocked(disconnectZoho).mockResolvedValue(undefined as never);
  });

  it("blocks non-admin users from syncing QuickBooks", async () => {
    vi.mocked(hasRole).mockReturnValue(false);

    const response = await quickbooksSync();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(syncQuickbooks).not.toHaveBeenCalled();
  });

  it("blocks non-admin users from disconnecting QuickBooks", async () => {
    vi.mocked(hasRole).mockReturnValue(false);

    const response = await quickbooksDisconnect();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(disconnectQuickbooks).not.toHaveBeenCalled();
  });

  it("blocks non-admin users from syncing Zoho", async () => {
    vi.mocked(hasRole).mockReturnValue(false);

    const response = await zohoSync();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(syncZoho).not.toHaveBeenCalled();
  });

  it("blocks non-admin users from disconnecting Zoho", async () => {
    vi.mocked(hasRole).mockReturnValue(false);

    const response = await zohoDisconnect();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(disconnectZoho).not.toHaveBeenCalled();
  });
});
