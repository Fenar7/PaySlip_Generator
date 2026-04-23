import type { Metadata } from "next";
import {
  getPdfStudioCanonicalPath,
  getPdfStudioTierBadgeCopy,
  getPdfStudioExecutionCopy,
  getPdfStudioTool,
  isPdfStudioToolInteractiveForPublic,
  listPdfStudioTools,
} from "@/features/docs/pdf-studio/lib/tool-registry";
import type {
  PdfStudioToolId,
  PdfStudioToolSurface,
} from "@/features/docs/pdf-studio/types";

const PDF_STUDIO_HUB_DESCRIPTION =
  "Browse PDF Studio tools for creating, merging, splitting, repairing, and converting PDFs with clear browser-vs-processing guidance.";

function getPdfStudioAbsoluteUrl(path: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.app").replace(
    /\/$/,
    "",
  );

  return `${baseUrl}${path}`;
}

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
      twitter: {
        card: "summary_large_image",
        title: "PDF Studio | Slipwise",
        description: PDF_STUDIO_HUB_DESCRIPTION,
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
  const tier = getPdfStudioTierBadgeCopy(tool);
  const publicInteractive = isPdfStudioToolInteractiveForPublic(tool);
  const description =
    surface === "public" && !publicInteractive
      ? `${tool.description} ${tier.label} access. Open the Slipwise workspace to run this tool with the right plan and document controls.`
      : `${tool.description} ${execution.description}`;
  const canonicalPath = getPdfStudioCanonicalPath(tool);

  if (surface === "public") {
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
      twitter: {
        card: "summary_large_image",
        title: `${tool.title} | PDF Studio`,
        description,
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

export function buildPdfStudioHubStructuredData() {
  const tools = listPdfStudioTools("public");

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "PDF Studio | Slipwise",
    description: PDF_STUDIO_HUB_DESCRIPTION,
    url: getPdfStudioAbsoluteUrl("/pdf-studio"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.title,
        url: getPdfStudioAbsoluteUrl(getPdfStudioCanonicalPath(tool)),
      })),
    },
  };
}

export function buildPdfStudioToolStructuredData(toolId: PdfStudioToolId) {
  const tool = getPdfStudioTool(toolId);
  const execution = getPdfStudioExecutionCopy(tool.executionMode);
  const tier = getPdfStudioTierBadgeCopy(tool);
  const publicInteractive = isPdfStudioToolInteractiveForPublic(tool);
  const canonicalPath = getPdfStudioCanonicalPath(tool);
  const description = publicInteractive
    ? `${tool.description} ${execution.description}`
    : `${tool.description} ${tier.label} access. Open the Slipwise workspace to run this tool with the right plan and document controls.`;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${tool.title} | PDF Studio`,
    description,
    url: getPdfStudioAbsoluteUrl(canonicalPath),
    isPartOf: {
      "@type": "CollectionPage",
      name: "PDF Studio | Slipwise",
      url: getPdfStudioAbsoluteUrl("/pdf-studio"),
    },
    keywords: tool.keywords.join(", "),
    about: [
      {
        "@type": "Thing",
        name: tool.title,
      },
      {
        "@type": "Thing",
        name: publicInteractive ? execution.badge : `${tier.label} access`,
      },
    ],
  };
}
