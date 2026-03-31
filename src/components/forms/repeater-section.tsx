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
    <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,243,237,0.96))] p-4 shadow-[0_14px_30px_rgba(34,34,34,0.045)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-medium text-[var(--foreground)]">{title}</h4>
          <p className="mt-1 text-[0.95rem] leading-7 text-[var(--foreground-soft)]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_22px_rgba(34,34,34,0.04)] transition-colors hover:bg-[rgba(255,255,255,0.88)]"
        >
          {actionLabel}
        </button>
      </div>
      <div className="mt-4 space-y-3.5">{children}</div>
    </div>
  );
}
