"use client";

import { PDF_STUDIO_DEFAULT_SETTINGS, PDF_STUDIO_SESSION_STORAGE_KEY } from "@/features/pdf-studio/constants";
import type { ImageItem, PageSettings, PdfStudioSession } from "@/features/pdf-studio/types";

function cloneDefaultSettings(): PageSettings {
  const defaults = PDF_STUDIO_DEFAULT_SETTINGS;
  return {
    ...defaults,
    metadata: { ...defaults.metadata },
    pageNumbers: { ...defaults.pageNumbers },
    watermark: {
      ...defaults.watermark,
      text: { ...defaults.watermark.text },
      image: { ...defaults.watermark.image },
    },
  };
}

function sanitizeCrop(crop: unknown): ImageItem["crop"] {
  if (!crop || typeof crop !== "object") {
    return undefined;
  }

  const candidate = crop as Record<string, unknown>;
  const x = typeof candidate.x === "number" ? Math.min(0.95, Math.max(0, candidate.x)) : 0;
  const y = typeof candidate.y === "number" ? Math.min(0.95, Math.max(0, candidate.y)) : 0;
  const width = typeof candidate.width === "number" ? Math.min(1, Math.max(0.05, candidate.width)) : 1;
  const height = typeof candidate.height === "number" ? Math.min(1, Math.max(0.05, candidate.height)) : 1;

  const normalizedWidth = Math.min(width, 1 - x);
  const normalizedHeight = Math.min(height, 1 - y);

  if (normalizedWidth >= 0.999 && normalizedHeight >= 0.999 && x === 0 && y === 0) {
    return undefined;
  }

  return {
    x,
    y,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

function sanitizeImages(images: unknown): ImageItem[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .filter((item): item is ImageItem => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.previewUrl === "string" &&
          typeof item.rotation === "number" &&
          typeof item.name === "string" &&
          typeof item.sizeBytes === "number",
      );
    })
    .map((item) => ({
      id: item.id,
      previewUrl: item.previewUrl,
      rotation: item.rotation,
      crop: sanitizeCrop(item.crop),
      name: item.name,
      sizeBytes: item.sizeBytes,
    }));
}

