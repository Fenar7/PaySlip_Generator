import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/lib/gstr1-generator", () => ({
  generateGSTR1: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { generateGSTR1 } from "@/lib/gstr1-generator";
import { GET } from "../route";

const mockedGetOrgContext = vi.mocked(getOrgContext);
const mockedCheckFeature = vi.mocked(checkFeature);
const mockedGenerateGSTR1 = vi.mocked(generateGSTR1);

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

describe("GET /api/export/gstr1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetOrgContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "admin",
    });
    mockedCheckFeature.mockResolvedValue(true);
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetOrgContext.mockResolvedValue(null);

    const response = await GET(makeRequest("http://localhost/api/export/gstr1?period=2026-04"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mockedGenerateGSTR1).not.toHaveBeenCalled();
  });

  it("returns 403 when the org lacks gstr export access", async () => {
    mockedCheckFeature.mockResolvedValue(false);

    const response = await GET(makeRequest("http://localhost/api/export/gstr1?period=2026-04"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "GSTR Export requires a Pro plan or above.",
    });
    expect(mockedGenerateGSTR1).not.toHaveBeenCalled();
  });

  it("returns 400 when period is missing or invalid", async () => {
    const response = await GET(makeRequest("http://localhost/api/export/gstr1?period=04-2026"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid or missing 'period' parameter. Expected format: YYYY-MM",
    });
    expect(mockedGenerateGSTR1).not.toHaveBeenCalled();
  });

  it("returns a JSON attachment for a valid filing period", async () => {
    mockedGenerateGSTR1.mockResolvedValue({
      gstin: "29ABCDE1234F1Z5",
      fp: "042026",
      b2b: [],
      b2cs: [],
      b2cl: [],
      summary: {
        totalInvoices: 0,
        totalTaxableValue: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalCess: 0,
        totalValue: 0,
      },
    });

    const response = await GET(makeRequest("http://localhost/api/export/gstr1?period=2026-04"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain(
      'GSTR1_29ABCDE1234F1Z5_042026.json',
    );
    expect(mockedCheckFeature).toHaveBeenCalledWith("org-1", "gstrExport");
    expect(mockedGenerateGSTR1).toHaveBeenCalledWith("org-1", "2026-04");
    expect(body).toEqual(
      expect.objectContaining({
        gstin: "29ABCDE1234F1Z5",
        fp: "042026",
      }),
    );
  });
});
