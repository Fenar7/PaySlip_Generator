"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { PassportPreset } from "@/features/pixel/data/passport-presets";
import {
  generatePrintSheet,
  type PrintSheetResult,
} from "@/features/pixel/utils/print-sheet";

interface PassportPrintSheetProps {
  photoCanvas: HTMLCanvasElement | null;
  preset: PassportPreset | null;
  onClose: () => void;
  /** Optional orgId forwarded to the PDF API for watermark gate evaluation. */
  orgId?: string;
}

export function PassportPrintSheet({
  photoCanvas,
  preset,
  onClose,
  orgId,
}: PassportPrintSheetProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<PrintSheetResult | null>(null);
  const [sheetSize, setSheetSize] = useState<"a4" | "letter">("a4");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoCanvas || !preset) return;
    let cancelled = false;

    const run = async () => {
      const sheetResult = generatePrintSheet(photoCanvas, {
        photoWidthMm: preset.widthMm,
        photoHeightMm: preset.heightMm,
        sheetSize,
        gutterMm: 2,
        dpi: 300,
      });

      if (cancelled) {
        sheetResult.canvas.width = 0;
        sheetResult.canvas.height = 0;
        return;
      }

      setResult(sheetResult);

      const display = displayRef.current;
      if (display) {
        display.width = sheetResult.canvas.width;
        display.height = sheetResult.canvas.height;
        const ctx = display.getContext("2d")!;
        ctx.drawImage(sheetResult.canvas, 0, 0);
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [photoCanvas, preset, sheetSize]);

  const handleDownload = useCallback(() => {
    if (!result) return;

    result.canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        const a = document.createElement("a");
        a.href = url;
        a.download = `print-sheet-${sheetSize}.jpg`;
        a.click();
      },
      "image/jpeg",
      0.95,
    );
  }, [result, blobUrl, sheetSize]);

  const handleDownloadPdf = useCallback(async () => {
    if (!photoCanvas || !preset) return;
    setPdfLoading(true);
    setPdfError(null);

    try {
      const imageBase64: string = await new Promise((resolve, reject) => {
        photoCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to encode photo."));
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("File read error."));
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.92,
        );
      });

      const response = await fetch("/api/pixel/print-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          presetId: preset.id,
          paperSize: sheetSize,
          orgId,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? `HTTP ${response.status}`,
        );
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `print-sheet-${preset.id}-${sheetSize}.pdf`;
      a.click();
      URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setPdfLoading(false);
    }
  }, [photoCanvas, preset, sheetSize, orgId]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!photoCanvas || !preset) return null;

  return (
    <div className="space-y-4 rounded-xl border border-[#e5e5e5] bg-white p-4">
      <div className="flex items-center justify-between">
        <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
          Print Sheet
        </label>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-[#666]">Sheet size:</label>
        <select
          value={sheetSize}
          onChange={(e) => setSheetSize(e.target.value as "a4" | "letter")}
          className="rounded-lg border border-[#e5e5e5] px-2 py-1 text-sm"
        >
          <option value="a4">A4</option>
          <option value="letter">US Letter</option>
        </select>
        {result && (
          <span className="text-xs text-[#999]">
            {result.photosPerSheet} photos per sheet ({result.columns}×
            {result.rows})
          </span>
        )}
      </div>

      <div className="flex justify-center rounded-xl bg-[#f5f5f5] p-4 overflow-auto">
        <canvas
          ref={displayRef}
          className="max-h-96 w-auto rounded shadow-sm"
          style={{ imageRendering: "auto" }}
        />
      </div>

      <Button onClick={handleDownload} size="sm">
        Download JPEG
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownloadPdf}
        disabled={pdfLoading}
      >
        {pdfLoading ? "Generating PDF…" : "Download PDF"}
      </Button>
      {pdfError && (
        <p className="text-xs text-red-500">{pdfError}</p>
      )}
    </div>
  );
}
