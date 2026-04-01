import type { PageSettings } from "@/features/pdf-studio/types";

export const PDF_STUDIO_MAX_IMAGES = 30;

export const PDF_STUDIO_SESSION_STORAGE_KEY = "pdf-studio-session-v1";

export const PDF_STUDIO_SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const PDF_STUDIO_SUPPORTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
];

export const PDF_STUDIO_DEFAULT_SETTINGS: PageSettings = {
  size: "a4",
  orientation: "auto",
  fitMode: "contain",
  margins: "small",
  filename: "pdf-studio-document",
  compressionQuality: 92,
  metadata: {
    title: "",
    author: "",
    subject: "",
    keywords: "",
  },
  pageNumbers: {
    enabled: false,
  },
  watermark: {
    enabled: false,
    text: "",
    opacity: 0.18,
  },
  enableOcr: false,
};

export const PAGE_SIZE_OPTIONS = [
  { value: "a4", label: "A4 (210 × 297 mm)" },
  { value: "letter", label: "US Letter (8.5 × 11 in)" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "auto", label: "Auto (match image)" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
] as const;

export const FIT_MODE_OPTIONS = [
  { value: "contain", label: "Contain — fit within page" },
  { value: "cover", label: "Cover — fill page" },
  { value: "actual", label: "Actual size" },
] as const;

export const MARGIN_OPTIONS = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
] as const;

export const PAGE_DIMENSIONS_PT = {
  a4: { widthPt: 595.28, heightPt: 841.89 },
  letter: { widthPt: 612, heightPt: 792 },
} as const;

export const MARGIN_PT = {
  none: 0,
  small: 14.17,
  medium: 28.35,
  large: 56.69,
} as const;
