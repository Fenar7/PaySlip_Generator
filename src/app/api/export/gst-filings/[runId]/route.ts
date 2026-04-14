import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import {
  buildGstFilingExportPackage,
  recordGstFilingPackageExport,
} from "@/lib/gst/filings";
import { checkFeature } from "@/lib/plans/enforcement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const context = await getOrgContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkFeature(context.orgId, "gstrExport");
  if (!allowed) {
    return NextResponse.json(
      { error: "GST filings require a Pro plan or above." },
      { status: 403 },
    );
  }

  const { runId } = await params;

  try {
    const payload = await buildGstFilingExportPackage({
      orgId: context.orgId,
      runId,
    });

    await recordGstFilingPackageExport({
      orgId: context.orgId,
      actorId: context.userId,
      runId,
    });

    const filename = `gst-filing-${payload.periodMonth}-${payload.returnType.toLowerCase()}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GST filing export failed.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
