import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron";
import { processPendingPdfStudioConversionJobs } from "@/features/docs/pdf-studio/lib/process-conversion-job";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingPdfStudioConversionJobs();
    return NextResponse.json({
      ok: true,
      ...result,
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
