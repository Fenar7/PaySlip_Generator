import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { processPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/process-conversion-job";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const auth = await getOrgContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  const job = await getPdfStudioConversionJob(jobId, auth.orgId);
  if (!job) {
    return NextResponse.json({ error: "Conversion job not found." }, { status: 404 });
  }

  const result = await processPdfStudioConversionJob(jobId, auth.orgId);
  return NextResponse.json(result, { status: 202 });
}
