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
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
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
        <p className="text-xs leading-6 text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-6 text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
