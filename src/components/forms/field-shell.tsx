import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 whitespace-nowrap text-[0.875rem] font-semibold text-[#1f2937]"
      >
        {label}
        {required ? (
          <span className="text-[var(--accent)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-[0.75rem] leading-6 text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-[0.75rem] leading-6 text-[var(--foreground-soft)]/80">{hint}</p>
      ) : null}
    </div>
  );
}
