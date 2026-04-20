import type {
  PdfStudioExecutionMode,
  PdfStudioFileClass,
  PdfStudioToolCategory,
  PdfStudioToolId,
  PdfStudioToolSurface,
} from "@/features/docs/pdf-studio/types";

export type PdfStudioToolDefinition = {
  id: PdfStudioToolId;
  title: string;
  description: string;
  icon: string;
  category: PdfStudioToolCategory;
  workspacePath: string;
  publicPath: string;
  availability: {
    workspace: "available";
    public: "available" | "workspace-only";
  };
  executionMode: PdfStudioExecutionMode;
  inputTypes: PdfStudioFileClass[];
  outputLabel: string;
  limits: {
    maxFiles: number;
    maxSizeMb: number;
    maxPages?: number;
  };
  defaultOutputBase: string;
  keywords: string[];
};

export const PDF_STUDIO_CATEGORY_ORDER: ReadonlyArray<{
  id: PdfStudioToolCategory;
  label: string;
}> = [
  { id: "page-organization", label: "Page Organization" },
  { id: "edit-enhance", label: "Edit & Enhance" },
  { id: "convert-export", label: "Convert & Export" },
];

const SHARED_PDF_LIMITS = {
  maxFiles: 1,
  maxSizeMb: 50,
  maxPages: 200,
} as const;

const PUBLIC_AND_WORKSPACE = {
  workspace: "available",
  public: "available",
} as const;

const WORKSPACE_ONLY = {
  workspace: "available",
  public: "workspace-only",
} as const;

export const PDF_STUDIO_TOOL_REGISTRY: Record<
  PdfStudioToolId,
  PdfStudioToolDefinition
> = {
  create: {
    id: "create",
    title: "Create PDF",
    description:
      "Convert JPG, PNG, WebP, HEIC, and HEIF images into a clean downloadable PDF.",
    icon: "📄",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/create",
    publicPath: "/pdf-studio/create",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["image"],
    outputLabel: "PDF",
    limits: {
      maxFiles: 30,
      maxSizeMb: 50,
    },
    defaultOutputBase: "pdf-studio-document",
    keywords: ["jpg to pdf", "image to pdf", "heic to pdf", "png to pdf"],
  },
  merge: {
    id: "merge",
    title: "Merge PDFs",
    description:
      "Combine multiple PDF files into one document with drag-and-drop page ordering.",
    icon: "📑",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/merge",
    publicPath: "/pdf-studio/merge",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: {
      maxFiles: 10,
      maxSizeMb: 50,
      maxPages: 200,
    },
    defaultOutputBase: "merged-document",
    keywords: ["merge pdf", "combine pdf", "join pdf"],
  },
  "alternate-mix": {
    id: "alternate-mix",
    title: "Alternate & Mix PDFs",
    description:
      "Interleave pages from multiple PDFs with a deterministic turn order and preview the combined result before export.",
    icon: "🧩",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/alternate-mix",
    publicPath: "/pdf-studio/alternate-mix",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: {
      maxFiles: 10,
      maxSizeMb: 50,
      maxPages: 200,
    },
    defaultOutputBase: "alternated-document",
    keywords: ["alternate pdf pages", "mix pdf pages", "interleave pdf"],
  },
  split: {
    id: "split",
    title: "Split PDF",
    description:
      "Split a PDF by ranges, selected start pages, bookmarks, size targets, or detected separators with a preview before export.",
    icon: "✂️",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/split",
    publicPath: "/pdf-studio/split",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF / ZIP",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "split-document",
    keywords: ["split pdf", "extract pages", "separate pdf"],
  },
  "extract-pages": {
    id: "extract-pages",
    title: "Extract Pages",
    description:
      "Pull selected pages or ranges into a new PDF or ZIP with first-class extraction controls and deterministic filenames.",
    icon: "📤",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/extract-pages",
    publicPath: "/pdf-studio/extract-pages",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF / ZIP",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "extracted-pages",
    keywords: ["extract pages from pdf", "save pdf pages", "pull pages from pdf"],
  },
  "delete-pages": {
    id: "delete-pages",
    title: "Delete Pages",
    description:
      "Remove unwanted pages from a PDF and download a cleaned result without leaving the browser.",
    icon: "🗑️",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/delete-pages",
    publicPath: "/pdf-studio/delete-pages",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "cleaned-document",
    keywords: ["delete pdf pages", "remove pdf pages", "clean pdf"],
  },
  organize: {
    id: "organize",
    title: "Organize Pages",
    description:
      "Reorder, rotate, and remove pages before downloading a reorganized PDF.",
    icon: "🔀",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/organize",
    publicPath: "/pdf-studio/organize",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "organized-document",
    keywords: ["organize pdf", "reorder pdf pages", "rotate pdf pages"],
  },
  rotate: {
    id: "rotate",
    title: "Rotate Pages",
    description:
      "Rotate selected or all PDF pages and download a corrected copy without leaving the browser.",
    icon: "↻",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/rotate",
    publicPath: "/pdf-studio/rotate",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "rotated-document",
    keywords: ["rotate pdf", "turn pdf pages", "fix page orientation"],
  },
  "resize-pages": {
    id: "resize-pages",
    title: "Resize Pages",
    description:
      "Change page dimensions with A4, Letter, or custom sizing presets for existing PDFs.",
    icon: "📐",
    category: "page-organization",
    workspacePath: "/app/docs/pdf-studio/resize-pages",
    publicPath: "/pdf-studio/resize-pages",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "resized-document",
    keywords: ["resize pdf", "change pdf page size", "scale pdf"],
  },
  "fill-sign": {
    id: "fill-sign",
    title: "Fill & Sign",
    description:
      "Add text, signatures, and initials to PDFs in-browser, then export a finished copy.",
    icon: "✍️",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/fill-sign",
    publicPath: "/pdf-studio/fill-sign",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 50,
    },
    defaultOutputBase: "signed-document",
    keywords: ["fill and sign pdf", "sign pdf", "annotate pdf"],
  },
  protect: {
    id: "protect",
    title: "Protect PDF",
    description:
      "Add AES-256 password protection in the workspace. The image-based unlock fallback stays workspace-only until a non-lossy path is available.",
    icon: "🔒",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/protect",
    publicPath: "/pdf-studio/protect",
    availability: WORKSPACE_ONLY,
    executionMode: "hybrid",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "protected-document",
    keywords: ["protect pdf", "unlock pdf", "pdf password"],
  },
  "header-footer": {
    id: "header-footer",
    title: "Header & Footer",
    description:
      "Add headers, footers, and page tokens to every page of a PDF without leaving the browser.",
    icon: "📝",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/header-footer",
    publicPath: "/pdf-studio/header-footer",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "header-footer-document",
    keywords: ["header footer pdf", "page numbers pdf", "stamp pdf"],
  },
  repair: {
    id: "repair",
    title: "Repair PDF",
    description:
      "Analyze corrupted PDFs, attempt repair, and clearly report repaired, partial, or failed outcomes.",
    icon: "🔧",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/repair",
    publicPath: "/pdf-studio/repair",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "repaired-document",
    keywords: ["repair pdf", "fix corrupted pdf", "recover pdf"],
  },
  "pdf-to-image": {
    id: "pdf-to-image",
    title: "PDF to Image",
    description:
      "Export PDF pages as PNG or JPG images with browser-safe page and pixel limits.",
    icon: "🖼️",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/pdf-to-image",
    publicPath: "/pdf-studio/pdf-to-image",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PNG / JPG / ZIP",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 20,
    },
    defaultOutputBase: "pdf-pages",
    keywords: ["pdf to jpg", "pdf to png", "export pdf images"],
  },
  "extract-images": {
    id: "extract-images",
    title: "Extract Images",
    description:
      "Pull embedded raster images out of a PDF and download them individually or as a ZIP archive.",
    icon: "🗂️",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/extract-images",
    publicPath: "/pdf-studio/extract-images",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PNG / ZIP",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 40,
    },
    defaultOutputBase: "extracted-images",
    keywords: ["extract images from pdf", "pdf image extractor", "save images from pdf"],
  },
};

