import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { listPdfStudioConversionHistory } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { checkFeature } from "@/lib/plans/enforcement";

export async function GET(request: NextRequest) {
  const auth = await getOrgContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await checkFeature(auth.orgId, "pdfStudioTools"))) {
    return NextResponse.json(
      { error: "PDF Studio conversions require a plan that includes PDF Studio tools." },
      { status: 403 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const toolId = searchParams.get("toolId") ?? undefined;
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number.parseInt(limitValue, 10) : undefined;

  const items = await listPdfStudioConversionHistory({
    orgId: auth.orgId,
    toolId:
      toolId === "pdf-to-word" ||
      toolId === "pdf-to-excel" ||
      toolId === "pdf-to-ppt" ||
      toolId === "word-to-pdf" ||
      toolId === "html-to-pdf"
        ? toolId
        : undefined,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit ?? 10, 1), 25) : undefined,
  });

  return NextResponse.json({ items });
}
