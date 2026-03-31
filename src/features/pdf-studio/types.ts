export type ImageRotation = 0 | 90 | 180 | 270;

export type PdfMetadata = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
};

export type PdfPageNumberSettings = {
  enabled: boolean;
};

export type PdfWatermarkSettings = {
  enabled: boolean;
  text: string;
  opacity: number;
};

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
  ocrStatus?: 'pending' | 'processing' | 'complete' | 'error';
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
  pageNumbers: PdfPageNumberSettings;
  watermark: PdfWatermarkSettings;
  enableOcr: boolean;
};

export type PdfStudioActionState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "success" }
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
};
