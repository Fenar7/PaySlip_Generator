"use client";

import type { ImageCrop, ImageRotation, PageDimensions, ImagePlacement, PageSettings } from "@/features/pdf-studio/types";
import { PAGE_DIMENSIONS_PT, MARGIN_PT } from "@/features/pdf-studio/constants";

export function normalizeImageCrop(crop?: ImageCrop): ImageCrop | undefined {
  if (!crop) {
    return undefined;
  }

  const x = Math.min(0.95, Math.max(0, crop.x));
  const y = Math.min(0.95, Math.max(0, crop.y));
  const width = Math.min(1, Math.max(0.05, crop.width));
  const height = Math.min(1, Math.max(0.05, crop.height));
  const normalizedWidth = Math.min(width, 1 - x);
  const normalizedHeight = Math.min(height, 1 - y);

  if (x === 0 && y === 0 && normalizedWidth >= 0.999 && normalizedHeight >= 0.999) {
    return undefined;
  }

  return {
    x,
    y,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

function getCroppedSourceRect(img: HTMLImageElement, crop?: ImageCrop) {
  const normalizedCrop = normalizeImageCrop(crop);

  if (!normalizedCrop) {
    return {
      sx: 0,
      sy: 0,
      sw: img.width,
      sh: img.height,
    };
  }

  const sx = Math.round(img.width * normalizedCrop.x);
  const sy = Math.round(img.height * normalizedCrop.y);
  const sw = Math.max(1, Math.round(img.width * normalizedCrop.width));
  const sh = Math.max(1, Math.round(img.height * normalizedCrop.height));

  return {
    sx,
    sy,
    sw: Math.min(sw, img.width - sx),
    sh: Math.min(sh, img.height - sy),
  };
}

export function getProcessedImageDimensions(
  dimensions: { width: number; height: number },
  rotation: ImageRotation,
  crop?: ImageCrop,
): { width: number; height: number } {
  const normalizedCrop = normalizeImageCrop(crop);
  const croppedWidth = normalizedCrop ? dimensions.width * normalizedCrop.width : dimensions.width;
  const croppedHeight = normalizedCrop ? dimensions.height * normalizedCrop.height : dimensions.height;

  if (rotation === 90 || rotation === 270) {
    return {
      width: croppedHeight,
      height: croppedWidth,
    };
  }

  return {
    width: croppedWidth,
    height: croppedHeight,
  };
}

export function prepareImageDataUrl(
  dataUrl: string,
  rotation: ImageRotation,
  cropOrQuality?: ImageCrop | number,
  maybeQuality = 0.92,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const crop = typeof cropOrQuality === "number" ? undefined : cropOrQuality;
      const quality = typeof cropOrQuality === "number" ? cropOrQuality : maybeQuality;
      const normalizedQuality = Math.min(1, Math.max(0.1, quality));
      const sourceRect = getCroppedSourceRect(img, crop);
      const swap = rotation === 90 || rotation === 270;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? sourceRect.sh : sourceRect.sw;
      canvas.height = swap ? sourceRect.sw : sourceRect.sh;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context."));
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sw,
        sourceRect.sh,
        -sourceRect.sw / 2,
        -sourceRect.sh / 2,
        sourceRect.sw,
        sourceRect.sh,
      );

      resolve(canvas.toDataURL("image/jpeg", normalizedQuality));
    };
    img.onerror = () => reject(new Error("Failed to prepare image for PDF generation."));
    img.src = dataUrl;
  });
}

export function rotateImageDataUrl(
  dataUrl: string,
  rotation: ImageRotation,
): Promise<string> {
  if (rotation === 0) {
    return Promise.resolve(dataUrl);
  }

  return prepareImageDataUrl(dataUrl, rotation, 0.92);
}

export function loadImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function getImageNaturalDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to load image for dimension check."));
    img.src = dataUrl;
  });
}

export function getEffectivePageDimensions(
  settings: PageSettings,
  imageWidth: number,
  imageHeight: number,
): PageDimensions {
  const base = PAGE_DIMENSIONS_PT[settings.size];

  if (settings.orientation === "auto") {
    const isLandscape = imageWidth > imageHeight;
    return isLandscape
      ? { widthPt: base.heightPt, heightPt: base.widthPt }
      : { widthPt: base.widthPt, heightPt: base.heightPt };
  }

  if (settings.orientation === "landscape") {
    return { widthPt: base.heightPt, heightPt: base.widthPt };
  }

  return { widthPt: base.widthPt, heightPt: base.heightPt };
}

export function calculateImagePlacement(
  imageWidth: number,
  imageHeight: number,
  pageDimensions: PageDimensions,
  settings: PageSettings,
): ImagePlacement {
  const margin = MARGIN_PT[settings.margins];
  const availableWidth = pageDimensions.widthPt - margin * 2;
  const availableHeight = pageDimensions.heightPt - margin * 2;

  if (settings.fitMode === "actual") {
    const pxToPt = 0.75;
    const imgWidthPt = imageWidth * pxToPt;
    const imgHeightPt = imageHeight * pxToPt;
    const x = (pageDimensions.widthPt - imgWidthPt) / 2;
    const y = (pageDimensions.heightPt - imgHeightPt) / 2;
    return { x, y, width: imgWidthPt, height: imgHeightPt };
  }

  const imageAspect = imageWidth / imageHeight;
  const pageAspect = availableWidth / availableHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (settings.fitMode === "cover") {
    if (imageAspect > pageAspect) {
      drawHeight = availableHeight;
      drawWidth = drawHeight * imageAspect;
    } else {
      drawWidth = availableWidth;
      drawHeight = drawWidth / imageAspect;
    }
  } else {
    if (imageAspect > pageAspect) {
      drawWidth = availableWidth;
      drawHeight = drawWidth / imageAspect;
    } else {
      drawHeight = availableHeight;
      drawWidth = drawHeight * imageAspect;
    }
  }

  const x = (pageDimensions.widthPt - drawWidth) / 2;
  const y = (pageDimensions.heightPt - drawHeight) / 2;

  return { x, y, width: drawWidth, height: drawHeight };
}

export function generateThumbnailDataUrl(
  dataUrl: string,
  rotation: ImageRotation,
  cropOrMaxSize?: ImageCrop | number,
  maybeMaxSize = 200,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const crop = typeof cropOrMaxSize === "number" ? undefined : cropOrMaxSize;
      const maxSize = typeof cropOrMaxSize === "number" ? cropOrMaxSize : maybeMaxSize;
      const sourceRect = getCroppedSourceRect(img, crop);
      const swap = rotation === 90 || rotation === 270;
      const naturalW = swap ? sourceRect.sh : sourceRect.sw;
      const naturalH = swap ? sourceRect.sw : sourceRect.sh;

      const scale = Math.min(maxSize / naturalW, maxSize / naturalH, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(naturalW * scale);
      canvas.height = Math.round(naturalH * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context."));
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sw,
        sourceRect.sh,
        -(sourceRect.sw * scale) / 2,
        -(sourceRect.sh * scale) / 2,
        sourceRect.sw * scale,
        sourceRect.sh * scale,
      );

      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Failed to generate thumbnail."));
    img.src = dataUrl;
  });
}
