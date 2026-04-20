import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfStudioPublicToolShell } from "@/features/docs/pdf-studio/components/pdf-studio-public-tool-shell";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";
import {
  getPdfStudioToolBySlug,
  listPdfStudioTools,
} from "@/features/docs/pdf-studio/lib/tool-registry";
import { renderPdfStudioToolWorkspace } from "@/features/docs/pdf-studio/lib/tool-components";

export function generateStaticParams() {
  return listPdfStudioTools("public").map((tool) => ({
    tool: tool.publicPath.split("/").pop(),
  }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> | Metadata {
  return params.then(({ tool: slug }) => {
    const tool = getPdfStudioToolBySlug(slug);
    if (!tool || !tool.publicReady) {
      return {};
    }

    return buildPdfStudioToolMetadata(tool.id, "public");
  });
}

export default async function PublicPdfStudioToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: slug } = await params;
  const tool = getPdfStudioToolBySlug(slug);
  if (!tool || !tool.publicReady) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pdf-studio"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          ← PDF Studio hub
        </Link>
      </div>
      <PdfStudioPublicToolShell tool={tool}>
        {renderPdfStudioToolWorkspace(tool.id)}
      </PdfStudioPublicToolShell>
    </div>
  );
}
