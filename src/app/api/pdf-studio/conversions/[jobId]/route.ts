import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { checkFeature } from "@/lib/plans/enforcement";

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
  const job = await getPdfStudioConversionJob(jobId, auth.orgId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(job);
}
