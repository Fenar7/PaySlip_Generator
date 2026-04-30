/**
 * Shared OCR readiness model consumed by both the create-PDF workspace
 * and the dedicated OCR workspace.
 *
 * Invariants:
 * - Searchable PDF export must never silently proceed without OCR text.
 * - OCR status must be deterministic and honest — no false-success UX.
 * - If OCR is ON and incomplete, generation must be blocked or explicitly confirmed.
 */
import type { ImageItem } from "@/features/docs/pdf-studio/types";
import { getOcrServiceStatus } from "@/features/docs/pdf-studio/utils/ocr-processor";

export type OcrAggregateStatus =
  | "idle"
  | "pending"
  | "processing"
  | "complete"
  | "partial"
  | "unavailable"
  | "cancelled";

export type OcrReadinessResult = {
  status: OcrAggregateStatus;
  serviceReady: boolean;
  allComplete: boolean;
  needsAttention: boolean;
  completeCount: number;
  failedCount: number;
  lowConfidenceCount: number;
  inProgressCount: number;
  cancelledCount: number;
  totalCount: number;
  ocrEnabled: boolean;
  searchableExportReady: boolean;
  exportAction: "none" | "block" | "confirm" | "warn-image-only";
  summary: string;
  statusLabel: string;
};

export type OcrReadinessInput = {
  images: ImageItem[];
  ocrEnabled: boolean;
  lowConfidenceThreshold?: number;
};

export function getOcrReadiness(input: OcrReadinessInput): OcrReadinessResult {
  const { images, ocrEnabled, lowConfidenceThreshold = 70 } = input;
  const totalCount = images.length;
  const serviceStatus = getOcrServiceStatus();
  const serviceReady = serviceStatus === "idle" || serviceStatus === "ready" || serviceStatus === "initializing";

  let completeCount = 0;
  let failedCount = 0;
  let lowConfidenceCount = 0;
  let inProgressCount = 0;
  let cancelledCount = 0;

  for (const img of images) {
    switch (img.ocrStatus) {
      case "complete":
        completeCount++;
        if (typeof img.ocrConfidence === "number" && img.ocrConfidence < lowConfidenceThreshold) {
          lowConfidenceCount++;
        }
        break;
      case "pending":
      case "processing":
        inProgressCount++;
        break;
      case "error":
        failedCount++;
        break;
      case "cancelled":
        cancelledCount++;
        break;
    }
  }

  const allComplete = !images.some((img) => !img.ocrText || img.ocrText === "");
  const searchableExportReady = ocrEnabled && allComplete && completeCount === totalCount;
  const needsAttention = inProgressCount > 0 || failedCount > 0 || cancelledCount > 0 || lowConfidenceCount > 0;

  let status: OcrAggregateStatus;
  if (serviceStatus === "unavailable") {
    status = "unavailable";
  } else if (inProgressCount > 0) {
    status = images.some((img) => img.ocrStatus === "processing") ? "processing" : "pending";
  } else if (completeCount === totalCount && totalCount > 0) {
    status = "complete";
  } else if (completeCount > 0 && (failedCount > 0 || cancelledCount > 0)) {
    status = "partial";
  } else if (failedCount > 0 || cancelledCount > 0) {
    status = "cancelled";
  } else {
    status = "idle";
  }

  let exportAction: OcrReadinessResult["exportAction"];
  let summary: string;

  if (!ocrEnabled) {
    exportAction = "warn-image-only";
    summary = "OCR is disabled. The PDF will be image-only (not searchable).";
  } else if (status === "unavailable") {
    exportAction = "confirm";
    summary = "OCR could not initialize in this browser. You can generate an image-only PDF or refresh to try again.";
  } else if (inProgressCount > 0) {
    exportAction = "block";
    summary = `OCR is still processing ${inProgressCount} page${inProgressCount !== 1 ? "s" : ""}. Please wait or cancel OCR before generating.`;
  } else if (totalCount === 0) {
    exportAction = "none";
    summary = "No images uploaded yet.";
  } else if (searchableExportReady) {
    exportAction = "none";
    summary = "OCR is complete on all pages. The PDF will be searchable.";
  } else if (completeCount > 0 && (failedCount > 0 || cancelledCount > 0)) {
    exportAction = "confirm";
    if (failedCount > 0) {
      summary = `${failedCount} page${failedCount !== 1 ? "s" : ""} failed OCR. The PDF may not be fully searchable.`;
    } else {
      summary = `${cancelledCount} page${cancelledCount !== 1 ? "s" : ""} had OCR cancelled. The PDF may not be fully searchable.`;
    }
  } else if (failedCount > 0) {
    exportAction = "confirm";
    summary = `OCR failed on all ${failedCount} page${failedCount !== 1 ? "s" : ""}. The PDF will not be searchable.`;
  } else {
    exportAction = "none";
    summary = "Ready to generate.";
  }

  let statusLabel: string;
  switch (status) {
    case "idle":
      statusLabel = ocrEnabled ? "OCR ready" : "OCR disabled";
      break;
    case "pending":
      statusLabel = "OCR pending";
      break;
    case "processing":
      statusLabel = "OCR processing";
      break;
    case "complete":
      statusLabel = "OCR complete";
      break;
    case "partial":
      statusLabel = "OCR partially complete";
      break;
    case "unavailable":
      statusLabel = "OCR unavailable";
      break;
    case "cancelled":
      statusLabel = "OCR cancelled";
      break;
    default:
      statusLabel = "OCR status unknown";
  }

  return {
    status,
    serviceReady,
    allComplete,
    needsAttention,
    completeCount,
    failedCount,
    lowConfidenceCount,
    inProgressCount,
    cancelledCount,
    totalCount,
    ocrEnabled,
    searchableExportReady,
    exportAction,
    summary,
    statusLabel,
  };
}

export function hasAnyOcrActivity(images: ImageItem[]): boolean {
  return images.some((img) => typeof img.ocrStatus !== "undefined");
}

export function isOcrStateRestorable(img: ImageItem): boolean {
  return img.ocrStatus === "complete" && typeof img.ocrText === "string" && img.ocrText.length > 0;
}

export function buildOcrRestoreMessage(completeCount: number, droppedCount: number): string {
  if (completeCount === 0 && droppedCount === 0) return "";

  if (droppedCount > 0) {
    return `${completeCount} page${completeCount !== 1 ? "s" : ""} ha${completeCount === 1 ? "s" : "ve"} restored OCR text. ${droppedCount} page${droppedCount !== 1 ? "s" : ""} need${droppedCount === 1 ? "s" : ""} the source file re-uploaded before OCR can run again.`;
  }

  return `OCR text restored for all ${completeCount} page${completeCount !== 1 ? "s" : ""}.`;
}
