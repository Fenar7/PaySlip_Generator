import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { retryPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { checkFeature } from "@/lib/plans/enforcement";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
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
    const job = await retryPdfStudioConversionJob(jobId, auth.orgId);
    if (!job) {
      return NextResponse.json({ error: "Conversion job not found." }, { status: 404 });
    }

    void fetch(new URL(`/api/pdf-studio/conversions/${jobId}/process`, request.url), {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }).catch(() => {});

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not retry the PDF Studio conversion job.",
      },
      { status: 409 },
    );
  }
}
