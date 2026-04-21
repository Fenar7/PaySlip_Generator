"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioAcceptString, buildPdfStudioUploadSummary } from "@/features/docs/pdf-studio/lib/ingestion";
import type { PdfStudioConversionJobStatus, PdfStudioToolId } from "@/features/docs/pdf-studio/types";

type ConversionStatusResponse = {
  jobId: string;
  status: PdfStudioConversionJobStatus;
  downloadUrl?: string;
  outputFileName?: string;
  error?: string;
  attempts?: number;
};

export function ServerConversionWorkspace(props: {
  toolId: PdfStudioToolId;
  title: string;
  description: string;
  targetFormat: "docx" | "xlsx" | "pptx" | "pdf";
  notice: string;
}) {
  const analytics = usePdfStudioAnalytics(props.toolId);
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ConversionStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accept = useMemo(() => buildPdfStudioAcceptString(props.toolId), [props.toolId]);

  useEffect(() => {
    if (!job || (job.status !== "pending" && job.status !== "processing" && job.status !== "retry_pending")) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/pdf-studio/conversions/${job.jobId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const nextJob = (await response.json()) as ConversionStatusResponse;
      setJob(nextJob);
      if (nextJob.status === "completed") {
        analytics.trackSuccess({ outputKind: props.targetFormat });
      }
      if (nextJob.status === "dead_letter") {
        analytics.trackFail({ stage: "process", reason: "processing-failed" });
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [analytics, job, props.targetFormat]);

  async function handleStart() {
    if (!file) {
      setError("Upload a supported file before starting the conversion.");
      return;
    }

    setSubmitting(true);
    setError(null);
    analytics.trackStart({ requiresProcessing: true, targetFormat: props.targetFormat });

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      formData.append("toolId", props.toolId);
      formData.append("targetFormat", props.targetFormat);

      const response = await fetch("/api/pdf-studio/conversions", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ConversionStatusResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not create the conversion job.");
      }

      setJob(payload);
    } catch (jobError) {
      const message =
        jobError instanceof Error
          ? jobError.message
          : "Could not start the conversion job.";
      setError(message);
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">{props.title}</h1>
        <p className="mt-2 text-sm text-[#666]">{props.description}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
        <p className="text-sm text-[#666]">{buildPdfStudioUploadSummary(props.toolId)}</p>

        <label className="block rounded-xl border border-dashed border-[#d4d4d4] px-4 py-6 text-center text-sm text-[#1a1a1a]">
          <span className="font-medium">Choose a source file</span>
          <input
            className="mt-3 block w-full text-xs text-[#666]"
            type="file"
            accept={accept}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {file ? (
          <div className="rounded-xl bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
            {file.name}
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {props.notice}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button onClick={() => void handleStart()} disabled={submitting}>
          {submitting ? "Queuing…" : "Start conversion"}
        </Button>

        {job ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
            <p className="text-sm font-semibold text-[#1a1a1a]">Job status: {job.status}</p>
            {job.error ? <p className="mt-2 text-sm text-red-700">{job.error}</p> : null}
            {job.downloadUrl && job.outputFileName ? (
              <a
                href={job.downloadUrl}
                className="mt-3 inline-flex items-center rounded-full border border-[#d4d4d4] px-4 py-2 text-sm font-medium text-[#1a1a1a]"
              >
                Download {job.outputFileName}
              </a>
            ) : (
              <p className="mt-2 text-sm text-[#666]">
                Keep this tab open while the queue runs. If the job retries, the same job ID will continue polling.
              </p>
            )}
            {job.downloadUrl ? (
              <p className="mt-2 text-xs text-[#666]">
                Download links stay available for 24 hours after the conversion finishes.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
