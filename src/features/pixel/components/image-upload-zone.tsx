"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

const HEIC_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];

function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "heic" || ext === "heif";
}

interface ImageUploadZoneProps {
  onImageLoaded: (
    file: File,
    previewUrl: string,
    img: HTMLImageElement,
  ) => void;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
}

export function ImageUploadZone({
  onImageLoaded,
  accept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif",
  maxSizeMb = 20,
  className,
}: ImageUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);

      try {
        if (file.size > maxSizeMb * 1024 * 1024) {
          setError(`File too large. Maximum size is ${maxSizeMb}MB.`);
          setLoading(false);
          return;
        }

        let processedFile = file;

        if (isHeicFile(file)) {
          try {
            const { convertHeicToJpeg } = await import(
              "@/features/docs/pdf-studio/utils/heic-converter"
            );
            processedFile = await convertHeicToJpeg(file);
          } catch {
            setError(
              "HEIC conversion failed. Please convert to JPEG/PNG first.",
            );
            setLoading(false);
            return;
          }
        }

        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/jpg",
        ];
        if (!validTypes.includes(processedFile.type) && !isHeicFile(file)) {
          setError("Unsupported format. Use JPEG, PNG, WebP, or HEIC.");
          setLoading(false);
          return;
        }

        const url = URL.createObjectURL(processedFile);
        setPreview(url);

        const img = new Image();
        img.onload = () => {
          onImageLoaded(processedFile, url, img);
          setLoading(false);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          setError("Failed to load image. The file may be corrupted.");
          setLoading(false);
        };
        img.src = url;
      } catch {
        setError("An unexpected error occurred while processing the image.");
        setLoading(false);
      }
    },
    [maxSizeMb, onImageLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          dragActive
            ? "border-[var(--accent)] bg-red-50/50"
            : "border-[#e5e5e5] bg-white hover:border-[#ccc]",
          preview && "py-4",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#666] border-t-transparent" />
            Processing…
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <img
              src={preview}
              alt="Preview"
              className="mx-auto max-h-48 rounded-lg object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Change Photo
            </Button>
          </div>
        ) : (
          <>
            <div className="text-4xl">📸</div>
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">
                Drop an image here or click to browse
              </p>
              <p className="mt-1 text-xs text-[#666]">
                JPEG, PNG, WebP, HEIC • Max {maxSizeMb}MB
              </p>
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
