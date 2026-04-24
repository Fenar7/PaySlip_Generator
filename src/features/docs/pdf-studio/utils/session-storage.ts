"use client";

import { PDF_STUDIO_DEFAULT_SETTINGS, PDF_STUDIO_SESSION_STORAGE_KEY } from "@/features/docs/pdf-studio/constants";
import type { ImageItem, PageSettings, PdfStudioSession } from "@/features/docs/pdf-studio/types";

function scopedSessionStorageKey(scope?: string): string {
  const normalizedScope = scope?.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "anonymous";
  return `${PDF_STUDIO_SESSION_STORAGE_KEY}:${normalizedScope}`;
}

function cloneDefaultSettings(): PageSettings {
  const defaults = PDF_STUDIO_DEFAULT_SETTINGS;
  return {
    ...defaults,
    metadata: { ...defaults.metadata },
    pageNumbers: { ...defaults.pageNumbers },
    watermark: {
      ...defaults.watermark,
      text: {
        content: defaults.watermark.text!.content,
        fontSize: defaults.watermark.text!.fontSize,
        color: defaults.watermark.text!.color,
        opacity: defaults.watermark.text!.opacity,
      },
      image: {
        scale: defaults.watermark.image!.scale,
        opacity: defaults.watermark.image!.opacity,
      },
    },
    password: {
      ...defaults.password,
      permissions: { ...defaults.password.permissions },
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
      // Restore completed OCR state — no file needed to use existing ocrText
      ...(item.ocrStatus === "complete" && typeof item.ocrText === "string" && item.ocrText
        ? {
            ocrText: item.ocrText,
            ocrConfidence:
              typeof item.ocrConfidence === "number"
                ? Math.max(0, Math.min(100, item.ocrConfidence))
                : undefined,
            ocrStatus: "complete" as const,
          }
        : {}),
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
    password?: Partial<PageSettings["password"]>;
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
        ...(typeof candidate.watermark?.image?.previewUrl === "string" && candidate.watermark.image.previewUrl
          ? { previewUrl: candidate.watermark.image.previewUrl }
          : {}),
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
    password: {
      enabled: typeof candidate.password?.enabled === "boolean" ? candidate.password.enabled : defaults.password.enabled,
      // Security: never restore raw passwords from storage — always start empty
      userPassword: defaults.password.userPassword,
      confirmPassword: defaults.password.confirmPassword,
      ownerPassword: defaults.password.ownerPassword,
      permissions: {
        printing:
          typeof candidate.password?.permissions?.printing === "boolean"
            ? candidate.password.permissions.printing
            : defaults.password.permissions.printing,
        copying:
          typeof candidate.password?.permissions?.copying === "boolean"
            ? candidate.password.permissions.copying
            : defaults.password.permissions.copying,
        modifying:
          typeof candidate.password?.permissions?.modifying === "boolean"
            ? candidate.password.permissions.modifying
            : defaults.password.permissions.modifying,
      },
    },
    enableOcr: typeof candidate.enableOcr === "boolean" ? candidate.enableOcr : defaults.enableOcr,
  };
}

export function loadPdfStudioSession(scope?: string): (PdfStudioSession & { _ocrCompleteCount?: number; _ocrDroppedCount?: number }) | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(scopedSessionStorageKey(scope));
    if (!raw) {
      return null;
    }

    const rawParsed = JSON.parse(raw) as Partial<PdfStudioSession> & { _hadImageWatermark?: boolean; _ocrCompleteCount?: number; _ocrDroppedCount?: number };

    return {
      images: sanitizeImages(rawParsed.images),
      settings: sanitizeSettings(rawParsed.settings),
      savedAt: typeof rawParsed.savedAt === "string" ? rawParsed.savedAt : new Date().toISOString(),
      watermarkImageCleared: rawParsed._hadImageWatermark === true,
      _ocrCompleteCount: typeof rawParsed._ocrCompleteCount === "number" ? rawParsed._ocrCompleteCount : undefined,
      _ocrDroppedCount: typeof rawParsed._ocrDroppedCount === "number" ? rawParsed._ocrDroppedCount : undefined,
    };
  } catch {
    return null;
  }
}

