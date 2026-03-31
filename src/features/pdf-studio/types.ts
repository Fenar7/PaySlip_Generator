export type ImageRotation = 0 | 90 | 180 | 270;

export type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: ImageRotation;
  name: string;
  sizeBytes: number;
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
