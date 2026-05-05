import { type LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
        className={cn(
          "text-[0.75rem] font-semibold text-[var(--text-primary)]",
          className,
        )}
      {...props}
    />
  ),
);
Label.displayName = "Label";
