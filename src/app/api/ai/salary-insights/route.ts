import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getSalaryInsights } from "@/lib/salary-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const period = request.nextUrl.searchParams.get("period") ?? undefined;

    const insights = await getSalaryInsights(ctx.orgId, period);

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Salary insights failed:", error);
    return NextResponse.json(
      { error: "Failed to generate salary insights." },
      { status: 500 },
    );
  }
}
