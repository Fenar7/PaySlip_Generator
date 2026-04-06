"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  penColor?: string;
  className?: string;
}

export function SignatureCanvas({
  onSave,
  penColor = "#000000",
  className,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      penColor,
      backgroundColor: "rgba(255,255,255,0)",
    });

    pad.addEventListener("endStroke", () => {
      setIsEmpty(pad.isEmpty());
    });

    padRef.current = pad;

    return () => {
      pad.off();
    };
  }, [penColor]);

  useEffect(() => {
    if (padRef.current) {
      padRef.current.penColor = penColor;
    }
  }, [penColor]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
    setIsEmpty(true);
  }, []);

  const handleDone = useCallback(() => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.toDataURL("image/png");
    onSave(dataUrl);
    padRef.current.clear();
    setIsEmpty(true);
  }, [onSave]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: 160 }}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
        >
          Clear
        </Button>
        <Button size="sm" onClick={handleDone} disabled={isEmpty}>
          Done
        </Button>
      </div>
    </div>
  );
}
