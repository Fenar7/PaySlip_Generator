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
    <div className="rounded-[1.3rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(248,251,255,0.92),rgba(255,255,255,0.98))] p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-[var(--foreground)]">{title}</h4>
          <p className="mt-1 text-sm leading-7 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-colors hover:bg-[var(--surface-accent)]"
        >
          {actionLabel}
        </button>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
