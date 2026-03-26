import type { ReactNode } from "react";

type RepeaterSectionProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAdd: () => void;
  children: ReactNode;
};

export function RepeaterSection({
  title,
  description,
  actionLabel,
  onAdd,
  children,
}: RepeaterSectionProps) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border-soft)] bg-white/80 p-4 shadow-[0_12px_30px_rgba(38,30,20,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-medium text-[var(--foreground)]">{title}</h4>
          <p className="mt-1 text-sm leading-7 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
        >
          {actionLabel}
        </button>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
