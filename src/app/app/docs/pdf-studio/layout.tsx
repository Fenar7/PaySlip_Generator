import Link from "next/link";

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
            href="/help/troubleshooting/pdf-studio-jobs"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            Help
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
