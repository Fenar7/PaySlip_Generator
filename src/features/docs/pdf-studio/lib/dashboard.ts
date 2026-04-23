import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import type { PdfStudioConversionHistoryEntry } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import type { PdfStudioServerConversionToolId } from "@/features/docs/pdf-studio/lib/conversion-jobs";

export type PdfStudioAnalyticsSnapshot = {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  batchJobs: number;
  outputItems: number;
  uniqueTools: number;
  successRate: number | null;
  topTools: Array<{
    toolId: PdfStudioServerConversionToolId;
    title: string;
    count: number;
  }>;
};

export function buildPdfStudioAnalyticsSnapshot(
  entries: PdfStudioConversionHistoryEntry[],
): PdfStudioAnalyticsSnapshot {
  const totalJobs = entries.length;
  const completedJobs = entries.filter((entry) => entry.status === "completed").length;
  const failedJobs = entries.filter((entry) => entry.status === "dead_letter").length;
  const activeJobs = totalJobs - completedJobs - failedJobs;
  const batchJobs = entries.filter((entry) => entry.totalItems > 1).length;
  const outputItems = entries.reduce(
    (total, entry) => total + entry.completedItems,
    0,
  );

  const toolCounts = new Map<PdfStudioServerConversionToolId, number>();
  for (const entry of entries) {
    toolCounts.set(entry.toolId, (toolCounts.get(entry.toolId) ?? 0) + 1);
  }

  const settledJobs = completedJobs + failedJobs;
  const successRate =
    settledJobs > 0 ? Math.round((completedJobs / settledJobs) * 100) : null;

  const topTools = [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([toolId, count]) => ({
      toolId,
      title: getPdfStudioTool(toolId).title,
      count,
    }));

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    activeJobs,
    batchJobs,
    outputItems,
    uniqueTools: toolCounts.size,
    successRate,
    topTools,
  };
}

