import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getPdfStudioConversionBundle } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { checkFeature } from "@/lib/plans/enforcement";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
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

  const { jobId } = await context.params;

  try {
    const bundle = await getPdfStudioConversionBundle(jobId, auth.orgId);
    if (!bundle) {
      return NextResponse.json({ error: "Conversion job not found." }, { status: 404 });
    }

    return new NextResponse(bundle.bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${bundle.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build the PDF Studio batch bundle.",
      },
      { status: 409 },
    );
  }
}
