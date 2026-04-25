import type { PlanId } from "@/lib/plans/config";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

export type PdfStudioCapabilityTier = "free" | "workspace" | "pro";

const PRO_TIER_TOOLS = new Set<PdfStudioToolId>([
  "repair",
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-ppt",
  "word-to-pdf",
  "html-to-pdf",
]);

const WORKSPACE_TIER_TOOLS = new Set<PdfStudioToolId>([
  "alternate-mix",
  "editor",
  "create-forms",
  "page-numbers",
  "bates",
  "metadata",
  "rename",
  "protect",
  "unlock",
  "grayscale",
  "remove-annotations",
  "bookmarks",
  "flatten",
  "n-up",
]);

export const PDF_STUDIO_STARTER_OCR_PAGE_LIMIT = 10;
export const PDF_STUDIO_STARTER_PROCESSING_PAGE_LIMIT = 40;

const PDF_STUDIO_RESULT_RETENTION_HOURS: Record<PlanId, number> = {
  free: 24,
  starter: 24,
  pro: 72,
  enterprise: 168,
};

const PDF_STUDIO_HISTORY_ENTRY_LIMITS: Record<PlanId, number> = {
  free: 0,
  starter: 10,
  pro: 25,
  enterprise: 50,
};

export function getPdfStudioCapabilityTier(toolId: PdfStudioToolId): PdfStudioCapabilityTier {
  if (PRO_TIER_TOOLS.has(toolId)) {
    return "pro";
  }

  return WORKSPACE_TIER_TOOLS.has(toolId) ? "workspace" : "free";
}

export function getPdfStudioTierLabel(tier: PdfStudioCapabilityTier) {
  switch (tier) {
    case "free":
      return "Free";
    case "workspace":
      return "Workspace";
    case "pro":
      return "Pro";
  }
}

export function getPdfStudioWorkspaceMinimumPlan(toolId: PdfStudioToolId): PlanId {
  return getPdfStudioCapabilityTier(toolId) === "pro" ? "pro" : "starter";
}

export function isPdfStudioToolDiscoverableOnPublicSurface(toolId: PdfStudioToolId) {
  // Every live PDF Studio tool has a public discovery/landing page.
  // Interactivity on the public surface is gated separately by isPdfStudioToolInteractiveOnPublicSurface.
  return toolId.length > 0;
}

export function isPdfStudioToolInteractiveOnPublicSurface(toolId: PdfStudioToolId) {
  return !WORKSPACE_TIER_TOOLS.has(toolId) && !PRO_TIER_TOOLS.has(toolId);
}

export function requiresProForPdfStudioBatch(toolId: PdfStudioToolId) {
  return PRO_TIER_TOOLS.has(toolId);
}

export function requiresProForPdfStudioLargeJob(
  toolId: PdfStudioToolId,
  pageCount: number,
) {
  if (toolId === "ocr") {
    return pageCount > PDF_STUDIO_STARTER_OCR_PAGE_LIMIT;
  }

  return PRO_TIER_TOOLS.has(toolId) && pageCount > PDF_STUDIO_STARTER_PROCESSING_PAGE_LIMIT;
}

export function getPdfStudioResultRetentionHours(planId: PlanId) {
  return PDF_STUDIO_RESULT_RETENTION_HOURS[planId];
}

export function getPdfStudioHistoryEntryLimit(planId: PlanId) {
  return PDF_STUDIO_HISTORY_ENTRY_LIMITS[planId];
}

export function clampPdfStudioHistoryLimit(
  planId: PlanId,
  requestedLimit?: number,
) {
  const maxLimit = getPdfStudioHistoryEntryLimit(planId);
  if (maxLimit <= 0) {
    return 0;
  }

  if (!Number.isFinite(requestedLimit)) {
    return maxLimit;
  }

  return Math.min(Math.max(Math.trunc(requestedLimit ?? maxLimit), 1), maxLimit);
}

export function getPdfStudioRetentionLabel(planId: PlanId) {
  const hours = getPdfStudioResultRetentionHours(planId);
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function getPdfStudioRetentionMessaging(planId: PlanId) {
  const retentionLabel = getPdfStudioRetentionLabel(planId);

  return {
    retentionLabel,
    planNotice: `Completed downloads and batch bundles stay available for ${retentionLabel} on your current plan.`,
    completionNotice: `Download links and batch bundles stay available for ${retentionLabel} after the conversion finishes.`,
  };
}

export function getPdfStudioToolUpgradeCopy(toolId: PdfStudioToolId) {
  switch (toolId) {
    case "repair":
      return "Repair and recovery run on the Pro plan so damaged files, logs, and supportable outcomes stay inside the workspace lane.";
    case "ocr":
      return `Starter covers quick OCR runs. Upgrade to Pro for scanned files above ${PDF_STUDIO_STARTER_OCR_PAGE_LIMIT} pages.`;
    case "pdf-to-word":
    case "pdf-to-excel":
    case "pdf-to-ppt":
    case "word-to-pdf":
    case "html-to-pdf":
      return `Office conversions and tracked batch processing are on the Pro plan. Starter stays on the basic workspace catalog.`;
    default:
      return "Upgrade your PDF Studio plan to unlock the full workspace lane, longer download retention, and advanced processing tools.";
  }
}

export function getPdfStudioCapabilityMatrix() {
  return [
    {
      label: "Public utility tools",
      free: "Browser-first public tools",
      workspace: "Everything in Free plus signed-in workspace entry",
      pro: "Everything in Workspace",
    },
    {
      label: "Workspace history",
      free: "Not available",
      workspace: "Recent jobs and resumable processing",
      pro: "Extended recent history and longer download retention",
    },
    {
      label: "Office conversions",
      free: "Not available",
      workspace: "Upgrade required",
      pro: "PDF↔Office and HTML conversions",
    },
    {
      label: "Batch mode",
      free: "Not available",
      workspace: "Upgrade required",
      pro: "Tracked multi-file batches with bundles",
    },
    {
      label: "Large OCR / repair",
      free: "Small in-browser OCR only",
      workspace: "Starter OCR limits",
      pro: "Large OCR and repair / recovery",
    },
  ] as const;
}