export const PDF_STUDIO_TOOL_ORDER = Object.keys(
  PDF_STUDIO_TOOL_REGISTRY,
) as PdfStudioToolId[];

export function getPdfStudioTool(toolId: PdfStudioToolId): PdfStudioToolDefinition {
  return PDF_STUDIO_TOOL_REGISTRY[toolId];
}

export function getPdfStudioToolBySlug(slug: string): PdfStudioToolDefinition | null {
  return (
    PDF_STUDIO_TOOL_ORDER
      .map((toolId) => PDF_STUDIO_TOOL_REGISTRY[toolId])
      .find((tool) => tool.publicPath.endsWith(`/${slug}`) || tool.workspacePath.endsWith(`/${slug}`)) ??
    null
  );
}

export function isPdfStudioToolAvailableOnSurface(
  tool: PdfStudioToolDefinition,
  surface: PdfStudioToolSurface,
) {
  return surface === "public"
    ? tool.availability.public === "available"
    : tool.availability.workspace === "available";
}

export function getPdfStudioCanonicalPath(tool: PdfStudioToolDefinition) {
  return tool.availability.public === "available"
    ? tool.publicPath
    : tool.workspacePath;
}

export function listPdfStudioTools(surface?: PdfStudioToolSurface) {
  const tools = PDF_STUDIO_TOOL_ORDER.map((toolId) => PDF_STUDIO_TOOL_REGISTRY[toolId]);
  if (surface === "public") {
    return tools.filter((tool) => isPdfStudioToolAvailableOnSurface(tool, "public"));
  }
  return tools;
}

export function listPdfStudioToolsByCategory(surface?: PdfStudioToolSurface) {
  const tools = listPdfStudioTools(surface);
  return PDF_STUDIO_CATEGORY_ORDER.map((category) => ({
    ...category,
    tools: tools.filter((tool) => tool.category === category.id),
  })).filter((category) => category.tools.length > 0);
}

export function getPdfStudioExecutionCopy(mode: PdfStudioExecutionMode) {
  switch (mode) {
    case "browser":
      return {
        badge: "Use in browser",
        description:
          "Runs entirely in your browser. Your source files stay on your device during processing.",
      };
    case "processing":
      return {
        badge: "Requires processing",
        description:
          "Uses secure server-side processing to complete the job and return a finished result.",
      };
    case "hybrid":
      return {
        badge: "Browser + processing",
        description:
          "Mixes browser-side work with secure processing for the parts that cannot run safely in-browser.",
      };
  }
}
