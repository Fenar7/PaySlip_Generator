import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { buildPdfStudioOutputName, getPdfStudioSourceBaseName } from "@/features/docs/pdf-studio/lib/output";
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
  sourceUrl?: string;
  options?: PdfStudioConversionJsonObject;
  outputStorageKey?: string;
  outputFileName?: string;
  outputMimeType?: string;
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
  const supabase = await createSupabaseAdmin();
  const { error } = await supabase.storage.from("attachments").upload(storageKey, buffer, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(`Failed to store conversion artifact: ${error.message}`);
  }
}

async function createConversionSignedUrl(storageKey: string, expiresInSeconds = 3600) {
  const supabase = await createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error("Failed to create a signed URL for the conversion result.");
  }

  return data.signedUrl;
}

export async function createPdfStudioConversionJob(params: {
  orgId: string;
  userId: string;
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceFile?: File;
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

  if (params.sourceFile) {
    const extension = params.sourceFile.name.includes(".")
      ? params.sourceFile.name.slice(params.sourceFile.name.lastIndexOf("."))
      : "";
    const sourcePath = `${params.orgId}/pdf-studio/conversions/${job.id}/source${extension}`;
    const buffer = Buffer.from(await params.sourceFile.arrayBuffer());
    await uploadConversionAttachment(
      sourcePath,
      buffer,
      params.sourceFile.type || "application/octet-stream",
    );
    sourceStorageKey = sourcePath;
    sourceFileName = params.sourceFile.name;
    sourceMimeType = params.sourceFile.type || "application/octet-stream";
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
        sourceUrl: params.sourceUrl,
        options: params.options ?? {},
      } as Prisma.InputJsonValue,
    },
  });

  return job.id;
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
  const downloadUrl =
    record.status === "completed" && payload.outputStorageKey
      ? await createConversionSignedUrl(payload.outputStorageKey, 60 * 60)
      : undefined;

  return {
    jobId: record.id,
    status: record.status as PdfStudioConversionJobStatus,
    outputFileName: payload.outputFileName,
    downloadUrl,
    error: record.errorMessage ?? undefined,
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
  await db.jobLog.update({
    where: { id: params.jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: {
        ...payload,
        outputStorageKey: storageKey,
        outputFileName,
        outputMimeType: params.mimeType,
      } as Prisma.InputJsonValue,
      nextRetryAt: null,
    },
  });
}

export async function markPdfStudioConversionFailed(params: {
  jobId: string;
  code: string;
  message: string;
}) {
  const job = await db.jobLog.findUniqueOrThrow({ where: { id: params.jobId } });
  const nextRetryCount = job.retryCount + 1;
  const payload = getPayload(job);

  if (nextRetryCount < job.maxRetries) {
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

  await db.jobLog.update({
    where: { id: params.jobId },
    data: {
      status: "dead_letter",
      retryCount: nextRetryCount,
      completedAt: new Date(),
      errorMessage: params.message,
      payload: {
        ...payload,
        failureCode: params.code,
      } as Prisma.InputJsonValue,
    },
  });
}
