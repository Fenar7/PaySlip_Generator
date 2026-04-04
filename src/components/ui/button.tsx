import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] shadow-[0_1px_3px_rgba(220,38,38,0.3)]":
              variant === "primary",
            "border border-[var(--border-strong)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-soft)]":
              variant === "secondary",
            "text-[var(--foreground)] hover:bg-[var(--surface-soft)]":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "danger",
          },
          {
            "h-8 rounded-lg px-3 text-xs": size === "sm",
            "h-10 rounded-xl px-4 text-sm": size === "md",
            "h-12 rounded-xl px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
