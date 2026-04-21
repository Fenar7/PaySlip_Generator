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
  "jpg-to-pdf": {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    description:
      "Convert JPG, JPEG, and PNG image files into a clean downloadable PDF with browser-side controls.",
    icon: "🖼️",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/jpg-to-pdf",
    publicPath: "/pdf-studio/jpg-to-pdf",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["image"],
    outputLabel: "PDF",
    limits: {
      maxFiles: 30,
      maxSizeMb: 50,
    },
    defaultOutputBase: "jpg-to-pdf-document",
    keywords: ["jpg to pdf", "jpeg to pdf", "png to pdf", "photos to pdf"],
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
    availability: WORKSPACE_ONLY,
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
  editor: {
    id: "editor",
    title: "PDF Editor Lite",
    description:
      "Add flattened text, shapes, image overlays, and signatures to a PDF without leaving the browser.",
    icon: "🖊️",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/editor",
    publicPath: "/pdf-studio/editor",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 50,
    },
    defaultOutputBase: "edited-document",
    keywords: ["edit pdf", "add text to pdf", "annotate pdf"],
  },
  "create-forms": {
    id: "create-forms",
    title: "Create Forms",
    description:
      "Place simple text, checkbox, date, and signature-placeholder fields on an existing PDF.",
    icon: "🧾",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/create-forms",
    publicPath: "/pdf-studio/create-forms",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 50,
    },
    defaultOutputBase: "fillable-document",
    keywords: ["create pdf forms", "fillable pdf", "pdf form fields"],
  },
  "page-numbers": {
    id: "page-numbers",
    title: "Page Numbers",
    description:
      "Add standalone page numbers with odd/even scope and first-page exceptions.",
    icon: "#️⃣",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/page-numbers",
    publicPath: "/pdf-studio/page-numbers",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "numbered-document",
    keywords: ["page numbers pdf", "paginate pdf", "number pdf pages"],
  },
  bates: {
    id: "bates",
    title: "Bates Numbering",
    description:
      "Apply deterministic sequential Bates labels with prefix, suffix, and zero-padding controls.",
    icon: "🔢",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/bates",
    publicPath: "/pdf-studio/bates",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "bates-document",
    keywords: ["bates numbering", "legal numbering pdf", "number legal pdf"],
  },
  metadata: {
    id: "metadata",
    title: "Edit Metadata",
    description:
      "Review and update supported PDF metadata fields with a before-and-after preview.",
    icon: "🏷️",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/metadata",
    publicPath: "/pdf-studio/metadata",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "metadata-document",
    keywords: ["edit pdf metadata", "pdf properties", "change pdf title"],
  },
  rename: {
    id: "rename",
    title: "Rename Outputs",
    description:
      "Apply explicit rename rules to one or more PDF outputs without changing the file contents.",
    icon: "🏷",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/rename",
    publicPath: "/pdf-studio/rename",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF / ZIP",
    limits: {
      maxFiles: 10,
      maxSizeMb: 50,
      maxPages: 200,
    },
    defaultOutputBase: "renamed-document",
    keywords: ["rename pdf", "pdf filename rules", "batch rename pdf"],
  },
  protect: {
    id: "protect",
    title: "Protect PDF",
    description:
      "Add AES-256 password protection with password policy checks and explicit permission presets.",
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
    keywords: ["protect pdf", "encrypt pdf", "pdf password"],
  },
  unlock: {
    id: "unlock",
    title: "Unlock PDF",
    description:
      "Use the workspace-only image-based unlock fallback when you can accept flattened, lossy output.",
    icon: "🔓",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/unlock",
    publicPath: "/pdf-studio/unlock",
    availability: WORKSPACE_ONLY,
    executionMode: "hybrid",
    inputTypes: ["pdf"],
    outputLabel: "Image-only PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "unlocked-document",
    keywords: ["unlock pdf", "remove pdf password", "lossy unlock pdf"],
  },
  watermark: {
    id: "watermark",
    title: "Add Watermark",
    description:
      "Apply text or image watermarks to an existing PDF with preset labels and explicit page scope controls.",
    icon: "💧",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/watermark",
    publicPath: "/pdf-studio/watermark",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "watermarked-document",
    keywords: ["watermark pdf", "draft pdf", "confidential pdf", "stamp pdf"],
  },
  grayscale: {
    id: "grayscale",
    title: "Grayscale PDF",
    description:
      "Convert one or more PDFs into grayscale image-based outputs with explicit messaging about flattened, lossy conversion.",
    icon: "⚫",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/grayscale",
    publicPath: "/pdf-studio/grayscale",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF / ZIP",
    limits: {
      maxFiles: 10,
      maxSizeMb: 50,
      maxPages: 40,
    },
    defaultOutputBase: "grayscale-document",
    keywords: ["grayscale pdf", "black and white pdf", "desaturate pdf"],
  },
  "header-footer": {
    id: "header-footer",
    title: "Header & Footer",
    description:
      "Add headers, footers, and page tokens with odd/even and first-page scope controls.",
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
  "remove-annotations": {
    id: "remove-annotations",
    title: "Remove Annotations",
    description:
      "Strip selected annotation types from a PDF while keeping the underlying pages intact.",
    icon: "🧹",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/remove-annotations",
    publicPath: "/pdf-studio/remove-annotations",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "clean-document",
    keywords: ["remove pdf annotations", "clean pdf markup", "strip notes from pdf"],
  },
  bookmarks: {
    id: "bookmarks",
    title: "Create Bookmarks",
    description:
      "Build a bookmark outline with structured levels and explicit page targets.",
    icon: "🔖",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/bookmarks",
    publicPath: "/pdf-studio/bookmarks",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "bookmarked-document",
    keywords: ["create pdf bookmarks", "pdf outline", "bookmark pdf"],
  },
  flatten: {
    id: "flatten",
    title: "Flatten PDF",
    description:
      "Flatten form fields into a read-only PDF with explicit irreversible export messaging.",
    icon: "📌",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/flatten",
    publicPath: "/pdf-studio/flatten",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "flattened-document",
    keywords: ["flatten pdf", "make pdf read only", "flatten form fields"],
  },
  repair: {
    id: "repair",
    title: "Repair PDF",
    description:
      "Analyze corrupted PDFs, attempt repair, and download a repair log with explicit repaired, partial, or failed outcomes.",
    icon: "🔧",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/repair",
    publicPath: "/pdf-studio/repair",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF / Log",
    limits: SHARED_PDF_LIMITS,
    defaultOutputBase: "repaired-document",
    keywords: ["repair pdf", "fix corrupted pdf", "recover pdf"],
  },
  ocr: {
    id: "ocr",
    title: "OCR PDF & Images",
    description:
      "Recognize text in scanned PDFs or images, review confidence page by page, and export a searchable raster PDF or TXT file.",
    icon: "🔎",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/ocr",
    publicPath: "/pdf-studio/ocr",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf", "image"],
    outputLabel: "Searchable PDF / TXT",
    limits: {
      maxFiles: 1,
      maxSizeMb: 40,
      maxPages: 30,
    },
    defaultOutputBase: "ocr-document",
    keywords: ["ocr pdf", "scan to text", "searchable pdf", "image to text"],
  },
  deskew: {
    id: "deskew",
    title: "Deskew Scan",
    description:
      "Detect skewed scanned pages, preview cleanup before export, and download a corrected PDF or PNG with manual fallback when detection is weak.",
    icon: "📐",
    category: "edit-enhance",
    workspacePath: "/app/docs/pdf-studio/deskew",
    publicPath: "/pdf-studio/deskew",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf", "image"],
    outputLabel: "PDF / PNG",
    limits: {
      maxFiles: 1,
      maxSizeMb: 40,
      maxPages: 30,
    },
    defaultOutputBase: "deskewed-document",
    keywords: ["deskew pdf", "straighten scan", "scan cleanup", "deskew image"],
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
  "pdf-to-text": {
    id: "pdf-to-text",
    title: "PDF to Text",
    description:
      "Extract selectable text from PDFs, with optional OCR fallback for scanned pages and copy/download actions.",
    icon: "📝",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/pdf-to-text",
    publicPath: "/pdf-studio/pdf-to-text",
    availability: PUBLIC_AND_WORKSPACE,
    executionMode: "browser",
    inputTypes: ["pdf", "scanned-pdf"],
    outputLabel: "TXT",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 30,
    },
    defaultOutputBase: "extracted-text",
    keywords: ["pdf to text", "extract text from pdf", "ocr pdf text"],
  },
  "pdf-to-word": {
    id: "pdf-to-word",
    title: "PDF to Word",
    description:
      "Queue a server-side PDF to DOCX conversion that rebuilds headings, indentation, and detected tables with deterministic naming.",
    icon: "📘",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/pdf-to-word",
    publicPath: "/pdf-studio/pdf-to-word",
    availability: WORKSPACE_ONLY,
    executionMode: "processing",
    inputTypes: ["pdf"],
    outputLabel: "DOCX",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxSizeMb: 25,
      maxPages: 120,
    },
    defaultOutputBase: "pdf-to-word",
    keywords: ["pdf to word", "pdf to docx", "convert pdf to word"],
  },
  "pdf-to-excel": {
    id: "pdf-to-excel",
    title: "PDF to Excel",
    description:
      "Queue a server-side PDF to XLSX conversion with worksheet-per-page output and detected row/column structure for table-like pages.",
    icon: "📗",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/pdf-to-excel",
    publicPath: "/pdf-studio/pdf-to-excel",
    availability: WORKSPACE_ONLY,
    executionMode: "processing",
    inputTypes: ["pdf"],
    outputLabel: "XLSX",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxSizeMb: 20,
      maxPages: 120,
    },
    defaultOutputBase: "pdf-to-excel",
    keywords: ["pdf to excel", "pdf to xlsx", "convert pdf to spreadsheet"],
  },
  "pdf-to-ppt": {
    id: "pdf-to-ppt",
    title: "PDF to PPT",
    description:
      "Queue a server-side PDF to PPTX conversion with one slide per source page and positioned editable text boxes.",
    icon: "📙",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/pdf-to-ppt",
    publicPath: "/pdf-studio/pdf-to-ppt",
    availability: WORKSPACE_ONLY,
    executionMode: "processing",
    inputTypes: ["pdf"],
    outputLabel: "PPTX",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxSizeMb: 25,
      maxPages: 120,
    },
    defaultOutputBase: "pdf-to-ppt",
    keywords: ["pdf to ppt", "pdf to powerpoint", "convert pdf to pptx"],
  },
  "word-to-pdf": {
    id: "word-to-pdf",
    title: "Word to PDF",
    description:
      "Queue a server-side DOCX to PDF conversion with print-layout options, deterministic naming, and strict DOCX validation.",
    icon: "📄",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/word-to-pdf",
    publicPath: "/pdf-studio/word-to-pdf",
    availability: WORKSPACE_ONLY,
    executionMode: "processing",
    inputTypes: ["office"],
    outputLabel: "PDF",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxSizeMb: 15,
      maxPages: undefined,
    },
    defaultOutputBase: "word-to-pdf",
    keywords: ["word to pdf", "docx to pdf", "convert word to pdf"],
  },
  "html-to-pdf": {
    id: "html-to-pdf",
    title: "HTML to PDF",
    description:
      "Queue a server-side HTML to PDF conversion from a self-contained HTML upload with page size, margin, and print CSS controls.",
    icon: "🌐",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/html-to-pdf",
    publicPath: "/pdf-studio/html-to-pdf",
    availability: WORKSPACE_ONLY,
    executionMode: "processing",
    inputTypes: ["html"],
    outputLabel: "PDF",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxSizeMb: 5,
      maxPages: undefined,
    },
    defaultOutputBase: "html-to-pdf",
    keywords: ["html to pdf", "web page to pdf", "url to pdf"],
  },
  "n-up": {
    id: "n-up",
    title: "N-Up Layout",
    description:
      "Generate 2-up and 4-up printable PDF sheets with A4 and A3 layout presets.",
    icon: "🗂️",
    category: "convert-export",
    workspacePath: "/app/docs/pdf-studio/n-up",
    publicPath: "/pdf-studio/n-up",
    availability: WORKSPACE_ONLY,
    executionMode: "browser",
    inputTypes: ["pdf"],
    outputLabel: "PDF",
    limits: {
      ...SHARED_PDF_LIMITS,
      maxPages: 100,
    },
    defaultOutputBase: "n-up-document",
    keywords: ["n-up pdf", "2-up pdf", "4-up pdf"],
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
