import "server-only";

import { db } from "@/lib/db";
import { captureError } from "@/lib/sentry";
import {
  appendPdfStudioConversionOutput,
  claimPdfStudioConversionJob,
  claimPdfStudioConversionJobForOrg,
  listRetryablePdfStudioConversionJobs,
  markPdfStudioConversionComplete,
  markPdfStudioConversionFailed,
  type PdfStudioConversionSourceManifest,
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

    const sources = getPendingSources(payload);
    if (sources.length === 0) {
      const result = await runServerConversion({
        toolId: payload.toolId,
        sourceStorageKey: payload.sourceStorageKey,
        sourceUrl: payload.sourceUrl,
        options: payload.options,
      });

      await appendPdfStudioConversionOutput({
        jobId,
        toolId: payload.toolId,
        targetFormat: payload.targetFormat,
        sourceIndex: 0,
        sourceFileName:
          payload.sourceFileName ??
          (payload.sourceUrl ? new URL(payload.sourceUrl).hostname : "document"),
        outputBytes: result.bytes,
        mimeType: result.mimeType,
      });
    } else {
      for (const source of sources) {
        const result = await runServerConversion({
          toolId: payload.toolId,
          sourceStorageKey: source.storageKey,
          sourceUrl: undefined,
          options: payload.options,
        });

        await appendPdfStudioConversionOutput({
          jobId,
          toolId: payload.toolId,
          targetFormat: payload.targetFormat,
          sourceIndex: source.index,
          sourceFileName: source.fileName,
          outputBytes: result.bytes,
          mimeType: result.mimeType,
        });
      }
    }

    await markPdfStudioConversionComplete({ jobId });

    return { processed: true as const, success: true as const };
  } catch (error) {
    const conversionError = toPdfStudioConversionError(error);
    await markPdfStudioConversionFailed({
      jobId,
      code: conversionError.code,
      message: conversionError.message,
      retryable: conversionError.retryable,
    });
    if (!conversionError.retryable || record.retryCount + 1 >= record.maxRetries) {
      await captureError(error, {
        feature: "pdf-studio",
        operation: "process-conversion-job",
        jobId,
        orgId: record.orgId,
        userId: record.userId,
        toolId: payload.toolId,
        targetFormat: payload.targetFormat,
        retryCount: record.retryCount + 1,
        maxRetries: record.maxRetries,
        failureCode: conversionError.code,
      });
    }
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

function getPendingSources(payload: PdfStudioConversionPayload): PdfStudioConversionSourceManifest[] {
  const sources =
    Array.isArray(payload.sources) && payload.sources.length > 0
      ? payload.sources
      : payload.sourceFileName
        ? [
            {
              index: 0,
              storageKey: payload.sourceStorageKey,
              fileName: payload.sourceFileName,
              mimeType: payload.sourceMimeType ?? "application/octet-stream",
              sizeBytes: payload.sourceSizeBytes ?? 0,
            },
          ]
        : [];

  const completedIndexes = new Set(
    Array.isArray(payload.outputs) ? payload.outputs.map((output) => output.index) : [],
  );

  return sources
    .filter((source) => !completedIndexes.has(source.index))
    .sort((a, b) => a.index - b.index);
}
