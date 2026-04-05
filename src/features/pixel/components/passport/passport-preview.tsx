"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { PassportPreset } from "@/features/pixel/data/passport-presets";
import type { AdjustmentValues } from "@/features/pixel/utils/image-adjustments";
import { applyCrop, type CropArea } from "@/features/pixel/utils/image-crop";
import { applyAdjustments } from "@/features/pixel/utils/image-adjustments";

interface NameOverlayConfig {
  enabled: boolean;
  name: string;
  date: string;
}

interface PassportPreviewProps {
  image: HTMLImageElement | null;
  preset: PassportPreset | null;
  cropArea: CropArea | null;
  adjustments: AdjustmentValues;
  bw: boolean;
  nameOverlay: NameOverlayConfig;
  onPrintSheet: (canvas: HTMLCanvasElement) => void;
}

export function PassportPreview({
  image,
  preset,
  cropArea,
  adjustments,
  bw,
  nameOverlay,
  onPrintSheet,
}: PassportPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);

  const renderCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!image || !preset || !cropArea) return null;

    const canvas = applyCrop(
      image,
      cropArea,
      preset.widthPx,
      preset.heightPx,
    );

    // Adjustments
    const needsAdjust =
      adjustments.brightness !== 0 ||
      adjustments.contrast !== 0 ||
      adjustments.saturation !== 0;
    if (needsAdjust) {
      applyAdjustments(canvas, adjustments);
    }

    // B&W
    if (bw) {
      const ctx = canvas.getContext("2d")!;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Name overlay
    if (nameOverlay.enabled && (nameOverlay.name || nameOverlay.date)) {
      const ctx = canvas.getContext("2d")!;
      const fontSize = Math.max(12, Math.round(canvas.width / 20));
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";

      const lines: string[] = [];
      if (nameOverlay.name) lines.push(nameOverlay.name);
      if (nameOverlay.date) lines.push(nameOverlay.date);

      const lineHeight = fontSize * 1.3;
      const startY = canvas.height - lines.length * lineHeight - 8;

      lines.forEach((line, idx) => {
        ctx.fillText(
          line,
          canvas.width / 2,
          startY + idx * lineHeight + fontSize,
        );
      });
    }

    return canvas;
  }, [image, preset, cropArea, adjustments, bw, nameOverlay]);

  useEffect(() => {
    const canvas = renderCanvas();
    if (!canvas) return;

    // Draw to visible canvas
    const display = canvasRef.current;
    if (display) {
      display.width = canvas.width;
      display.height = canvas.height;
      const ctx = display.getContext("2d")!;
      ctx.drawImage(canvas, 0, 0);
    }

    // Compute file size
    canvas.toBlob(
      (blob) => {
        if (blob) setFileSize(blob.size);
      },
      "image/jpeg",
      0.92,
    );

    // Cleanup temp canvas
    canvas.width = 0;
    canvas.height = 0;
  }, [renderCanvas]);

  const handleDownload = useCallback(() => {
    const canvas = renderCanvas();
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        const a = document.createElement("a");
        a.href = url;
        a.download = `passport-photo-${preset?.id ?? "photo"}.jpg`;
        a.click();
        canvas.width = 0;
        canvas.height = 0;
      },
      "image/jpeg",
      0.92,
    );
  }, [renderCanvas, blobUrl, preset]);

  const handlePrintSheet = useCallback(() => {
    const canvas = renderCanvas();
    if (!canvas) return;
    onPrintSheet(canvas);
  }, [renderCanvas, onPrintSheet]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!image || !preset || !cropArea) {
    return (
      <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-8 text-center">
        <p className="text-sm text-[#999]">
          Upload a photo, select a preset, and crop to see preview
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
          Preview
        </label>
        <span className="text-xs text-[#999]">
          {preset.widthPx}×{preset.heightPx}px • ~
          {(fileSize / 1024).toFixed(0)}KB
        </span>
      </div>

      <div className="flex justify-center rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-4">
        <canvas
          ref={canvasRef}
          className="max-h-72 w-auto rounded shadow-sm"
          style={{ imageRendering: "auto" }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownload} size="sm">
          Download Photo
        </Button>
        <Button variant="secondary" size="sm" onClick={handlePrintSheet}>
          Generate Print Sheet
        </Button>
      </div>
    </div>
  );
}
