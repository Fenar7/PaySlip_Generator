import "server-only";

import { zipSync } from "fflate";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  buildPdfStudioOutputName,
  getPdfStudioSourceBaseName,
} from "@/features/docs/pdf-studio/lib/output";
import {
  PDF_STUDIO_CONVERSION_DEAD_LETTER_RETENTION_MS,
  PDF_STUDIO_CONVERSION_RECORD_RETENTION_MS,
  PDF_STUDIO_CONVERSION_RESULT_TTL_MS,
} from "@/features/docs/pdf-studio/lib/server-conversion-policy";
import {
  deleteFileServer,
  downloadFileServer,
  getSignedUrlServer,
  uploadFileServer,
} from "@/lib/storage/upload-server";
import type { PdfStudioConversionJobStatus } from "@/features/docs/pdf-studio/types";

const PDF_STUDIO_CONVERSION_JOB_NAME = "pdf-studio-conversion";
const BATCH_BUNDLE_ROUTE_BASE = "/api/pdf-studio/conversions";

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

export type PdfStudioConversionSourceManifest = {
  index: number;
  storageKey?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  deletedAt?: string;
};

export type PdfStudioConversionOutputManifest = {
  index: number;
  sourceFileName: string;
  storageKey?: string;
  fileName: string;
  mimeType: string;
  completedAt?: string;
  deletedAt?: string;
};

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
  failureRetryable?: boolean;
  totalItems?: number;
  sources?: PdfStudioConversionSourceManifest[];
  outputs?: PdfStudioConversionOutputManifest[];
};

type JobLogRecord = Awaited<ReturnType<typeof db.jobLog.findUnique>>;

export type PdfStudioConversionOutputResult = {
  index: number;
  sourceFileName: string;
  outputFileName: string;
  downloadUrl?: string;
};

export type PdfStudioConversionJobResult = {
  jobId: string;
  status: PdfStudioConversionJobStatus;
  outputFileName?: string;
  downloadUrl?: string;
  bundleDownloadPath?: string;
  outputs?: PdfStudioConversionOutputResult[];
  error?: string;
  attempts: number;
  payload: PdfStudioConversionPayload;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  canRetry: boolean;
  nextRetryAt?: string;
};

export type PdfStudioConversionHistoryEntry = {
  jobId: string;
  toolId: PdfStudioServerConversionToolId;
  status: PdfStudioConversionJobStatus;
  createdAt: string;
  completedAt?: string;
  attempts: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  sourceLabel: string;
  error?: string;
  canRetry: boolean;
  bundleAvailable: boolean;
  nextRetryAt?: string;
};

function getPayload(record: JobLogRecord): PdfStudioConversionPayload {
  return (record?.payload ?? {}) as PdfStudioConversionPayload;
}

function getSourceManifests(payload: PdfStudioConversionPayload): PdfStudioConversionSourceManifest[] {
  if (Array.isArray(payload.sources) && payload.sources.length > 0) {
    return [...payload.sources].sort((a, b) => a.index - b.index);
  }

  if (payload.sourceFileName) {
    return [
      {
        index: 0,
        storageKey: payload.sourceStorageKey,
        fileName: payload.sourceFileName,
        mimeType: payload.sourceMimeType ?? "application/octet-stream",
        sizeBytes: payload.sourceSizeBytes ?? 0,
        deletedAt: payload.sourceDeletedAt,
      },
    ];
  }

  return [];
}

function getOutputManifests(payload: PdfStudioConversionPayload): PdfStudioConversionOutputManifest[] {
  if (Array.isArray(payload.outputs) && payload.outputs.length > 0) {
    return [...payload.outputs].sort((a, b) => a.index - b.index);
  }

  if (payload.outputFileName) {
    return [
      {
        index: 0,
        sourceFileName: payload.sourceFileName ?? payload.outputFileName,
        storageKey: payload.outputStorageKey,
        fileName: payload.outputFileName,
        mimeType: payload.outputMimeType ?? "application/octet-stream",
        deletedAt: payload.outputDeletedAt,
      },
    ];
  }

  return [];
}

