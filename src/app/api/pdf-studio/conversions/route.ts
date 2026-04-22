import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import {
  countActivePdfStudioConversionJobs,
  createPdfStudioConversionJob,
  type PdfStudioServerConversionTargetFormat,
  type PdfStudioServerConversionToolId,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import {
  isPdfStudioConversionError,
  PdfStudioConversionError,
} from "@/features/docs/pdf-studio/lib/conversion-errors";
import {
  PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT,
  validatePdfStudioBatchConversionRequest,
  validatePdfStudioConversionRequest,
} from "@/features/docs/pdf-studio/lib/server-conversion-policy";
import { checkFeature } from "@/lib/plans/enforcement";
import { RATE_LIMITS, rateLimitByOrg } from "@/lib/rate-limit";
import { isUploadedFile } from "@/lib/server/form-data";

export const runtime = "nodejs";
export const maxDuration = 60;

const SERVER_TOOLS = new Set<PdfStudioServerConversionToolId>([
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-ppt",
  "word-to-pdf",
  "html-to-pdf",
]);

const SERVER_TARGET_FORMATS = new Set<PdfStudioServerConversionTargetFormat>([
  "docx",
  "xlsx",
  "pptx",
  "pdf",
]);

function isServerToolId(value: string): value is PdfStudioServerConversionToolId {
  return SERVER_TOOLS.has(value as PdfStudioServerConversionToolId);
}

function isServerTargetFormat(value: string): value is PdfStudioServerConversionTargetFormat {
  return SERVER_TARGET_FORMATS.has(value as PdfStudioServerConversionTargetFormat);
}

export async function POST(request: NextRequest) {
  const context = await getOrgContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkFeature(context.orgId, "pdfStudioTools"))) {
    return NextResponse.json(
      { error: "PDF Studio conversions require a plan that includes PDF Studio tools." },
      { status: 403 },
    );
  }

  const rateLimit = await rateLimitByOrg(context.orgId, RATE_LIMITS.export);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many conversion requests. Wait for the queue to settle, then retry." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter ?? 60),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const formData = await request.formData();
  const toolId = formData.get("toolId");
  const targetFormat = formData.get("targetFormat");
  const sourceUrl = formData.get("sourceUrl");
  const file = formData.get("file");
  const files = formData.getAll("files");
  const pageSize = formData.get("pageSize");
  const margin = formData.get("margin");

  if (
    typeof toolId !== "string" ||
    !isServerToolId(toolId) ||
    typeof targetFormat !== "string" ||
    !isServerTargetFormat(targetFormat)
  ) {
    return NextResponse.json({ error: "Unsupported conversion request." }, { status: 400 });
  }

  const activeJobs = await countActivePdfStudioConversionJobs(context.orgId);
  if (activeJobs >= PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT) {
    return NextResponse.json(
      {
        error: `Wait for one of your existing PDF Studio conversions to finish before starting another. Up to ${PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT} queued conversions can run per workspace at once.`,
      },
      { status: 429 },
    );
  }

  try {
    const uploadedFiles = files.filter(isUploadedFile);
    const sourceFiles =
      uploadedFiles.length > 0
        ? uploadedFiles
        : isUploadedFile(file)
          ? [file]
          : [];

    const options = {
      pageSize: typeof pageSize === "string" && pageSize.length > 0 ? pageSize : undefined,
      margin: typeof margin === "string" && margin.length > 0 ? margin : undefined,
      preferPrintCss: formData.get("preferPrintCss") === "true",
    };

    const sourceUrlValue =
      typeof sourceUrl === "string" && sourceUrl.trim().length > 0 ? sourceUrl.trim() : undefined;

    if (sourceFiles.length === 0 && !sourceUrlValue) {
      return NextResponse.json(
        { error: "Upload a supported file before starting the conversion." },
        { status: 400 },
      );
    }

    if (sourceFiles.length > 1) {
      const validatedBatch = await validatePdfStudioBatchConversionRequest({
        toolId,
        targetFormat,
        sourceFiles,
        options,
      });

      const jobId = await createPdfStudioConversionJob({
        orgId: context.orgId,
        userId: context.userId,
        toolId,
        targetFormat,
        sourceFiles: validatedBatch.sources.map((source) => ({
          file: source.sourceFile,
          bytes: source.sourceBytes,
          pageCount: source.pageCount,
        })),
        options: validatedBatch.options,
      });

      void fetch(new URL(`/api/pdf-studio/conversions/${jobId}/process`, request.url), {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      }).catch(() => {});

      return NextResponse.json(
        {
          jobId,
          status: "pending",
          totalItems: validatedBatch.sources.length,
          completedItems: 0,
          failedItems: 0,
        },
        { status: 202 },
      );
    }

    const validated = await validatePdfStudioConversionRequest({
      toolId,
      targetFormat,
      sourceFile: sourceFiles[0],
      sourceUrl: sourceUrlValue,
      options,
    });

    const jobId = await createPdfStudioConversionJob({
      orgId: context.orgId,
      userId: context.userId,
      toolId,
      targetFormat,
      sourceFile: validated.sourceFile,
      sourceBytes: validated.sourceBytes,
      options: validated.options,
    });

    void fetch(new URL(`/api/pdf-studio/conversions/${jobId}/process`, request.url), {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        jobId,
        status: "pending",
        totalItems: 1,
        completedItems: 0,
        failedItems: 0,
      },
      { status: 202 },
    );
  } catch (error) {
    if (isPdfStudioConversionError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const fallbackError = new PdfStudioConversionError({
      code: "conversion_failed",
      message: "Could not queue the conversion job.",
      status: 500,
    });
    return NextResponse.json(
      { error: fallbackError.message, code: fallbackError.code },
      { status: fallbackError.status },
    );
  }
}
