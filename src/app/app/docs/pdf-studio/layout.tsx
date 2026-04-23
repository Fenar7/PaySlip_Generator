import Link from "next/link";
import { PdfStudioSupportNotice } from "@/features/docs/pdf-studio/components/pdf-studio-support-notice";
import { PDF_STUDIO_SUPPORT_GUIDE } from "@/features/docs/pdf-studio/lib/support-links";

export default function PdfStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-[var(--border-soft)] bg-white px-4 py-2 sm:px-6">
        <nav className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Link
            href="/app/docs/pdf-studio"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            PDF Studio
          </Link>
          <span>/</span>
          <Link
            href="/app/docs/pdf-studio/readiness"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            Readiness
          </Link>
          <span>/</span>
          <Link
            href={PDF_STUDIO_SUPPORT_GUIDE}
            className="transition-colors hover:text-[var(--foreground)]"
          >
            Help
          </Link>
        </nav>
      </div>
      <div className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <PdfStudioSupportNotice />
        </div>
      </div>
      {children}
    </div>
  );
}