function getTotalItems(payload: PdfStudioConversionPayload) {
  return (
    payload.totalItems ??
    Math.max(getSourceManifests(payload).length, getOutputManifests(payload).length, payload.sourceUrl ? 1 : 0)
  );
}

function buildBatchVariant(index: number) {
  return `batch-${String(index + 1).padStart(2, "0")}`;
}

function buildBundleName(payload: PdfStudioConversionPayload, outputs: PdfStudioConversionOutputManifest[]) {
  const firstSourceName =
    outputs[0]?.sourceFileName ?? payload.sourceFileName ?? payload.outputFileName ?? "document";

  return buildPdfStudioOutputName({
    toolId: payload.toolId,
    baseName: getPdfStudioSourceBaseName(firstSourceName, "document"),
    variant: buildBatchVariant(Math.max(outputs.length - 1, 0)),
    extension: "zip",
  });
}

function getArtifactStrippedPayload(payload: PdfStudioConversionPayload, nowIso: string) {
  const nextSources = getSourceManifests(payload).map((source) => ({
    ...source,
    storageKey: undefined,
    deletedAt: source.deletedAt ?? nowIso,
  }));
  const nextOutputs = getOutputManifests(payload).map((output) => ({
    ...output,
    storageKey: undefined,
    deletedAt: output.deletedAt ?? nowIso,
  }));

  return {
    ...payload,
    sourceStorageKey: undefined,
    outputStorageKey: undefined,
    sourceDeletedAt: payload.sourceDeletedAt ?? nowIso,
    outputDeletedAt: payload.outputDeletedAt ?? nowIso,
    sources: nextSources.length > 0 ? nextSources : undefined,
    outputs: nextOutputs.length > 0 ? nextOutputs : undefined,
  };
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
  sourceFiles?: Array<{
    file: File;
    bytes?: Uint8Array;
    pageCount?: number;
  }>;
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

  const requestedSources =
    params.sourceFiles && params.sourceFiles.length > 0
      ? params.sourceFiles
      : params.sourceFile
        ? [{ file: params.sourceFile, bytes: params.sourceBytes }]
        : [];

  const uploadedSources: PdfStudioConversionSourceManifest[] = [];

  try {
    for (const [index, source] of requestedSources.entries()) {
      const extension = source.file.name.includes(".")
        ? source.file.name.slice(source.file.name.lastIndexOf("."))
        : "";
      const sourcePath =
        `${params.orgId}/pdf-studio/conversions/${job.id}/sources/` +
        `${String(index + 1).padStart(2, "0")}${extension}`;
      const buffer = Buffer.from(source.bytes ?? (await source.file.arrayBuffer()));

      await uploadConversionAttachment(
        sourcePath,
        buffer,
        source.file.type || "application/octet-stream",
      );

      uploadedSources.push({
        index,
        storageKey: sourcePath,
        fileName: source.file.name,
        mimeType: source.file.type || "application/octet-stream",
        sizeBytes: buffer.byteLength,
        pageCount: source.pageCount,
      });
    }

    const singleSource = uploadedSources[0];

    await db.jobLog.update({
      where: { id: job.id },
      data: {
        payload: {
          toolId: params.toolId,
          targetFormat: params.targetFormat,
          sourceStorageKey:
            uploadedSources.length === 1 ? singleSource?.storageKey : undefined,
          sourceFileName:
            uploadedSources.length === 1 ? singleSource?.fileName : undefined,
          sourceMimeType:
            uploadedSources.length === 1 ? singleSource?.mimeType : undefined,
          sourceSizeBytes:
            uploadedSources.length === 1 ? singleSource?.sizeBytes : undefined,
          sourceUrl: params.sourceUrl,
          options: params.options ?? {},
          totalItems: Math.max(uploadedSources.length, params.sourceUrl ? 1 : 0),
          sources: uploadedSources.length > 0 ? uploadedSources : undefined,
          outputs: undefined,
        } as Prisma.InputJsonValue,
      },
    });

    return job.id;
  } catch (error) {
    for (const source of uploadedSources) {
      if (!source.storageKey) {
        continue;
      }
      try {
        await deleteConversionAttachment(source.storageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up conversion source after job creation error:",
          cleanupError,
        );
      }
    }
    await db.jobLog.delete({ where: { id: job.id } }).catch((deleteError) => {
      console.error("Failed to delete incomplete conversion job:", deleteError);
    });
    throw error;
  }
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
  const outputs = getOutputManifests(payload);
  const totalItems = getTotalItems(payload);
  const completedItems = outputs.length;
  const resultExpiresAt = payload.resultExpiresAt ? new Date(payload.resultExpiresAt) : null;
  const resultExpired = resultExpiresAt != null && resultExpiresAt.getTime() <= Date.now();

  let resolvedOutputs: PdfStudioConversionOutputResult[] | undefined;
  let downloadUrl: string | undefined;

  if (record.status === "completed" && outputs.length > 0 && !resultExpired) {
    resolvedOutputs = await Promise.all(
      outputs.map(async (output) => ({
        index: output.index,
        sourceFileName: output.sourceFileName,
        outputFileName: output.fileName,
        downloadUrl:
          output.storageKey != null
            ? await getSignedUrlServer("attachments", output.storageKey, 15 * 60, {
                useAdmin: true,
                download: output.fileName,
              })
            : undefined,
      })),
    );

    if (resolvedOutputs.length === 1) {
      downloadUrl = resolvedOutputs[0]?.downloadUrl;
    }
  } else if (outputs.length > 0) {
    resolvedOutputs = outputs.map((output) => ({
      index: output.index,
      sourceFileName: output.sourceFileName,
      outputFileName: output.fileName,
    }));
  }

  return {
    jobId: record.id,
    status: record.status as PdfStudioConversionJobStatus,
    outputFileName: resolvedOutputs?.length === 1 ? resolvedOutputs[0]?.outputFileName : undefined,
    downloadUrl,
    bundleDownloadPath:
      record.status === "completed" && outputs.length > 1 && !resultExpired
        ? `${BATCH_BUNDLE_ROUTE_BASE}/${record.id}/bundle`
        : undefined,
    outputs: resolvedOutputs,
    error:
      resultExpired && record.status === "completed"
        ? "This conversion result expired after 24 hours. Run the conversion again to generate a fresh download."
        : record.errorMessage ?? undefined,
    attempts: record.retryCount,
    payload,
    totalItems,
    completedItems,
    failedItems: record.status === "dead_letter" ? Math.max(totalItems - completedItems, 1) : 0,
    canRetry:
      record.status === "dead_letter" &&
      payload.failureRetryable === true &&
      (getSourceManifests(payload).length > 0 || Boolean(payload.sourceUrl)),
    nextRetryAt: record.nextRetryAt?.toISOString(),
  } satisfies PdfStudioConversionJobResult;
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
    orderBy: [{ triggeredAt: "asc" }, { id: "asc" }],
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

export async function appendPdfStudioConversionOutput(params: {
  jobId: string;
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceIndex: number;
  sourceFileName: string;
  outputBytes: Uint8Array;
  mimeType: string;
}) {
  const job = await db.jobLog.findUniqueOrThrow({ where: { id: params.jobId } });
  const payload = getPayload(job);
  const totalItems = getTotalItems(payload);
  const baseName = getPdfStudioSourceBaseName(params.sourceFileName, "document");
  const outputFileName = buildPdfStudioOutputName({
    toolId: params.toolId,
    baseName,
    variant: totalItems > 1 ? buildBatchVariant(params.sourceIndex) : undefined,
    extension: params.targetFormat,
  });
  const storageKey =
    `${job.orgId}/pdf-studio/conversions/${params.jobId}/outputs/` +
    `${String(params.sourceIndex + 1).padStart(2, "0")}-${outputFileName}`;

  await uploadConversionAttachment(storageKey, Buffer.from(params.outputBytes), params.mimeType);

  const existingOutputs = getOutputManifests(payload).filter(
    (output) => output.index !== params.sourceIndex,
  );
  const nextOutputs = [...existingOutputs, {
    index: params.sourceIndex,
    sourceFileName: params.sourceFileName,
    storageKey,
    fileName: outputFileName,
    mimeType: params.mimeType,
    completedAt: new Date().toISOString(),
  }].sort((a, b) => a.index - b.index);

  await db.jobLog.update({
    where: { id: params.jobId },
    data: {
      payload: {
        ...payload,
        outputStorageKey: nextOutputs.length === 1 ? nextOutputs[0]?.storageKey : undefined,
        outputFileName: nextOutputs.length === 1 ? nextOutputs[0]?.fileName : undefined,
        outputMimeType: nextOutputs.length === 1 ? nextOutputs[0]?.mimeType : undefined,
        outputs: nextOutputs,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function markPdfStudioConversionComplete(params: { jobId: string }) {
  const job = await db.jobLog.findUniqueOrThrow({ where: { id: params.jobId } });
  const payload = getPayload(job);
  const outputs = getOutputManifests(payload);
  const sources = getSourceManifests(payload);
  const completedAt = new Date();
  const resultExpiresAt = new Date(
    completedAt.getTime() + PDF_STUDIO_CONVERSION_RESULT_TTL_MS,
  );

  const nextSources = await Promise.all(
    sources.map(async (source) => {
      if (!source.storageKey) {
        return source;
      }

      try {
        await deleteConversionAttachment(source.storageKey);
        return {
          ...source,
          storageKey: undefined,
          deletedAt: completedAt.toISOString(),
        };
      } catch (error) {
        console.error("Failed to delete conversion source after success:", error);
        return source;
      }
    }),
  );

  await db.jobLog.update({
    where: { id: params.jobId },
    data: {
      status: "completed",
      completedAt,
      errorMessage: null,
      payload: {
        ...payload,
        sourceStorageKey:
          nextSources.length === 1 ? nextSources[0]?.storageKey : undefined,
        sourceDeletedAt:
          nextSources.length === 1 ? nextSources[0]?.deletedAt : payload.sourceDeletedAt,
        outputStorageKey:
          outputs.length === 1 ? outputs[0]?.storageKey : undefined,
        outputFileName:
          outputs.length === 1 ? outputs[0]?.fileName : undefined,
        outputMimeType:
          outputs.length === 1 ? outputs[0]?.mimeType : undefined,
        resultExpiresAt: resultExpiresAt.toISOString(),
        failureCode: undefined,
        failureRetryable: undefined,
        sources: nextSources.length > 0 ? nextSources : undefined,
        outputs: outputs.length > 0 ? outputs : undefined,
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
          failureRetryable: true,
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
        failureRetryable: shouldRetry,
      } as Prisma.InputJsonValue,
      nextRetryAt: null,
    },
  });
}

export async function retryPdfStudioConversionJob(jobId: string, orgId: string) {
  const record = await db.jobLog.findFirst({
    where: {
      id: jobId,
      orgId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      status: "dead_letter",
    },
  });

  if (!record) {
    return null;
  }

  const payload = getPayload(record);
  if (payload.failureRetryable !== true) {
    throw new Error("This PDF Studio job cannot be retried automatically.");
  }

  if (getSourceManifests(payload).length === 0 && !payload.sourceUrl) {
    throw new Error("The original conversion inputs are no longer available for retry.");
  }

  await db.jobLog.update({
    where: { id: jobId },
    data: {
      status: "pending",
      completedAt: null,
      errorMessage: null,
      nextRetryAt: null,
      payload: {
        ...payload,
        failureCode: undefined,
        failureRetryable: undefined,
      } as Prisma.InputJsonValue,
    },
  });

  return getPdfStudioConversionJob(jobId, orgId);
}

export async function listPdfStudioConversionHistory(params: {
  orgId: string;
  toolId?: PdfStudioServerConversionToolId;
  limit?: number;
}) {
  const take = Math.max(params.limit ?? 10, 1);
  const rows = await db.jobLog.findMany({
    where: {
      orgId: params.orgId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
    },
    orderBy: [{ triggeredAt: "desc" }, { id: "desc" }],
    take: Math.max(take * 3, 20),
  });

  return rows
    .map((row) => {
      const payload = getPayload(row);
      const outputs = getOutputManifests(payload);
      const totalItems = getTotalItems(payload);
      const resultExpired =
        payload.resultExpiresAt != null &&
        new Date(payload.resultExpiresAt).getTime() <= Date.now();

      return {
        jobId: row.id,
        toolId: payload.toolId,
        status: row.status as PdfStudioConversionJobStatus,
        createdAt: row.triggeredAt.toISOString(),
        completedAt: row.completedAt?.toISOString(),
        attempts: row.retryCount,
        totalItems,
        completedItems: outputs.length,
        failedItems:
          row.status === "dead_letter" ? Math.max(totalItems - outputs.length, 1) : 0,
        sourceLabel:
          totalItems <= 1
            ? getSourceManifests(payload)[0]?.fileName ??
              payload.sourceFileName ??
              "document"
            : `${totalItems} files`,
        error: row.errorMessage ?? undefined,
        canRetry:
          row.status === "dead_letter" &&
          payload.failureRetryable === true &&
          (getSourceManifests(payload).length > 0 || Boolean(payload.sourceUrl)),
        bundleAvailable:
          row.status === "completed" && outputs.length > 1 && !resultExpired,
        nextRetryAt: row.nextRetryAt?.toISOString(),
      } satisfies PdfStudioConversionHistoryEntry;
    })
    .filter((entry) => (params.toolId ? entry.toolId === params.toolId : true))
    .slice(0, take);
}

export async function getPdfStudioConversionBundle(jobId: string, orgId: string) {
  const record = await db.jobLog.findFirst({
    where: {
      id: jobId,
      orgId,
      jobName: PDF_STUDIO_CONVERSION_JOB_NAME,
      status: "completed",
    },
  });

  if (!record) {
    return null;
  }

  const payload = getPayload(record);
  const outputs = getOutputManifests(payload);
  if (outputs.length <= 1) {
    throw new Error("A bundle is only available for completed batch jobs.");
  }

  if (payload.resultExpiresAt && new Date(payload.resultExpiresAt).getTime() <= Date.now()) {
    throw new Error("This batch bundle expired after 24 hours. Run the batch again.");
  }

  const files = await Promise.all(
    outputs.map(async (output) => {
      if (!output.storageKey) {
        throw new Error(`Missing storage for ${output.fileName}.`);
      }

      return {
        name: output.fileName,
        data: await downloadFileServer("attachments", output.storageKey, { useAdmin: true }),
      };
    }),
  );

  const zipEntries: Record<string, Uint8Array> = {};
  for (const file of files) {
    zipEntries[file.name] = file.data;
  }

  return {
    fileName: buildBundleName(payload, outputs),
    bytes: zipSync(zipEntries),
  };
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
    orderBy: [{ completedAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  let cleaned = 0;
  let deletedRecords = 0;

  for (const job of candidates) {
    const payload = getPayload(job);
    const storageKeys = new Set<string>();

    if (payload.sourceStorageKey) {
      storageKeys.add(payload.sourceStorageKey);
    }
    if (payload.outputStorageKey) {
      storageKeys.add(payload.outputStorageKey);
    }
    for (const source of getSourceManifests(payload)) {
      if (source.storageKey) {
        storageKeys.add(source.storageKey);
      }
    }
    for (const output of getOutputManifests(payload)) {
      if (output.storageKey) {
        storageKeys.add(output.storageKey);
      }
    }

    for (const storageKey of storageKeys) {
      try {
        await deleteConversionAttachment(storageKey);
      } catch (error) {
        console.error("Failed to delete expired conversion artifact:", error);
      }
    }

    const artifactStrippedPayload = getArtifactStrippedPayload(payload, now.toISOString());

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
