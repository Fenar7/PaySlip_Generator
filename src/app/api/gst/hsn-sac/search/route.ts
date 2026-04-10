import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/require-org";

export async function GET(request: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") ?? "";
  const type = searchParams.get("type"); // "hsn" | "sac" | null (both)

  if (query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const where: Record<string, unknown> = {
    OR: [
      { code: { startsWith: query } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  if (type === "hsn") {
    where.isService = false;
  } else if (type === "sac") {
    where.isService = true;
  }

  const results = await db.hsnSacCode.findMany({
    where,
    take: 10,
    orderBy: { code: "asc" },
    select: {
      code: true,
      description: true,
      gstRate: true,
      isService: true,
    },
  });

  return NextResponse.json({ data: results });
}
