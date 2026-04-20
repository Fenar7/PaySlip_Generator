export type ImageRotation = 0 | 90 | 180 | 270;

export type PdfStudioToolId =
  | "create"
  | "merge"
  | "alternate-mix"
  | "split"
  | "extract-pages"
  | "delete-pages"
  | "organize"
  | "rotate"
  | "resize-pages"
  | "fill-sign"
  | "protect"
  | "header-footer"
  | "repair"
  | "pdf-to-image"
  | "extract-images";

export type PdfStudioToolSurface = "workspace" | "public";
export type PdfStudioToolCategory =
  | "page-organization"
  | "edit-enhance"
  | "convert-export";
export type PdfStudioExecutionMode = "browser" | "processing" | "hybrid";
export type PdfStudioFileClass =
  | "pdf"
  | "image"
  | "office"
  | "html"
  | "scanned-pdf";

export type PdfMetadata = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
};

export type PageNumberFormat = 'number' | 'page-number' | 'number-of-total' | 'page-number-of-total';
export type PageNumberPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';

export type PageNumberSettings = {
  enabled: boolean;
  position: PageNumberPosition;
  format: PageNumberFormat;
  startFrom: number;
  skipFirstPage: boolean;
};

// Alias for backward compatibility
export type PdfPageNumberSettings = PageNumberSettings;

/**
 * Password protection settings for PDF documents
 */
export type PasswordSettings = {
  enabled: boolean;
  userPassword: string;
  confirmPassword: string;
  ownerPassword?: string;
  permissions: {
    printing: boolean;
    copying: boolean;
    modifying: boolean;
  };
};

/**
 * Password validation result with strength assessment
 */
export type PasswordValidation = {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
};

export type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type WatermarkSettings = {
  enabled: boolean;
  type: 'none' | 'text' | 'image';
  text?: {
    content: string;
    fontSize: number;
    color: string;
    opacity: number;
  };
  image?: {
    file?: File;
    previewUrl?: string;
    scale: number;
    opacity: number;
  };
  position: WatermarkPosition;
  rotation: number;
  scope: 'all' | 'first';
};

// Legacy type alias for backward compatibility
export type PdfWatermarkSettings = WatermarkSettings;

export type ImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageItem = {
  id: string;
  file?: File;
  previewUrl: string;
  rotation: ImageRotation;
  crop?: ImageCrop;
  name: string;
  sizeBytes: number;
  isConverting?: boolean;
  ocrText?: string;
  ocrStatus?: 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';
  ocrErrorMessage?: string;
};

export type PageSize = "a4" | "letter";
export type PageOrientation = "portrait" | "landscape" | "auto";
export type FitMode = "contain" | "cover" | "actual";
export type MarginSize = "none" | "small" | "medium" | "large";

export type PageSettings = {
  size: PageSize;
  orientation: PageOrientation;
  fitMode: FitMode;
  margins: MarginSize;
  filename: string;
  compressionQuality: number;
  metadata: PdfMetadata;
  pageNumbers: PageNumberSettings;
  watermark: WatermarkSettings;
  password: PasswordSettings;
  enableOcr: boolean;
};

export type PdfStudioActionState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type ImageDimensions = {
  width: number;
  height: number;
};

export type PageDimensions = {
  widthPt: number;
  heightPt: number;
};

export type ImagePlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PersistedImageItem = Omit<ImageItem, "file">;

export type PdfStudioSession = {
  images: PersistedImageItem[];
  settings: PageSettings;
  savedAt: string;
  watermarkImageCleared?: boolean; // Set when image watermark was cleared on restore
};
