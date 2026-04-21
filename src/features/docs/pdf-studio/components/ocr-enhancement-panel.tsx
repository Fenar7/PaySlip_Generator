"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { PdfStudioOcrMode } from "@/features/docs/pdf-studio/types";

// --- Types ---

type OcrLanguage = {
  code: string;
  label: string;
};

export type OcrImageResult = {
  imageId: string;
  imageName: string;
  text: string;
  confidence: number;
};

type OcrEnhancementPanelProps = {
  /** Current language selection */
  language?: string;
  onLanguageChange?: (lang: string) => void;
  /** Current OCR mode */
  mode?: PdfStudioOcrMode;
  onModeChange?: (mode: PdfStudioOcrMode) => void;
  /** OCR results to display */
  results?: OcrImageResult[];
  /** Whether OCR is currently running */
  isProcessing?: boolean;
  exportFilename?: string;
  className?: string;
};

// --- Constants ---

const LANGUAGES: OcrLanguage[] = [
  { code: "eng", label: "English" },
  { code: "ara", label: "Arabic" },
  { code: "fra", label: "French" },
  { code: "spa", label: "Spanish" },
  { code: "deu", label: "German" },
  { code: "hin", label: "Hindi" },
  { code: "urd", label: "Urdu" },
];

// --- Helpers ---

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "bg-emerald-100 text-emerald-700";
  if (confidence >= 60) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Sub-components ---

function ExpandableResult({ result }: { result: OcrImageResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
      >
        <span className="min-w-0 truncate font-medium text-[#1a1a1a]">
          {result.imageName}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              confidenceColor(result.confidence),
            )}
          >
            {Math.round(result.confidence)}%
          </span>
          <svg
            className={cn(
              "h-4 w-4 text-[#666] transition-transform",
              expanded && "rotate-180",
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
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[#e5e5e5] px-3 py-2">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#666]">
            {result.text || "No text detected"}
          </pre>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function OcrEnhancementPanel({
  language = "eng",
  onLanguageChange,
  mode = "accurate",
  onModeChange,
  results = [],
  isProcessing = false,
  exportFilename = "ocr-output.txt",
  className,
}: OcrEnhancementPanelProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allText = useMemo(
    () => results.map((r) => r.text).filter(Boolean).join("\n\n---\n\n"),
    [results],
  );

  const isNonEnglish = language !== "eng";

  const handleCopyAll = useCallback(async () => {
    if (!allText) return;
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked
    }
  }, [allText]);

  const handleExportTxt = useCallback(() => {
    if (!allText) return;
    downloadTextFile(allText, exportFilename);
  }, [allText, exportFilename]);

  return (
    <div
      className={cn(
        "rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-[#1a1a1a]">OCR Settings</h3>

      {/* Language Selector */}
      <div className="mt-4">
        <label
          htmlFor="ocr-language"
          className="block text-xs font-medium text-[#666]"
        >
          Language
        </label>
        <div className="mt-1 flex items-center gap-2">
          <select
            id="ocr-language"
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            disabled={isProcessing}
            className="block w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm text-[#1a1a1a] shadow-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          {isNonEnglish && (
            <Badge variant="warning" className="shrink-0 text-[0.65rem]">
              Pack will download
            </Badge>
          )}
        </div>
      </div>

      {/* OCR Mode Selector */}
      <div className="mt-4">
        <p className="text-xs font-medium text-[#666]">OCR Mode</p>
        <div className="mt-1.5 flex gap-1 rounded-lg border border-[#e5e5e5] bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => onModeChange?.("fast")}
            disabled={isProcessing}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50",
              mode === "fast"
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "text-[#666] hover:text-[#1a1a1a]",
            )}
          >
            Fast
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.("accurate")}
            disabled={isProcessing}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50",
              mode === "accurate"
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "text-[#666] hover:text-[#1a1a1a]",
            )}
          >
            Accurate
          </button>
        </div>
        <p className="mt-1 text-[0.65rem] text-[#666]">
          {mode === "fast"
            ? "Lower accuracy, quicker processing"
            : "Higher accuracy, slower processing"}
        </p>
      </div>

      {/* OCR Results */}
      {results.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#666]">
              Results ({results.length})
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={!allText}
                className="rounded-md px-2 py-1 text-[0.65rem] font-medium text-[#666] transition-colors hover:bg-gray-100 hover:text-[#1a1a1a] disabled:opacity-40"
              >
                {copied ? "Copied!" : "Copy all"}
              </button>
              <button
                type="button"
                onClick={handleExportTxt}
                disabled={!allText}
                className="rounded-md px-2 py-1 text-[0.65rem] font-medium text-[#666] transition-colors hover:bg-gray-100 hover:text-[#1a1a1a] disabled:opacity-40"
              >
                Export .txt
              </button>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {results.map((r) => (
              <ExpandableResult key={r.imageId} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
