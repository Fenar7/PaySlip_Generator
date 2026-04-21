import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import {
  createPdfStudioConversionJob,
  type PdfStudioServerConversionTargetFormat,
  type PdfStudioServerConversionToolId,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";

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

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

export async function POST(request: NextRequest) {
  const context = await getOrgContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const toolId = formData.get("toolId");
  const targetFormat = formData.get("targetFormat");
  const sourceUrl = formData.get("sourceUrl");
  const file = formData.get("file");
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

  if (!isUploadedFile(file) && typeof sourceUrl !== "string") {
    return NextResponse.json(
      { error: "Upload a source file or provide a public URL before starting the conversion." },
      { status: 400 },
    );
  }

  const options = {
    pageSize: typeof pageSize === "string" && pageSize.length > 0 ? pageSize : undefined,
    margin: typeof margin === "string" && margin.length > 0 ? margin : undefined,
    preferPrintCss: formData.get("preferPrintCss") === "true",
  };

  const jobId = await createPdfStudioConversionJob({
    orgId: context.orgId,
    userId: context.userId,
    toolId,
    targetFormat,
    sourceFile: isUploadedFile(file) ? file : undefined,
    sourceUrl: typeof sourceUrl === "string" && sourceUrl.length > 0 ? sourceUrl : undefined,
    options,
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
    },
    { status: 202 },
  );
}
