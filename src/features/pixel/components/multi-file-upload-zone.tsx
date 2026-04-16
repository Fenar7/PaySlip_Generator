"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MultiFileUploadZoneProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
  label?: string;
}

export function MultiFileUploadZone({
  onFilesAccepted,
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMb = 20,
  className,
  label = "Drop images here or click to upload",
}: MultiFileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setError(null);

      const valid: File[] = [];
      for (const file of Array.from(fileList)) {
        if (file.size > maxSizeMb * 1024 * 1024) {
          setError(`"${file.name}" exceeds the ${maxSizeMb} MB limit — skipped.`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length > 0) onFilesAccepted(valid);
    },
    [maxSizeMb, onFilesAccepted]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        processFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragActive
          ? "border-[#1a1a1a] bg-[#f5f5f5]"
          : "border-[#d4d4d4] bg-white hover:border-[#999] hover:bg-[#fafafa]",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />
      <span className="text-3xl">🖼️</span>
      <p className="text-sm font-medium text-[#444]">{label}</p>
      <p className="text-xs text-[#999]">Max {maxSizeMb} MB per file</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
