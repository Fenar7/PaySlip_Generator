import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { buildPdfStudioOutputName, getPdfStudioSourceBaseName } from "@/features/docs/pdf-studio/lib/output";
import {
  PDF_STUDIO_CONVERSION_DEAD_LETTER_RETENTION_MS,
  PDF_STUDIO_CONVERSION_RECORD_RETENTION_MS,
  PDF_STUDIO_CONVERSION_RESULT_TTL_MS,
} from "@/features/docs/pdf-studio/lib/server-conversion-policy";
import {
  deleteFileServer,
  getSignedUrlServer,
  uploadFileServer,
} from "@/lib/storage/upload-server";
import type { PdfStudioConversionJobStatus } from "@/features/docs/pdf-studio/types";

const PDF_STUDIO_CONVERSION_JOB_NAME = "pdf-studio-conversion";

type JsonPrimitive = string | number | boolean | null;
export type PdfStudioConversionJsonValue =
  | JsonPrimitive
  | PdfStudioConversionJsonObject
  | PdfStudioConversionJsonValue[];
export type PdfStudioConversionJsonObject = {
  [key: string]: PdfStudioConversionJsonValue | undefined;
};

export type PdfStudioServerConversionToolId =
  | "pdf-to-word"
  | "pdf-to-excel"
  | "pdf-to-ppt"
  | "word-to-pdf"
  | "html-to-pdf";

export type PdfStudioServerConversionTargetFormat = "docx" | "xlsx" | "pptx" | "pdf";

export type PdfStudioConversionPayload = {
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceStorageKey?: string;
  sourceFileName?: string;
  sourceMimeType?: string;
  sourceSizeBytes?: number;
  sourceUrl?: string;
  options?: PdfStudioConversionJsonObject;
  outputStorageKey?: string;
  outputFileName?: string;
  outputMimeType?: string;
  resultExpiresAt?: string;
  sourceDeletedAt?: string;
  outputDeletedAt?: string;
  failureCode?: string;
};

type JobLogRecord = Awaited<ReturnType<typeof db.jobLog.findUnique>>;

function getPayload(record: JobLogRecord): PdfStudioConversionPayload {
  return (record?.payload ?? {}) as PdfStudioConversionPayload;
}

async function uploadConversionAttachment(
  storageKey: string,
  buffer: Buffer,
  contentType: string,
) {
  await uploadFileServer("attachments", storageKey, buffer, contentType, {
    useAdmin: true,
  });
}

async function deleteConversionAttachment(storageKey: string) {
  await deleteFileServer("attachments", storageKey, { useAdmin: true });
}

