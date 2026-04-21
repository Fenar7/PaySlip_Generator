import "server-only";

import { db } from "@/lib/db";
import {
  claimPdfStudioConversionJob,
  claimPdfStudioConversionJobForOrg,
  listRetryablePdfStudioConversionJobs,
  markPdfStudioConversionComplete,
  markPdfStudioConversionFailed,
  type PdfStudioConversionPayload,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { toPdfStudioConversionError } from "@/features/docs/pdf-studio/lib/conversion-errors";
import { runServerConversion } from "@/features/docs/pdf-studio/lib/server-converters";

export async function processPdfStudioConversionJob(jobId: string, orgId?: string) {
  const claimed = orgId
    ? await claimPdfStudioConversionJobForOrg(jobId, orgId)
    : await claimPdfStudioConversionJob(jobId);
  if (!claimed) {
    return { processed: false as const };
  }

  const record = await db.jobLog.findUniqueOrThrow({ where: { id: jobId } });
  const payload = (record.payload ?? {}) as Partial<PdfStudioConversionPayload>;

  try {
    if (!payload.toolId || !payload.targetFormat) {
      throw new Error("The queued conversion job is missing its conversion target.");
    }

    const result = await runServerConversion({
      toolId: payload.toolId,
      sourceStorageKey: payload.sourceStorageKey,
      sourceUrl: payload.sourceUrl,
      options: payload.options,
    });

    await markPdfStudioConversionComplete({
      jobId,
      toolId: payload.toolId,
      targetFormat: payload.targetFormat,
      sourceFileName:
        payload.sourceFileName ??
        (payload.sourceUrl ? new URL(payload.sourceUrl).hostname : "document"),
      outputBytes: result.bytes,
      mimeType: result.mimeType,
    });

    return { processed: true as const, success: true as const };
  } catch (error) {
    const conversionError = toPdfStudioConversionError(error);
    await markPdfStudioConversionFailed({
      jobId,
      code: conversionError.code,
      message: conversionError.message,
      retryable: conversionError.retryable,
    });
    return { processed: true as const, success: false as const };
  }
}

export async function processPendingPdfStudioConversionJobs(limit = 5) {
  const jobs = await listRetryablePdfStudioConversionJobs(limit);
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    const result = await processPdfStudioConversionJob(job.id);
    if (!result.processed) {
      continue;
    }
    if (result.success) {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  return {
    processed: succeeded + failed,
    succeeded,
    failed,
  };
}
