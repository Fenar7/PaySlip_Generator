import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[0.75rem] font-semibold text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--brand-primary)]",
            error ? "border-[var(--state-danger)]" : "border-[var(--border-default)]",
            "disabled:bg-[var(--surface-subtle)] disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--state-danger)]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
