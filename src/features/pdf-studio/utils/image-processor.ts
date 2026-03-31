"use client";

import type { ImageRotation, PageDimensions, ImagePlacement, PageSettings } from "@/features/pdf-studio/types";
import { PAGE_DIMENSIONS_PT, MARGIN_PT } from "@/features/pdf-studio/constants";

export function rotateImageDataUrl(
  dataUrl: string,
  rotation: ImageRotation,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (rotation === 0) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const swap = rotation === 90 || rotation === 270;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context."));
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to load image for rotation."));
    img.src = dataUrl;
  });
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
  maxSize = 200,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const swap = rotation === 90 || rotation === 270;
      const naturalW = swap ? img.height : img.width;
      const naturalH = swap ? img.width : img.height;

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

      const srcW = swap ? img.height : img.width;
      const srcH = swap ? img.width : img.height;
      ctx.drawImage(img, -(srcW * scale) / 2, -(srcH * scale) / 2, img.width * scale, img.height * scale);

      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Failed to generate thumbnail."));
    img.src = dataUrl;
  });
}
