"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { ImageUploadZone } from "@/features/pixel/components/image-upload-zone";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  applyAdjustments,
  type AdjustmentValues,
} from "@/features/pixel/utils/image-adjustments";

type OutputFormat = "image/jpeg" | "image/png";

interface HistoryEntry {
  imageData: ImageData;
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-[#666] w-20 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="text-xs text-[#999] w-9 text-right">{value}</span>
    </div>
  );
}

export function AdjustWorkspace() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentValues>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [exposure, setExposure] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [bw, setBw] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, { imageData: data }];
      if (next.length > 20) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const renderToCanvas = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const isRotated = rotation % 180 !== 0;
    const w = isRotated ? image.naturalHeight : image.naturalWidth;
    const h = isRotated ? image.naturalWidth : image.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(
      image,
      -image.naturalWidth / 2,
      -image.naturalHeight / 2,
    );
    ctx.restore();

    // Adjustments with exposure folded into brightness
    const adj: AdjustmentValues = {
      brightness: adjustments.brightness + exposure * 0.5,
      contrast: adjustments.contrast,
      saturation: adjustments.saturation,
    };
    const needsAdjust = adj.brightness !== 0 || adj.contrast !== 0 || adj.saturation !== 0;
    if (needsAdjust) applyAdjustments(canvas, adj);

    // Sharpness (simple unsharp mask via convolution)
    if (sharpness > 0) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      const copy = new Uint8ClampedArray(d);
      const cw = canvas.width;
      const factor = sharpness / 100;
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < cw - 1; x++) {
          const idx = (y * cw + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c] * 5;
            const neighbors =
              copy[idx - 4 + c] +
              copy[idx + 4 + c] +
              copy[(idx - cw * 4) + c] +
              copy[(idx + cw * 4) + c];
            const sharp = center - neighbors;
            d[idx + c] = Math.max(
              0,
              Math.min(255, copy[idx + c] + factor * (sharp - copy[idx + c])),
            );
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // B&W
    if (bw) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Sepia
    if (sepia && !bw) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        d[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        d[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        d[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [image, adjustments, exposure, sharpness, bw, sepia, flipH, flipV, rotation]);

  useEffect(() => {
    renderToCanvas();
  }, [renderToCanvas]);

  const handleImageLoaded = useCallback(
    (_file: File, _url: string, img: HTMLImageElement) => {
      setImage(img);
      setHistory([]);
      setHistoryIndex(-1);
      setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
      setExposure(0);
      setSharpness(0);
      setBw(false);
      setSepia(false);
      setFlipH(false);
      setFlipV(false);
      setRotation(0);
    },
    [],
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    const canvas = canvasRef.current;
    if (canvas && prev) {
      canvas.width = prev.imageData.width;
      canvas.height = prev.imageData.height;
      canvas.getContext("2d")!.putImageData(prev.imageData, 0, 0);
      setHistoryIndex((i) => i - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    const canvas = canvasRef.current;
    if (canvas && next) {
      canvas.width = next.imageData.width;
      canvas.height = next.imageData.height;
      canvas.getContext("2d")!.putImageData(next.imageData, 0, 0);
      setHistoryIndex((i) => i + 1);
    }
  }, [history, historyIndex]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pushHistory();
    const ext = format === "image/png" ? "png" : "jpg";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const a = document.createElement("a");
        a.href = url;
        a.download = `adjusted-photo.${ext}`;
        a.click();
      },
      format,
      format === "image/png" ? undefined : 0.92,
    );
  }, [format, pushHistory]);

  const resetAll = useCallback(() => {
    pushHistory();
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
    setExposure(0);
    setSharpness(0);
    setBw(false);
    setSepia(false);
    setFlipH(false);
    setFlipV(false);
    setRotation(0);
  }, [pushHistory]);

  return (
    <PixelToolShell
      title="🎨 Basic Adjustments"
      description="Brightness, contrast, B&W and more"
    >
      <div className="space-y-6">
        <ImageUploadZone onImageLoaded={handleImageLoaded} />

        {image && (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            {/* Preview */}
            <div className="flex justify-center rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-4 overflow-auto">
              <canvas
                ref={canvasRef}
                className="max-h-[500px] w-auto rounded"
                style={{ imageRendering: "auto" }}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="space-y-2.5 rounded-xl border border-[#e5e5e5] bg-white p-4">
                <Slider
                  label="Brightness"
                  value={adjustments.brightness}
                  min={-100}
                  max={100}
                  onChange={(v) =>
                    setAdjustments((a) => ({ ...a, brightness: v }))
                  }
                />
                <Slider
                  label="Contrast"
                  value={adjustments.contrast}
                  min={-100}
                  max={100}
                  onChange={(v) =>
                    setAdjustments((a) => ({ ...a, contrast: v }))
                  }
                />
                <Slider
                  label="Saturation"
                  value={adjustments.saturation}
                  min={-100}
                  max={100}
                  onChange={(v) =>
                    setAdjustments((a) => ({ ...a, saturation: v }))
                  }
                />
                <Slider
                  label="Exposure"
                  value={exposure}
                  min={-100}
                  max={100}
                  onChange={setExposure}
                />
                <Slider
                  label="Sharpness"
                  value={sharpness}
                  min={0}
                  max={100}
                  onChange={setSharpness}
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-2">
                {/* eslint-disable-next-line react-hooks/refs */}
                {[
                  { label: "B&W", active: bw, onClick: () => setBw(!bw) },
                  {
                    label: "Sepia",
                    active: sepia,
                    onClick: () => setSepia(!sepia),
                  },
                  {
                    label: "Flip H",
                    active: flipH,
                    onClick: () => {
                      pushHistory();
                      setFlipH(!flipH);
                    },
                  },
                  {
                    label: "Flip V",
                    active: flipV,
                    onClick: () => {
                      pushHistory();
                      setFlipV(!flipV);
                    },
                  },
                  {
                    label: "↻ CW",
                    active: false,
                    onClick: () => {
                      pushHistory();
                      setRotation((r) => (r + 90) % 360);
                    },
                  },
                  {
                    label: "↺ CCW",
                    active: false,
                    onClick: () => {
                      pushHistory();
                      setRotation((r) => (r - 90 + 360) % 360);
                    },
                  },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={t.onClick}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs transition-colors border",
                      t.active
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[#e5e5e5] text-[#666] hover:bg-[#f5f5f5]",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Undo/Redo */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  ↩ Undo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  ↪ Redo
                </Button>
              </div>

              {/* Output */}
              <div className="flex gap-2">
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

              <div className="flex gap-2">
                <Button size="sm" onClick={handleDownload}>
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={resetAll}>
                  Reset All
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PixelToolShell>
  );
}
