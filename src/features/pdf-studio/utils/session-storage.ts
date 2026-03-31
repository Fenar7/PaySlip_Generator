"use client";

import { PDF_STUDIO_DEFAULT_SETTINGS, PDF_STUDIO_SESSION_STORAGE_KEY } from "@/features/pdf-studio/constants";
import type { ImageItem, PageSettings, PdfStudioSession } from "@/features/pdf-studio/types";

function cloneDefaultSettings(): PageSettings {
  return {
    ...PDF_STUDIO_DEFAULT_SETTINGS,
    metadata: { ...PDF_STUDIO_DEFAULT_SETTINGS.metadata },
    pageNumbers: { ...PDF_STUDIO_DEFAULT_SETTINGS.pageNumbers },
    watermark: { ...PDF_STUDIO_DEFAULT_SETTINGS.watermark },
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
    },
    watermark: {
      enabled:
        typeof candidate.watermark?.enabled === "boolean"
          ? candidate.watermark.enabled
          : defaults.watermark.enabled,
      text: typeof candidate.watermark?.text === "string" ? candidate.watermark.text : defaults.watermark.text,
      opacity:
        typeof candidate.watermark?.opacity === "number"
          ? Math.min(0.6, Math.max(0.05, candidate.watermark.opacity))
          : defaults.watermark.opacity,
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
