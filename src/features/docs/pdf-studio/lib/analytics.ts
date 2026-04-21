"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import { usePdfStudioSurface } from "@/features/docs/pdf-studio/lib/surface";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

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
  | "image-only-output"
  | "unknown";

type SafeAnalyticsProperties = Record<string, unknown>;
type FailureProperties = SafeAnalyticsProperties & {
  stage: PdfStudioFailureStage;
  reason: PdfStudioFailureReason;
};

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
      trackPdfStudioLifecycleEvent("pdf_studio_fail", {
        ...baseProperties,
        ...sanitizeAnalyticsProperties(properties),
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
