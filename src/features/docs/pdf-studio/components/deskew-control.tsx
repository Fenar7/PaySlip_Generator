"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { detectSkewAngle, deskewCanvas } from "../utils/deskew";

type DeskewControlProps = {
  /** Source image to analyze / deskew (as an HTMLCanvasElement or image URL) */
  imageUrl?: string;
  /** Called with the deskewed canvas when user applies correction */
  onApply?: (canvas: HTMLCanvasElement) => void;
  className?: string;
};

function angleBadgeColor(angle: number): string {
  const abs = Math.abs(angle);
  if (abs < 2) return "bg-emerald-100 text-emerald-700";
  if (abs < 10) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function loadImageToCanvas(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function DeskewControl({
  imageUrl,
  onApply,
  className,
}: DeskewControlProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [detectedAngle, setDetectedAngle] = useState<number | null>(null);
  const [manualAngle, setManualAngle] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset when image changes
  useEffect(() => {
    setDetectedAngle(null);
    setManualAngle(0);
    setError(null);
    setBeforePreview(null);
    setAfterPreview(null);
    sourceCanvasRef.current = null;
  }, [imageUrl]);

  const handleAutoDetect = useCallback(async () => {
    if (!imageUrl) {
      setError("No image loaded");
      return;
    }

    setIsDetecting(true);
    setError(null);

    try {
      const canvas = await loadImageToCanvas(imageUrl);
      sourceCanvasRef.current = canvas;
      setBeforePreview(canvasToDataUrl(canvas));

      const angle = detectSkewAngle(canvas);
      setDetectedAngle(angle);
      setManualAngle(angle);

      // Generate after preview
      if (angle !== 0) {
        const corrected = deskewCanvas(canvas, angle);
        setAfterPreview(canvasToDataUrl(corrected));
      } else {
        setAfterPreview(canvasToDataUrl(canvas));
      }
    } catch {
      setError("Could not analyze the image. Try a different image.");
    } finally {
      setIsDetecting(false);
    }
  }, [imageUrl]);

  // Update after preview when manual angle changes
  useEffect(() => {
    if (!sourceCanvasRef.current) return;
    if (manualAngle === 0) {
      setAfterPreview(canvasToDataUrl(sourceCanvasRef.current));
    } else {
      const corrected = deskewCanvas(sourceCanvasRef.current, manualAngle);
      setAfterPreview(canvasToDataUrl(corrected));
    }
  }, [manualAngle]);

  const handleApply = useCallback(() => {
    if (!sourceCanvasRef.current || !onApply) return;
    const corrected =
      manualAngle === 0
        ? sourceCanvasRef.current
        : deskewCanvas(sourceCanvasRef.current, manualAngle);
    onApply(corrected);
  }, [manualAngle, onApply]);

  const effectiveAngle = manualAngle;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#e5e5e5] bg-white shadow-sm",
        className,
      )}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-[#1a1a1a]">
          Deskew Correction
        </span>
        <svg
          className={cn(
            "h-4 w-4 text-[#666] transition-transform",
            collapsed && "-rotate-90",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-[#e5e5e5] px-4 pb-4 pt-3">
          {/* Auto-detect */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAutoDetect}
              disabled={!imageUrl || isDetecting}
            >
              {isDetecting ? "Detecting…" : "Auto-detect"}
            </Button>
            {detectedAngle !== null && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  angleBadgeColor(detectedAngle),
                )}
              >
                {detectedAngle === 0
                  ? "No skew"
                  : `${detectedAngle > 0 ? "+" : ""}${detectedAngle.toFixed(1)}°`}
              </span>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          {/* Manual slider */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="deskew-slider"
                className="text-xs font-medium text-[#666]"
              >
                Fine-tune angle
              </label>
              <span className="text-xs font-medium text-[#1a1a1a]">
                {effectiveAngle > 0 ? "+" : ""}
                {effectiveAngle.toFixed(1)}°
              </span>
            </div>
            <input
              id="deskew-slider"
              type="range"
              min={-10}
              max={10}
              step={0.5}
              value={manualAngle}
              onChange={(e) => setManualAngle(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[0.6rem] text-[#666]">
              <span>-10°</span>
              <span>0°</span>
              <span>+10°</span>
            </div>
          </div>

          {/* Before/After preview */}
          {beforePreview && afterPreview && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-[#666]">Preview</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-center text-[0.6rem] font-medium uppercase tracking-wider text-[#666]">
                    Before
                  </p>
                  <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforePreview}
                      alt="Before deskew"
                      className="h-24 w-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-center text-[0.6rem] font-medium uppercase tracking-wider text-[#666]">
                    After
                  </p>
                  <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={afterPreview}
                      alt="After deskew"
                      className="h-24 w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Apply button */}
          {sourceCanvasRef.current && onApply && (
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={handleApply}
              disabled={effectiveAngle === 0}
            >
              Apply Deskew
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