function sanitizeSettings(settings: unknown): PageSettings {
  const defaults = cloneDefaultSettings();
  if (!settings || typeof settings !== "object") {
    return defaults;
  }

  const candidate = settings as Partial<PageSettings> & {
    metadata?: Partial<PageSettings["metadata"]>;
    pageNumbers?: Partial<PageSettings["pageNumbers"]>;
    watermark?: Partial<PageSettings["watermark"]>;
  };

  return {
    size: candidate.size === "a4" || candidate.size === "letter" ? candidate.size : defaults.size,
    orientation:
      candidate.orientation === "portrait" ||
      candidate.orientation === "landscape" ||
      candidate.orientation === "auto"
        ? candidate.orientation
        : defaults.orientation,
    fitMode:
      candidate.fitMode === "contain" || candidate.fitMode === "cover" || candidate.fitMode === "actual"
        ? candidate.fitMode
        : defaults.fitMode,
    margins:
      candidate.margins === "none" ||
      candidate.margins === "small" ||
      candidate.margins === "medium" ||
      candidate.margins === "large"
        ? candidate.margins
        : defaults.margins,
    filename: typeof candidate.filename === "string" && candidate.filename.trim() ? candidate.filename : defaults.filename,
    compressionQuality:
      typeof candidate.compressionQuality === "number"
        ? Math.min(100, Math.max(10, Math.round(candidate.compressionQuality)))
        : defaults.compressionQuality,
    metadata: {
      title: typeof candidate.metadata?.title === "string" ? candidate.metadata.title : defaults.metadata.title,
      author: typeof candidate.metadata?.author === "string" ? candidate.metadata.author : defaults.metadata.author,
      subject: typeof candidate.metadata?.subject === "string" ? candidate.metadata.subject : defaults.metadata.subject,
      keywords:
        typeof candidate.metadata?.keywords === "string" ? candidate.metadata.keywords : defaults.metadata.keywords,
    },
    pageNumbers: {
      enabled:
        typeof candidate.pageNumbers?.enabled === "boolean"
          ? candidate.pageNumbers.enabled
          : defaults.pageNumbers.enabled,
      position:
        candidate.pageNumbers?.position === "top-left" ||
        candidate.pageNumbers?.position === "top-right" ||
        candidate.pageNumbers?.position === "bottom-left" ||
        candidate.pageNumbers?.position === "bottom-right" ||
        candidate.pageNumbers?.position === "bottom-center"
          ? candidate.pageNumbers.position
          : defaults.pageNumbers.position,
      format:
        candidate.pageNumbers?.format === "number" ||
        candidate.pageNumbers?.format === "page-number" ||
        candidate.pageNumbers?.format === "number-of-total" ||
        candidate.pageNumbers?.format === "page-number-of-total"
          ? candidate.pageNumbers.format
          : defaults.pageNumbers.format,
      startFrom:
        typeof candidate.pageNumbers?.startFrom === "number" && candidate.pageNumbers.startFrom >= 1
          ? Math.round(candidate.pageNumbers.startFrom)
          : defaults.pageNumbers.startFrom,
      skipFirstPage:
        typeof candidate.pageNumbers?.skipFirstPage === "boolean"
          ? candidate.pageNumbers.skipFirstPage
          : defaults.pageNumbers.skipFirstPage,
    },
    watermark: {
      enabled:
        typeof candidate.watermark?.enabled === "boolean"
          ? candidate.watermark.enabled
          : defaults.watermark.enabled,
      type:
        candidate.watermark?.type === "none" ||
        candidate.watermark?.type === "text" ||
        candidate.watermark?.type === "image"
          ? candidate.watermark.type
          : defaults.watermark.type,
      text: {
        content:
          typeof candidate.watermark?.text?.content === "string"
            ? candidate.watermark.text.content
            : defaults.watermark.text?.content || "",
        fontSize:
          typeof candidate.watermark?.text?.fontSize === "number"
            ? Math.min(48, Math.max(8, candidate.watermark.text.fontSize))
            : defaults.watermark.text?.fontSize || 14,
        color:
          typeof candidate.watermark?.text?.color === "string"
            ? candidate.watermark.text.color
            : defaults.watermark.text?.color || "#999999",
        opacity:
          typeof candidate.watermark?.text?.opacity === "number"
            ? Math.min(100, Math.max(1, candidate.watermark.text.opacity))
            : defaults.watermark.text?.opacity || 50,
      },
      image: {
        scale:
          typeof candidate.watermark?.image?.scale === "number"
            ? Math.min(100, Math.max(10, candidate.watermark.image.scale))
            : defaults.watermark.image?.scale || 30,
        opacity:
          typeof candidate.watermark?.image?.opacity === "number"
            ? Math.min(100, Math.max(1, candidate.watermark.image.opacity))
            : defaults.watermark.image?.opacity || 50,
      },
      position:
        candidate.watermark?.position === "top-left" ||
        candidate.watermark?.position === "top-center" ||
        candidate.watermark?.position === "top-right" ||
        candidate.watermark?.position === "center-left" ||
        candidate.watermark?.position === "center" ||
        candidate.watermark?.position === "center-right" ||
        candidate.watermark?.position === "bottom-left" ||
        candidate.watermark?.position === "bottom-center" ||
        candidate.watermark?.position === "bottom-right"
          ? candidate.watermark.position
          : defaults.watermark.position,
      rotation:
        typeof candidate.watermark?.rotation === "number"
          ? Math.min(360, Math.max(-360, candidate.watermark.rotation))
          : defaults.watermark.rotation,
      scope:
        candidate.watermark?.scope === "all" || candidate.watermark?.scope === "first"
          ? candidate.watermark.scope
          : defaults.watermark.scope,
    },
    enableOcr: typeof candidate.enableOcr === "boolean" ? candidate.enableOcr : defaults.enableOcr,
  };
}

export function loadPdfStudioSession(): PdfStudioSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PDF_STUDIO_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PdfStudioSession>;

    return {
      images: sanitizeImages(parsed.images),
      settings: sanitizeSettings(parsed.settings),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function savePdfStudioSession(images: ImageItem[], settings: PageSettings): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const payload: PdfStudioSession = {
    images: images.map(({ id, previewUrl, rotation, crop, name, sizeBytes }) => ({
      id,
      previewUrl,
      rotation,
      crop,
      name,
      sizeBytes,
    })),
    settings,
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(PDF_STUDIO_SESSION_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearPdfStudioSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PDF_STUDIO_SESSION_STORAGE_KEY);
}
