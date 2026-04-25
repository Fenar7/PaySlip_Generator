import Link from "next/link";
import type { PdfStudioExecutionMode } from "@/features/docs/pdf-studio/types";
import {
  PDF_STUDIO_JOB_SUPPORT_GUIDE,
  PDF_STUDIO_SUPPORT_GUIDE,
} from "@/features/docs/pdf-studio/lib/support-links";

function buildSupportNoticeCopy(
  surface: "workspace" | "public",
  executionMode?: PdfStudioExecutionMode,
) {
  if (executionMode === "browser") {
    return surface === "workspace"
      ? "This tool runs locally in the browser. If upload, runtime, or export steps fail, use the suite support guide. Browser-first tools do not expose persistent job IDs, queue depth, or worker diagnostics."
      : "This public tool runs locally in the browser. Use the suite support guide for recovery guidance. Persistent job IDs and worker diagnostics are only available in the signed-in workspace.";
  }

  if (executionMode === "processing") {
    return surface === "workspace"
      ? "This tool runs as a tracked worker job with a job ID, failure codes, history, and readiness diagnostics. Keep the job ID when you escalate an issue."
      : "This tool requires the signed-in workspace to run as a tracked worker job with job IDs, failure codes, and readiness diagnostics.";
  }

  if (executionMode === "hybrid") {
    return surface === "workspace"
      ? "This tool uses a hybrid lane: some steps run in the browser and others enqueue a worker job. Browser failures use the suite support guide; worker failures expose job IDs and diagnostics."
      : "This tool uses a hybrid lane. The signed-in workspace adds tracked worker jobs, failure codes, and readiness diagnostics beyond browser-first recovery.";
  }

  return surface === "workspace"
    ? "Browser-first PDF Studio tools run in this tab and use the suite support guide when upload, runtime, or export steps fail. Worker-backed conversions add job IDs, failure codes, history, and readiness diagnostics."
    : "Public PDF Studio pages use the suite support guide for browser-first recovery. Worker-backed conversions still require the signed-in workspace for job IDs, failure codes, and readiness diagnostics.";
}

export function PdfStudioSupportNotice(props?: {
  surface?: "workspace" | "public";
  executionMode?: PdfStudioExecutionMode;
}) {
  const surface = props?.surface ?? "workspace";
  const copy = buildSupportNoticeCopy(surface, props?.executionMode);

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
        Support &amp; recovery
      </p>
      <p className="mt-2 text-sm text-blue-900">{copy}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
        <Link href={PDF_STUDIO_SUPPORT_GUIDE} className="text-blue-700 hover:underline">
          Suite support guide
        </Link>
        <Link
          href={
            surface === "workspace" ? "/app/docs/pdf-studio/readiness" : "/app/docs/pdf-studio"
          }
          className="text-blue-700 hover:underline"
        >
          {surface === "workspace" ? "Readiness & diagnostics" : "Open workspace"}
        </Link>
        <Link
          href={PDF_STUDIO_JOB_SUPPORT_GUIDE}
          className="text-blue-700 hover:underline"
        >
          Worker job guide
        </Link>
      </div>
    </section>
  );
}
