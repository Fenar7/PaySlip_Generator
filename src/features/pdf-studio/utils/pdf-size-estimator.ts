"use client";

import type { ImageItem, PageSettings } from "@/features/pdf-studio/types";
import { prepareImageDataUrl } from "@/features/pdf-studio/utils/image-processor";

const SAMPLE_IMAGE_LIMIT = 5;
const SAMPLING_THRESHOLD = 10;
const BASE_DOCUMENT_OVERHEAD_BYTES = 1400;
const PER_PAGE_OVERHEAD_BYTES = 380;
const METADATA_OVERHEAD_BYTES = 180;
const PAGE_NUMBERS_OVERHEAD_BYTES = 220;
const TEXT_WATERMARK_OVERHEAD_BYTES = 160;
const IMAGE_WATERMARK_PLACEMENT_OVERHEAD_BYTES = 280;
const OCR_BASE_OVERHEAD_BYTES = 120;
const OCR_BYTES_PER_CHAR = 1.2;

export type PdfEstimateCache = Map<string, number>;

function dataUrlPayloadToBytes(dataUrl: string): number {
  const [, payload = ""] = dataUrl.split(",", 2);
  if (!payload) return 0;

  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

async function estimateImageBytes(
  image: ImageItem,
  quality: number,
  cache: PdfEstimateCache,
): Promise<number> {
  const cacheKey = JSON.stringify({
    id: image.id,
    previewUrl: image.previewUrl,
    rotation: image.rotation,
    crop: image.crop,
    quality,
  });

  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const preparedDataUrl = await prepareImageDataUrl(image.previewUrl, image.rotation, image.crop, quality);
  const bytes = dataUrlPayloadToBytes(preparedDataUrl);
  cache.set(cacheKey, bytes);
  return bytes;
}

async function estimateWatermarkImageBytes(settings: PageSettings): Promise<number> {
  if (!settings.watermark.enabled || settings.watermark.type !== "image" || !settings.watermark.image?.previewUrl) {
    return 0;
  }

  const previewUrl = settings.watermark.image.previewUrl;

  if (previewUrl.startsWith("data:")) {
    return dataUrlPayloadToBytes(previewUrl);
  }

  try {
    const response = await fetch(previewUrl);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

function estimateOcrBytes(images: ImageItem[], settings: PageSettings): number {
  if (!settings.enableOcr) {
    return 0;
  }

  const totalChars = images.reduce((sum, image) => sum + (image.ocrText?.length ?? 0), 0);
  if (totalChars === 0) {
    return OCR_BASE_OVERHEAD_BYTES;
  }

  return OCR_BASE_OVERHEAD_BYTES + Math.round(totalChars * OCR_BYTES_PER_CHAR);
}

function estimateFeatureOverhead(images: ImageItem[], settings: PageSettings, watermarkImageBytes: number): number {
  let overhead = BASE_DOCUMENT_OVERHEAD_BYTES + images.length * PER_PAGE_OVERHEAD_BYTES;

  if (
    settings.metadata.title ||
    settings.metadata.author ||
    settings.metadata.subject ||
    settings.metadata.keywords
  ) {
    overhead += METADATA_OVERHEAD_BYTES;
  }

  if (settings.pageNumbers.enabled) {
    overhead += PAGE_NUMBERS_OVERHEAD_BYTES + images.length * 24;
  }

  if (settings.watermark.enabled) {
    if (settings.watermark.type === "text" && settings.watermark.text?.content?.trim()) {
      overhead += TEXT_WATERMARK_OVERHEAD_BYTES;
    }

    if (settings.watermark.type === "image" && settings.watermark.image?.previewUrl) {
      overhead += watermarkImageBytes + IMAGE_WATERMARK_PLACEMENT_OVERHEAD_BYTES;
    }
  }

  overhead += estimateOcrBytes(images, settings);

  return overhead;
}

export async function estimatePdfSize(
  images: ImageItem[],
  settings: PageSettings,
  cache: PdfEstimateCache = new Map(),
): Promise<number> {
  if (images.length === 0) {
    return 0;
  }

  const quality = settings.compressionQuality / 100;
  const sampledImages = images.length > SAMPLING_THRESHOLD ? images.slice(0, SAMPLE_IMAGE_LIMIT) : images;

  const sampledBytes = await Promise.all(
    sampledImages.map((image) => estimateImageBytes(image, quality, cache)),
  );

  const imageBytes =
    images.length > SAMPLING_THRESHOLD
      ? Math.round(sampledBytes.reduce((sum, bytes) => sum + bytes, 0) / sampledImages.length) * images.length
      : sampledBytes.reduce((sum, bytes) => sum + bytes, 0);

  const watermarkImageBytes = await estimateWatermarkImageBytes(settings);
  const overhead = estimateFeatureOverhead(images, settings, watermarkImageBytes);

  return imageBytes + overhead;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

