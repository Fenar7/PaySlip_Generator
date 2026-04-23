import Link from "next/link";
import {
  PDF_STUDIO_JOB_SUPPORT_GUIDE,
  PDF_STUDIO_SUPPORT_GUIDE,
} from "@/features/docs/pdf-studio/lib/support-links";

export function PdfStudioSupportNotice(props?: {
  surface?: "workspace" | "public";
}) {
  const surface = props?.surface ?? "workspace";

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
        Support &amp; recovery
      </p>
      <p className="mt-2 text-sm text-blue-900">
        {surface === "workspace"
          ? "Browser-first PDF Studio tools run in this tab and use the suite support guide when upload, runtime, or export steps fail. Worker-backed conversions add job IDs, failure codes, history, and readiness diagnostics."
          : "Public PDF Studio pages use the suite support guide for browser-first recovery. Worker-backed conversions still require the signed-in workspace for job IDs, failure codes, and readiness diagnostics."}
      </p>
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
