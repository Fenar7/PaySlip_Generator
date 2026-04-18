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
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <p className="text-sm font-medium text-[var(--foreground)]">{message}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
    </div>
  );
}
