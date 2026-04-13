import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { generateGSTR1 } from "@/lib/gstr1-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await checkFeature(ctx.orgId, "gstrExport");
    if (!allowed) {
      return NextResponse.json(
        { error: "GSTR Export requires a Pro plan or above." },
        { status: 403 },
      );
    }

    const period = request.nextUrl.searchParams.get("period");
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: "Invalid or missing 'period' parameter. Expected format: YYYY-MM" },
        { status: 400 },
      );
    }

    const report = await generateGSTR1(ctx.orgId, period);

    const filename = `GSTR1_${report.gstin || "DRAFT"}_${report.fp}.json`;

    return new NextResponse(JSON.stringify(report, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GSTR-1 generation failed:", error);
    return NextResponse.json(
      { error: "GSTR-1 generation failed." },
      { status: 500 },
    );
  }
}
