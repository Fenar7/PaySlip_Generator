"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import {
  buildPdfStudioUploadSummary,
} from "@/features/docs/pdf-studio/lib/ingestion";
import {
  getPdfStudioExecutionCopy,
  type PdfStudioToolDefinition,
} from "@/features/docs/pdf-studio/lib/tool-registry";
import { trackPdfStudioLifecycleEvent } from "@/features/docs/pdf-studio/lib/analytics";

export function PdfStudioPublicToolShell({
  tool,
  children,
}: {
  tool: PdfStudioToolDefinition;
  children: React.ReactNode;
}) {
  const execution = getPdfStudioExecutionCopy(tool.executionMode);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--border-strong)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-xl">
                {tool.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                  {tool.title}
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {tool.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                variant={
                  tool.executionMode === "browser"
                    ? "success"
                    : tool.executionMode === "processing"
                      ? "warning"
                      : "default"
                }
              >
                {execution.badge}
              </Badge>
              <Badge variant="default">{tool.outputLabel}</Badge>
              <Badge variant="default">{buildPdfStudioUploadSummary(tool.id)}</Badge>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--foreground-soft)]">
              {execution.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={tool.workspacePath}
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              Open workspace version
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
              onClick={() =>
                trackPdfStudioLifecycleEvent("pdf_studio_upgrade_intent", {
                  subject: tool.id,
                  surface: "public",
                  route: tool.publicPath,
                  destination: "/pricing",
                  executionMode: tool.executionMode,
                })
              }
            >
              Need more capacity?
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          Stay on this public page to use the tool now. The workspace version is
          for signed-in Slipwise users who want the full docs workspace around
          the same utility.
        </p>
      </section>

      <section className="[&_.pdf-studio-tool-header]:hidden">{children}</section>
    </div>
  );
}
