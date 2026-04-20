import { z } from "zod";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import { classifyPdfStudioFile } from "@/features/docs/pdf-studio/lib/ingestion";
import type {
  PdfStudioExecutionMode,
  PdfStudioFileClass,
  PdfStudioToolId,
  PdfStudioToolSurface,
} from "@/features/docs/pdf-studio/types";

export const pdfStudioJobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const pdfStudioJobPayloadSchema = z.object({
  jobId: z.string().min(1),
  tool: z.string().min(1),
  surface: z.enum(["workspace", "public"]),
  status: pdfStudioJobStatusSchema,
  inputManifest: z.object({
    fileCount: z.number().int().positive(),
    totalBytes: z.number().int().nonnegative(),
    pageCount: z.number().int().nonnegative().optional(),
    classifications: z.array(z.string().min(1)).min(1),
  }),
  outputManifest: z.object({
    label: z.string().min(1),
    extension: z.string().min(1),
  }),
  execution: z.object({
    mode: z.enum(["browser", "processing", "hybrid"]),
    requiresProcessing: z.boolean(),
  }),
});

export type PdfStudioJobPayload = z.infer<typeof pdfStudioJobPayloadSchema>;

export function createPdfStudioJobPayload(options: {
  toolId: PdfStudioToolId;
  surface: PdfStudioToolSurface;
  files: File[];
  pageCount?: number;
  classifications?: PdfStudioFileClass[];
  executionMode?: PdfStudioExecutionMode;
  status?: z.infer<typeof pdfStudioJobStatusSchema>;
  outputExtension?: string;
}) {
  const tool = getPdfStudioTool(options.toolId);
  const classifications =
    options.classifications ??
    options.files
      .map((file) => classifyPdfStudioFile(file))
      .filter((value): value is PdfStudioFileClass => Boolean(value));

  return pdfStudioJobPayloadSchema.parse({
    jobId:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `pdf-studio-${Date.now()}`,
    tool: options.toolId,
    surface: options.surface,
    status: options.status ?? "queued",
    inputManifest: {
      fileCount: options.files.length,
      totalBytes: options.files.reduce((sum, file) => sum + file.size, 0),
      pageCount: options.pageCount,
      classifications,
    },
    outputManifest: {
      label: tool.outputLabel,
      extension: options.outputExtension ?? "pdf",
    },
    execution: {
      mode: options.executionMode ?? tool.executionMode,
      requiresProcessing:
        (options.executionMode ?? tool.executionMode) !== "browser",
    },
  });
}
