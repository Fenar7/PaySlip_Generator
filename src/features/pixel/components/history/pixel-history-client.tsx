"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type ToolType =
  | "PASSPORT_PHOTO"
  | "RESIZE"
  | "COMPRESS"
  | "ADJUST"
  | "FORMAT_CONVERT"
  | "PRINT_SHEET";

interface HistoryRecord {
  id: string;
  toolType: ToolType;
  inputFileName: string;
  outputFileName: string | null;
  presetId: string | null;
  fileSizeBytes: number | null;
  createdAt: Date;
}

const TOOL_LABELS: Record<ToolType, string> = {
  PASSPORT_PHOTO: "Passport Photo",
  RESIZE: "Resize",
  COMPRESS: "Compress",
  ADJUST: "Adjust",
  FORMAT_CONVERT: "Convert",
  PRINT_SHEET: "Print Sheet",
};

const TOOL_ICONS: Record<ToolType, string> = {
  PASSPORT_PHOTO: "🪪",
  RESIZE: "📐",
  COMPRESS: "🗜️",
  ADJUST: "🎛️",
  FORMAT_CONVERT: "🔄",
  PRINT_SHEET: "🖨️",
};

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function PixelHistoryClient({ records }: { records: HistoryRecord[] }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/app/pixel"
            className="inline-flex items-center gap-1.5 text-sm text-[#666] hover:text-[#1a1a1a] transition-colors"
          >
            <span>←</span>
            <span>Pixel Hub</span>
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1a1a1a]">
            Job History
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            Your last 100 Pixel processing jobs.
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-[#e5e5e5] bg-white px-6 py-12 text-center">
          <p className="text-[#888]">No Pixel jobs on record yet.</p>
          <Link
            href="/app/pixel"
            className="mt-4 inline-block rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
          >
            Start using Pixel tools
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0f0f0] bg-[#fafafa] text-left text-xs text-[#666]">
                <th className="px-4 py-3 font-medium">Tool</th>
                <th className="px-4 py-3 font-medium">Input File</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Output
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Size
                </th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f5]">
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  className={cn("hover:bg-[#fafafa] transition-colors")}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span>{TOOL_ICONS[rec.toolType]}</span>
                      <span className="font-medium text-[#1a1a1a]">
                        {TOOL_LABELS[rec.toolType]}
                      </span>
                    </span>
                    {rec.presetId && (
                      <span className="mt-0.5 block text-[11px] text-[#999]">
                        Preset: {rec.presetId}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-[#444]">
                    {rec.inputFileName}
                  </td>
                  <td className="hidden max-w-[160px] truncate px-4 py-3 text-[#444] sm:table-cell">
                    {rec.outputFileName ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-[#666] md:table-cell">
                    {formatBytes(rec.fileSizeBytes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#666]">
                    {formatDate(rec.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
