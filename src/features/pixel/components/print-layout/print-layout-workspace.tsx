"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { ImageUploadZone } from "@/features/pixel/components/image-upload-zone";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type SheetSize = "a4" | "letter" | "4x6" | "5x7";
type OutputFormat = "image/jpeg" | "image/png";

interface PhotoSize {
  label: string;
  widthMm: number;
  heightMm: number;
}

const PHOTO_SIZES: PhotoSize[] = [
  { label: "Wallet (6×9 cm)", widthMm: 60, heightMm: 90 },
  { label: "5×7 print", widthMm: 127, heightMm: 178 },
  { label: "4×6 print", widthMm: 102, heightMm: 152 },
  { label: "Passport strip", widthMm: 35, heightMm: 45 },
];

const SHEET_SIZES: Record<SheetSize, { label: string; widthMm: number; heightMm: number }> = {
  a4: { label: "A4", widthMm: 210, heightMm: 297 },
  letter: { label: "US Letter", widthMm: 215.9, heightMm: 279.4 },
  "4x6": { label: "4×6 (10×15 cm)", widthMm: 101.6, heightMm: 152.4 },
  "5x7": { label: "5×7 (13×18 cm)", widthMm: 127, heightMm: 177.8 },
};

interface ImageEntry {
  file: File;
  img: HTMLImageElement;
  previewUrl: string;
}

