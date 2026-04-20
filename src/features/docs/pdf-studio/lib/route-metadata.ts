import type { Metadata } from "next";
import {
  getPdfStudioCanonicalPath,
  getPdfStudioExecutionCopy,
  getPdfStudioTool,
  isPdfStudioToolAvailableOnSurface,
} from "@/features/docs/pdf-studio/lib/tool-registry";
import type {
  PdfStudioToolId,
  PdfStudioToolSurface,
} from "@/features/docs/pdf-studio/types";

const PDF_STUDIO_HUB_DESCRIPTION =
  "Browse PDF Studio tools for creating, merging, splitting, repairing, and converting PDFs with clear browser-vs-processing guidance.";

export function buildPdfStudioHubMetadata(
  surface: PdfStudioToolSurface,
): Metadata {
  if (surface === "public") {
    return {
      title: "PDF Studio | Slipwise",
      description: PDF_STUDIO_HUB_DESCRIPTION,
      alternates: {
        canonical: "/pdf-studio",
      },
      openGraph: {
        title: "PDF Studio | Slipwise",
        description: PDF_STUDIO_HUB_DESCRIPTION,
        url: "/pdf-studio",
      },
    };
  }

  return {
    title: "PDF Studio | Slipwise",
    description:
      "Open PDF Studio in the workspace to run browser-first PDF tools with a shared catalog, shared limits, and workspace shortcuts.",
    alternates: {
      canonical: "/pdf-studio",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export function buildPdfStudioToolMetadata(
  toolId: PdfStudioToolId,
  surface: PdfStudioToolSurface,
): Metadata {
  const tool = getPdfStudioTool(toolId);
  const execution = getPdfStudioExecutionCopy(tool.executionMode);
  const description = `${tool.description} ${execution.description}`;
  const canonicalPath = getPdfStudioCanonicalPath(tool);

  if (surface === "public" && isPdfStudioToolAvailableOnSurface(tool, "public")) {
    return {
      title: `${tool.title} | PDF Studio`,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${tool.title} | PDF Studio`,
        description,
        url: canonicalPath,
      },
      keywords: tool.keywords,
    };
  }

  return {
    title: `${tool.title} | PDF Studio`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    keywords: tool.keywords,
    robots: {
      index: false,
      follow: false,
    },
  };
}