export async function createPdfStudioConversionJob(params: {
  orgId: string;
  userId: string;
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceFile?: File;
  sourceBytes?: Uint8Array;
  sourceUrl?: string;
  options?: PdfStudioConversionJsonObject;
}) {
  const job = await db.jobLog.create({
    data: {
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      orgId: params.orgId,
      status: "pending",
      payload: {
        toolId: params.toolId,
        targetFormat: params.targetFormat,
        sourceUrl: params.sourceUrl,
        options: params.options ?? {},
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  let sourceStorageKey: string | undefined;
  let sourceFileName: string | undefined;
  let sourceMimeType: string | undefined;
  let sourceSizeBytes: number | undefined;

  try {
    if (params.sourceFile) {
      const extension = params.sourceFile.name.includes(".")
        ? params.sourceFile.name.slice(params.sourceFile.name.lastIndexOf("."))
        : "";
      const sourcePath = `${params.orgId}/pdf-studio/conversions/${job.id}/source${extension}`;
      const buffer = Buffer.from(params.sourceBytes ?? (await params.sourceFile.arrayBuffer()));
      await uploadConversionAttachment(
        sourcePath,
        buffer,
        params.sourceFile.type || "application/octet-stream",
      );
      sourceStorageKey = sourcePath;
      sourceFileName = params.sourceFile.name;
      sourceMimeType = params.sourceFile.type || "application/octet-stream";
      sourceSizeBytes = buffer.byteLength;
    }

    await db.jobLog.update({
      where: { id: job.id },
      data: {
        payload: {
          toolId: params.toolId,
          targetFormat: params.targetFormat,
          sourceStorageKey,
          sourceFileName,
          sourceMimeType,
          sourceSizeBytes,
          sourceUrl: params.sourceUrl,
          options: params.options ?? {},
        } as Prisma.InputJsonValue,
      },
    });

    return job.id;
  } catch (error) {
    if (sourceStorageKey) {
      try {
        await deleteConversionAttachment(sourceStorageKey);
      } catch (cleanupError) {
        console.error("Failed to clean up conversion source after job creation error:", cleanupError);
      }
    }
    await db.jobLog.delete({ where: { id: job.id } }).catch((deleteError) => {
      console.error("Failed to delete incomplete conversion job:", deleteError);
    });
    throw error;
  }
}

function getPayloadWithoutArtifacts(payload: PdfStudioConversionPayload) {
  return {
    ...payload,
    sourceStorageKey: undefined,
    outputStorageKey: undefined,
  };
}

export async function getPdfStudioConversionJob(jobId: string, orgId: string) {
  const record = await db.jobLog.findFirst({
    where: {
      id: jobId,
      orgId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
    },
  });

  if (!record) {
    return null;
  }

  const payload = getPayload(record);
  const resultExpiresAt = payload.resultExpiresAt ? new Date(payload.resultExpiresAt) : null;
  const resultExpired = resultExpiresAt != null && resultExpiresAt.getTime() <= Date.now();
  const downloadUrl =
    record.status === "completed" && payload.outputStorageKey && !resultExpired
      ? await getSignedUrlServer("attachments", payload.outputStorageKey, 15 * 60, {
          useAdmin: true,
          download: payload.outputFileName ?? true,
        })
      : undefined;

  return {
    jobId: record.id,
    status: record.status as PdfStudioConversionJobStatus,
    outputFileName: payload.outputFileName,
    downloadUrl,
    error:
      resultExpired && record.status === "completed"
        ? "This conversion result expired after 24 hours. Run the conversion again to generate a fresh download."
        : record.errorMessage ?? undefined,
    attempts: record.retryCount,
    payload,
  };
}

export async function claimPdfStudioConversionJob(jobId: string) {
  const claimed = await db.jobLog.updateMany({
    where: {
      id: jobId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      status: { in: ["pending", "retry_pending"] },
    },
    data: {
      status: "processing",
      errorMessage: null,
    },
  });

  return claimed.count > 0;
}

export async function claimPdfStudioConversionJobForOrg(jobId: string, orgId: string) {
  const claimed = await db.jobLog.updateMany({
    where: {
      id: jobId,
      orgId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      status: { in: ["pending", "retry_pending"] },
    },
    data: {
      status: "processing",
      errorMessage: null,
    },
  });

  return claimed.count > 0;
}

export async function listRetryablePdfStudioConversionJobs(limit = 10) {
  return db.jobLog.findMany({
    where: {
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      status: { in: ["pending", "retry_pending"] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    orderBy: { triggeredAt: "asc" },
    take: limit,
  });
}

export async function countActivePdfStudioConversionJobs(orgId: string) {
  return db.jobLog.count({
    where: {
      orgId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      status: { in: ["pending", "retry_pending", "processing"] },
    },
  });
}

export async function markPdfStudioConversionComplete(params: {
  jobId: string;
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceFileName: string;
  outputBytes: Uint8Array;
  mimeType: string;
}) {
  const baseName = getPdfStudioSourceBaseName(params.sourceFileName, "document");
  const outputFileName = buildPdfStudioOutputName({
    toolId: params.toolId,
    baseName,
    extension: params.targetFormat,
  });
  const job = await db.jobLog.findUniqueOrThrow({ where: { id: params.jobId } });
  const storageKey = `${job.orgId}/pdf-studio/conversions/${params.jobId}/${outputFileName}`;

  await uploadConversionAttachment(
    storageKey,
    Buffer.from(params.outputBytes),
    params.mimeType,
  );

  const payload = getPayload(job);
  const completedAt = new Date();
  const resultExpiresAt = new Date(completedAt.getTime() + PDF_STUDIO_CONVERSION_RESULT_TTL_MS);
  let sourceDeletedAt: string | undefined;

  if (payload.sourceStorageKey) {
    try {
      await deleteConversionAttachment(payload.sourceStorageKey);
      sourceDeletedAt = completedAt.toISOString();
    } catch (error) {
      console.error("Failed to delete conversion source after success:", error);
    }
  }

  await db.jobLog.update({
    where: { id: params.jobId },
    data: {
      status: "completed",
      completedAt,
      errorMessage: null,
      payload: {
        ...payload,
        sourceStorageKey: sourceDeletedAt ? undefined : payload.sourceStorageKey,
        outputStorageKey: storageKey,
        outputFileName,
        outputMimeType: params.mimeType,
        resultExpiresAt: resultExpiresAt.toISOString(),
        sourceDeletedAt,
        failureCode: undefined,
      } as Prisma.InputJsonValue,
      nextRetryAt: null,
    },
  });
}

export async function markPdfStudioConversionFailed(params: {
  jobId: string;
  code: string;
  message: string;
  retryable?: boolean;
}) {
  const job = await db.jobLog.findUniqueOrThrow({ where: { id: params.jobId } });
  const nextRetryCount = job.retryCount + 1;
  const payload = getPayload(job);
  const shouldRetry = params.retryable ?? true;

  if (shouldRetry && nextRetryCount < job.maxRetries) {
    const retryDelayMs = Math.min(Math.pow(2, nextRetryCount) * 30_000, 60 * 60 * 1000);
    const nextRetryAt = new Date(Date.now() + retryDelayMs);
    await db.jobLog.update({
      where: { id: params.jobId },
      data: {
        status: "retry_pending",
        retryCount: nextRetryCount,
        nextRetryAt,
        errorMessage: params.message,
        payload: {
          ...payload,
          failureCode: params.code,
        } as Prisma.InputJsonValue,
      },
    });
    return;
  }

  let sourceDeletedAt: string | undefined;
  let outputDeletedAt: string | undefined;
  if (payload.sourceStorageKey) {
    try {
      await deleteConversionAttachment(payload.sourceStorageKey);
      sourceDeletedAt = new Date().toISOString();
    } catch (error) {
      console.error("Failed to delete conversion source after failure:", error);
    }
  }
  if (payload.outputStorageKey) {
    try {
      await deleteConversionAttachment(payload.outputStorageKey);
      outputDeletedAt = new Date().toISOString();
    } catch (error) {
      console.error("Failed to delete conversion output after failure:", error);
    }
  }

  await db.jobLog.update({
    where: { id: params.jobId },
    data: {
      status: "dead_letter",
      retryCount: nextRetryCount,
      completedAt: new Date(),
      errorMessage: params.message,
      payload: {
        ...payload,
        sourceStorageKey: sourceDeletedAt ? undefined : payload.sourceStorageKey,
        outputStorageKey: outputDeletedAt ? undefined : payload.outputStorageKey,
        sourceDeletedAt,
        outputDeletedAt,
        failureCode: params.code,
      } as Prisma.InputJsonValue,
      nextRetryAt: null,
    },
  });
}

export async function cleanupExpiredPdfStudioConversionArtifacts(limit = 25) {
  const now = new Date();
  const completedCutoff = new Date(now.getTime() - PDF_STUDIO_CONVERSION_RESULT_TTL_MS);
  const deadLetterCutoff = new Date(now.getTime() - PDF_STUDIO_CONVERSION_DEAD_LETTER_RETENTION_MS);
  const recordRetentionCutoff = new Date(now.getTime() - PDF_STUDIO_CONVERSION_RECORD_RETENTION_MS);

  const candidates = await db.jobLog.findMany({
    where: {
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      OR: [
        {
          status: "completed",
          completedAt: { lte: completedCutoff },
        },
        {
          status: "dead_letter",
          completedAt: { lte: deadLetterCutoff },
        },
      ],
    },
    orderBy: { completedAt: "asc" },
    take: limit,
  });

  let cleaned = 0;
  let deletedRecords = 0;

  for (const job of candidates) {
    const payload = getPayload(job);
    if (payload.sourceStorageKey) {
      try {
        await deleteConversionAttachment(payload.sourceStorageKey);
      } catch (error) {
        console.error("Failed to delete expired conversion source:", error);
      }
    }

    if (payload.outputStorageKey) {
      try {
        await deleteConversionAttachment(payload.outputStorageKey);
      } catch (error) {
        console.error("Failed to delete expired conversion output:", error);
      }
    }

    const artifactStrippedPayload = {
      ...getPayloadWithoutArtifacts(payload),
      sourceDeletedAt: payload.sourceDeletedAt ?? now.toISOString(),
      outputDeletedAt: payload.outputDeletedAt ?? now.toISOString(),
    };

    if ((job.completedAt ?? job.triggeredAt) <= recordRetentionCutoff) {
      await db.jobLog.delete({ where: { id: job.id } });
      deletedRecords += 1;
    } else {
      await db.jobLog.update({
        where: { id: job.id },
        data: {
          payload: artifactStrippedPayload as Prisma.InputJsonValue,
        },
      });
    }

    cleaned += 1;
  }

  return { cleaned, deletedRecords };
}