export function PrintLayoutWorkspace() {
  const [photos, setPhotos] = useState<ImageEntry[]>([]);
  const [sheetSize, setSheetSize] = useState<SheetSize>("a4");
  const [photoSizeIdx, setPhotoSizeIdx] = useState(0);
  const [customW, setCustomW] = useState(50);
  const [customH, setCustomH] = useState(50);
  const [useCustom, setUseCustom] = useState(false);
  const [bgWhite, setBgWhite] = useState(true);
  const [gutterMm, setGutterMm] = useState(2);
  const [cropMarks, setCropMarks] = useState(true);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageLoaded = useCallback(
    (file: File, previewUrl: string, img: HTMLImageElement) => {
      setPhotos((prev) =>
        prev.length >= 4 ? prev : [...prev, { file, img, previewUrl }],
      );
    },
    [],
  );

  const photoW = useCustom ? customW : PHOTO_SIZES[photoSizeIdx].widthMm;
  const photoH = useCustom ? customH : PHOTO_SIZES[photoSizeIdx].heightMm;
  const sheet = SHEET_SIZES[sheetSize];
  const marginMm = 10;
  const usableW = sheet.widthMm - 2 * marginMm;
  const usableH = sheet.heightMm - 2 * marginMm;
  const cols = Math.floor((usableW + gutterMm) / (photoW + gutterMm)) || 1;
  const rows = Math.floor((usableH + gutterMm) / (photoH + gutterMm)) || 1;
  const total = cols * rows;

  const renderSheet = useCallback(() => {
    if (photos.length === 0) return;
    const dpi = 300;
    const pxPerMm = dpi / 25.4;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.round(sheet.widthMm * pxPerMm);
    canvas.height = Math.round(sheet.heightMm * pxPerMm);
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = bgWhite ? "#ffffff" : "#f5f0eb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pw = Math.round(photoW * pxPerMm);
    const ph = Math.round(photoH * pxPerMm);
    const gPx = Math.round(gutterMm * pxPerMm);
    const mPx = Math.round(marginMm * pxPerMm);
    const markLen = Math.round(3 * pxPerMm);

    let photoIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = mPx + c * (pw + gPx);
        const y = mPx + r * (ph + gPx);
        const entry = photos[photoIdx % photos.length];
        ctx.drawImage(entry.img, x, y, pw, ph);
        photoIdx++;

        if (cropMarks) {
          ctx.strokeStyle = "#cccccc";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - markLen, y); ctx.lineTo(x, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y - markLen); ctx.lineTo(x, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + pw, y); ctx.lineTo(x + pw + markLen, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + pw, y - markLen); ctx.lineTo(x + pw, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - markLen, y + ph); ctx.lineTo(x, y + ph); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y + ph); ctx.lineTo(x, y + ph + markLen); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + pw, y + ph); ctx.lineTo(x + pw + markLen, y + ph); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + pw, y + ph); ctx.lineTo(x + pw, y + ph + markLen); ctx.stroke();
        }
      }
    }
  }, [photos, sheet, photoW, photoH, gutterMm, bgWhite, cropMarks, cols, rows]);

  useEffect(() => {
    renderSheet();
  }, [renderSheet]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ext = format === "image/png" ? "png" : "jpg";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const a = document.createElement("a");
        a.href = url;
        a.download = `print-layout.${ext}`;
        a.click();
      },
      format,
      format === "image/png" ? undefined : 0.95,
    );
  }, [format]);

  return (
    <PixelToolShell
      title="🖨 Print Layout"
      description="Arrange photos for printing on A4 or Letter"
    >
      <div className="space-y-6">
        <div>
          <ImageUploadZone onImageLoaded={handleImageLoaded} />
          {photos.length > 0 && (
            <p className="mt-2 text-xs text-[#666]">
              {photos.length}/4 photos loaded
            </p>
          )}
        </div>

        {photos.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Sheet size */}
              <div className="space-y-2 rounded-xl border border-[#e5e5e5] bg-white p-4">
                <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
                  Sheet Size
                </label>
                {(Object.entries(SHEET_SIZES) as [SheetSize, typeof sheet][]).map(
                  ([key, s]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSheetSize(key)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors",
                        sheetSize === key
                          ? "bg-red-50 text-[var(--accent)] font-medium"
                          : "hover:bg-[#f5f5f5] text-[#666]",
                      )}
                    >
                      {s.label}
                    </button>
                  ),
                )}
              </div>

              {/* Photo size */}
              <div className="space-y-2 rounded-xl border border-[#e5e5e5] bg-white p-4">
                <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
                  Photo Size
                </label>
                {PHOTO_SIZES.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setPhotoSizeIdx(i);
                      setUseCustom(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors",
                      !useCustom && photoSizeIdx === i
                        ? "bg-red-50 text-[var(--accent)] font-medium"
                        : "hover:bg-[#f5f5f5] text-[#666]",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors",
                    useCustom
                      ? "bg-red-50 text-[var(--accent)] font-medium"
                      : "hover:bg-[#f5f5f5] text-[#666]",
                  )}
                >
                  Custom
                </button>
                {useCustom && (
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <label className="text-[0.65rem] text-[#666]">W (mm)</label>
                      <input
                        type="number"
                        min={10}
                        max={200}
                        value={customW}
                        onChange={(e) => setCustomW(Number(e.target.value))}
                        className="w-full rounded-lg border border-[#e5e5e5] px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[0.65rem] text-[#666]">H (mm)</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={customH}
                        onChange={(e) => setCustomH(Number(e.target.value))}
                        className="w-full rounded-lg border border-[#e5e5e5] px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e5e5e5] bg-white p-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#666]">Gutter</label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={gutterMm}
                  onChange={(e) => setGutterMm(Number(e.target.value))}
                  className="w-20 accent-[var(--accent)]"
                />
                <span className="text-xs text-[#999]">{gutterMm}mm</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[#666] cursor-pointer">
                <input
                  type="checkbox"
                  checked={bgWhite}
                  onChange={(e) => setBgWhite(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                White bg
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#666] cursor-pointer">
                <input
                  type="checkbox"
                  checked={cropMarks}
                  onChange={(e) => setCropMarks(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Crop marks
              </label>
              <span className="text-xs text-[#999]">
                {total} photos per sheet ({cols}×{rows})
              </span>
            </div>

            {/* Preview */}
            <div className="flex justify-center rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-4 overflow-auto">
              <canvas
                ref={canvasRef}
                className="max-h-[500px] w-auto rounded shadow-sm"
                style={{ imageRendering: "auto" }}
              />
            </div>

            {/* Download */}
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                {(
                  [
                    ["image/jpeg", "JPEG"],
                    ["image/png", "PNG"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormat(val)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs border transition-colors",
                      format === val
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[#e5e5e5] text-[#666] hover:bg-[#f5f5f5]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={handleDownload}>
                Download Sheet
              </Button>
            </div>
          </>
        )}
      </div>
    </PixelToolShell>
  );
}
