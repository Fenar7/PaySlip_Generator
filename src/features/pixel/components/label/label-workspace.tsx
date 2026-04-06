"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { ImageUploadZone } from "@/features/pixel/components/image-upload-zone";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type OutputFormat = "image/jpeg" | "image/png";

const FONT_FAMILIES = [
  "Arial, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
  "Verdana, sans-serif",
  "Times New Roman, serif",
];

const COLOR_SWATCHES = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#0066cc",
  "#008800",
  "#ff6600",
  "#9933cc",
  "#666666",
];

interface TextField {
  id: string;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bgMode: "none" | "white" | "black";
  x: number;
  y: number;
}

function createTextField(idx: number): TextField {
  return {
    id: `text-${Date.now()}-${idx}`,
    content: "",
    fontFamily: FONT_FAMILIES[0],
    fontSize: 24,
    color: "#000000",
    bgMode: "none",
    x: 50,
    y: 50 + idx * 40,
  };
}

export function LabelWorkspace() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fields, setFields] = useState<TextField[]>([createTextField(0)]);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [dragging, setDragging] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const renderCanvas = useCallback(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);

    for (const field of fields) {
      if (!field.content) continue;
      ctx.font = `${field.fontSize}px ${field.fontFamily}`;
      const metrics = ctx.measureText(field.content);
      const textH = field.fontSize;

      if (field.bgMode !== "none") {
        ctx.fillStyle = field.bgMode === "white" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)";
        ctx.fillRect(
          field.x - 4,
          field.y - textH,
          metrics.width + 8,
          textH + 8,
        );
      }

      ctx.fillStyle = field.color;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(field.content, field.x, field.y);
    }
  }, [image, fields]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleImageLoaded = useCallback(
    (_file: File, _url: string, img: HTMLImageElement) => {
      setImage(img);
      setFields([createTextField(0)]);
    },
    [],
  );

  const updateField = useCallback(
    (id: string, partial: Partial<TextField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...partial } : f)),
      );
    },
    [],
  );

  const addField = useCallback(() => {
    if (fields.length >= 4) return;
    setFields((prev) => [...prev, createTextField(prev.length)]);
  }, [fields.length]);

  const removeField = useCallback(
    (id: string) => {
      if (fields.length <= 1) return;
      setFields((prev) => prev.filter((f) => f.id !== id));
    },
    [fields.length],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !image) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = image.naturalWidth / rect.width;
      const scaleY = image.naturalHeight / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      // Find field near click
      for (const field of [...fields].reverse()) {
        if (!field.content) continue;
        const dx = Math.abs(cx - field.x);
        const dy = Math.abs(cy - field.y);
        if (dx < 100 && dy < field.fontSize) {
          setDragging(field.id);
          return;
        }
      }
    },
    [fields, image],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragging || !canvasRef.current || !image) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = image.naturalWidth / rect.width;
      const scaleY = image.naturalHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      updateField(dragging, { x: Math.round(x), y: Math.round(y) });
    },
    [dragging, image, updateField],
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const insertDate = useCallback(
    (id: string) => {
      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const field = fields.find((f) => f.id === id);
      if (field) {
        updateField(id, {
          content: field.content ? `${field.content} ${today}` : today,
        });
      }
    },
    [fields, updateField],
  );

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
        a.download = `labeled-photo.${ext}`;
        a.click();
      },
      format,
      format === "image/png" ? undefined : 0.92,
    );
  }, [format]);

  return (
    <PixelToolShell
      title="🏷 Name & Date Labels"
      description="Add text labels to any photo"
    >
      <div className="space-y-6">
        <ImageUploadZone onImageLoaded={handleImageLoaded} />

        {image && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Canvas */}
            <div className="flex justify-center rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-4 overflow-auto">
              <canvas
                ref={canvasRef}
                className="max-h-[500px] w-auto rounded cursor-crosshair"
                style={{ imageRendering: "auto" }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>

            {/* Text Fields */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="space-y-2 rounded-xl border border-[#e5e5e5] bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.7rem] font-semibold text-[#1a1a1a]">
                      Text {idx + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter text…"
                        value={field.content}
                        onChange={(e) =>
                          updateField(field.id, { content: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertDate(field.id)}
                      title="Insert today's date"
                    >
                      📅
                    </Button>
                  </div>

                  <select
                    value={field.fontFamily}
                    onChange={(e) =>
                      updateField(field.id, { fontFamily: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#e5e5e5] px-2 py-1 text-sm"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f.split(",")[0]}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="text-[0.65rem] text-[#666]">Size</label>
                    <input
                      type="range"
                      min={8}
                      max={72}
                      value={field.fontSize}
                      onChange={(e) =>
                        updateField(field.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[var(--accent)]"
                    />
                    <span className="text-xs text-[#999] w-8 text-right">
                      {field.fontSize}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateField(field.id, { color: c })}
                        className={cn(
                          "h-6 w-6 rounded-full border-2 transition-transform",
                          field.color === c
                            ? "border-[var(--accent)] scale-110"
                            : "border-[#e5e5e5]",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="text"
                      value={field.color}
                      onChange={(e) =>
                        updateField(field.id, { color: e.target.value })
                      }
                      className="w-20 rounded-lg border border-[#e5e5e5] px-2 py-0.5 text-xs"
                      placeholder="#hex"
                    />
                  </div>

                  <div className="flex gap-1">
                    {(
                      [
                        ["none", "None"],
                        ["white", "White Box"],
                        ["black", "Black Box"],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          updateField(field.id, { bgMode: val })
                        }
                        className={cn(
                          "rounded-lg px-2 py-1 text-[0.65rem] border transition-colors",
                          field.bgMode === val
                            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                            : "border-[#e5e5e5] text-[#666] hover:bg-[#f5f5f5]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[0.6rem] text-[#999]">
                    Click &amp; drag on image to reposition
                  </p>
                </div>
              ))}

              {fields.length < 4 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addField}
                  className="w-full"
                >
                  + Add Text Field
                </Button>
              )}

              {/* Download */}
              <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
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
                <Button size="sm" onClick={handleDownload} className="w-full">
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PixelToolShell>
  );
}