export function savePdfStudioSession(images: ImageItem[], settings: PageSettings, scope?: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Build safe watermark settings for persistence
  const safeWatermark = { ...settings.watermark };
  if (safeWatermark.type === "image") {
    const previewUrl = safeWatermark.image?.previewUrl;
    if (!previewUrl || previewUrl.startsWith("blob:")) {
      // Blob URLs die on reload — downgrade to none so restore is honest
      safeWatermark.type = "none";
      // Keep scale/opacity for user convenience if they re-upload
    } else {
      // Data URL — safe to persist, strip the non-serializable File
      safeWatermark.image = {
        previewUrl,
        scale: safeWatermark.image!.scale,
        opacity: safeWatermark.image!.opacity,
      };
    }
  }

  const ocrCompleteCount = images.filter((img) => img.ocrStatus === "complete" && img.ocrText).length;
  const ocrDroppedCount = images.filter((img) => img.ocrStatus && img.ocrStatus !== "complete").length;

  const payload: PdfStudioSession & { _hadImageWatermark?: boolean; _ocrCompleteCount?: number; _ocrDroppedCount?: number } = {
    images: images.map(({ id, previewUrl, rotation, crop, name, sizeBytes, ocrText, ocrConfidence, ocrStatus }) => ({
      id,
      previewUrl,
      rotation,
      crop,
      name,
      sizeBytes,
      // Only persist completed OCR — other states require the source file to re-run
      ...(ocrStatus === "complete" && ocrText
        ? { ocrText, ocrConfidence, ocrStatus: "complete" as const }
        : {}),
    })),
    settings: {
      ...settings,
      watermark: safeWatermark,
      password: {
        ...settings.password,
        // Security: strip raw passwords before persisting to storage
        userPassword: "",
        confirmPassword: "",
        ownerPassword: undefined,
      },
    },
    _hadImageWatermark: settings.watermark.type === "image" && safeWatermark.type === "none",
    _ocrCompleteCount: ocrCompleteCount,
    _ocrDroppedCount: ocrDroppedCount,
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(scopedSessionStorageKey(scope), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearPdfStudioSession(scope?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(scopedSessionStorageKey(scope));
}

// ───────────────────────────────────────────────────────────────────────────
// OCR Workspace session storage (separate from main PDF Studio session)
// ───────────────────────────────────────────────────────────────────────────

export const PDF_STUDIO_OCR_SESSION_STORAGE_KEY = "pdf-studio-ocr-session-v1";

function scopedOcrSessionStorageKey(scope?: string): string {
  const normalizedScope = scope?.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "anonymous";
  return `${PDF_STUDIO_OCR_SESSION_STORAGE_KEY}:${normalizedScope}`;
}

export type OcrWorkspaceSession = {
  images: ImageItem[];
  language?: string;
  mode?: "fast" | "accurate";
  confidenceThreshold?: number;
  savedAt: string;
};

function sanitizeOcrImages(images: unknown): ImageItem[] {
  return sanitizeImages(images).map((img) => ({
    ...img,
    // OCR workspace stores full OCR state including text for export
    ...(img.ocrStatus === "complete" && img.ocrText
      ? { ocrText: img.ocrText, ocrConfidence: img.ocrConfidence, ocrStatus: "complete" as const }
      : {}),
  }));
}

export function loadOcrWorkspaceSession(scope?: string): OcrWorkspaceSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(scopedOcrSessionStorageKey(scope));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<OcrWorkspaceSession>;

    return {
      images: sanitizeOcrImages(parsed.images),
      language: typeof parsed.language === "string" ? parsed.language : undefined,
      mode: parsed.mode === "fast" || parsed.mode === "accurate" ? parsed.mode : undefined,
      confidenceThreshold:
        typeof parsed.confidenceThreshold === "number"
          ? Math.max(0, Math.min(100, parsed.confidenceThreshold))
          : undefined,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveOcrWorkspaceSession(
  images: ImageItem[],
  language?: string,
  mode?: "fast" | "accurate",
  confidenceThreshold?: number,
  scope?: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const payload: OcrWorkspaceSession = {
    images: images.map(({ id, previewUrl, rotation, crop, name, sizeBytes, ocrText, ocrConfidence, ocrStatus }) => ({
      id,
      previewUrl,
      rotation,
      crop,
      name,
      sizeBytes,
      ...(ocrStatus === "complete" && ocrText
        ? { ocrText, ocrConfidence, ocrStatus: "complete" as const }
        : {}),
    })),
    language,
    mode,
    confidenceThreshold,
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(scopedOcrSessionStorageKey(scope), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearOcrWorkspaceSession(scope?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(scopedOcrSessionStorageKey(scope));
}
