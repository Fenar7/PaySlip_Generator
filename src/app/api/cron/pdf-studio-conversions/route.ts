import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";
import { cleanupExpiredPdfStudioConversionArtifacts } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { processPendingPdfStudioConversionJobs } from "@/features/docs/pdf-studio/lib/process-conversion-job";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [result, cleanup] = await Promise.all([
      processPendingPdfStudioConversionJobs(),
      cleanupExpiredPdfStudioConversionArtifacts(),
    ]);
    return NextResponse.json({
      ok: true,
      ...result,
      cleanup,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not process queued PDF Studio conversions.",
      },
      { status: 500 },
    );
  }
}
