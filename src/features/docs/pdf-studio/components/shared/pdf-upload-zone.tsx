"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  buildPdfStudioAcceptString,
  buildPdfStudioUploadSummary,
  validatePdfStudioFiles,
} from "@/features/docs/pdf-studio/lib/ingestion";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

interface PdfUploadZoneProps {
  onFiles: (files: File[]) => void;
  toolId?: PdfStudioToolId;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMb?: number;
  currentFileCount?: number;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}

export function PdfUploadZone({
  onFiles,
  toolId,
  accept = ".pdf",
  multiple = false,
  maxFiles = 10,
  maxSizeMb = 100,
  currentFileCount = 0,
  label = "Drop your PDF here",
  sublabel,
  disabled = false,
  error: externalError,
  className,
}: PdfUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = externalError ?? error;
  const resolvedAccept = toolId ? buildPdfStudioAcceptString(toolId) : accept;
  const resolvedSublabel =
    sublabel ?? (toolId ? buildPdfStudioUploadSummary(toolId) : undefined);

  const validateAndEmit = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const files = Array.from(fileList);

      if (files.length === 0) return;

      if (!multiple && toolId == null && files.length > 1) {
        setError("Please upload only one file");
        return;
      }

      if (toolId) {
        const result = validatePdfStudioFiles(toolId, fileList, {
          currentFileCount,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onFiles(result.files);
        return;
      }

      if (files.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const oversized = files.find(
        (f) => f.size > maxSizeMb * 1024 * 1024
      );
      if (oversized) {
        setError(
          `${oversized.name} exceeds ${maxSizeMb}MB limit`
        );
        return;
      }

      const acceptExts = resolvedAccept
        .split(",")
        .map((s) => s.trim().toLowerCase());
      const invalid = files.find((f) => {
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        const mime = f.type.toLowerCase();
        return !acceptExts.some(
          (a) => a === ext || a === mime
        );
      });
      if (invalid) {
        setError(`${invalid.name} is not a supported file type`);
        return;
      }

      onFiles(files);
    },
    [
      currentFileCount,
      maxFiles,
      maxSizeMb,
      multiple,
      onFiles,
      resolvedAccept,
      toolId,
    ]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      validateAndEmit(e.dataTransfer.files);
    },
    [disabled, validateAndEmit]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        validateAndEmit(e.target.files);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndEmit]
  );

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragOver
            ? "border-[var(--accent)] bg-red-50/40"
            : "border-[var(--border-strong)] bg-[var(--surface-soft)]",
          disabled && "pointer-events-none opacity-50",
          displayError && "border-red-400"
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
          📄
        </div>
        <p className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {resolvedSublabel ??
            `${resolvedAccept.replace(/\./g, "").toUpperCase()} ${multiple ? `• Up to ${maxFiles} files` : ""} • Max ${maxSizeMb}MB each`}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={resolvedAccept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
      {displayError && (
        <p className="mt-2 text-xs text-red-600">{displayError}</p>
      )}
    </div>
  );
}
