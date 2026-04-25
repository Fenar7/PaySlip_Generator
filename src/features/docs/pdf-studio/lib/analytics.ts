"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { captureError } from "@/lib/sentry";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import { PDF_STUDIO_SUPPORT_GUIDE } from "@/features/docs/pdf-studio/lib/support-links";
import { usePdfStudioSurface } from "@/features/docs/pdf-studio/lib/surface";
import type {
  PdfStudioExecutionMode,
  PdfStudioToolId,
} from "@/features/docs/pdf-studio/types";

type PdfStudioAnalyticsSubject = PdfStudioToolId | "hub";
type PdfStudioAnalyticsEvent =
  | "pdf_studio_entry"
  | "pdf_studio_upload"
  | "pdf_studio_start"
  | "pdf_studio_success"
  | "pdf_studio_fail"
  | "pdf_studio_upgrade_intent";

export type PdfStudioFailureStage = "upload" | "process" | "render" | "generate";
export type PdfStudioFailureReason =
  | "no-files"
  | "too-many-files"
  | "file-too-large"
  | "unsupported-file-type"
  | "page-limit-exceeded"
  | "pdf-read-failed"
  | "pdf-runtime-failed"
  | "processing-failed"
  | "render-failed"
  | "validation-failed"
  | "password-protected"
  | "password-required"
  | "password-mismatch"
  | "password-too-short"
  | "incorrect-password"
  | "rate-limited"
  | "payload-too-large"
  | "encryption-failed"
  | "no-embedded-images"
  | "no-text-detected"
  | "ocr-unavailable"
  | "confidence-low"
  | "weak-detection"
  | "no-recoverable-pages"
  | "image-only-output"
  | "unknown";

type SafeAnalyticsProperties = Record<string, unknown>;
type FailureProperties = SafeAnalyticsProperties & {
  stage: PdfStudioFailureStage;
  reason: PdfStudioFailureReason;
};

export function getPdfStudioSupportLane(
  executionMode: PdfStudioExecutionMode | null,
): "browser-first" | "worker-backed" | "hybrid" | "unknown" {
  if (executionMode === "browser") return "browser-first";
  if (executionMode === "processing") return "worker-backed";
  if (executionMode === "hybrid") return "hybrid";
  return "unknown";
}

export function getPdfStudioDiagnosticsScope(
  executionMode: PdfStudioExecutionMode | null,
): "telemetry-only" | "job-history" | "mixed" | "unknown" {
  if (executionMode === "browser") return "telemetry-only";
  if (executionMode === "processing") return "job-history";
  if (executionMode === "hybrid") return "mixed";
  return "unknown";
}

const SUPPORT_CAPTURE_REASONS = new Set<PdfStudioFailureReason>([
  "pdf-read-failed",
  "pdf-runtime-failed",
  "processing-failed",
  "render-failed",
  "ocr-unavailable",
  "encryption-failed",
  "no-recoverable-pages",
  "image-only-output",
]);

const BLOCKED_ANALYTICS_KEYS = new Set([
  "message",
  "error",
  "filename",
  "fileName",
  "sourcePdfName",
]);

function sanitizeAnalyticsProperties(properties: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_ANALYTICS_KEYS.has(key)) {
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

export function trackPdfStudioLifecycleEvent(
  eventName: PdfStudioAnalyticsEvent,
  properties: Record<string, unknown>,
) {
  void trackEvent(eventName, sanitizeAnalyticsProperties(properties));
}

export async function capturePdfStudioSupportFailure(params: {
  subject: PdfStudioAnalyticsSubject;
  executionMode: PdfStudioExecutionMode | null;
  route: string;
  surface: string;
  failure: FailureProperties;
}) {
  if (
    params.subject === "hub" ||
    (params.executionMode !== "browser" && params.executionMode !== "hybrid") ||
    !SUPPORT_CAPTURE_REASONS.has(params.failure.reason)
  ) {
    return;
  }

  const failure = sanitizeAnalyticsProperties(params.failure);

  await captureError(
    new Error(
      `PDF Studio browser-support failure: ${params.subject} ${params.failure.stage} ${params.failure.reason}`,
    ),
    {
      subject: params.subject,
      surface: params.surface,
      route: params.route,
      executionMode: params.executionMode,
      ...failure,
      supportLane: "browser-first",
      diagnosticsScope: "telemetry-only",
      helpHref: PDF_STUDIO_SUPPORT_GUIDE,
    },
  );
}

export function usePdfStudioAnalytics(subject: PdfStudioAnalyticsSubject) {
  const { surface } = usePdfStudioSurface();
  const pathname = usePathname();
  const trackedEntry = useRef(false);
  const tool =
    subject === "hub" ? null : getPdfStudioTool(subject);

  const baseProperties = useMemo(
    () => ({
      surface,
      subject,
      executionMode: tool?.executionMode ?? null,
      route: pathname,
    }),
    [pathname, subject, surface, tool?.executionMode],
  );

  useEffect(() => {
    if (trackedEntry.current) {
      return;
    }
    trackedEntry.current = true;
    trackPdfStudioLifecycleEvent("pdf_studio_entry", baseProperties);
  }, [baseProperties]);

  return {
    surface,
    trackUpload(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_upload", {
        ...baseProperties,
        ...properties,
      });
    },
    trackStart(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_start", {
        ...baseProperties,
        ...properties,
      });
    },
    trackSuccess(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_success", {
        ...baseProperties,
        ...properties,
      });
    },
    trackFail(properties: FailureProperties) {
      const executionMode = tool?.executionMode ?? null;
      const failureProperties = {
        ...baseProperties,
        ...sanitizeAnalyticsProperties(properties),
        supportLane: getPdfStudioSupportLane(executionMode),
        diagnosticsScope: getPdfStudioDiagnosticsScope(executionMode),
      };

      trackPdfStudioLifecycleEvent("pdf_studio_fail", failureProperties);
      void capturePdfStudioSupportFailure({
        subject,
        executionMode,
        route: pathname,
        surface,
        failure: properties,
      });
    },
    trackUpgradeIntent(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_upgrade_intent", {
        ...baseProperties,
        ...properties,
      });
    },
  };
}
