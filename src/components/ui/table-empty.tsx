import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TableEmptyProps {
  message?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function TableEmpty({
  message = "No records found",
  description,
  icon,
  className,
}: TableEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      {icon && <div className="mb-4 text-4xl text-[var(--text-muted)]">{icon}</div>}
      <p className="text-sm font-medium text-[var(--text-primary)]">{message}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
          {description}
        </p>
      )}
    </div>
  );
}
