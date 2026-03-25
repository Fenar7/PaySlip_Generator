import type { ReactNode } from "react";

type DocumentPreviewSurfaceProps = {
  title: string;
  templateName: string;
  children: ReactNode;
};

export function DocumentPreviewSurface({
  title,
  templateName,
  children,
}: DocumentPreviewSurfaceProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[var(--paper)] p-4 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(198,152,84,0.18),transparent_70%)] blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between rounded-[1.25rem] border border-[var(--border-soft)] bg-white/68 px-4 py-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              Live preview
            </p>
            <p className="mt-1 text-sm text-[var(--foreground-soft)]">
              {title} · {templateName}
            </p>
          </div>
          <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
            A4 workspace
          </span>
        </div>

        <div className="overflow-x-auto rounded-[1.6rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,#fffdf8,#f8f2e8)] p-3">
          <div className="mx-auto min-h-[1080px] w-full min-w-[720px] max-w-[794px] rounded-[1.25rem] border border-[rgba(29,23,16,0.08)] bg-white p-8 shadow-[0_24px_48px_rgba(38,30,20,0.08)] [--voucher-ink:#1d1710] [--voucher-accent:var(--accent)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
