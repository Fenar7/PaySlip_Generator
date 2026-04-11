import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    hsnSacCode: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-org", () => ({
  getOrgContext: vi.fn(),
}));

import { GET } from "../route";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/require-org";

const mockedGetOrgContext = vi.mocked(getOrgContext);
const mockedFindMany = vi.mocked(db.hsnSacCode.findMany);

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetOrgContext.mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
    role: "ADMIN",
  });
});

describe("GET /api/gst/hsn-sac/search", () => {
  it("TC-15-004: returns top 10 results by code match", async () => {
    const mockResults = [
      { code: "9983", description: "Health services", gstRate: 18, isService: true },
      { code: "998311", description: "Hospital services", gstRate: 18, isService: true },
      { code: "998312", description: "Medical services", gstRate: 18, isService: true },
    ];
    mockedFindMany.mockResolvedValue(mockResults);

    const response = await GET(makeRequest("http://localhost/api/gst/hsn-sac/search?q=998"));
    const body = await response.json();

    expect(body.data).toEqual(mockResults);
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: { code: "asc" },
        where: {
          OR: [
            { code: { startsWith: "998" } },
            { description: { contains: "998", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("returns empty array for queries shorter than 2 characters", async () => {
    const response = await GET(makeRequest("http://localhost/api/gst/hsn-sac/search?q=a"));
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when query is missing", async () => {
    const response = await GET(makeRequest("http://localhost/api/gst/hsn-sac/search"));
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetOrgContext.mockResolvedValue(null);

    const response = await GET(makeRequest("http://localhost/api/gst/hsn-sac/search?q=test"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("filters by type=hsn (isService=false)", async () => {
    mockedFindMany.mockResolvedValue([]);

    await GET(makeRequest("http://localhost/api/gst/hsn-sac/search?q=0401&type=hsn"));

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isService: false,
        }),
      }),
    );
  });

  it("filters by type=sac (isService=true)", async () => {
    mockedFindMany.mockResolvedValue([]);

    await GET(makeRequest("http://localhost/api/gst/hsn-sac/search?q=9981&type=sac"));

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isService: true,
        }),
      }),
    );
  });

  it("does not filter by isService when type is not specified", async () => {
    mockedFindMany.mockResolvedValue([]);

    await GET(makeRequest("http://localhost/api/gst/hsn-sac/search?q=milk"));

    const callArgs = mockedFindMany.mock.calls[0][0] as any;
    expect(callArgs.where).not.toHaveProperty("isService");
  });
});
