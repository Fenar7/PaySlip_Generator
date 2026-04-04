import type { PageSettings } from "@/features/docs/pdf-studio/types";

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
    position: 'bottom-center',
    format: 'number-of-total',
    startFrom: 1,
    skipFirstPage: false,
  },
  watermark: {
    enabled: false,
    type: 'none',
    text: {
      content: 'Confidential',
      fontSize: 24,
      color: '#999999',
      opacity: 50,
    },
    image: {
      scale: 30,
      opacity: 50,
    },
    position: 'center',
    rotation: 0,
    scope: 'all',
  },
  password: {
    enabled: false,
    userPassword: '',
    confirmPassword: '',
    ownerPassword: '',
    permissions: {
      printing: true,
      copying: true,
      modifying: true,
    },
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

export const WATERMARK_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
] as const;

export const WATERMARK_POSITION_OPTIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "center-left", label: "Center Left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Center Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
] as const;

export const WATERMARK_SCOPE_OPTIONS = [
  { value: "all", label: "All pages" },
  { value: "first", label: "First page only" },
] as const;

export const PAGE_NUMBER_POSITION_OPTIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-center", label: "Bottom Center" },
] as const;

export const PAGE_NUMBER_FORMAT_OPTIONS = [
  { value: "number", label: "1, 2, 3..." },
  { value: "page-number", label: "Page 1, Page 2..." },
  { value: "number-of-total", label: "1 of 5, 2 of 5..." },
  { value: "page-number-of-total", label: "Page 1 of 5, Page 2 of 5..." },
] as const;

export const PASSWORD_STRENGTH_COLORS = {
  weak: 'text-red-600',
  fair: 'text-yellow-600', 
  good: 'text-green-400',
  strong: 'text-green-600'
} as const;

export const PASSWORD_STRENGTH_DESCRIPTIONS = {
  weak: 'Weak',
  fair: 'Fair', 
  good: 'Good',
  strong: 'Strong'
} as const;

export const PASSWORD_PERMISSIONS_OPTIONS = [
  { 
    key: 'printing' as const,
    label: 'Allow printing',
    description: 'Users can print the PDF document'
  },
  { 
    key: 'copying' as const,
    label: 'Allow copying text and images',
    description: 'Users can select and copy content from the PDF'
  },
  { 
    key: 'modifying' as const,
    label: 'Allow document modification',
    description: 'Users can modify the PDF document (add annotations, fill forms, etc.)'
  },
] as const;
